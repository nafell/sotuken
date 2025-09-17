# データベーススキーマ設計書
*「頭の棚卸しノート」アプリ - データベース詳細設計*

## 📖 概要

### 設計原則
- **プライバシー・ファースト**: 個人特定情報はローカルのみ
- **拡張性**: factors辞書による無限拡張対応
- **研究対応**: 測定データの高い追跡性
- **パフォーマンス**: 適切なインデックス設計
- **可用性**: データ整合性とバックアップ戦略

### データ分散ポリシー

| データ種別 | ローカル | サーバー | 理由 |
|-----------|---------|---------|------|
| **個人特定情報** | ✅ | ❌ | プライバシー保護 |
| **ユーザ入力テキスト** | ✅ | ✅ | LLM判断に必要 |
| **システム要約データ** | ✅ | ✅ | UI生成・研究用 |
| **測定ログ** | ✅ | ✅ | 研究分析用 |
| **UI生成結果** | ❌ | ✅ | 品質向上・デバッグ |

---

## 💾 ローカルストレージ設計（IndexedDB）

### 設計概要
- **技術**: IndexedDB（Capacitor対応）
- **暗号化**: 機密情報はOS保護領域
- **同期**: オフライン対応、バックグラウンド同期
- **容量**: 最大100MB想定

### テーブル設計

#### 1. `user_profile`
**目的**: ユーザーの基本情報と設定

```sql
{
  "userId": "uuid",                    -- プライマリキー
  "anonymousId": "hashed_id",          -- サーバー送信用匿名ID
  "createdAt": "timestamp",
  "experimentCondition": "static_ui | dynamic_ui",
  "configVersion": "v1",
  "settings": {
    "notifications": boolean,
    "timerSound": boolean,
    "dataCollection": boolean
  }
}
```

#### 2. `concern_sessions`
**目的**: 関心事整理セッションの完全データ

```sql
{
  "sessionId": "uuid",                 -- プライマリキー
  "userId": "uuid",                    -- 外部キー
  "startTime": "timestamp",
  "endTime": "timestamp?",
  "currentScreen": "string",
  "completed": boolean,
  
  -- フェーズ1: 実態把握
  "realityCheck": {
    "rawInput": "string",              -- 実際のテキスト（ローカルのみ）
    "concernLevel": "low | medium | high",
    "urgency": "now | this_week | this_month | someday",
    "estimatedMentalLoad": number,     -- 0-100
    "inputMethod": "keyboard | voice",
    "inputTime": "timestamp"
  },
  
  -- フェーズ2: 方針立案  
  "planning": {
    "category": "learning_research | event_planning | lifestyle_habits | work_project | other",
    "approach": "information_gathering | concrete_action | strategic_planning",
    "confidenceLevel": number,         -- 選択の確信度
    "alternativeConsidered": string[]  -- 検討した他の選択肢
  },
  
  -- フェーズ3: 細分化
  "breakdown": {
    "suggestedActions": [
      {
        "id": "string",
        "description": "string",
        "estimatedTimeMin": number,
        "actionType": "information_gathering | communication | planning | execution",
        "source": "ai_generated | user_custom",
        "priority": number
      }
    ],
    "selectedActionId": "string",
    "customAction": {
      "description": "string",
      "estimatedTimeMin": number
    }?,
    "uiVariant": "static | dynamic",
    "generationId": "string?"           -- サーバー生成ID
  },
  
  -- 結果測定
  "outcomes": {
    "actionStarted": boolean,
    "actionCompleted": boolean,
    "satisfactionLevel": "very_clear | somewhat_clear | still_foggy",
    "workingMemoryBefore": number,
    "workingMemoryAfter": number,
    "cognitiveReliefScore": number,     -- 0-100
    "nextConcern": "string?",
    "totalTimeSpentMin": number,
    "screenTransitions": number
  }
}
```

#### 3. `context_data`
**目的**: セッション時の状況データ

```sql
{
  "contextId": "uuid",                 -- プライマリキー
  "sessionId": "uuid",                 -- 外部キー
  "collectedAt": "timestamp",
  "timeOfDay": "morning | afternoon | evening | night",
  "dayOfWeek": number,                 -- 0=日曜
  "availableTimeMin": number,
  
  -- 拡張可能なfactors辞書
  "factors": {
    "location_category": {
      "value": "home | work | transit | other",
      "confidence": number,            -- 0-1
      "source": "gps_abstraction",
      "rawData": "object?"             -- ローカルのみ、詳細位置情報等
    },
    "activity_level": {
      "value": "stationary | light | active",
      "confidence": number,
      "source": "motion_sensor"
    },
    "calendar_availability": {
      "value": "free | light | moderate | busy", 
      "confidence": number,
      "source": "calendar_analysis",
      "rawData": "object?"             -- 具体的予定情報（ローカルのみ）
    },
    "device_context": {
      "orientation": "portrait | landscape",
      "batteryLevel": number,
      "networkType": "wifi | cellular | offline"
    }
    // 将来追加: biometric, weather, etc.
  }
}
```

