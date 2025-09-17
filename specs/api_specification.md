# API仕様書
*「頭の棚卸しノート」アプリ - サーバーAPI詳細仕様*

## 📖 概要

### 設計原則
- **RESTful設計**: 明確なリソース指向
- **プライバシー・ファースト**: ユーザ入力vs自動取得データの適切な分離
- **拡張性**: factors辞書による無限拡張対応
- **堅牢性**: エラーハンドリングとフォールバック機構
- **再現性**: 実験用途のためのバージョン管理

### 基本情報
- **ベースURL**: `https://api.concern-app.example.com/v1`
- **認証**: APIキー認証（将来JWT対応）
- **Content-Type**: `application/json`
- **文字エンコーディング**: UTF-8

---

## 🔗 エンドポイント一覧

| メソッド | エンドポイント | 目的 | 重要度 |
|---------|---------------|------|--------|
| GET | `/v1/config` | 設定・実験条件配布 | 🔴高 |
| POST | `/v1/ui/generate` | 動的UI生成 | 🔴高 |
| POST | `/v1/score/rank` | 優先スコア計算 | 🟡中 |
| POST | `/v1/events/batch` | イベントログ記録 | 🔴高 |
| POST | `/v1/replay/generate` | デバッグ用リプレイ | 🟢低 |

---

## 📋 詳細API仕様

### 1. 設定配布API

#### `GET /v1/config`

**目的**: クライアントに実験条件、重み設定、UI生成パラメータを配布

**リクエスト**
```http
GET /v1/config HTTP/1.1
Host: api.concern-app.example.com
Authorization: Bearer <api_key>
X-User-ID: <anonymous_hashed_user_id>
```

**レスポンス**
```json
{
  "configVersion": "v1",
  "weightsVersion": "v1",
  "experimentAssignment": {
    "condition": "dynamic_ui",
    "assignedAt": "2025-09-17T10:00:00Z",
    "experimentId": "exp_001"
  },
  "weights": {
    "importance": 0.25,
    "urgency": 0.20,
    "cognitiveRelief": 0.18,
    "deadlineProximity": 0.12,
    "contextFit": 0.10,
    "timeFit": 0.06,
    "staleness": 0.05,
    "energyMatch": 0.04,
    "brainFogLevel": 0.07,
    "switchCost": -0.07
  },
  "uiNoveltyPolicy": {
    "lowThreshold": 0.4,
    "highThreshold": 0.7,
    "dailyBudget": 2,
    "layoutHintsCaps": {
      "motionLevelMax": 1,
      "colorVarianceMax": 2
    }
  },
  "model": {
    "provider": "google",
    "name": "gemini-2.5-mini",
    "version": "2025-02",
    "parameters": {
      "temperature": 0.3,
      "topP": 0.8,
      "topK": 40
    }
  }
}
```

**エラーレスポンス**
```json
{
  "error": {
    "code": "CONFIG_UNAVAILABLE",
    "message": "Configuration service temporarily unavailable",
    "retryAfterMs": 30000
  }
}
```

---

### 2. 動的UI生成API ⭐最重要

#### `POST /v1/ui/generate`

**目的**: ユーザ状況と関心事に基づいてUI DSLを生成

**リクエスト**
```json
{
  "sessionId": "session_abc123",
  "anonymousUserId": "user_hash_def456",
  "uiVariant": "dynamic",
  
  "userExplicitInput": {
    "concernText": "卒業研究のテーマを決めたいけど、何から始めたらいいかわからない",
    "selectedCategory": "learning_research",
    "selectedApproach": "information_gathering",
    "urgencyChoice": "this_week",
    "concernLevel": "medium",
    "customActionText": null
  },
  
  "systemInferredContext": {
    "timeOfDay": "morning",
    "availableTimeMin": 15,
    "factors": {
      "location_category": {
        "value": "home",
        "confidence": 0.95,
        "source": "gps_abstraction"
      },
      "activity_level": {
        "value": "stationary", 
        "confidence": 0.8,
        "source": "motion_sensor"
      },
      "calendar_availability": {
        "value": "free",
        "confidence": 0.9,
        "source": "calendar_analysis"
      }
    }
  },
  
  "noveltyLevel": "med"
}
```

