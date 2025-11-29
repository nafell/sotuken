# メトリクス設計書

**Version**: 1.0
**最終更新**: 2025-11-28

---

## 1. 概要

Full-Flowデモで収集するLLM呼び出しメトリクスの設計。

### 1.1 目的

- LLM呼び出し効率の可視化
- トークン使用量の追跡
- 処理時間の計測
- 研究データ収集

### 1.2 収集対象

| フェーズ | 操作 | 収集データ |
|---------|------|-----------|
| capture | 診断 | トークン数、処理時間 |
| plan/diverge | UI生成 | トークン数、処理時間 |
| plan/organize | UI生成 | トークン数、処理時間 |
| plan/converge | UI生成 | トークン数、処理時間 |
| plan/summary | UI生成 | トークン数、処理時間 |
| breakdown | タスク分解 | トークン数、処理時間 |

---

## 2. 型定義

### 2.1 Phase / PlanStage

```typescript
type Phase = 'capture' | 'plan' | 'breakdown' | 'complete';
type PlanStage = 'diverge' | 'organize' | 'converge' | 'summary';
```

### 2.2 StageMetrics

個別のLLM呼び出しメトリクス。

```typescript
interface StageMetrics {
  id: string;              // 一意ID
  phase: Phase;            // フェーズ
  stage?: PlanStage;       // Planフェーズのステージ
  operation: string;       // 操作名
  promptTokens: number;    // プロンプトトークン数
  responseTokens: number;  // レスポンストークン数
  totalTokens: number;     // 合計トークン数
  processingTimeMs: number; // 処理時間（ミリ秒）
  model: string;           // 使用モデル名
  timestamp: string;       // ISO 8601タイムスタンプ
  success: boolean;        // 成功フラグ
  error?: string;          // エラーメッセージ
}
```

### 2.3 CumulativeMetrics

累計メトリクス。

```typescript
interface CumulativeMetrics {
  totalCalls: number;         // 総呼び出し回数
  successfulCalls: number;    // 成功回数
  failedCalls: number;        // 失敗回数
  totalPromptTokens: number;  // プロンプトトークン合計
  totalResponseTokens: number; // レスポンストークン合計
  totalTokens: number;        // 総トークン数
  totalTimeMs: number;        // 総処理時間
  avgTimePerCall: number;     // 平均処理時間/呼び出し
}
```

### 2.4 MetricsExport

エクスポート用形式。

```typescript
interface MetricsExport {
  sessionId: string;       // セッションID
  concernText: string;     // 入力された関心事
  entries: StageMetrics[]; // 全エントリ
  cumulative: CumulativeMetrics; // 累計
  exportedAt: string;      // エクスポート日時
}
```

---

## 3. FullFlowMetricsService

### 3.1 概要

シングルトンパターンで実装されたメトリクス収集サービス。

```typescript
class FullFlowMetricsService {
  private metricsLog: StageMetrics[] = [];
  private sessionId: string = '';
  private concernText: string = '';
}

export const fullFlowMetricsService = new FullFlowMetricsService();
```

### 3.2 主要メソッド

#### セッション管理

```typescript
// セッション開始
startSession(sessionId: string, concernText: string): void

// セッションリセット
reset(): void
```

#### エントリ追加

```typescript
// 直接追加
addEntry(entry: Omit<StageMetrics, 'id' | 'timestamp'>): StageMetrics

// APIレスポンスから追加
addFromApiResponse(
  phase: Phase,
  operation: string,
  response: {
    success: boolean;
    generation?: {
      model: string;
      processingTimeMs: number;
      promptTokens: number;
      responseTokens: number;
      totalTokens: number;
    };
    error?: { message: string };
  },
  stage?: PlanStage
): StageMetrics
```

#### データ取得

```typescript
// 全エントリ取得
getAll(): StageMetrics[]
getEntries(): StageMetrics[]  // エイリアス

// フィルタ取得
getByPhase(phase: Phase): StageMetrics[]
getByStage(stage: PlanStage): StageMetrics[]

// 最新エントリ
getLatest(): StageMetrics | null
```

