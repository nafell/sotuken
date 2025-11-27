/**
 * WidgetDefinitionGenerator.test.ts
 *
 * WidgetDefinitionGeneratorの単体テスト
 */

import { describe, expect, test } from 'bun:test';
import {
  getAllWidgetSummaries,
  getWidgetSummary,
  generateWidgetDefinitionsPrompt,
  generatePortCompatibilityMap,
  generatePortCompatibilityPrompt,
} from '../WidgetDefinitionGenerator';

describe('WidgetDefinitionGenerator', () => {
  describe('getAllWidgetSummaries', () => {
    test('全Widget定義を取得できる', () => {
      const summaries = getAllWidgetSummaries();

      expect(summaries.length).toBeGreaterThan(0);

      // TradeoffBalanceが含まれることを確認
      const tradeoff = summaries.find((s) => s.id === 'tradeoff_balance');
      expect(tradeoff).toBeDefined();
      expect(tradeoff?.name).toBe('トレードオフ天秤');
      expect(tradeoff?.stage).toBe('converge');
    });

    test('ステージでフィルタできる', () => {
      const summaries = getAllWidgetSummaries({
        filterByStage: ['converge'],
      });

      expect(summaries.length).toBeGreaterThan(0);
      summaries.forEach((s) => {
        expect(s.stage).toBe('converge');
      });
    });

    test('制約を含めることができる', () => {
      const summaries = getAllWidgetSummaries({
        includeConstraints: true,
      });

      const tradeoff = summaries.find((s) => s.id === 'tradeoff_balance');
      const balanceOutput = tradeoff?.outputs.find((o) => o.id === 'balance');

      expect(balanceOutput?.constraints).toBeDefined();
      expect(balanceOutput?.constraints).toContain('range');
    });

    test('説明を含めることができる', () => {
      const summaries = getAllWidgetSummaries({
        includeDescriptions: true,
      });

      const tradeoff = summaries.find((s) => s.id === 'tradeoff_balance');
      const balanceOutput = tradeoff?.outputs.find((o) => o.id === 'balance');

      expect(balanceOutput?.description).toBeDefined();
    });
  });

  describe('getWidgetSummary', () => {
    test('特定のWidgetサマリーを取得できる', () => {
      const summary = getWidgetSummary('tradeoff_balance');

      expect(summary).not.toBeNull();
      expect(summary?.id).toBe('tradeoff_balance');
      expect(summary?.inputs.length).toBeGreaterThan(0);
      expect(summary?.outputs.length).toBeGreaterThan(0);
    });

    test('存在しないWidgetはnullを返す', () => {
      const summary = getWidgetSummary('nonexistent_widget');

      expect(summary).toBeNull();
    });
  });

  describe('generateWidgetDefinitionsPrompt', () => {
    test('プロンプトテキストを生成できる', () => {
      const prompt = generateWidgetDefinitionsPrompt();

      expect(prompt).toContain('## Available Widgets');
      expect(prompt).toContain('tradeoff_balance');
      expect(prompt).toContain('トレードオフ天秤');
      expect(prompt).toContain('Inputs:');
      expect(prompt).toContain('Outputs:');
    });

    test('ステージフィルタがヘッダーに反映される', () => {
      const prompt = generateWidgetDefinitionsPrompt({
        filterByStage: ['converge'],
      });

      expect(prompt).toContain('## Available Widgets (converge stage)');
    });

    test('メタデータを含めることができる', () => {
      const prompt = generateWidgetDefinitionsPrompt({
        includeMetadata: true,
      });

      expect(prompt).toContain('Metadata:');
      expect(prompt).toContain('timing:');
      expect(prompt).toContain('versatility:');
    });
  });

  describe('generatePortCompatibilityMap', () => {
    test('ポート互換性マップを生成できる', () => {
      const map = generatePortCompatibilityMap();

      expect(map.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generatePortCompatibilityPrompt', () => {
    test('互換性プロンプトを生成できる', () => {
      const prompt = generatePortCompatibilityPrompt();

      expect(prompt).toContain('## Port Compatibility');
    });
  });
});
