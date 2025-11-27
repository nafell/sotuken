/**
 * WidgetDefinitionGenerator.ts
 *
 * Widget定義からLLMプロンプト用テキストを生成するユーティリティ。
 * DependencyGraph生成時にLLMに渡すWidget情報を構造化する。
 *
 * @module WidgetDefinitionGenerator
 * @since Phase 4 Task 2.2
 */

import type {
  WidgetDefinition,
  ReactivePortDefinition,
  PortConstraint,
} from '../types/WidgetDefinition';
import { WIDGET_DEFINITIONS } from '../definitions/widgets';

// =============================================================================
// 型定義
// =============================================================================

/**
 * 生成オプション
 */
export interface GeneratorOptions {
  /** ポート制約を含めるか */
  includeConstraints?: boolean;
  /** 日本語説明を含めるか */
  includeDescriptions?: boolean;
  /** メタデータを含めるか */
  includeMetadata?: boolean;
  /** 特定のステージのみ出力 */
  filterByStage?: string[];
}

/**
 * ポートサマリー（プロンプト用簡潔形式）
 */
export interface PortSummary {
  id: string;
  direction: 'in' | 'out';
  dataType: string;
  description?: string;
  constraints?: string;
}

/**
 * Widget定義サマリー（プロンプト用簡潔形式）
 */
export interface WidgetSummary {
  id: string;
  name: string;
  description: string;
  stage: string;
  inputs: PortSummary[];
  outputs: PortSummary[];
}

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * 制約をテキスト形式に変換
 */
function constraintToText(constraint: PortConstraint): string {
  switch (constraint.type) {
    case 'range':
      return `range(${constraint.min ?? '-∞'}, ${constraint.max ?? '∞'})`;
    case 'enum':
      return `enum(${constraint.values?.join(', ') ?? ''})`;
    case 'pattern':
      return `pattern(${constraint.regex ?? ''})`;
    case 'array':
      const parts: string[] = [];
      if (constraint.minLength !== undefined)
        parts.push(`min=${constraint.minLength}`);
      if (constraint.maxLength !== undefined)
        parts.push(`max=${constraint.maxLength}`);
      return `array(${parts.join(', ')})`;
    default:
      return '';
  }
}

/**
 * ポート定義をサマリーに変換
 */
function portToSummary(
  port: ReactivePortDefinition,
  includeConstraints: boolean,
  includeDescriptions: boolean
): PortSummary {
  const summary: PortSummary = {
    id: port.id,
    direction: port.direction,
    dataType: port.dataType,
  };

  if (includeDescriptions && port.description) {
    summary.description = port.description;
  }

  if (includeConstraints && port.constraints && port.constraints.length > 0) {
    summary.constraints = port.constraints.map(constraintToText).join(', ');
  }

  return summary;
}

// =============================================================================
// メイン生成関数
// =============================================================================

/**
 * 全Widget定義をサマリー形式で取得
 */
export function getAllWidgetSummaries(
  options: GeneratorOptions = {}
): WidgetSummary[] {
  const {
    includeConstraints = true,
    includeDescriptions = true,
    filterByStage,
  } = options;

  const definitions = Object.values(WIDGET_DEFINITIONS);

  const filtered = filterByStage
    ? definitions.filter((d) => filterByStage.includes(d.stage))
    : definitions;

  return filtered.map((def) => ({
    id: def.id,
    name: def.name,
    description: def.description,
    stage: def.stage,
    inputs: def.ports.inputs.map((p) =>
      portToSummary(p, includeConstraints, includeDescriptions)
    ),
    outputs: def.ports.outputs.map((p) =>
      portToSummary(p, includeConstraints, includeDescriptions)
    ),
  }));
}

/**
 * 特定のWidgetのサマリーを取得
 */
export function getWidgetSummary(
  widgetId: string,
  options: GeneratorOptions = {}
): WidgetSummary | null {
  const def = WIDGET_DEFINITIONS[widgetId];
  if (!def) return null;

  const { includeConstraints = true, includeDescriptions = true } = options;

  return {
    id: def.id,
    name: def.name,
    description: def.description,
    stage: def.stage,
    inputs: def.ports.inputs.map((p) =>
      portToSummary(p, includeConstraints, includeDescriptions)
    ),
    outputs: def.ports.outputs.map((p) =>
      portToSummary(p, includeConstraints, includeDescriptions)
    ),
  };
}

