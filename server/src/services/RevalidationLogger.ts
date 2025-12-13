/**
 * RevalidationLogger
 *
 * batch実験の再検証プロセスを可視化する専用ロガー
 * 機能美を重視した情報粒度で、実行過程と差分を明確に表示
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// ========================================
// Types
// ========================================

interface ValidationDiff {
  field: string;
  before: unknown;
  after: unknown;
  changed: boolean;
}

interface LogValidationResult {
  logId: string;
  trialNumber: number;
  inputId: string;
  modelConfig: string;
  success: boolean;
  error?: string;
  diffs: ValidationDiff[];
  processingTimeMs: number;
}

interface RevalidationSummary {
  batchId: string;
  startedAt: Date;
  completedAt: Date;
  totalTargets: number;
  successCount: number;
  failCount: number;
  changedCount: number;
  unchangedCount: number;
  totalProcessingTimeMs: number;
  results: LogValidationResult[];
  diffSummary: {
    field: string;
    changedCount: number;
    examples: Array<{ logId: string; before: unknown; after: unknown }>;
  }[];
}

// ========================================
// Box Drawing Characters for CLI
// ========================================

const BOX = {
  TOP_LEFT: '┌',
  TOP_RIGHT: '┐',
  BOTTOM_LEFT: '└',
  BOTTOM_RIGHT: '┘',
  HORIZONTAL: '─',
  VERTICAL: '│',
  T_DOWN: '┬',
  T_UP: '┴',
  T_RIGHT: '├',
  T_LEFT: '┤',
  CROSS: '┼',
} as const;

const ICONS = {
  REVALIDATE: '⟳',
  CHECK: '✓',
  CROSS: '✗',
  ARROW: '→',
  DELTA: 'Δ',
  DOT: '•',
  BULLET: '▸',
  PROGRESS: '░▒▓█',
  SEPARATOR: '─',
} as const;

// ログ出力のプレフィックス（HTTPログとの区別用）
const LOG_PREFIX = '[revalidate]';

// ========================================
// RevalidationLogger Class
// ========================================

export class RevalidationLogger {
  private batchId: string;
  private startedAt: Date;
  private results: LogValidationResult[] = [];
  private logBuffer: string[] = [];
  private totalTargets: number = 0;
  private processedCount: number = 0;

  constructor(batchId: string) {
    this.batchId = batchId;
    this.startedAt = new Date();
  }

  // ========================================
  // Header
  // ========================================

  logHeader(totalTargets: number, options: {
    experimentId?: string;
    modelConfigs?: string[];
    rerunBackendValidation?: boolean;
  } = {}): void {
    this.totalTargets = totalTargets;

    const width = 56;
    const hr = ICONS.SEPARATOR.repeat(width);

    const lines = [
      '',
      `${LOG_PREFIX} ${BOX.TOP_LEFT}${hr}${BOX.TOP_RIGHT}`,
      `${LOG_PREFIX} ${BOX.VERTICAL}  ${ICONS.REVALIDATE} REVALIDATION SESSION                              ${BOX.VERTICAL}`,
      `${LOG_PREFIX} ${BOX.T_RIGHT}${hr}${BOX.T_LEFT}`,
      `${LOG_PREFIX} ${BOX.VERTICAL}  Batch   : ${this.batchId.slice(0, 8)}...                     ${BOX.VERTICAL}`,
      `${LOG_PREFIX} ${BOX.VERTICAL}  Targets : ${String(totalTargets).padEnd(4)} Stage 3 logs                  ${BOX.VERTICAL}`,
      `${LOG_PREFIX} ${BOX.VERTICAL}  Started : ${this.formatTime(this.startedAt)}                         ${BOX.VERTICAL}`,
    ];

    if (options.experimentId) {
      lines.push(`${LOG_PREFIX} ${BOX.VERTICAL}  Exp ID  : ${options.experimentId.slice(0, 32).padEnd(32)}   ${BOX.VERTICAL}`);
    }

    lines.push(`${LOG_PREFIX} ${BOX.BOTTOM_LEFT}${hr}${BOX.BOTTOM_RIGHT}`);
    lines.push(`${LOG_PREFIX}`);

    for (const line of lines) {
      console.log(line);
      this.logBuffer.push(line);
    }
  }

  // ========================================
  // Progress
  // ========================================

  logProgress(result: LogValidationResult): void {
    this.results.push(result);
    this.processedCount++;

    const progressPct = Math.round((this.processedCount / Math.max(1, this.totalTargets)) * 100);
    const progressBar = this.createProgressBar(progressPct, 16);

    const statusIcon = result.success ? ICONS.CHECK : ICONS.CROSS;
    const changedCount = result.diffs.filter(d => d.changed).length;
    const diffIndicator = changedCount > 0
      ? `${ICONS.DELTA}${changedCount}`
      : '  ';

    const line = `${LOG_PREFIX} [${progressBar}] ${String(progressPct).padStart(3)}%  ${statusIcon} #${String(result.trialNumber).padStart(3)} ${result.inputId.padEnd(10).slice(0, 10)} ${diffIndicator} ${result.processingTimeMs}ms`;

    console.log(line);
    this.logBuffer.push(line);

    // 差分がある場合は詳細を表示
    if (changedCount > 0) {
      this.logDiffDetails(result.diffs, result.logId);
    }
  }

  private logDiffDetails(diffs: ValidationDiff[], logId: string): void {
    const changedDiffs = diffs.filter(d => d.changed);

    for (const diff of changedDiffs) {
      const beforeStr = this.formatValue(diff.before);
      const afterStr = this.formatValue(diff.after);
      const line = `${LOG_PREFIX}     ${ICONS.BULLET} ${diff.field}: ${beforeStr} ${ICONS.ARROW} ${afterStr}`;
      console.log(line);
      this.logBuffer.push(line);
    }
  }

  logSkipped(logId: string, reason: string): void {
    const line = `${LOG_PREFIX} ${ICONS.DOT} ${logId.slice(0, 8)}... skipped: ${reason}`;
    console.log(line);
    this.logBuffer.push(line);
  }

  logError(logId: string, error: string): void {
    const line = `${LOG_PREFIX} ${ICONS.CROSS} ${logId.slice(0, 8)}... error: ${error}`;
    console.error(line);
    this.logBuffer.push(line);
  }

  // ========================================
  // Summary
  // ========================================

  logSummary(): RevalidationSummary {
    const completedAt = new Date();
    const totalProcessingTimeMs = completedAt.getTime() - this.startedAt.getTime();

    const successCount = this.results.filter(r => r.success).length;
    const failCount = this.results.filter(r => !r.success).length;
    const changedCount = this.results.filter(r => r.diffs.some(d => d.changed)).length;
    const unchangedCount = successCount - changedCount;

    // フィールドごとの差分集計
    const diffSummary = this.aggregateDiffs();

    const summary: RevalidationSummary = {
      batchId: this.batchId,
      startedAt: this.startedAt,
      completedAt,
      totalTargets: this.totalTargets,
      successCount,
      failCount,
      changedCount,
      unchangedCount,
      totalProcessingTimeMs,
      results: this.results,
      diffSummary,
    };

    this.printSummary(summary);

    return summary;
  }

  private aggregateDiffs(): RevalidationSummary['diffSummary'] {
    const fieldMap = new Map<string, {
      changedCount: number;
      examples: Array<{ logId: string; before: unknown; after: unknown }>;
    }>();

    for (const result of this.results) {
      for (const diff of result.diffs) {
        if (!diff.changed) continue;

        if (!fieldMap.has(diff.field)) {
          fieldMap.set(diff.field, { changedCount: 0, examples: [] });
        }

        const entry = fieldMap.get(diff.field)!;
        entry.changedCount++;

        // 最大3つまで例を保存
        if (entry.examples.length < 3) {
          entry.examples.push({
            logId: result.logId,
            before: diff.before,
            after: diff.after,
          });
        }
      }
    }

    return Array.from(fieldMap.entries())
      .map(([field, data]) => ({ field, ...data }))
      .sort((a, b) => b.changedCount - a.changedCount);
  }

  private printSummary(summary: RevalidationSummary): void {
    const width = 56;
    const hr = ICONS.SEPARATOR.repeat(width);

    const lines = [
      `${LOG_PREFIX}`,
      `${LOG_PREFIX} ${BOX.TOP_LEFT}${hr}${BOX.TOP_RIGHT}`,
      `${LOG_PREFIX} ${BOX.VERTICAL}  ${ICONS.CHECK} REVALIDATION COMPLETE                              ${BOX.VERTICAL}`,
      `${LOG_PREFIX} ${BOX.T_RIGHT}${hr}${BOX.T_LEFT}`,
    ];

    // 結果サマリー
    lines.push(`${LOG_PREFIX} ${BOX.VERTICAL}                                                        ${BOX.VERTICAL}`);
    lines.push(`${LOG_PREFIX} ${BOX.VERTICAL}  Results:                                              ${BOX.VERTICAL}`);
    lines.push(`${LOG_PREFIX} ${BOX.VERTICAL}    ${ICONS.CHECK} Success   : ${String(summary.successCount).padStart(4)}                             ${BOX.VERTICAL}`);
    lines.push(`${LOG_PREFIX} ${BOX.VERTICAL}    ${ICONS.CROSS} Failed    : ${String(summary.failCount).padStart(4)}                             ${BOX.VERTICAL}`);
    lines.push(`${LOG_PREFIX} ${BOX.VERTICAL}    ${ICONS.DELTA} Changed   : ${String(summary.changedCount).padStart(4)}                             ${BOX.VERTICAL}`);
    lines.push(`${LOG_PREFIX} ${BOX.VERTICAL}    ${ICONS.DOT} Unchanged : ${String(summary.unchangedCount).padStart(4)}                             ${BOX.VERTICAL}`);
    lines.push(`${LOG_PREFIX} ${BOX.VERTICAL}                                                        ${BOX.VERTICAL}`);

    // 差分サマリー
    if (summary.diffSummary.length > 0) {
      lines.push(`${LOG_PREFIX} ${BOX.T_RIGHT}${hr}${BOX.T_LEFT}`);
      lines.push(`${LOG_PREFIX} ${BOX.VERTICAL}  Diff Summary:                                         ${BOX.VERTICAL}`);

      for (const diff of summary.diffSummary.slice(0, 6)) {
        const fieldName = diff.field.padEnd(20).slice(0, 20);
        lines.push(`${LOG_PREFIX} ${BOX.VERTICAL}    ${fieldName} : ${String(diff.changedCount).padStart(4)} changes          ${BOX.VERTICAL}`);
      }
      lines.push(`${LOG_PREFIX} ${BOX.VERTICAL}                                                        ${BOX.VERTICAL}`);
    }

    // タイミング
    lines.push(`${LOG_PREFIX} ${BOX.T_RIGHT}${hr}${BOX.T_LEFT}`);
    lines.push(`${LOG_PREFIX} ${BOX.VERTICAL}  Duration : ${this.formatDuration(summary.totalProcessingTimeMs).padEnd(42)} ${BOX.VERTICAL}`);
    lines.push(`${LOG_PREFIX} ${BOX.VERTICAL}  Finished : ${this.formatTime(summary.completedAt)}                     ${BOX.VERTICAL}`);
    lines.push(`${LOG_PREFIX} ${BOX.BOTTOM_LEFT}${hr}${BOX.BOTTOM_RIGHT}`);
    lines.push(`${LOG_PREFIX}`);

    for (const line of lines) {
      console.log(line);
      this.logBuffer.push(line);
    }
  }

  // ========================================
  // File Output
  // ========================================

  async writeLogFile(summary: RevalidationSummary): Promise<string> {
    const logsDir = join(process.cwd(), 'logs', 'revalidation');
    await mkdir(logsDir, { recursive: true });

    const timestamp = this.formatTimestamp(summary.completedAt);
    const filename = `revalidation_${this.batchId.slice(0, 8)}_${timestamp}.log`;
    const filepath = join(logsDir, filename);

    // ログ内容を構築
    const logContent = this.buildLogFileContent(summary);

    await writeFile(filepath, logContent, 'utf-8');

    const line = `${LOG_PREFIX} ${ICONS.BULLET} Log file: ${filepath}`;
    console.log(line);
    this.logBuffer.push(line);

    return filepath;
  }

  private buildLogFileContent(summary: RevalidationSummary): string {
    const lines: string[] = [];

    // ヘッダー
    lines.push('═'.repeat(70));
    lines.push('REVALIDATION LOG');
    lines.push('═'.repeat(70));
    lines.push('');
    lines.push(`Batch ID   : ${summary.batchId}`);
    lines.push(`Started    : ${summary.startedAt.toISOString()}`);
    lines.push(`Completed  : ${summary.completedAt.toISOString()}`);
    lines.push(`Duration   : ${this.formatDuration(summary.totalProcessingTimeMs)}`);
    lines.push('');

    // サマリー統計
    lines.push('─'.repeat(70));
    lines.push('SUMMARY');
    lines.push('─'.repeat(70));
    lines.push(`Total Targets : ${summary.totalTargets}`);
    lines.push(`Success       : ${summary.successCount}`);
    lines.push(`Failed        : ${summary.failCount}`);
    lines.push(`Changed       : ${summary.changedCount}`);
    lines.push(`Unchanged     : ${summary.unchangedCount}`);
    lines.push('');

    // 差分サマリー
    if (summary.diffSummary.length > 0) {
      lines.push('─'.repeat(70));
      lines.push('DIFF SUMMARY BY FIELD');
      lines.push('─'.repeat(70));

      for (const diff of summary.diffSummary) {
        lines.push(`${diff.field}: ${diff.changedCount} changes`);
        for (const ex of diff.examples) {
          lines.push(`  └─ ${ex.logId.slice(0, 8)}: ${JSON.stringify(ex.before)} → ${JSON.stringify(ex.after)}`);
        }
      }
      lines.push('');
    }

    // 詳細結果
    lines.push('─'.repeat(70));
    lines.push('DETAILED RESULTS');
    lines.push('─'.repeat(70));

    for (const result of summary.results) {
      const status = result.success ? 'OK' : 'FAIL';
      const changedFields = result.diffs.filter(d => d.changed);

      lines.push('');
      lines.push(`[${status}] Trial #${result.trialNumber} | ${result.inputId} | ${result.modelConfig}`);
      lines.push(`     Log ID: ${result.logId}`);
      lines.push(`     Time: ${result.processingTimeMs}ms`);

      if (result.error) {
        lines.push(`     Error: ${result.error}`);
      }

      if (changedFields.length > 0) {
        lines.push('     Changes:');
        for (const diff of changedFields) {
          lines.push(`       ${diff.field}: ${JSON.stringify(diff.before)} → ${JSON.stringify(diff.after)}`);
        }
      } else if (result.success) {
        lines.push('     Changes: (none)');
      }
    }

    lines.push('');
    lines.push('═'.repeat(70));
    lines.push('END OF LOG');
    lines.push('═'.repeat(70));

    return lines.join('\n');
  }

  // ========================================
  // Utility Methods
  // ========================================

  private createProgressBar(percent: number, width: number): string {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  private formatTimestamp(date: Date): string {
    return date.toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .slice(0, 15);
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}m ${sec}s`;
  }

  private formatValue(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      if (value.length <= 3) return `[${value.join(', ')}]`;
      return `[${value.length} items]`;
    }
    if (typeof value === 'string') {
      return value.length > 20 ? `"${value.slice(0, 17)}..."` : `"${value}"`;
    }
    return JSON.stringify(value).slice(0, 20);
  }

  // ========================================
  // Static Factory for Diff Creation
  // ========================================

  static createDiff(
    field: string,
    before: unknown,
    after: unknown
  ): ValidationDiff {
    const changed = !this.deepEqual(before, after);
    return { field, before, after, changed };
  }

  private static deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, idx) => this.deepEqual(val, b[idx]));
    }

    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a as object);
      const keysB = Object.keys(b as object);
      if (keysA.length !== keysB.length) return false;
      return keysA.every(key =>
        this.deepEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key]
        )
      );
    }

    return false;
  }
}

// ========================================
// Export Types
// ========================================

export type { ValidationDiff, LogValidationResult, RevalidationSummary };
