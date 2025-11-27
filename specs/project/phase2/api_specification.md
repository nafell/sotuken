# Phase 2 API仕様書

**作成日**: 2025年10月18日  
**ベースURL**: `http://localhost:3000/v1`

---

## 📋 API一覧

### Phase 1実装済み（Phase 2で使用）
- `POST /v1/thought/generate` - 思考整理UI生成
- `POST /v1/task/rank` - タスク推奨

### Phase 2新規実装
- `GET /v1/config` - 実験条件・設定配布 ⭐️
- `POST /v1/events/batch` - イベントログバッチ送信 ⭐️
- `GET /v1/metrics/engagement` - 着手率取得 ⭐️
- `POST /v1/tasks/sync` - タスク同期
- `POST /v1/admin/condition/override` - 実験条件手動上書き（デバッグ用）

---

## 🆕 1. GET /v1/config（実験条件・設定配布）⭐️

### 概要
ユーザーの実験条件（dynamic_ui / static_ui）とアプリ設定を配布する。

### リクエスト

```http
GET /v1/config HTTP/1.1
Host: localhost:3000
X-User-ID: user_abc123def456
```

**ヘッダー**:
- `X-User-ID` (required): 匿名ユーザーID

**パラメータ**: なし

### レスポンス（成功時）

```json
{
  "configVersion": "v1.0",
  "experimentId": "exp_2025_10",
  "experimentAssignment": {
    "condition": "dynamic_ui",
    "assignedAt": "2025-10-18T10:00:00Z",
    "method": "hash"
  },
  "taskRecommendation": {
    "weights": {
      "importance": 0.4,
      "urgency": 0.3,
      "staleness": 0.2,
      "contextFit": 0.1
    },
    "logisticParams": {
      "urgency": { "mid": 48, "k": 0.1 },
      "staleness": { "mid": 3, "k": 1.5 }
    }
  },
  "uiNoveltyPolicy": {
    "dynamic_ui": {
      "enabled": true,
      "noveltyLevel": "low",
      "model": "gemini-1.5-pro"
    },
    "static_ui": {
      "enabled": true,
      "templateVersion": "v1.0"
    }
  },
  "features": {
    "sensorsEnabled": false,
    "offlineMode": false
  }
}
```

### レスポンス（エラー時）

```json
{
  "error": {
    "code": "MISSING_USER_ID",
    "message": "X-User-ID header is required"
  }
}
```

### 実装例

```typescript
// /server/src/routes/config.ts
import { Hono } from 'hono';
import { ExperimentService } from '../services/ExperimentService';

const config = new Hono();
const experimentService = new ExperimentService();

config.get('/', async (c) => {
  const userId = c.req.header('X-User-ID');
  
  if (!userId) {
    return c.json({ error: { code: 'MISSING_USER_ID', message: 'X-User-ID header is required' }}, 400);
  }
  
  try {
    // ユーザーの実験条件を取得・割り当て
    const condition = await experimentService.getOrAssignCondition(userId);
    
    // 設定を構築
    const config = {
      configVersion: 'v1.0',
      experimentId: 'exp_2025_10',
      experimentAssignment: {
        condition: condition.condition,
        assignedAt: condition.assignedAt.toISOString(),
        method: 'hash'
      },
      taskRecommendation: {
        weights: {
          importance: 0.4,
          urgency: 0.3,
          staleness: 0.2,
          contextFit: 0.1
        },
        logisticParams: {
          urgency: { mid: 48, k: 0.1 },
          staleness: { mid: 3, k: 1.5 }
        }
      },
      uiNoveltyPolicy: {
        dynamic_ui: {
          enabled: true,
          noveltyLevel: 'low',
          model: 'gemini-1.5-pro'
        },
        static_ui: {
          enabled: true,
          templateVersion: 'v1.0'
        }
      },
      features: {
        sensorsEnabled: false,
        offlineMode: false
      }
    };
    
    return c.json(config);
    
  } catch (error) {
    console.error('Config API error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch config' }}, 500);
  }
});

export default config;
```