/**
 * LLMプロンプト用のWidget定義テキストを生成
 *
 * @example
 * ```typescript
 * const prompt = generateWidgetDefinitionsPrompt({
 *   filterByStage: ['converge'],
 *   includeConstraints: true,
 * });
 * console.log(prompt);
 * // ## Available Widgets (converge stage)
 * // ### tradeoff_balance - トレードオフ天秤
 * // Description: 複数の選択肢を重み付けし...
 * // Inputs:
 * //   - items (object[]): 比較対象の項目リスト
 * // Outputs:
 * //   - balance (number): バランススコア（-100〜100）[range(-100, 100)]
 * //   - direction (string): 天秤の傾き方向 [enum(left, right, balanced)]
 * ```
 */
export function generateWidgetDefinitionsPrompt(
  options: GeneratorOptions = {}
): string {
  const summaries = getAllWidgetSummaries(options);
  const { includeMetadata = false, filterByStage } = options;

  const lines: string[] = [];

  // ヘッダー
  if (filterByStage && filterByStage.length > 0) {
    lines.push(`## Available Widgets (${filterByStage.join(', ')} stage)`);
  } else {
    lines.push('## Available Widgets');
  }
  lines.push('');

  for (const widget of summaries) {
    // Widget header
    lines.push(`### ${widget.id} - ${widget.name}`);
    lines.push(`Description: ${widget.description}`);
    lines.push(`Stage: ${widget.stage}`);

    // Inputs
    if (widget.inputs.length > 0) {
      lines.push('Inputs:');
      for (const input of widget.inputs) {
        let line = `  - ${input.id} (${input.dataType})`;
        if (input.description) line += `: ${input.description}`;
        if (input.constraints) line += ` [${input.constraints}]`;
        lines.push(line);
      }
    }

    // Outputs
    if (widget.outputs.length > 0) {
      lines.push('Outputs:');
      for (const output of widget.outputs) {
        let line = `  - ${output.id} (${output.dataType})`;
        if (output.description) line += `: ${output.description}`;
        if (output.constraints) line += ` [${output.constraints}]`;
        lines.push(line);
      }
    }

    // Metadata (optional)
    if (includeMetadata) {
      const def = WIDGET_DEFINITIONS[widget.id];
      if (def?.metadata) {
        lines.push('Metadata:');
        lines.push(`  - timing: ${def.metadata.timing}`);
        lines.push(`  - versatility: ${def.metadata.versatility}`);
        lines.push(
          `  - bottleneck: ${def.metadata.bottleneck.join(', ')}`
        );
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * DependencyGraph生成用のポート接続可能性マップを生成
 *
 * Widget間でどのポートが接続可能かを示すマップを生成。
 * 型互換性に基づいて接続可能なポートペアを列挙。
 */
export function generatePortCompatibilityMap(): Map<
  string,
  { source: string; target: string; dataType: string }[]
> {
  const compatibility = new Map<
    string,
    { source: string; target: string; dataType: string }[]
  >();

  const definitions = Object.values(WIDGET_DEFINITIONS);

  // 全Widgetの出力ポートを収集
  const outputs: { widgetId: string; port: ReactivePortDefinition }[] = [];
  for (const def of definitions) {
    for (const port of def.ports.outputs) {
      outputs.push({ widgetId: def.id, port });
    }
  }

  // 全Widgetの入力ポートを収集
  const inputs: { widgetId: string; port: ReactivePortDefinition }[] = [];
  for (const def of definitions) {
    for (const port of def.ports.inputs) {
      inputs.push({ widgetId: def.id, port });
    }
  }

  // 型互換性チェック（簡易版：完全一致のみ）
  for (const output of outputs) {
    const compatible: { source: string; target: string; dataType: string }[] =
      [];

    for (const input of inputs) {
      // 同じWidget間の接続は除外
      if (output.widgetId === input.widgetId) continue;

      // 型が一致する場合のみ接続可能
      if (output.port.dataType === input.port.dataType) {
        compatible.push({
          source: `${output.widgetId}.${output.port.id}`,
          target: `${input.widgetId}.${input.port.id}`,
          dataType: output.port.dataType,
        });
      }
    }

    if (compatible.length > 0) {
      const key = `${output.widgetId}.${output.port.id}`;
      compatibility.set(key, compatible);
    }
  }

  return compatibility;
}

/**
 * ポート接続可能性をテキスト形式で出力
 */
export function generatePortCompatibilityPrompt(): string {
  const map = generatePortCompatibilityMap();
  const lines: string[] = [];

  lines.push('## Port Compatibility (Source -> Target)');
  lines.push('');

  for (const [source, targets] of map) {
    lines.push(`### ${source}`);
    for (const target of targets) {
      lines.push(`  -> ${target.target} (${target.dataType})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
