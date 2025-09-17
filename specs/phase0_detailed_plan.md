# Phase 0 詳細実行計画書
*環境構築・設計フェーズ（Week 1-2）*

## 📖 概要

### Phase 0 の目的
- **技術基盤の確立**: Capacitor + React + Bun/Hono 環境構築
- **設計の具体化**: データベーススキーマと5画面フローの詳細化
- **開発効率化**: ツール・ワークフロー・デバッグ環境整備
- **研究基盤準備**: 実験データ収集・分析の基盤作り

### 完了基準
- ✅ 開発環境で基本的なPWAが動作
- ✅ サーバーサイドでAPI応答を確認
- ✅ データベーススキーマが実装済み
- ✅ 5画面の画面遷移が動作
- ✅ factors辞書システムの基本実装完了

---

## 📅 詳細スケジュール

### 🗓️ Week 1: 環境構築・技術検証

#### **Day 1: プロジェクト初期化**
**所要時間: 8時間**

**午前（4時間）: フロントエンド環境構築**
```bash
# 1. Capacitor + React + TypeScript プロジェクト作成
npm create @capacitor/app concern-app --typescript --react
cd concern-app

# 2. 追加依存関係インストール
npm install dexie @capacitor/geolocation @capacitor/motion @capacitor/device
npm install -D @types/node tailwindcss postcss autoprefixer

# 3. Tailwind CSS セットアップ
npx tailwindcss init -p

# 4. PWA機能追加
npm install @vite-pwa/vite-plugin
```

**午後（4時間）: サーバーサイド環境構築**
```bash
# 1. Bun + Hono プロジェクト作成
mkdir server && cd server
bun init

# 2. 依存関係追加
bun add hono @hono/node-server
bun add sqlite3 drizzle-orm drizzle-kit
bun add @google/generative-ai cors
bun add -D @types/sqlite3

# 3. 基本サーバー構築
touch src/index.ts src/routes.ts src/database.ts
```

**成果物:**
- ✅ クライアント・サーバーの基本構造
- ✅ 必要パッケージの導入完了
- ✅ ビルド・実行確認

**検証項目:**
- [ ] `npm run dev` でReactアプリ起動
- [ ] `bun run dev` でHonoサーバー起動  
- [ ] ブラウザで「Hello World」表示確認

---

#### **Day 2: データベース設計実装**
**所要時間: 8時間**

**午前（4時間）: ローカルデータベース（IndexedDB）**
```typescript
// src/services/database/localDB.ts
import Dexie, { Table } from 'dexie';
import { ConcernSession, ContextData, InteractionEvent, UserProfile } from '../../types';

export class LocalDatabase extends Dexie {
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
}

export const db = new LocalDatabase();
```

**午後（4時間）: サーバーデータベース（SQLite + Drizzle）**
```typescript
// server/src/database/schema.ts
import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';

export const experiments = sqliteTable('experiments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  configVersion: text('config_version').notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
});

export const uiGenerationRequests = sqliteTable('ui_generation_requests', {
  generationId: text('generation_id').primaryKey(),
  sessionId: text('session_id').notNull(),
  anonymousUserId: text('anonymous_user_id').notNull(),
  concernText: text('concern_text').notNull(),
  uiDsl: blob('ui_dsl', { mode: 'json' }).notNull(),
  requestedAt: integer('requested_at', { mode: 'timestamp' }).notNull(),
});
```

**成果物:**
- ✅ IndexedDBテーブル定義・作成
- ✅ SQLiteスキーマ定義・マイグレーション
- ✅ 基本CRUD操作の実装

**検証項目:**
- [ ] ローカルDBにサンプルデータ挿入・取得成功
- [ ] サーバーDBでテーブル作成確認
- [ ] データ型・制約の動作確認

---

#### **Day 3: API基盤実装**
**所要時間: 8時間**