**レスポンス**
```json
{
  "sessionId": "session_abc123",
  "generationId": "gen_xyz789",
  "uiDsl": {
    "version": "1.1",
    "theme": {
      "style": "daily-rotating",
      "noveltyLevel": "med",
      "seed": 4207
    },
    "layoutHints": {
      "motionLevel": 1,
      "colorVariance": 2
    },
    "layout": {
      "type": "vertical",
      "sections": [
        {
          "type": "headline",
          "text": "研究への第一歩",
          "style": "fresh"
        },
        {
          "type": "cards",
          "items": [
            {
              "component": "card",
              "title": "まず3つだけ検索してみる",
              "subtitle": "興味のある分野を軽く調べる",
              "accent": "priority",
              "actions": [
                {
                  "id": "start_action",
                  "label": "2分で始める",
                  "params": {
                    "actionId": "search_3_topics",
                    "estimatedMin": 2
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "widget",
          "component": "breathing",
          "params": {
            "seconds": 60,
            "message": "まずは深呼吸から"
          }
        }
      ]
    },
    "actions": {
      "start_action": {
        "kind": "navigate",
        "target": "/action-execution",
        "paramsSchema": {
          "actionId": "string",
          "estimatedMin": "number"
        },
        "track": true
      }
    }
  },
  "generation": {
    "model": "gemini-2.5-mini",
    "seed": 4207,
    "generatedAt": "2025-09-17T10:30:00Z",
    "processingTimeMs": 342,
    "fallbackUsed": false,
    "promptTokens": 456,
    "responseTokens": 234
  }
}
```

**エラーレスポンス**
```json
{
  "error": {
    "code": "LLM_GENERATION_FAILED",
    "message": "UI generation temporarily unavailable",
    "details": {
      "reason": "model_timeout",
      "retryable": true
    }
  },
  "fallback": {
    "recommendAction": "use_local_template",
    "templateId": "minimal_card_breathing",
    "uiDsl": {
      "version": "1.1",
      "theme": {
        "style": "daily-rotating",
        "noveltyLevel": "low",
        "seed": 0
      },
      "layout": {
        "type": "vertical",
        "sections": [
          {
            "type": "cards",
            "items": [
              {
                "component": "card",
                "title": "2分で始めてみる",
                "accent": "calm",
                "actions": [
                  {
                    "id": "start_simple",
                    "label": "開始"
                  }
                ]
              }
            ]
          },
          {
            "type": "widget",
            "component": "breathing"
          }
        ]
      }
    }
  }
}
```

---

### 3. 優先スコア計算API

#### `POST /v1/score/rank`

**目的**: 複数の関心事の優先順位を計算

**リクエスト**
```json
{
  "anonymousUserId": "user_hash_def456",
  "context": {
    "timeOfDay": "morning",
    "availableTimeMin": 20,
    "factors": {
      "location_category": {"value": "home"},
      "energy_level": {"value": "high", "confidence": 0.7}
    }
  },
  "concerns": [
    {
      "id": "concern_001",
      "category": "learning_research", 
      "urgency": "this_week",
      "importance": 0.8,
      "lastTouchedHours": 72,
      "estimatedReliefScore": 0.7,
      "complexity": "moderate"
    },
    {
      "id": "concern_002", 
      "category": "event_planning",
      "urgency": "this_month",
      "importance": 0.6,
      "lastTouchedHours": 24,
      "estimatedReliefScore": 0.5,
      "complexity": "simple"
    }
  ]
}
```

**レスポンス**
```json
{
  "rankedConcerns": [
    {
      "id": "concern_001",
      "priorityScore": 0.75,
      "reasoning": {
        "importance": 0.8,
        "urgency": 0.6,
        "staleness": 0.6,
        "contextFit": 0.9,
        "cognitiveRelief": 0.7,
        "energyMatch": 0.8
      }
    },
    {
      "id": "concern_002",
      "priorityScore": 0.52,
      "reasoning": {
        "importance": 0.6,
        "urgency": 0.4,
        "staleness": 0.2,
        "contextFit": 0.7,
        "cognitiveRelief": 0.5,
        "energyMatch": 0.6
      }
    }
  ],
  "configVersion": "v1",
  "weightsUsed": "v1",
  "calculatedAt": "2025-09-17T10:35:00Z"
}
```

---

### 4. イベントログAPI ⭐測定用

