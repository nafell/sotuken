# アーキテクチャ設計書
*「頭の棚卸しノート」アプリ - システム全体設計*

## 📖 概要

### 設計思想
- **研究価値の最大化**: 動的UI効果の精密測定
- **プライバシー・ファースト**: 個人情報の適切な分離管理
- **拡張性**: factors辞書による無限センサー対応
- **実用性**: PWAからネイティブアプリへの段階的移行
- **堅牢性**: エラー処理とフォールバック機構の充実

### システム全体像
```mermaid
graph TB
    U[👤 ユーザー] --> PWA[📱 PWA Client]
    PWA --> CAP[⚡ Capacitor Bridge]
    CAP --> IDB[(💾 IndexedDB)]
    CAP --> SEN[📡 Sensors API]
    
    PWA <--> API[🌐 API Gateway]
    API --> HON[🚀 Hono Server]
    HON --> LLM[🤖 Gemini 2.5]
    HON --> SDB[(🗄️ SQLite DB)]
    
    PWA -.-> MON[📊 Monitoring]
    HON -.-> LOG[📋 Logging]
```

---

## 🏗️ アーキテクチャレイヤー

### Layer 1: プレゼンテーション層

#### **PWA Client (React + TypeScript + Capacitor)**
```
src/
├── components/          # UI Components
│   ├── screens/        # 5つのメイン画面
│   ├── ui/            # 再利用可能UIパーツ
│   └── dynamic/       # 動的UI生成コンポーネント
├── hooks/             # React Hooks
├── services/          # ビジネスロジック
│   ├── storage/       # ローカルデータ管理
│   ├── api/          # サーバー通信
│   ├── context/      # factors収集
│   └── ui-generation/ # UI生成・レンダリング
├── types/            # TypeScript型定義
└── utils/            # ユーティリティ
```

**技術スタック:**
- **React 18**: 関数コンポーネント + Hooks
- **TypeScript**: 型安全性
- **Vite**: 高速ビルド
- **Capacitor**: ネイティブブリッジ
- **IndexedDB**: ローカルストレージ（Dexie.js）
- **Tailwind CSS**: スタイリング

**主要機能:**
- 5画面フロー実装
- factors辞書によるコンテキスト収集
- 動的UI DSLレンダリング
- オフライン対応
- A/Bテスト機能

#### **Capacitor Native Bridge**
```javascript
// センサーデータ収集
import { Geolocation } from '@capacitor/geolocation';
import { Motion } from '@capacitor/motion';
import { Device } from '@capacitor/device';

async function collectFactors(): Promise<FactorsDict> {
  const factors: FactorsDict = {};
  
  // 位置情報（抽象化）
  const position = await Geolocation.getCurrentPosition();
  factors.location_category = {
    value: abstractizeLocation(position),
    confidence: position.coords.accuracy,
    source: 'gps_sensor'
  };
  
  // デバイス情報
  const deviceInfo = await Device.getInfo();
  factors.device_orientation = {
    value: deviceInfo.orientation,
    source: 'device_api'
  };
  
  // 将来拡張: Motion, Calendar, etc.
  
  return factors;
}
```

---

### Layer 2: ビジネスロジック層

#### **Context Service（factors辞書管理）**
```typescript
interface FactorsDict {
  [factorName: string]: {
    value: string | number | boolean | object;
    confidence?: number;  // 0-1
    source?: string;
    timestamp?: Date;
  };
}

class ContextService {
  private factors: FactorsDict = {};
  
  async collectCurrentFactors(): Promise<FactorsDict> {
    // 基本コンテキスト
    this.factors.time_of_day = {
      value: this.getTimeOfDay(),
      source: 'system_clock'
    };
    
    // センサーデータ（プライバシー考慮）
    await this.collectLocationFactor();
    await this.collectActivityFactor();
    
    // 将来拡張
    await this.collectCalendarFactor();
    await this.collectBiometricFactor();
    
    return this.factors;
  }
  
  private async collectLocationFactor() {
    try {
      const position = await Geolocation.getCurrentPosition();
      this.factors.location_category = {
        value: this.categorizeLocation(position), // home/work/other
        confidence: this.calculateLocationConfidence(position),
        source: 'gps_abstraction'
      };
    } catch (error) {
      // フォールバック: 時間ベース推定
      this.factors.location_category = {
        value: this.inferLocationFromTime(),
        confidence: 0.3,
        source: 'time_inference'
      };
    }
  }
}
```

#### **UI Generation Service（動的UI生成）**
```typescript
interface UIGenerationService {
  async generateUI(request: UIGenerationRequest): Promise<UIGenerationResponse> {
    try {
      // サーバーでLLM生成
      const response = await this.apiService.post('/v1/ui/generate', {
        ...request,
        userExplicitInput: request.userInput,  // そのまま送信
        systemInferredContext: this.anonymizeContext(request.context) // 抽象化
      });
      
      // DSL検証
      if (!this.validateDSL(response.uiDsl)) {
        throw new Error('Invalid DSL received');
      }
      
      return response;
      
    } catch (error) {
      // フォールバック機構
      return this.getFallbackUI(request);
    }
  }
  
  private anonymizeContext(context: ContextData) {
    const anonymized = { ...context };
    
    // factors辞書の抽象化
    for (const [key, factor] of Object.entries(context.factors)) {
      if (this.isPersonallyIdentifiable(factor)) {
        anonymized.factors[key] = {
          ...factor,
          value: this.abstractValue(factor.value),
          // rawDataは削除
        };
      }
    }
    
    return anonymized;
  }
}
```