**午前（4時間）: 基本API構造**
```typescript
// server/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

app.use('*', cors());
app.use('*', logger());

// ヘルスチェック
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date() }));

// API routes
app.route('/v1/config', configRoutes);
app.route('/v1/ui', uiGenerationRoutes);
app.route('/v1/events', eventRoutes);

export default app;
```

**午後（4時間）: 設定配布API実装**
```typescript
// server/src/routes/config.ts
import { Hono } from 'hono';

const configRoutes = new Hono();

configRoutes.get('/', async (c) => {
  const config = {
    configVersion: "v1",
    weightsVersion: "v1",
    experimentAssignment: {
      condition: "dynamic_ui", // TODO: 実際の割り当てロジック
      assignedAt: new Date(),
      experimentId: "exp_001"
    },
    weights: {
      importance: 0.25,
      urgency: 0.20,
      // ... config.v1.jsonの内容
    }
  };
  
  return c.json(config);
});

export { configRoutes };
```

**成果物:**
- ✅ Honoサーバーの基本構造
- ✅ CORS・ログミドルウェア設定
- ✅ 設定配布API実装

**検証項目:**
- [ ] `GET /health` で正常応答
- [ ] `GET /v1/config` で設定JSON取得
- [ ] ブラウザからAPI呼び出し成功

---

#### **Day 4: factors辞書システム実装**
**所要時間: 8時間**

**午前（4時間）: ContextService基盤**
```typescript
// src/services/context/ContextService.ts
export interface FactorValue {
  value: string | number | boolean | object;
  confidence?: number;
  source?: string;
  timestamp?: Date;
}

export interface FactorsDict {
  [factorName: string]: FactorValue;
}

export class ContextService {
  private factors: FactorsDict = {};

  async collectCurrentFactors(): Promise<FactorsDict> {
    // 基本要素
    this.factors.time_of_day = {
      value: this.getTimeOfDay(),
      source: 'system_clock',
      timestamp: new Date()
    };

    this.factors.day_of_week = {
      value: new Date().getDay(),
      source: 'system_clock'
    };

    // Capacitor統合
    await this.collectCapacitorFactors();
    
    return this.factors;
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }
}
```

**午後（4時間）: Capacitor統合**
```typescript
// src/services/context/CapacitorIntegration.ts
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';

export class CapacitorIntegration {
  async collectDeviceFactors(): Promise<Partial<FactorsDict>> {
    const factors: Partial<FactorsDict> = {};

    try {
      // デバイス情報
      const deviceInfo = await Device.getInfo();
      factors.device_orientation = {
        value: deviceInfo.platform === 'web' ? 'portrait' : 'unknown',
        source: 'device_api'
      };

      // 位置情報（簡易版）
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 5000
      });
      
      factors.location_category = {
        value: this.categorizeLocation(position),
        confidence: this.calculateLocationConfidence(position),
        source: 'gps_abstraction'
      };

    } catch (error) {
      console.warn('Failed to collect some factors:', error);
    }

    return factors;
  }
}
```

**成果物:**
- ✅ factors辞書システムの基本実装
- ✅ Capacitor APIとの統合
- ✅ 拡張可能な設計の確認

**検証項目:**
- [ ] factors収集でエラーなく動作
- [ ] 位置情報許可・拒否両方での動作確認
- [ ] factors辞書に新項目追加テスト

---

#### **Day 5: 基本UI実装**
**所要時間: 8時間**

**午前（4時間）: React Router + 基本レイアウト**
```typescript
// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConcernInputScreen } from './components/screens/ConcernInputScreen';
import { ConcernLevelScreen } from './components/screens/ConcernLevelScreen';
// ... 他の画面

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<ConcernInputScreen />} />
          <Route path="/concern-level" element={<ConcernLevelScreen />} />
          <Route path="/category" element={<CategorySelectionScreen />} />
          <Route path="/breakdown" element={<BreakdownScreen />} />
          <Route path="/feedback" element={<FeedbackScreen />} />
        </Routes>
      </div>
    </Router>
  );
}
```