---

## 🆕 2. POST /v1/events/batch（イベントログバッチ送信）⭐️

### 概要
クライアント側でバッファリングしたイベントログをバッチ送信する。

### リクエスト

```http
POST /v1/events/batch HTTP/1.1
Host: localhost:3000
Content-Type: application/json
X-User-ID: user_abc123def456

{
  "batchId": "batch_xyz789",
  "events": [
    {
      "eventId": "evt_001",
      "eventType": "task_recommendation_shown",
      "timestamp": "2025-10-18T10:00:00Z",
      "sessionId": "sess_123",
      "screenId": "task_recommendation",
      "metadata": {
        "uiCondition": "dynamic_ui",
        "taskId": "task_456",
        "taskVariant": "task_card",
        "saliency": 2,
        "score": 0.85,
        "generationId": "gen_789"
      }
    },
    {
      "eventId": "evt_002",
      "eventType": "task_action_started",
      "timestamp": "2025-10-18T10:00:12Z",
      "sessionId": "sess_123",
      "screenId": "task_recommendation",
      "metadata": {
        "uiCondition": "dynamic_ui",
        "taskId": "task_456",
        "timeToActionSec": 12.5
      }
    },
    {
      "eventId": "evt_003",
      "eventType": "task_action_completed",
      "timestamp": "2025-10-18T10:25:00Z",
      "sessionId": "sess_123",
      "screenId": "task_recommendation",
      "metadata": {
        "taskId": "task_456",
        "durationMin": 25,
        "clarityImprovement": 3
      }
    }
  ]
}
```

**ヘッダー**:
- `X-User-ID` (required): 匿名ユーザーID

**ボディ**:
- `batchId` (string): バッチID（クライアント生成）
- `events` (array): イベント配列

### レスポンス（成功時）

```json
{
  "success": true,
  "batchId": "batch_xyz789",
  "receivedCount": 3,
  "processedCount": 3,
  "failedCount": 0,
  "timestamp": "2025-10-18T10:25:01Z"
}
```

### レスポンス（部分失敗時）

```json
{
  "success": true,
  "batchId": "batch_xyz789",
  "receivedCount": 3,
  "processedCount": 2,
  "failedCount": 1,
  "errors": [
    {
      "eventId": "evt_002",
      "error": "Invalid metadata format"
    }
  ],
  "timestamp": "2025-10-18T10:25:01Z"
}
```

### 実装例

```typescript
// /server/src/routes/events.ts
import { Hono } from 'hono';
import { EventLogService } from '../services/EventLogService';

const events = new Hono();
const eventLogService = new EventLogService();

events.post('/batch', async (c) => {
  const userId = c.req.header('X-User-ID');
  
  if (!userId) {
    return c.json({ error: { code: 'MISSING_USER_ID', message: 'X-User-ID header is required' }}, 400);
  }
  
  try {
    const { batchId, events: eventList } = await c.req.json();
    
    if (!Array.isArray(eventList) || eventList.length === 0) {
      return c.json({ error: { code: 'INVALID_BATCH', message: 'events must be a non-empty array' }}, 400);
    }
    
    // イベントを処理
    const results = await eventLogService.processBatch(userId, batchId, eventList);
    
    return c.json({
      success: true,
      batchId,
      receivedCount: eventList.length,
      processedCount: results.processedCount,
      failedCount: results.failedCount,
      errors: results.errors,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Events batch API error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to process events' }}, 500);
  }
});

export default events;
```

---

## 🆕 3. GET /v1/metrics/engagement（着手率取得）⭐️

### 概要
条件別の着手率とスッキリ度を計算して返す。研究の主要測定指標。

### リクエスト

```http
GET /v1/metrics/engagement?condition=dynamic_ui&startDate=2025-10-01&endDate=2025-10-18 HTTP/1.1
Host: localhost:3000
X-User-ID: user_abc123def456
```