---

### Layer 3: データアクセス層

#### **Local Storage Service（IndexedDB）**
```typescript
// Dexie.jsによるIndexedDB管理
class LocalDatabase extends Dexie {
  userProfile!: Table<UserProfile>;
  concernSessions!: Table<ConcernSession>;
  contextData!: Table<ContextData>;
  interactionEvents!: Table<InteractionEvent>;
  
  constructor() {
    super('ConcernApp');
    this.version(1).stores({
      userProfile: 'userId',
      concernSessions: 'sessionId, userId, startTime',
      contextData: 'contextId, sessionId, collectedAt',
      interactionEvents: 'eventId, sessionId, timestamp, syncedToServer'
    });
  }
  
  // プライバシー保護付きクエリ
  async getSessionsForAnalysis(userId: string): Promise<ConcernSession[]> {
    return await this.concernSessions
      .where('userId').equals(userId)
      .and(session => session.completed === true)
      .toArray();
  }
  
  // 未同期イベント取得
  async getUnsyncedEvents(limit: number = 50): Promise<InteractionEvent[]> {
    return await this.interactionEvents
      .where('syncedToServer').equals(false)
      .limit(limit)
      .toArray();
  }
}
```

---

### Layer 4: サーバーサイド

#### **Bun + Hono API Server**
```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

// ミドルウェア
app.use('*', cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));
app.use('*', logger());
app.use('*', authMiddleware);
app.use('*', rateLimitMiddleware);

// API Routes
app.route('/v1/config', configRoutes);
app.route('/v1/ui', uiGenerationRoutes);
app.route('/v1/score', priorityScoreRoutes);
app.route('/v1/events', eventLoggingRoutes);
app.route('/v1/replay', replayRoutes);

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
};
```

#### **UI Generation Handler**
```typescript
export const uiGenerationRoutes = new Hono()
  .post('/generate', async (c) => {
    const request = await c.req.json() as UIGenerationRequest;
    
    try {
      // バリデーション
      const validatedRequest = validateUIGenerationRequest(request);
      
      // LLM呼び出し
      const generationResult = await generateWithLLM(validatedRequest);
      
      // DSL検証
      const validatedDSL = validateDSL(generationResult.uiDsl);
      
      // DB記録
      await db.ui_generation_requests.create({
        generation_id: generationResult.generationId,
        session_id: request.sessionId,
        anonymous_user_id: request.anonymousUserId,
        concern_text: request.userExplicitInput.concernText,
        // ... その他のフィールド
      });
      
      return c.json({
        sessionId: request.sessionId,
        generationId: generationResult.generationId,
        uiDsl: validatedDSL,
        generation: generationResult.metadata
      });
      
    } catch (error) {
      // フォールバック処理
      const fallbackUI = await getFallbackUI(request);
      
      return c.json({
        ...fallbackUI,
        fallback: { used: true, reason: error.message }
      });
    }
  });
```

#### **LLM Integration Service**
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

class LLMService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  
  async generateUI(request: UIGenerationRequest): Promise<UIDSL> {
    const model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-mini',
      generationConfig: {
        temperature: 0.3,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1000
      }
    });
    
    const prompt = this.buildPrompt(request);
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    
    const response = result.response;
    const uiDsl = JSON.parse(response.text());
    
    return uiDsl;
  }
  
  private buildPrompt(request: UIGenerationRequest): string {
    return `
あなたは認知行動療法に基づく「頭の棚卸しノート」アプリのUIアシスタントです。

ユーザーの関心事: "${request.userExplicitInput.concernText}"
カテゴリ: ${request.userExplicitInput.selectedCategory}
アプローチ: ${request.userExplicitInput.selectedApproach}
緊急度: ${request.userExplicitInput.urgencyChoice}

現在の状況:
- 時間帯: ${request.systemInferredContext.timeOfDay}
- 利用可能時間: ${request.systemInferredContext.availableTimeMin}分
- 場所: ${request.systemInferredContext.factors.location_category?.value}
- アクティビティ: ${request.systemInferredContext.factors.activity_level?.value}

新規性レベル: ${request.noveltyLevel}

以下のUI DSL v1.1仕様に従い、2分ルールで着手しやすいUIを生成してください...
    `;
  }
}
```

---

## 🔄 データフロー設計

### 1. セッション開始から完了まで

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant LS as LocalStorage
    participant API as API Server
    participant LLM as LLM Service
    participant DB as Database
    
    U->>C: アプリ起動
    C->>API: GET /v1/config（実験条件取得）
    API->>DB: ユーザー条件確認
    API->>C: 実験設定返却
    
    U->>C: 関心事入力
    C->>LS: セッションデータ保存
    
    U->>C: 画面遷移（1→2→3）
    C->>LS: 進行状況更新
    
    C->>C: factors収集
    C->>API: POST /v1/ui/generate
    API->>LLM: UI生成リクエスト
    LLM->>API: DSL JSON返却
    API->>DB: 生成ログ記録
    API->>C: UI設計返却
    
    C->>C: 動的UIレンダリング
    U->>C: アクション開始
    C->>LS: インタラクション記録
    
    U->>C: 完了報告
    C->>LS: 結果保存
    C->>API: POST /v1/events/batch（測定データ送信）
```