#### 4. `interaction_events`
**目的**: すべてのUIインタラクション記録

```sql
{
  "eventId": "uuid",                   -- プライマリキー
  "sessionId": "uuid",                 -- 外部キー
  "timestamp": "timestamp",
  "eventType": "ui_shown | button_tap | input_change | navigation | action_started | satisfaction_reported",
  "screenId": "string",
  "componentId": "string?",
  "metadata": {
    "uiVariant": "static | dynamic",
    "generationId": "string?",
    "actionId": "string?",
    "inputValue": "string?",
    "timeOnScreenSec": number?,
    "scrollPosition": number?,
    "deviceContext": "object"
  },
  "syncedToServer": boolean,
  "syncedAt": "timestamp?"
}
```

#### 5. `ui_generations`
**目的**: 生成されたUI情報（キャッシュ・デバッグ用）

```sql
{
  "generationId": "uuid",              -- プライマリキー
  "sessionId": "uuid",                 -- 外部キー
  "generatedAt": "timestamp",
  "uiDsl": "object",                   -- DSL JSON
  "requestContext": "object",          -- 生成リクエスト情報
  "generationMetadata": {
    "model": "string",
    "seed": number,
    "processingTimeMs": number,
    "fallbackUsed": boolean,
    "promptTokens": number,
    "responseTokens": number
  }
}
```

### インデックス設計
```sql
-- パフォーマンス最適化用インデックス
CREATE INDEX idx_sessions_user_time ON concern_sessions(userId, startTime);
CREATE INDEX idx_events_session_time ON interaction_events(sessionId, timestamp);
CREATE INDEX idx_context_session ON context_data(sessionId);
CREATE INDEX idx_events_sync ON interaction_events(syncedToServer, timestamp);
```

---

## 🗄️ サーバーサイドDB設計（SQLite → PostgreSQL）

### 設計概要
- **Phase 1**: SQLite（開発用）
- **Phase 2**: PostgreSQL（本番用）
- **匿名化**: 個人特定不可能なデータのみ
- **保持期間**: 研究データ180日、運用ログ30日

### テーブル設計

#### 1. `experiments`
**目的**: 実験設定とA/B条件管理

```sql
CREATE TABLE experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    config_version VARCHAR(20) NOT NULL,
    weights_version VARCHAR(20) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_assignments (
    anonymous_user_id VARCHAR(64) PRIMARY KEY,
    experiment_id UUID REFERENCES experiments(id),
    condition VARCHAR(50) NOT NULL, -- 'static_ui' | 'dynamic_ui'
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_assignment_exp_condition (experiment_id, condition)
);
```

#### 2. `ui_generation_requests`
**目的**: UI生成リクエストと結果

```sql
CREATE TABLE ui_generation_requests (
    generation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) NOT NULL,
    anonymous_user_id VARCHAR(64) NOT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- ユーザ明示入力（そのまま保存）
    concern_text TEXT NOT NULL,
    selected_category VARCHAR(50) NOT NULL,
    selected_approach VARCHAR(50) NOT NULL,
    urgency_choice VARCHAR(20) NOT NULL,
    concern_level VARCHAR(10) NOT NULL,
    custom_action_text TEXT,
    
    -- システム推論コンテキスト（抽象化済み）
    time_of_day VARCHAR(20) NOT NULL,
    available_time_min INTEGER NOT NULL,
    factors JSONB NOT NULL,           -- factors辞書（抽象化済み）
    
    -- 生成結果
    ui_variant VARCHAR(10) NOT NULL,  -- 'static' | 'dynamic'
    novelty_level VARCHAR(10),        -- 'low' | 'med' | 'high'
    ui_dsl JSONB NOT NULL,            -- 生成されたDSL
    
    -- メタデータ
    model_used VARCHAR(50) NOT NULL,
    seed_used INTEGER,
    processing_time_ms INTEGER,
    fallback_used BOOLEAN DEFAULT FALSE,
    prompt_tokens INTEGER,
    response_tokens INTEGER,
    
    INDEX idx_generation_user_time (anonymous_user_id, requested_at),
    INDEX idx_generation_session (session_id),
    INDEX idx_generation_variant_novelty (ui_variant, novelty_level)
);
```

#### 3. `measurement_events`
**目的**: 研究用測定データ

```sql
CREATE TABLE measurement_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) NOT NULL,
    anonymous_user_id VARCHAR(64) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    event_type VARCHAR(50) NOT NULL,  -- 'ui_shown' | 'action_started' | etc.
    screen_id VARCHAR(50),
    ui_variant VARCHAR(10),           -- 'static' | 'dynamic'
    generation_id UUID REFERENCES ui_generation_requests(generation_id),
    
    -- 測定用メタデータ
    metadata JSONB NOT NULL,
    
    -- 研究分析用
    experiment_condition VARCHAR(50),
    config_version VARCHAR(20),
    
    INDEX idx_events_user_time (anonymous_user_id, recorded_at),
    INDEX idx_events_session_type (session_id, event_type),
    INDEX idx_events_variant_type (ui_variant, event_type),
    INDEX idx_events_generation (generation_id)
);
```