**ヘッダー**:
- `X-User-ID` (optional): 特定ユーザーのメトリクスを取得（省略時は全ユーザー）

**パラメータ**:
- `condition` (optional): 'dynamic_ui' | 'static_ui' | 'all'（デフォルト: 'all'）
- `startDate` (optional): 集計開始日（ISO 8601形式）
- `endDate` (optional): 集計終了日（ISO 8601形式）

### レスポンス（成功時）

```json
{
  "period": {
    "startDate": "2025-10-01T00:00:00Z",
    "endDate": "2025-10-18T23:59:59Z"
  },
  "overall": {
    "engagementRate": 0.68,
    "averageClarityImprovement": 2.4,
    "totalRecommendations": 150,
    "totalActions": 102,
    "totalCompletions": 95
  },
  "byCondition": {
    "dynamic_ui": {
      "engagementRate": 0.75,
      "averageClarityImprovement": 2.6,
      "totalRecommendations": 80,
      "totalActions": 60,
      "totalCompletions": 58
    },
    "static_ui": {
      "engagementRate": 0.60,
      "averageClarityImprovement": 2.2,
      "totalRecommendations": 70,
      "totalActions": 42,
      "totalCompletions": 37
    }
  },
  "byVariant": {
    "task_card": {
      "engagementRate": 0.80,
      "count": 50
    },
    "micro_step_card": {
      "engagementRate": 0.72,
      "count": 25
    },
    "prepare_step_card": {
      "engagementRate": 0.55,
      "count": 5
    }
  },
  "bySaliency": {
    "0": { "engagementRate": 0.50, "count": 10 },
    "1": { "engagementRate": 0.60, "count": 15 },
    "2": { "engagementRate": 0.70, "count": 50 },
    "3": { "engagementRate": 0.90, "count": 5 }
  },
  "timestamp": "2025-10-18T12:00:00Z"
}
```

### 実装例

```typescript
// /server/src/routes/metrics.ts
import { Hono } from 'hono';
import { MetricsService } from '../services/MetricsService';

const metrics = new Hono();
const metricsService = new MetricsService();

metrics.get('/engagement', async (c) => {
  const userId = c.req.header('X-User-ID'); // optional
  const condition = c.req.query('condition') || 'all';
  const startDate = c.req.query('startDate') ? new Date(c.req.query('startDate')!) : undefined;
  const endDate = c.req.query('endDate') ? new Date(c.req.query('endDate')!) : undefined;
  
  try {
    const result = await metricsService.calculateEngagementMetrics({
      userId,
      condition: condition as 'dynamic_ui' | 'static_ui' | 'all',
      startDate,
      endDate
    });
    
    return c.json(result);
    
  } catch (error) {
    console.error('Metrics API error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to calculate metrics' }}, 500);
  }
});

export default metrics;
```

---

## 🔄 4. POST /v1/tasks/sync（タスク同期）

### 概要
クライアント側のタスクをサーバーに同期する。

### リクエスト

```http
POST /v1/tasks/sync HTTP/1.1
Host: localhost:3000
Content-Type: application/json
X-User-ID: user_abc123def456

{
  "tasks": [
    {
      "taskId": "task_001",
      "title": "論文を読む",
      "importance": 0.8,
      "urgency": 0.7,
      "status": "active",
      "createdAt": "2025-10-18T10:00:00Z",
      "updatedAt": "2025-10-18T10:00:00Z"
    }
  ]
}
```

### レスポンス（成功時）

```json
{
  "success": true,
  "syncedCount": 1,
  "conflicts": [],
  "timestamp": "2025-10-18T12:00:00Z"
}
```

---

## 🔧 5. POST /v1/admin/condition/override（実験条件手動上書き）

### 概要
デバッグ用に実験条件を手動上書きする。

### リクエスト

```http
POST /v1/admin/condition/override HTTP/1.1
Host: localhost:3000
Content-Type: application/json
X-Admin-Key: debug_key_12345

{
  "userId": "user_abc123def456",
  "condition": "static_ui",
  "reason": "Debug testing"
}
```

