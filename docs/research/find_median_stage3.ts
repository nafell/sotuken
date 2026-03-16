/**
 * Stage 3 (UISpec Generation) の inputTokens が中央値付近の5試行を列挙するスクリプト
 *
 * Usage:
 *   bun docs/research/find_median_stage3.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const DATA_PATH = join(import.meta.dir, 'DATA-FINISH/result-full-json-2057.json');

// --- 型定義 ---
interface TrialLog {
  id: string;
  trialNumber: number;
  inputId: string;
  modelConfig: string;
  stage: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  dslErrors: string[] | null;
  runtimeError: boolean;
}

interface ExportData {
  trialLogs: TrialLog[];
}

// --- データ読み込み ---
console.log('Loading JSON...');
const raw = readFileSync(DATA_PATH, 'utf-8');
const data: ExportData = JSON.parse(raw);
console.log(`Total trial logs: ${data.trialLogs.length}`);

// --- Stage 3 のみ抽出 ---
const stage3Raw = data.trialLogs.filter(t => t.stage === 3);
const stage3 = stage3Raw.filter(t => t.inputTokens > 0);
console.log(`Stage 3 entries: ${stage3Raw.length} (excluding inputTokens=0: ${stage3.length})`);

// --- inputTokens でソートして中央値を求める ---
const sorted = [...stage3].sort((a, b) => a.inputTokens - b.inputTokens);

const medianIdx = Math.floor(sorted.length / 2);
const medianTokens = sorted.length % 2 === 1
  ? sorted[medianIdx].inputTokens
  : (sorted[medianIdx - 1].inputTokens + sorted[medianIdx].inputTokens) / 2;

console.log(`\ninputTokens stats (Stage 3):`);
console.log(`  min    : ${sorted[0].inputTokens}`);
console.log(`  median : ${medianTokens}`);
console.log(`  max    : ${sorted[sorted.length - 1].inputTokens}`);

// inputTokens の分布確認用パーセンタイル
const p25 = sorted[Math.floor(sorted.length * 0.25)].inputTokens;
const p75 = sorted[Math.floor(sorted.length * 0.75)].inputTokens;
console.log(`  p25    : ${p25}`);
console.log(`  p75    : ${p75}`);

// --- 中央値に最も近い5試行を選ぶ ---
// 各エントリに「中央値との距離」を付けてソート
const withDistance = stage3.map(t => ({
  ...t,
  distFromMedian: Math.abs(t.inputTokens - medianTokens),
}));

withDistance.sort((a, b) => a.distFromMedian - b.distFromMedian);

const top5 = withDistance.slice(0, 5);

console.log('\n--- 中央値付近の5試行 (Stage 3) ---');
console.log(
  'rank | inputId      | modelConfig | trialNumber | inputTokens | distFromMedian | dslErrors'
);
console.log('-'.repeat(90));

top5.forEach((t, i) => {
  const errors = t.dslErrors ? t.dslErrors.join(',') : 'none';
  console.log(
    `  ${i + 1}  | ${t.inputId.padEnd(12)} | ${t.modelConfig.padEnd(11)} | ${String(t.trialNumber).padEnd(11)} | ${String(t.inputTokens).padEnd(11)} | ${String(t.distFromMedian).padEnd(14)} | ${errors}`
  );
});

console.log('\n--- inputId 一覧 ---');
top5.forEach(t => console.log(`  ${t.inputId}  (trial #${t.trialNumber}, model=${t.modelConfig}, tokens=${t.inputTokens})`));
