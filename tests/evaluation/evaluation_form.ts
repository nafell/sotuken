/**
 * Evaluation Form - 専門家評価フォーム
 * Phase 4 タスク3.1
 *
 * 自動生成されたUIフローに対して専門家が評価スコアを付与するための
 * インタラクティブなCLIツール
 *
 * 使用方法:
 *   bun run tests/evaluation/evaluation_form.ts [caseId]
 *   bun run tests/evaluation/evaluation_form.ts case1_selection_overload
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

// ============================================================
// 型定義
// ============================================================

interface EvaluationScore {
  bottleneckDiagnosis: number; // 1-5
  componentSelection: number; // 1-5
  flowLogic: number; // 1-5
  reactivityDesign: number; // 1-5
  overallScore: number; // 1-5
  comments: string;
  evaluatorId: string;
  evaluatedAt: string;
}

interface EvaluationResult {
  testCase: any;
  uiSpec: any;
  metrics: any;
  rawResponse: any;
  timestamp: string;
}

interface ScoredResult extends EvaluationResult {
  expertScore?: EvaluationScore;
}

// ============================================================
// 設定
// ============================================================

const RESULTS_DIR = join(import.meta.dir, 'results');
const SCORED_DIR = join(import.meta.dir, 'results', 'scored');

// ============================================================
// ユーティリティ
// ============================================================

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    const { mkdirSync } = require('fs');
    mkdirSync(dir, { recursive: true });
  }
}

function loadResult(caseId: string): EvaluationResult | null {
  const filepath = join(RESULTS_DIR, `${caseId}_result.json`);
  if (!existsSync(filepath)) {
    console.error(`❌ 結果ファイルが見つかりません: ${filepath}`);
    return null;
  }
  const content = readFileSync(filepath, 'utf-8');
  return JSON.parse(content);
}

function saveScoredResult(caseId: string, result: ScoredResult): void {
  ensureDir(SCORED_DIR);
  const filepath = join(SCORED_DIR, `${caseId}_scored.json`);
  writeFileSync(filepath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\n📁 評価結果保存: ${filepath}`);
}

function listAvailableResults(): string[] {
  if (!existsSync(RESULTS_DIR)) {
    return [];
  }
  return readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith('_result.json') && !f.startsWith('summary'))
    .map((f) => f.replace('_result.json', ''));
}

// ============================================================
// インタラクティブ入力
// ============================================================

function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function promptScore(
  rl: readline.Interface,
  label: string,
  description: string
): Promise<number> {
  console.log(`\n📊 ${label}`);
  console.log(`   ${description}`);
  console.log('   1: 全く不適切  2: 不適切  3: 普通  4: 適切  5: 非常に適切');

  while (true) {
    const input = await prompt(rl, '   スコア (1-5): ');
    const score = parseInt(input, 10);
    if (score >= 1 && score <= 5) {
      return score;
    }
    console.log('   ⚠️  1から5の数値を入力してください');
  }
}

// ============================================================
// 評価表示
// ============================================================

function displayCaseInfo(result: EvaluationResult): void {
  const { testCase, uiSpec, metrics } = result;

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  ケース: ${testCase.id}`);
  console.log('═══════════════════════════════════════════════════════════════');

  console.log(`\n📝 悩み内容:`);
  console.log(`   「${testCase.concern}」`);

  console.log(`\n🏷️  カテゴリ: ${testCase.category}`);
  console.log(`📌 優先度: ${testCase.priority}`);

  console.log(`\n🎯 期待されるボトルネック:`);
  testCase.expectedBottleneck.forEach((b: string) => console.log(`   - ${b}`));

  console.log(`\n📦 期待されるコンポーネント:`);
  testCase.expectedComponents.forEach((c: string) => console.log(`   - ${c}`));

  if (testCase.hasReactivity) {
    console.log(`\n🔗 リアクティビティ: ${testCase.reactivityType || 'あり'}`);
  }

  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('  生成結果');
  console.log('───────────────────────────────────────────────────────────────');

  if (!uiSpec) {
    console.log('\n❌ UISpec生成失敗');
    console.log(`   エラー: ${metrics.errors.join(', ')}`);
    return;
  }

  console.log(`\n⏱️  生成時間: ${metrics.generationTime}ms`);
  console.log(`📊 トークン数: ${metrics.tokenUsage.total} (prompt: ${metrics.tokenUsage.prompt}, response: ${metrics.tokenUsage.response})`);
  console.log(`✅ 構文検証: ${metrics.syntaxValid ? '成功' : '失敗'}`);

  console.log(`\n📦 生成されたWidget (${metrics.widgetCount}個):`);
  if (uiSpec.widgets && Array.isArray(uiSpec.widgets)) {
    uiSpec.widgets.forEach((widget: any, index: number) => {
      console.log(`   ${index + 1}. ${widget.component} (id: ${widget.id})`);
      if (widget.config?.prompt) {
        console.log(`      プロンプト: "${widget.config.prompt.slice(0, 50)}..."`);
      }
    });
  }

  console.log(`\n📋 コンポーネント検証:`);
  console.log(`   一致: ${metrics.validationResults.matchedComponents.join(', ') || 'なし'}`);
  console.log(`   不足: ${metrics.validationResults.missingComponents.join(', ') || 'なし'}`);
  console.log(`   追加: ${metrics.validationResults.extraComponents.join(', ') || 'なし'}`);

  if (testCase.hasReactivity) {
    console.log(`\n🔗 リアクティビティ検証: ${metrics.hasExpectedReactivity ? '✓ 検出' : '✗ 未検出'}`);

    if (uiSpec.dpg?.dependencies?.length > 0) {
      console.log('   依存関係:');
      uiSpec.dpg.dependencies.forEach((dep: any) => {
        console.log(`     ${dep.source} → ${dep.target}`);
      });
    }
  }

  // 評価基準の表示
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('  評価基準');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`\n📋 ボトルネック診断: ${testCase.evaluationCriteria.bottleneckDiagnosis}`);
  console.log(`📋 コンポーネント選択: ${testCase.evaluationCriteria.componentSelection}`);
  if (testCase.evaluationCriteria.flowLogic) {
    console.log(`📋 フロー構成: ${testCase.evaluationCriteria.flowLogic}`);
  }
  if (testCase.evaluationCriteria.reactivityDesign) {
    console.log(`📋 リアクティビティ設計: ${testCase.evaluationCriteria.reactivityDesign}`);
  }
}

// ============================================================
// 評価プロセス
// ============================================================

async function evaluateCase(caseId: string): Promise<void> {
  const result = loadResult(caseId);
  if (!result) {
    return;
  }

  displayCaseInfo(result);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  専門家評価入力');
  console.log('═══════════════════════════════════════════════════════════════');

  const rl = createReadline();

  try {
    // 評価者ID
    const evaluatorId = await prompt(rl, '\n👤 評価者ID: ');

    // 各項目のスコア
    const bottleneckDiagnosis = await promptScore(
      rl,
      'ボトルネック診断',
      'ユーザーの悩みに対するボトルネックの認識は正確か'
    );

    const componentSelection = await promptScore(
      rl,
      'コンポーネント選択',
      '悩み解決に適切なWidgetが選ばれているか'
    );

    const flowLogic = await promptScore(
      rl,
      'フロー構成',
      'Widget間のフローは論理的か（発散→整理→収束の流れ）'
    );

    let reactivityDesign = 3;
    if (result.testCase.hasReactivity) {
      reactivityDesign = await promptScore(
        rl,
        'リアクティビティ設計',
        'Widget間のリアクティブな連携は効果的か'
      );
    }

    const overallScore = await promptScore(
      rl,
      '総合評価',
      '全体として、このUIフローはユーザーの問題解決に役立つか'
    );

    console.log('\n📝 コメント（任意、Enterで終了）:');
    const comments = await prompt(rl, '   ');

    // スコア構築
    const score: EvaluationScore = {
      bottleneckDiagnosis,
      componentSelection,
      flowLogic,
      reactivityDesign,
      overallScore,
      comments,
      evaluatorId,
      evaluatedAt: new Date().toISOString(),
    };

    // 結果表示
    console.log('\n───────────────────────────────────────────────────────────────');
    console.log('  評価結果');
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`   ボトルネック診断: ${bottleneckDiagnosis}/5`);
    console.log(`   コンポーネント選択: ${componentSelection}/5`);
    console.log(`   フロー構成: ${flowLogic}/5`);
    if (result.testCase.hasReactivity) {
      console.log(`   リアクティビティ設計: ${reactivityDesign}/5`);
    }
    console.log(`   総合評価: ${overallScore}/5`);

    // 保存確認
    const confirm = await prompt(rl, '\n💾 この評価を保存しますか？ (y/n): ');
    if (confirm.toLowerCase() === 'y') {
      const scoredResult: ScoredResult = {
        ...result,
        expertScore: score,
      };
      saveScoredResult(caseId, scoredResult);
      console.log('✅ 評価が保存されました');
    } else {
      console.log('⚠️  評価はキャンセルされました');
    }
  } finally {
    rl.close();
  }
}

async function listCases(): Promise<void> {
  const cases = listAvailableResults();

  if (cases.length === 0) {
    console.log('❌ 評価可能な結果ファイルがありません');
    console.log('   まずexpert_evaluation.tsを実行してください');
    return;
  }

  console.log('\n📋 評価可能なケース:');
  cases.forEach((caseId) => {
    const scoredPath = join(SCORED_DIR, `${caseId}_scored.json`);
    const scored = existsSync(scoredPath) ? '✓ 評価済み' : '  未評価';
    console.log(`   ${scored} ${caseId}`);
  });

  console.log(`\n使用方法: bun run tests/evaluation/evaluation_form.ts <caseId>`);
}

// ============================================================
// エントリーポイント
// ============================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--list') {
    await listCases();
    return;
  }

  const caseId = args[0];
  await evaluateCase(caseId);
}

main().catch(console.error);