**午後（4時間）: 最初の画面実装**
```typescript
// src/components/screens/ConcernInputScreen.tsx
export const ConcernInputScreen: React.FC = () => {
  const [concernText, setConcernText] = useState('');
  const navigate = useNavigate();

  const handleNext = () => {
    if (concernText.trim().length >= 3) {
      // ローカルDBに保存
      saveConcernSession({ rawInput: concernText });
      navigate('/concern-level');
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        今、気になっていることは？
      </h1>
      
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-700">💡 例：こんなことでもOK！</p>
          <ul className="text-sm text-blue-600 mt-2 space-y-1">
            <li>• 卒業研究のテーマを決めたい</li>
            <li>• 来月の友達との旅行どうしよう</li>
            <li>• ジムに久しぶりに行きたいけど...</li>
          </ul>
        </div>

        <textarea
          value={concernText}
          onChange={(e) => setConcernText(e.target.value)}
          placeholder="気になっていることを自由に..."
          className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
          rows={4}
        />

        <button
          onClick={handleNext}
          disabled={concernText.trim().length < 3}
          className={`w-full py-3 rounded-lg font-medium ${
            concernText.trim().length >= 3
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          次へ進む
        </button>
      </div>
    </div>
  );
};
```

**成果物:**
- ✅ React Router設定
- ✅ Tailwind CSSスタイリング
- ✅ 最初の画面の基本機能実装

**検証項目:**
- [ ] 画面遷移が正常動作
- [ ] テキスト入力・バリデーション動作
- [ ] レスポンシブデザイン確認

---

### 🗓️ Week 2: 詳細設計・統合テスト

#### **Day 6-7: 5画面フロー完成**
**所要時間: 16時間**

**各画面の詳細実装:**
1. **関心事入力画面** （Day 5で完成）
2. **関心度・切迫度測定画面**
3. **性質分類+アプローチ選択画面**
4. **第一歩具体化画面** ⭐
5. **完了フィードバック画面**

**Day 6目標: 画面2-3完成**
**Day 7目標: 画面4-5完成 + 画面遷移統合**

---

#### **Day 8: データフロー統合**
**所要時間: 8時間**

**セッション管理実装:**
```typescript
// src/services/session/SessionManager.ts
export class SessionManager {
  private currentSession: ConcernSession | null = null;

  async startSession(): Promise<string> {
    const sessionId = crypto.randomUUID();
    this.currentSession = {
      sessionId,
      userId: await this.getUserId(),
      startTime: new Date(),
      currentScreen: 'concern_input',
      completed: false,
      realityCheck: {},
      planning: {},
      breakdown: {},
      outcomes: {}
    };

    await db.concernSessions.add(this.currentSession);
    return sessionId;
  }

  async updateSession(updates: Partial<ConcernSession>) {
    if (!this.currentSession) return;
    
    Object.assign(this.currentSession, updates);
    await db.concernSessions.update(this.currentSession.sessionId, updates);
  }

  async completeSession(outcomes: ConcernSession['outcomes']) {
    if (!this.currentSession) return;

    await this.updateSession({
      outcomes,
      completed: true,
      endTime: new Date()
    });
  }
}
```

**成果物:**
- ✅ セッション管理システム
- ✅ 画面間データ受け渡し
- ✅ ローカルDB統合

---

#### **Day 9: API統合・LLM連携準備**
**所要時間: 8時間**

**UI生成API基盤:**
```typescript
// server/src/routes/ui.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const uiRoutes = new Hono();

