/**
 * case_05 の試行データ（modelConfig A/B/C/D）を抜き出すスクリプト
 *
 * Usage:
 *   bun docs/research/extract_case05.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_PATH = join(import.meta.dir, 'DATA-FINISH/result-full-json-2057.json');
const OUT_PATH  = join(import.meta.dir, 'DATA-FINISH/case_05_abcd.json');

const raw = readFileSync(DATA_PATH, 'utf-8');
const data = JSON.parse(raw);

const TARGET_INPUT  = 'case_05';
const TARGET_MODELS = new Set(['A', 'B', 'C', 'D']);

const filtered = data.trialLogs.filter(
  (t: { inputId: string; modelConfig: string }) =>
    t.inputId === TARGET_INPUT && TARGET_MODELS.has(t.modelConfig)
);

// stage 昇順 → modelConfig 昇順で整列
filtered.sort((a: { stage: number; modelConfig: string }, b: { stage: number; modelConfig: string }) =>
  a.stage !== b.stage ? a.stage - b.stage : a.modelConfig.localeCompare(b.modelConfig)
);

console.log(`Matched entries: ${filtered.length}`);

// stage × modelConfig のクロス集計
const summary: Record<number, string[]> = {};
for (const t of filtered) {
  (summary[t.stage] ??= []).push(t.modelConfig);
}
for (const [stage, models] of Object.entries(summary)) {
  console.log(`  Stage ${stage}: modelConfig = [${models.join(', ')}]`);
}

const output = {
  extractedAt: new Date().toISOString(),
  sourceFile: 'result-full-json-2057.json',
  filter: { inputId: TARGET_INPUT, modelConfigs: [...TARGET_MODELS] },
  count: filtered.length,
  trialLogs: filtered,
};

writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
console.log(`\nSaved to: ${OUT_PATH}`);
