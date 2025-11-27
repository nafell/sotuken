# API仕様書 V3

**Version**: 3.0
**最終更新**: 2025-11-28

---

## 1. 概要

DSL v3（OODM + DpG + Reactive Widgets）対応のAPIエンドポイント仕様。

### 1.1 基本情報

| 項目 | 値 |
|------|-----|
| ベースURL | `https://sotuken.nafell.dev/api` |
| Content-Type | `application/json` |
| 文字エンコーディング | UTF-8 |

### 1.2 V3エンドポイント一覧

| メソッド | エンドポイント | 目的 |
|---------|---------------|------|
| POST | `/v1/ui/generate-v3` | UISpec v3生成 |
| GET | `/v1/ui/status` | UI生成ステータス |
| GET | `/health` | ヘルスチェック |

---

## 2. UISpec v3生成API

### 2.1 POST /v1/ui/generate-v3

DSL v3用のUISpec生成。12種プリセットWidgetを活用した動的UI生成。

#### リクエスト

```typescript
interface UISpecV3Request {
  sessionId: string;              // セッションID（必須）
  concernText: string;            // 関心事テキスト（必須）
  stage: StageType;               // ステージ（必須）
  factors?: Record<string, any>;  // コンテキスト情報
  options?: {
    restrictToImplementedWidgets?: boolean;  // 実装済みWidgetのみ
    textOnlyMode?: boolean;                  // テキストモード
    previousStageResults?: Record<string, any>; // 前ステージ結果
    bottleneckType?: string;                 // ボトルネックタイプ
  };
}

type StageType = 'diverge' | 'organize' | 'converge' | 'summary';
```

**リクエスト例**:

```json
{
  "sessionId": "session_12345",
  "concernText": "転職を考えているが、現職に残るべきか迷っている",
  "stage": "diverge",
  "options": {
    "restrictToImplementedWidgets": true,
    "bottleneckType": "tooManyOptions"
  }
}
```

#### レスポンス（成功）

```typescript
interface UISpecV3Response {
  success: true;
  uiSpec: UISpecV3;              // 生成されたUISpec
  textSummary?: string;          // テキストモード時のサマリー
  mode: 'widget' | 'text';       // 生成モード
  generation: {
    model: string;               // 使用モデル
    generatedAt: string;         // 生成日時（ISO 8601）
    processingTimeMs: number;    // 処理時間
    promptTokens: number;        // プロンプトトークン
    responseTokens: number;      // レスポンストークン
    totalTokens: number;         // 合計トークン
    retryCount: number;          // リトライ回数
  };
}
```

**レスポンス例**:

```json
{
  "success": true,
  "uiSpec": {
    "version": "3.0",
    "stage": "diverge",
    "widgets": [
      {
        "id": "widget_1",
        "component": "brainstorm_cards",
        "config": {
          "prompt": "転職について思いつくことを自由に書き出してください",
          "maxCards": 10
        }
      }
    ],
    "dependencies": []
  },
  "mode": "widget",
  "generation": {
    "model": "gemini-2.5-mini",
    "generatedAt": "2025-11-28T10:00:00.000Z",
    "processingTimeMs": 3500,
    "promptTokens": 1200,
    "responseTokens": 800,
    "totalTokens": 2000,
    "retryCount": 0
  }
}
```

#### レスポンス（エラー）

```typescript
interface UISpecV3ErrorResponse {
  success: false;
  error: {
    code: string;          // エラーコード
    message: string;       // エラーメッセージ
    retryCount?: number;   // リトライ回数
  };
  metrics?: {
    processingTimeMs: number;
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
  };
}
```

**エラーコード一覧**:

| コード | 説明 | HTTPステータス |
|--------|------|---------------|
| INVALID_REQUEST | リクエスト不正 | 400 |
| GENERATION_FAILED | 生成失敗 | 500 |
| INTERNAL_ERROR | 内部エラー | 500 |

---

## 3. UISpec v3 スキーマ

### 3.1 UISpecV3