#### 4. `priority_scores`
**目的**: 優先スコア計算結果

```sql
CREATE TABLE priority_scores (
    score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymous_user_id VARCHAR(64) NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- コンテキスト情報
    context_factors JSONB NOT NULL,
    config_version VARCHAR(20) NOT NULL,
    weights_version VARCHAR(20) NOT NULL,
    
    -- 計算結果
    concern_scores JSONB NOT NULL,    -- [{"id": "concern_001", "score": 0.75, "reasoning": {...}}]
    
    INDEX idx_scores_user_time (anonymous_user_id, calculated_at)
);
```

#### 5. `system_logs`
**目的**: システム運用ログ

```sql
CREATE TABLE system_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(10) NOT NULL,       -- 'INFO' | 'WARN' | 'ERROR'
    component VARCHAR(50) NOT NULL,   -- 'ui_generation' | 'scoring' | 'events'
    message TEXT NOT NULL,
    metadata JSONB,
    request_id VARCHAR(100),
    
    INDEX idx_logs_time_level (logged_at, level),
    INDEX idx_logs_component_time (component, logged_at)
);
```

### データ保持ポリシー
```sql
-- 研究データ: 180日後削除
DELETE FROM measurement_events WHERE recorded_at < NOW() - INTERVAL '180 days';
DELETE FROM ui_generation_requests WHERE requested_at < NOW() - INTERVAL '180 days';

-- 運用ログ: 30日後削除  
DELETE FROM system_logs WHERE logged_at < NOW() - INTERVAL '30 days';
```

---

## 🔄 データ同期戦略

### ローカル → サーバー同期

#### 1. イベントバッチ送信
```javascript
// バックグラウンドで定期実行
async function syncEvents() {
  const unsyncedEvents = await db.interaction_events
    .where('syncedToServer').equals(false)
    .limit(50)
    .toArray();
    
  if (unsyncedEvents.length > 0) {
    const response = await api.post('/v1/events/batch', {
      events: unsyncedEvents.map(anonymizeEvent)
    });
    
    // 成功したイベントをマーク
    await db.interaction_events.bulkUpdate(
      unsyncedEvents.map(e => e.eventId),
      { syncedToServer: true, syncedAt: new Date() }
    );
  }
}
```

#### 2. オフライン対応
```javascript
// オフライン時の処理
window.addEventListener('offline', () => {
  // UI生成をローカルフォールバックに切り替え
  uiGenerator.setMode('local_fallback');
});

window.addEventListener('online', () => {
  // オンライン復帰時に未同期データを送信
  syncPendingData();
  uiGenerator.setMode('server_assisted');
});
```

---

## 🔍 クエリパフォーマンス最適化

### 主要クエリパターン

#### 1. 研究分析用クエリ
```sql
-- 着手率分析（UI variant別）
SELECT 
  ui_variant,
  COUNT(CASE WHEN event_type = 'ui_shown' THEN 1 END) as ui_shown_count,
  COUNT(CASE WHEN event_type = 'action_started' THEN 1 END) as action_started_count,
  ROUND(
    COUNT(CASE WHEN event_type = 'action_started' THEN 1 END) * 100.0 / 
    COUNT(CASE WHEN event_type = 'ui_shown' THEN 1 END), 2
  ) as conversion_rate
FROM measurement_events 
WHERE recorded_at >= '2025-09-01' 
GROUP BY ui_variant;
```

#### 2. リアルタイム監視用
```sql
-- 過去1時間のUI生成パフォーマンス
SELECT 
  AVG(processing_time_ms) as avg_processing_time,
  COUNT(*) as total_generations,
  COUNT(CASE WHEN fallback_used THEN 1 END) as fallback_count,
  ROUND(COUNT(CASE WHEN fallback_used THEN 1 END) * 100.0 / COUNT(*), 2) as fallback_rate
FROM ui_generation_requests 
WHERE requested_at >= NOW() - INTERVAL '1 hour';
```

---

## 🛡️ セキュリティ・プライバシー

### データ暗号化
- **ローカル**: 機密情報はOS保護領域に保存
- **転送**: TLS 1.3での通信暗号化
- **サーバー**: 匿名化済みデータのみ保存

### アクセス制御
- **API認証**: Bearer tokenによる認証
- **データベース**: 最小権限の原則
- **監査ログ**: すべてのデータアクセスを記録

### GDPR対応
- **データポータビリティ**: ユーザーデータのエクスポート機能
- **削除権**: ユーザーリクエストによる完全削除
- **透明性**: データ収集・利用目的の明確化

---

*作成日: 2025年9月17日*  
*バージョン: v1.0*  
*対応MVP要件: v2.0*