#### 集計

```typescript
// 全体累計
getCumulative(): CumulativeMetrics

// フェーズ別累計
getCumulativeByPhase(phase: Phase): CumulativeMetrics
```

#### エクスポート

```typescript
// オブジェクト形式
export(): MetricsExport

// JSON文字列
exportAsJSON(): string
```

#### デバッグ

```typescript
// コンソール出力
logSummary(): void
```

---

## 4. データフロー

### 4.1 収集フロー

```
LLM API呼び出し
     │
     ▼
APIレスポンス受信
     │
     ▼
fullFlowMetricsService.addFromApiResponse()
     │
     ├── StageMetrics作成
     ├── metricsLogに追加
     └── コンソールログ出力
```

### 4.2 使用例

```typescript
// useFullFlowState.tsでの使用例
const response = await ApiService.generateUISpec(request);

fullFlowMetricsService.addFromApiResponse(
  'plan',           // phase
  'generateUI',     // operation
  response,         // APIレスポンス
  currentStage      // stage (diverge, organize, etc.)
);
```

---

## 5. 計測項目

### 5.1 トークン数

| 項目 | 説明 | 典型値 |
|------|------|--------|
| promptTokens | 入力トークン | 1000-5000 |
| responseTokens | 出力トークン | 500-2000 |
| totalTokens | 合計 | 1500-7000 |

### 5.2 処理時間

| 項目 | 説明 | 典型値 |
|------|------|--------|
| processingTimeMs | サーバー処理時間 | 2000-8000ms |
| avgTimePerCall | 平均処理時間 | 3000-5000ms |

### 5.3 成功率

```typescript
const successRate = cumulative.successfulCalls / cumulative.totalCalls;
// 目標: 95%以上
```

---

## 6. 出力形式

### 6.1 コンソールログ

```
📊 [Metrics] Session started: session_xxx
📊 [Metrics] capture: 1234 tokens, 3456ms
📊 [Metrics] plan/diverge: 2345 tokens, 4567ms
📊 ═══════════════════════════════════════
📊 METRICS SUMMARY
📊 ═══════════════════════════════════════
📊 Session: session_xxx
📊 Total Calls: 5
📊 Success Rate: 5/5
📊 Total Tokens: 8000
📊   - Prompt: 5000
📊   - Response: 3000
📊 Total Time: 20000ms
📊 Avg Time/Call: 4000ms
📊 ═══════════════════════════════════════
```

### 6.2 JSONエクスポート

```json
{
  "sessionId": "session_xxx",
  "concernText": "ユーザーの入力テキスト",
  "entries": [
    {
      "id": "metrics_xxx",
      "phase": "capture",
      "operation": "diagnosis",
      "promptTokens": 1000,
      "responseTokens": 500,
      "totalTokens": 1500,
      "processingTimeMs": 3000,
      "model": "gemini-2.5-mini",
      "timestamp": "2025-11-28T10:00:00.000Z",
      "success": true
    }
  ],
  "cumulative": {
    "totalCalls": 5,
    "successfulCalls": 5,
    "failedCalls": 0,
    "totalPromptTokens": 5000,
    "totalResponseTokens": 3000,
    "totalTokens": 8000,
    "totalTimeMs": 20000,
    "avgTimePerCall": 4000
  },
  "exportedAt": "2025-11-28T10:10:00.000Z"
}
```

---

## 7. 将来拡張

### 7.1 永続化

- IndexedDBへの保存
- サーバーへの送信

### 7.2 可視化

- リアルタイムダッシュボード
- グラフ表示

### 7.3 分析

- セッション間比較
- ボトルネック別の効率分析
- Widget別のトークン消費分析

---

## 8. 関連ファイル

| ファイル | 説明 |
|---------|------|
| `concern-app/src/services/FullFlowMetricsService.ts` | メインサービス |
| `concern-app/src/components/demo/full-flow/types.ts` | 型定義 |
| `concern-app/src/hooks/useFullFlowState.ts` | 使用例 |
| `concern-app/src/pages/dev-demo/FullFlowDemoPage.tsx` | デモページ |