uiRoutes.post('/generate', async (c) => {
  const request = await c.req.json();
  
  try {
    // バリデーション
    if (!request.userExplicitInput?.concernText) {
      throw new Error('concernText is required');
    }

    // 固定UI版（Phase 2で動的化）
    const staticUI = {
      version: "1.1",
      theme: { style: "daily-rotating", noveltyLevel: "low", seed: 0 },
      layout: {
        type: "vertical",
        sections: [
          {
            type: "cards",
            items: [{
              component: "card",
              title: "2分で始めてみる",
              subtitle: request.userExplicitInput.concernText.slice(0, 50) + "...",
              accent: "priority",
              actions: [{ id: "start", label: "開始" }]
            }]
          }
        ]
      }
    };

    return c.json({
      sessionId: request.sessionId,
      generationId: crypto.randomUUID(),
      uiDsl: staticUI,
      generation: { fallbackUsed: true }
    });

  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});
```

**成果物:**
- ✅ UI生成APIの基本実装（固定UI）
- ✅ エラーハンドリング
- ✅ フロントエンド連携確認

---

#### **Day 10: 統合テスト・デバッグ**
**所要時間: 8時間**

**テスト項目:**
- [ ] 5画面フローの端から端まで動作
- [ ] データがローカルDBに正しく保存される
- [ ] API呼び出しが正常動作
- [ ] factors辞書が適切に収集される
- [ ] エラー時のフォールバック動作
- [ ] PWAとしてインストール可能

**デバッグ環境整備:**
- React Developer Tools設定
- Network tab監視
- IndexedDB内容確認ツール
- サーバーログ出力確認

**成果物:**
- ✅ 安定動作するMVP基盤
- ✅ 次フェーズの開発準備完了

---

## 🛠️ 開発ツール・環境設定

### VSCode設定推奨拡張機能
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode", 
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "ms-vscode.vscode-json"
  ]
}
```

### 環境変数設定
```bash
# client/.env.local
VITE_API_BASE_URL=http://localhost:3000/v1
VITE_APP_ENV=development

# server/.env
DATABASE_URL=./dev.db
GEMINI_API_KEY=your_api_key_here
CORS_ORIGIN=http://localhost:5173
PORT=3000
```

### デバッグスクリプト
```json
{
  "scripts": {
    "dev:all": "concurrently \"npm run dev\" \"cd server && bun run dev\"",
    "db:reset": "rm -f server/dev.db && cd server && bun run migrate",
    "test:api": "cd server && bun test",
    "build:check": "npm run build && cd server && bun run build"
  }
}
```

---

## 📋 Phase 0 完了チェックリスト

### 技術基盤
- [ ] Capacitor + React + TypeScript環境動作
- [ ] Bun + Hono サーバー応答確認
- [ ] IndexedDB テーブル作成・操作成功
- [ ] SQLite スキーマ作成・マイグレーション成功
- [ ] PWAとしてインストール・オフライン動作確認

### 機能実装
- [ ] 5画面フロー完全動作
- [ ] セッションデータの永続化
- [ ] factors辞書によるコンテキスト収集
- [ ] 基本的なAPI連携（設定取得・UI生成・イベント送信）
- [ ] エラーハンドリング・フォールバック機構

### 開発効率化
- [ ] Hot reload開発環境構築
- [ ] デバッグツール設定完了
- [ ] ログ出力・監視機能
- [ ] 型定義・バリデーション実装
- [ ] テスト実行環境準備

### ドキュメント
- [ ] README.md作成（セットアップ手順）
- [ ] API仕様書の実装との整合性確認
- [ ] データベーススキーマの実装確認
- [ ] Phase 1への引き継ぎ事項整理

---

## 🎯 Phase 1 準備事項

### 次フェーズでの重点課題
1. **比較実験機能**: A/B条件割り当てロジック
2. **測定データ収集**: イベント詳細記録システム
3. **UI改善**: ユーザビリティテスト対応
4. **パフォーマンス**: レスポンシブ性能向上

### 技術的負債・改善点
- factors辞書の型安全性向上
- API応答の詳細エラーハンドリング
- ローカルストレージの容量管理
- セキュリティ設定の強化

---

*作成日: 2025年9月17日*  
*バージョン: v1.0*  
*実行開始予定: Phase 0 開始時*
