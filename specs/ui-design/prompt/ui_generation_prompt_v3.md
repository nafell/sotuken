# LLMプロンプト仕様書 (V3)

**Version**: 3.0
**最終更新**: 2025-11-28

---

## 1. 概要

DSL v3用のUISpec生成プロンプト仕様。Gemini 2.5 miniを使用してステージ毎のWidget UIを動的生成します。

---

## 2. 生成モード

| モード | 用途 | 出力形式 |
|--------|------|---------|
| widget | 通常ステージ | UISpec v3 JSON |
| text | Widget無しステージ | マークダウンテキスト |

---

## 3. Widgetモード プロンプト

### 3.1 プロンプト構造

```
[Role] あなたはユーザーの悩み解決を支援するUI設計AIです。

[Input]
- ユーザーの悩み: 「{concernText}」
- ステージ: {stage}（{stageDescription}）
- 利用可能Widget: {widgetDescriptions}

[Output Format]
- UISpec v3 JSON

[Instructions]
- 悩みの内容に応じて1〜4個のWidgetを選択
- 各Widgetのconfigを適切に設定
- 日本語のプロンプトや説明を使用
- JSONのみを出力
```

### 3.2 ステージ別Widget選択

| ステージ | 目的 | 利用可能Widget |
|---------|------|----------------|
| diverge | 発散 | emotion_palette, brainstorm_cards, question_card_chain |
| organize | 整理 | card_sorting, dependency_mapping, swot_analysis, mind_map |
| converge | 収束 | matrix_placement, tradeoff_balance, priority_slider_grid, timeline_slider |
| summary | まとめ | structured_summary |

### 3.3 Widget説明（LLMに提供）

```
- emotion_palette: 8種類の感情から選択し強度を調整。config: { prompt: string }
- brainstorm_cards: 自由にアイデアを書き出すカード。config: { prompt: string, maxCards: number }
- question_card_chain: 質問に連鎖的に回答していく。config: { questions: string[] }
- card_sorting: カードをカテゴリに仕分け。config: { categories: string[] }
- dependency_mapping: 要素間の依存関係をマッピング。config: {}
- swot_analysis: SWOT分析の4象限にカード配置。config: {}
- mind_map: マインドマップで関連性を視覚化。config: { centerTopic: string }
- matrix_placement: 2軸マトリックスにアイテム配置。config: { xAxisLabel: string, yAxisLabel: string, maxItems: number }
- tradeoff_balance: トレードオフを天秤で可視化。config: {}
- priority_slider_grid: 複数項目の優先度をスライダーで設定。config: { maxItems: number }
- timeline_slider: 時間軸でイベントを配置。config: { startLabel: string, endLabel: string }
- structured_summary: 構造化された文章でまとめ。config: {}
```

---

## 4. 出力フォーマット (UISpec v3)

```json
{
  "sessionId": "string",
  "stage": "diverge|organize|converge|summary",
  "oodm": {
    "version": "3.0",
    "entities": [],
    "metadata": {}
  },
  "dpg": {
    "dependencies": [],
    "metadata": { "version": "3.0", "generatedAt": number }
  },
  "widgets": [
    {
      "id": "widget_1",
      "component": "widget_type",
      "position": 1,
      "layout": "single",
      "config": {},
      "inputs": [],
      "outputs": [],
      "reactiveBindings": [],
      "metadata": {
        "timing": 0.1-1.0,
        "versatility": 0.1-1.0,
        "bottleneck": ["string"],
        "description": "string"
      }
    }
  ],
  "layout": {
    "type": "sequential",
    "config": { "spacing": "comfortable", "responsive": true }
  },
  "metadata": {
    "generatedAt": number,
    "llmModel": "string",
    "tokenCount": number,
    "version": "3.0"
  }
}
```

---

## 5. テキストモード プロンプト

### 5.1 ステージ別指示

| ステージ | 指示 |
|---------|------|
| diverge | ユーザーの悩みに関連するアイデアや視点を広げてください |
| organize | 情報を整理し、構造化してください。関連要素をグループ化し、関係性を明確にしてください |
| converge | 重要なポイントを絞り込み、優先順位をつけてください |
| summary | 検討内容を総括し、次のアクションにつながる形でまとめてください |

### 5.2 出力形式

```
- 見出しを使って構造化
- 箇条書きで要点を整理
- 具体的で実行可能な内容
- 日本語で回答
```

---

## 6. バリデーション

### 6.1 必須フィールド

- `sessionId`: セッションID
- `stage`: ステージ名
- `widgets`: Widget配列（1個以上）
- `widgets[].component`: Widget種類

### 6.2 Widget検証

- `component`が利用可能Widgetリストに含まれること

---

## 7. リトライ戦略

- 最大リトライ回数: 3
- リトライ条件:
  - LLMエラー
  - JSON解析失敗
  - バリデーション失敗

---

## 8. 関連ファイル

| ファイル | 説明 |
|---------|------|
| `server/src/services/UISpecGeneratorV3.ts` | UISpec生成サービス |
| `server/src/services/GeminiService.ts` | Gemini API連携 |
| `server/src/definitions/widgets.ts` | Widget定義 |

---

## 9. メトリクス収集

各生成で以下を記録:
- `promptTokens`: 入力トークン数
- `responseTokens`: 出力トークン数
- `processingTimeMs`: 処理時間
- `success`: 成功/失敗
- `retryCount`: リトライ回数
