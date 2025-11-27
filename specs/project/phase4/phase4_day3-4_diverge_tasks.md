# Phase 4 Day 3-4: DSL v3 検証・計測タスク計画

**作成日**: 2025-01-26
**目的**: DSL v3と動的UIシステムの動作検証・計測
**アプローチ**: アジャイル的（Widget積み上げより検証優先）

---

## 概要

Widget実装の積み上げではなく、DSL v3と動的UIシステムの動作検証・計測を優先するアジャイル的アプローチ。

**検証対象**: 実装済み4種Widget（EmotionPalette, BrainstormCards, MatrixPlacement, PrioritySliderGrid）

## 開発用ルーティング構造

```
/dev-demo                    # 開発用デモ親ルート
  ├── /widget-p4d3           # ステップ1: Widget表示検証
  └── /e2e-p4d3              # ステップ3: E2E統合検証
```

**注意**: これらは開発・検証用のルートであり、本番には含めない

---

## 実装ステップ

### ステップ1: DSL→Widget表示の検証

**目標**: サンプルDSL v3 JSONからWidgetを正しく表示できることを確認

| ファイル | 種別 | 説明 |
|----------|------|------|
| `concern-app/src/services/ui-generation/UIRendererV3.tsx` | 新規 | v3 Widget対応レンダラー |
| `concern-app/src/pages/dev-demo/WidgetP4D3Page.tsx` | 新規 | Widget表示検証ページ |
| `concern-app/src/__fixtures__/sample-uispec-v3.json` | 新規 | サンプルDSL JSON |
| `concern-app/src/App.tsx` | 修正 | /dev-demo/* ルート追加 |

**UIRendererV3の主要ロジック**:
- UISpec.widgetsをposition順にソート
- widget.componentに基づいてReactコンポーネントを選択
- onUpdate/onCompleteコールバックを各Widgetに接続

**検証手順**:
1. `cd concern-app && bun run dev`
2. `http://localhost:5173/dev-demo/widget-p4d3`にアクセス
3. 4種Widgetの表示・操作を確認

**成功基準**:
- [ ] 4種全てのWidgetがレンダリングされる
- [ ] Widget操作結果がonUpdate経由で取得できる

---

### ステップ2: 計測機能の実装

**目標**: トークン使用量とレスポンス時間を計測・記録

| ファイル | 種別 | 説明 |
|----------|------|------|
| `server/src/services/GeminiService.ts` | 修正 | トークン計測追加（usageMetadata抽出） |
| `server/src/types/metrics.types.ts` | 新規 | LLMMetrics型定義 |
| `server/src/utils/metricsLogger.ts` | 新規 | 計測ログユーティリティ |

**GeminiService修正内容**:
```typescript
// レスポンス型を拡張
export interface GeminiResponse {
  success: boolean;
  data?: any;
  error?: string;
  metrics?: {
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
    processingTimeMs: number;
  };
}
```

**計測ポイント**:
- `response.usageMetadata.promptTokenCount`
- `response.usageMetadata.candidatesTokenCount`
- `Date.now()`による処理時間計測

**成功基準**:
- [ ] Gemini API呼び出しごとにトークン数が記録される
- [ ] 処理時間がミリ秒単位で計測される

---

### ステップ3: E2E統合

**目標**: LLM生成UISpecをフロントエンドに配信し、手動検証できる状態にする

| ファイル | 種別 | 説明 |
|----------|------|------|
| `server/src/services/UISpecGeneratorV3.ts` | 新規 | DSL v3生成サービス |
| `server/src/routes/ui.ts` | 修正 | `/v1/ui/generate-v3`エンドポイント追加 |
| `concern-app/src/services/api/ApiService.ts` | 修正 | generateUIV3メソッド追加 |
| `concern-app/src/pages/dev-demo/E2EP4D3Page.tsx` | 新規 | E2E検証ページ |

**APIレスポンス形式**:
```json
{
  "sessionId": "string",
  "generationId": "string",
  "uiSpec": { /* UISpec v3 */ },
  "generation": {
    "model": "gemini-2.5-flash-lite",
    "processingTimeMs": 1234,
    "promptTokens": 500,
    "responseTokens": 800
  }
}
```

**手動E2E検証テストケース**:

| # | 入力 | ステージ | 期待Widget |
|---|------|----------|------------|
| 1 | 仕事のプレゼンが不安で眠れない | diverge | emotion_palette, brainstorm_cards |
| 2 | タスクが多すぎて整理できない | organize | matrix_placement |
| 3 | どの選択肢を選ぶか決められない | converge | priority_slider_grid |

**計測データ記録フォーマット**:
```
| # | 関心事 | ステージ | Prompt Tokens | Response Tokens | 処理時間(ms) | Widget数 |
```

**成功基準**:
- [ ] `/v1/ui/generate-v3`がUISpecを生成できる
- [ ] 計測データがフロントエンドに表示される
- [ ] 手動検証で4種Widget全てが動作する

---

## Critical Files

1. **`server/src/services/GeminiService.ts`** - トークン計測の基盤
2. **`concern-app/src/services/ui-generation/UIRendererV3.tsx`** - Widget描画の中核
3. **`server/src/services/UISpecGeneratorV3.ts`** - LLMプロンプト・生成ロジック
4. **`server/src/routes/ui.ts`** - APIエントリポイント
5. **`concern-app/src/types/widget.types.ts`** - 既存型定義（参照）
6. **`concern-app/src/App.tsx`** - ルーティング追加（/dev-demo/*）

## 新規作成ファイル一覧

```
concern-app/
├── src/
│   ├── services/ui-generation/
│   │   └── UIRendererV3.tsx          # ステップ1
│   ├── pages/dev-demo/
│   │   ├── WidgetP4D3Page.tsx        # ステップ1
│   │   └── E2EP4D3Page.tsx           # ステップ3
│   └── __fixtures__/
│       └── sample-uispec-v3.json     # ステップ1
server/
├── src/
│   ├── services/
│   │   └── UISpecGeneratorV3.ts      # ステップ3
│   ├── types/
│   │   └── metrics.types.ts          # ステップ2
│   └── utils/
│       └── metricsLogger.ts          # ステップ2
```

## リスク・注意事項

1. **usageMetadata**: Gemini 2.5 flash-liteで正しく返されるか要確認
2. **型の整合性**: UISpec→WidgetSpecObject変換ロジックに注意
3. **エラーハンドリング**: LLM失敗時のフォールバック処理

---

**作成者**: TK