**ヘッダー**:
- `X-Admin-Key` (required): 管理者キー（開発環境のみ）

**ボディ**:
- `userId` (string): 対象ユーザーID
- `condition` (string): 'dynamic_ui' | 'static_ui'
- `reason` (string): 上書き理由（ログ用）

### レスポンス（成功時）

```json
{
  "success": true,
  "userId": "user_abc123def456",
  "previousCondition": "dynamic_ui",
  "newCondition": "static_ui",
  "timestamp": "2025-10-18T12:00:00Z"
}
```

---

## ♻️ Phase 1実装済みAPI（Phase 2で使用）

### POST /v1/thought/generate

Phase 1Aで実装済み。思考整理フロー（capture/plan/breakdown）で使用。

**詳細**: `/specs/project/task/PHASE1_HANDOVER_REPORT.md` 参照

### POST /v1/task/rank

Phase 1Bで実装済み。タスク推奨システムで使用。

**詳細**: `/specs/project/task/PHASE1B_COMPLETION_REPORT.md` 参照

---

## 🔐 認証・セキュリティ

### 匿名ユーザーID（X-User-ID）

```typescript
// クライアント側（ApiService.ts）
class ApiService {
  private anonymousUserId: string;
  
  private generateAnonymousUserId(): string {
    const stored = localStorage.getItem('concern_app_anonymous_user_id');
    if (stored) return stored;
    
    // 新規生成
    const newId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    localStorage.setItem('concern_app_anonymous_user_id', newId);
    return newId;
  }
  
  // 全API呼び出しでヘッダーに付与
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'X-User-ID': this.anonymousUserId
      }
    });
  }
}
```

### 管理者API（デバッグ用）

```typescript
// サーバー側ミドルウェア
function requireAdminKey(c: Context, next: Next) {
  const adminKey = c.req.header('X-Admin-Key');
  const validKey = process.env.ADMIN_DEBUG_KEY || 'debug_key_12345';
  
  if (adminKey !== validKey) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid admin key' }}, 401);
  }
  
  return next();
}

// 使用例
admin.post('/condition/override', requireAdminKey, async (c) => {
  // ...
});
```

---

## 🧪 エラーハンドリング

### 標準エラーフォーマット

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* optional additional info */ }
  }
}
```

### エラーコード一覧

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| MISSING_USER_ID | 400 | X-User-IDヘッダーがない |
| INVALID_BATCH | 400 | イベントバッチが不正 |
| INVALID_REQUEST | 400 | リクエストボディが不正 |
| UNAUTHORIZED | 401 | 認証失敗 |
| NOT_FOUND | 404 | リソースが見つからない |
| INTERNAL_ERROR | 500 | サーバー内部エラー |
| DATABASE_ERROR | 500 | データベースエラー |

---

## 📝 実装チェックリスト

### サーバー側API実装

- [ ] `/server/src/routes/config.ts` 作成
- [ ] `/server/src/routes/events.ts` 拡張
- [ ] `/server/src/routes/metrics.ts` 作成
- [ ] `/server/src/routes/tasks.ts` 拡張
- [ ] `/server/src/routes/admin.ts` 作成（デバッグ用）
- [ ] `/server/src/services/ExperimentService.ts` 作成
- [ ] `/server/src/services/EventLogService.ts` 作成
- [ ] `/server/src/services/MetricsService.ts` 作成
- [ ] `/server/src/index.ts` にルート追加

### クライアント側API統合

- [ ] `/concern-app/src/services/api/ApiService.ts` 拡張
  - [ ] `getConfig()` メソッド追加
  - [ ] `sendEventsBatch()` メソッド追加
  - [ ] `getEngagementMetrics()` メソッド追加
  - [ ] `syncTasks()` メソッド追加
- [ ] エラーハンドリング強化
- [ ] リトライロジック実装

---

**作成者**: AI Agent (Claude Sonnet 4.5)  
**最終更新**: 2025年10月18日