```typescript
interface UISpecV3 {
  version: "3.0";
  stage: StageType;
  widgets: WidgetSpec[];
  dependencies?: DependencySpec[];
  theme?: ThemeConfig;
}
```

### 3.2 WidgetSpec

```typescript
interface WidgetSpec {
  id: string;                    // Widget一意ID
  component: WidgetComponentType; // Widgetタイプ
  config?: Record<string, any>;  // Widget設定
  position?: { x: number; y: number }; // 配置位置
}

type WidgetComponentType =
  | 'brainstorm_cards'
  | 'question_card_chain'
  | 'emotion_palette'
  | 'card_sorting'
  | 'dependency_mapping'
  | 'swot_analysis'
  | 'mind_map'
  | 'matrix_placement'
  | 'tradeoff_balance'
  | 'priority_slider_grid'
  | 'timeline_slider'
  | 'structured_summary';
```

### 3.3 DependencySpec

```typescript
interface DependencySpec {
  source: string;      // ソースポートキー (widgetId.portId)
  target: string;      // ターゲットポートキー
  mechanism: 'update' | 'validate';
  relationship: {
    type: 'passthrough' | 'javascript' | 'transform';
    expression?: string;  // JavaScript式
    functionName?: string; // 組み込み変換関数
  };
}
```

---

## 4. ステージ別推奨Widget

### 4.1 ステージとWidget対応

| ステージ | 推奨Widget | 目的 |
|---------|-----------|------|
| diverge | emotion_palette, brainstorm_cards, question_card_chain | 発散・アイデア展開 |
| organize | card_sorting, dependency_mapping, swot_analysis, mind_map | 整理・構造化 |
| converge | matrix_placement, priority_slider_grid, tradeoff_balance, timeline_slider | 収束・優先順位 |
| summary | structured_summary | まとめ・結論 |

### 4.2 ボトルネック別推奨Widget

| ボトルネック | 推奨Widget |
|-------------|-----------|
| tooManyOptions | matrix_placement, priority_slider_grid, card_sorting, tradeoff_balance |
| emotionalBlock | emotion_palette, brainstorm_cards, question_card_chain |
| noStartingPoint | brainstorm_cards, question_card_chain, mind_map |
| entangledProblems | brainstorm_cards, matrix_placement, dependency_mapping, swot_analysis |
| lackOfInformation | brainstorm_cards, question_card_chain, mind_map |
| fearOfDecision | emotion_palette, matrix_placement, tradeoff_balance, timeline_slider |
| fixedPerspective | brainstorm_cards, swot_analysis, mind_map |
| noPrioritization | priority_slider_grid, matrix_placement, card_sorting, timeline_slider |

---

## 5. 既存API（参照用）

### 5.1 設定API

```
GET /v1/config
```

実験条件・重み設定を配布。

### 5.2 イベントAPI

```
POST /v1/events/batch
```

ユーザーイベントをバッチ送信。

### 5.3 ヘルスチェック

```
GET /health
```

**レスポンス**:

```json
{
  "status": "ok",
  "timestamp": "2025-11-28T10:00:00.000Z",
  "service": "concern-app-server",
  "database": {
    "connected": true,
    "latencyMs": 5
  }
}
```

---

## 6. エラーハンドリング

### 6.1 共通エラーレスポンス形式

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}
```

### 6.2 HTTPステータスコード

| ステータス | 説明 |
|-----------|------|
| 200 | 成功 |
| 400 | リクエスト不正 |
| 401 | 認証エラー |
| 500 | サーバーエラー |
| 503 | サービス一時停止 |

---

## 7. 関連ファイル

| ファイル | 説明 |
|---------|------|
| `server/src/routes/ui.ts` | UIルート定義 |
| `server/src/services/UISpecGeneratorV3.ts` | UISpec生成サービス |
| `server/src/services/GeminiService.ts` | LLMサービス |
| `server/src/index.ts` | サーバーエントリポイント |
| `specs/dsl-design/v3/` | DSL v3仕様 |