### 2. オフライン・エラー対応

```mermaid
graph TB
    A[UI生成リクエスト] --> B{ネットワーク接続}
    B -->|OK| C[サーバーLLM生成]
    B -->|NG| D[ローカルフォールバック]
    
    C --> E{LLM応答}
    E -->|成功| F[DSL検証]
    E -->|失敗| G[フォールバックUI]
    
    F --> H{DSL有効性}
    H -->|有効| I[UI表示]
    H -->|無効| G
    
    D --> J[静的テンプレート使用]
    G --> J
    J --> I
    
    I --> K[ユーザーインタラクション]
    K --> L[ローカル記録]
    L --> M{オンライン復帰}
    M -->|Yes| N[バックグラウンド同期]
```

---

## 🛡️ セキュリティアーキテクチャ

### プライバシー保護レイヤー
```typescript
// データ分類と処理方針
interface DataClassification {
  PERSONAL_IDENTIFIABLE: {
    storage: 'local_only';
    examples: ['GPS座標', '具体的予定', 'デバイスID'];
  };
  USER_EXPLICIT: {
    storage: 'local_and_server';
    processing: 'as_is';
    examples: ['関心事テキスト', 'ユーザー選択項目'];
  };
  SYSTEM_INFERRED: {
    storage: 'local_and_server';
    processing: 'anonymized';
    examples: ['location_category', 'activity_level'];
  };
}

class PrivacyManager {
  static classifyData(data: any): DataClassification {
    // データ種別自動判定
  }
  
  static anonymizeForServer(data: any): any {
    // サーバー送信用匿名化処理
  }
  
  static validatePrivacyCompliance(request: any): boolean {
    // プライバシー要件チェック
  }
}
```

### 認証・認可
```typescript
// JWTベース認証（将来実装）
interface AuthService {
  generateAnonymousToken(deviceId: string): Promise<string>;
  validateToken(token: string): Promise<TokenPayload>;
  refreshToken(token: string): Promise<string>;
}

// レート制限
interface RateLimiter {
  checkLimit(userId: string, endpoint: string): Promise<boolean>;
  recordRequest(userId: string, endpoint: string): Promise<void>;
}
```

---

## 📊 監視・可観測性

### メトリクス収集
```typescript
interface SystemMetrics {
  // パフォーマンス
  uiGenerationLatency: Histogram;
  apiResponseTime: Histogram;
  databaseQueryTime: Histogram;
  
  // ビジネスロジック
  uiConversionRate: Counter;
  fallbackUsageRate: Counter;
  userEngagement: Gauge;
  
  // システムヘルス
  errorRate: Counter;
  uptime: Gauge;
  resourceUsage: Gauge;
}
```

### ログ設計
```typescript
interface StructuredLog {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  component: string;
  message: string;
  requestId?: string;
  userId?: string;  // 匿名化済み
  metadata: Record<string, any>;
}
```

---

## 🚀 デプロイメント・インフラ

### 開発環境
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  client:
    build: ./client
    ports: ["5173:5173"]
    volumes: ["./client:/app"]
    
  server:
    build: ./server
    ports: ["3000:3000"]
    environment:
      - NODE_ENV=development
      - DATABASE_URL=sqlite:./dev.db
    volumes: ["./server:/app"]
    
  database:
    image: sqlite:latest
    volumes: ["./data:/data"]
```

### 本番環境（将来）
```yaml
# k8s deployment example
apiVersion: apps/v1
kind: Deployment
metadata:
  name: concern-app-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: concern-app-server
  template:
    spec:
      containers:
      - name: server
        image: concern-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
```

---

## ⚡ パフォーマンス最適化

### フロントエンド最適化
- **Code Splitting**: 画面ごとの動的インポート
- **Service Worker**: オフライン対応・キャッシュ戦略
- **Virtual Scrolling**: 大量データ表示
- **React.memo**: 不要な再レンダリング防止

### バックエンド最適化
- **Connection Pooling**: データベース接続最適化
- **LLM Response Caching**: 同一リクエストの結果キャッシュ
- **Batch Processing**: イベントログの効率的処理
- **CDN**: 静的アセットの高速配信

---

*作成日: 2025年9月17日*  
*バージョン: v1.0*  
*対応MVP要件: v2.0*