#### `POST /v1/events/batch`

**目的**: ユーザインタラクションと測定データを記録

**リクエスト**
```json
{
  "events": [
    {
      "eventId": "evt_001",
      "sessionId": "session_abc123",
      "anonymousUserId": "user_hash_def456",
      "eventType": "ui_shown",
      "timestamp": "2025-09-17T10:30:00Z",
      "metadata": {
        "screenId": "breakdown",
        "uiVariant": "dynamic",
        "generationId": "gen_xyz789",
        "noveltyLevel": "med"
      }
    },
    {
      "eventId": "evt_002", 
      "sessionId": "session_abc123",
      "anonymousUserId": "user_hash_def456",
      "eventType": "action_started",
      "timestamp": "2025-09-17T10:32:15Z",
      "metadata": {
        "actionId": "search_3_topics",
        "startMethod": "button_tap",
        "uiVariant": "dynamic",
        "timeToActionSec": 135
      }
    },
    {
      "eventId": "evt_003",
      "sessionId": "session_abc123",
      "anonymousUserId": "user_hash_def456",
      "eventType": "satisfaction_reported",
      "timestamp": "2025-09-17T10:35:45Z",
      "metadata": {
        "satisfactionLevel": "somewhat_clear",
        "workingMemoryBefore": 70,
        "workingMemoryAfter": 50,
        "sessionDurationSec": 345
      }
    }
  ]
}
```

**レスポンス**
```json
{
  "recordedEvents": 3,
  "errors": [],
  "processingTimeMs": 45,
  "nextBatchId": "batch_456"
}
```

**イベントタイプ一覧**
| eventType | 目的 | 必須metadata |
|-----------|------|-------------|
| `ui_shown` | UI表示測定 | screenId, uiVariant, generationId |
| `action_started` | 着手率測定 | actionId, timeToActionSec |
| `action_completed` | 完了率測定 | actionId, durationSec |
| `satisfaction_reported` | スッキリ度測定 | satisfactionLevel, workingMemory変化 |
| `session_ended` | セッション完了 | sessionDurationSec, screensVisited |

---

### 5. リプレイ生成API（デバッグ用）

#### `POST /v1/replay/generate`

**目的**: 過去のセッションを再現してUI生成をデバッグ

**リクエスト**
```json
{
  "sessionId": "session_abc123",
  "replayAt": "breakdown_screen",
  "overrides": {
    "noveltyLevel": "high",
    "seed": 9999
  }
}
```

**レスポンス**
```json
{
  "originalGeneration": { /* 元のUI DSL */ },
  "replayedGeneration": { /* リプレイ結果 */ },
  "differences": [
    {
      "path": "theme.noveltyLevel", 
      "original": "med",
      "replayed": "high"
    }
  ]
}
```

---

## 🔒 セキュリティ仕様

### 認証・認可
- **APIキー認証**: `Authorization: Bearer <api_key>`
- **レート制限**: 1000req/hour/user
- **IP制限**: 必要に応じて地理的制限

### データ保護
- **TLS 1.3**: すべての通信を暗号化
- **匿名化**: 個人特定情報は送信禁止
- **ログ制限**: 個人情報を含むログ記録禁止

### バリデーション
- **入力検証**: JSON Schema validation
- **サイズ制限**: リクエスト最大10KB
- **文字制限**: concernText最大500文字

---

## 📊 パフォーマンス要件

| エンドポイント | 目標応答時間 | SLA |
|---------------|------------|-----|
| `/v1/config` | < 100ms | 99.9% |
| `/v1/ui/generate` | < 700ms | 99.0% |
| `/v1/score/rank` | < 200ms | 99.5% |
| `/v1/events/batch` | < 150ms | 99.9% |

### 可用性
- **アップタイム**: 99.9%以上
- **フォールバック**: LLM障害時の代替UI提供
- **監視**: Prometheus + Grafana

---

## 🧪 テスト戦略

### 単体テスト
- JSON Schema validation
- エラーハンドリング
- プライバシー保護機能

### 統合テスト  
- LLM API連携
- データベース操作
- 実験条件配布

### 負荷テスト
- 100concurrent users
- UI生成API負荷テスト
- フォールバック機構動作確認

---

*作成日: 2025年9月17日*  
*バージョン: v1.0*  
*対応MVP要件: v2.0*
