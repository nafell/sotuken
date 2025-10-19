# Phase 2 Step 5: A/Bテスト手動割り当て機構 - 実装仕様書

**作成日**: 2025年10月19日  
**バージョン**: 1.0.0  
**実装者**: AI Agent  
**実装完了日**: 2025年10月19日

---

## 📋 目次

1. [概要](#概要)
2. [システムアーキテクチャ](#システムアーキテクチャ)
3. [サーバー側実装](#サーバー側実装)
4. [クライアント側実装](#クライアント側実装)
5. [データモデル](#データモデル)
6. [API仕様](#api仕様)
7. [画面仕様](#画面仕様)
8. [運用フロー](#運用フロー)
9. [実装の制約と注意事項](#実装の制約と注意事項)

---

## 概要

### 目的
動的UI版と固定UI版のA/Bテストを実施するため、管理者が被験者に実験条件を手動で割り当てる機構を実装する。

### 背景
- 被験者数が少ない（5名程度）ため、ハッシュベース自動割り当てから手動割り当てに設計変更
- 管理者が各被験者の属性を考慮して均等に割り当てることで、バランスの取れたデータ収集が可能

### スコープ
- ✅ サーバー側実験条件管理サービス
- ✅ 管理者用API
- ✅ クライアント側実験条件取得サービス
- ✅ 条件別ルーティング機構
- ✅ 未割り当てユーザー用画面
- ✅ ユーザー用設定画面
- ✅ 管理者用条件管理画面

### 対象外
- ❌ データベース永続化（現時点ではメモリキャッシュのみ）
- ❌ 全ユーザー一覧取得API（フェーズ外）
- ❌ 認証・認可機構

---

## システムアーキテクチャ

### 全体構成図

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                     │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │               App.tsx (ルート)                   │   │
│  │  - experimentService.fetchCondition() 呼び出し   │   │
│  │  - 条件に応じてNavigatorを切り替え               │   │
│  └────────────┬─────────────────────────────────────┘   │
│               │                                           │
│       ┌───────┴────────┬─────────────────┐              │
│       │                │                 │              │
│   condition=null   dynamic_ui       static_ui           │
│       │                │                 │              │
│       ▼                ▼                 ▼              │
│  UnassignedScreen  DynamicUI         StaticUI           │
│                    Navigator          Navigator          │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │         ClientExperimentService                  │   │
│  │  - fetchCondition() → /v1/config                │   │
│  │  - switchCondition() (デバッグ用)               │   │
│  │  - キャッシュ管理                               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │       AdminUserManagement (管理者画面)          │   │
│  │  - /admin/assignments API 呼び出し              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           │ HTTP
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Server (Hono)                         │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │         GET /v1/config (条件配布)                │   │
│  │  - experimentService.getCondition(userId)        │   │
│  │  - 未割り当て時は condition: null を返す        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │         /admin/* (管理者API)                     │   │
│  │  - GET /admin/assignments                        │   │
│  │  - GET /admin/assignments/counts                 │   │
│  │  - POST /admin/assignments                       │   │
│  │  - DELETE /admin/assignments/:userId             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │           ExperimentService                      │   │
│  │  - getCondition(userId)                          │   │
│  │  - assignConditionManually(...)                  │   │
│  │  - getAllAssignments()                           │   │
│  │  - getAssignmentCounts()                         │   │
│  │  - removeAssignment(userId)                      │   │
│  │  - assignmentCache (Map)                         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### コンポーネント間の依存関係

```
App.tsx
  └─ ClientExperimentService
       └─ /v1/config API
            └─ ExperimentService

AdminUserManagement
  └─ /admin/assignments API
       └─ ExperimentService
```

---

## サーバー側実装

### 1. ExperimentService

**ファイル**: `/server/src/services/ExperimentService.ts`

#### 責務
- 実験条件の管理（手動割り当て方式）
- 割り当て状況のキャッシュ管理
- 条件別統計情報の提供

#### クラス構造

```typescript
export interface ExperimentAssignment {
  userId: string;
  condition: 'dynamic_ui' | 'static_ui' | null;
  assignedAt: Date | null;
  method: 'manual';
  experimentId: string;
  assignedBy?: string;
  note?: string;
}

export class ExperimentService {
  private experimentId: string = 'exp_2025_10';
  private assignmentCache: Map<string, ExperimentAssignment>;

  constructor()
  async getCondition(userId: string): Promise<ExperimentAssignment>
  async assignConditionManually(userId, condition, assignedBy, note?): Promise<ExperimentAssignment>
  async getAllAssignments(): Promise<ExperimentAssignment[]>
  async getAssignmentCounts(): Promise<{dynamic_ui, static_ui, unassigned}>
  async removeAssignment(userId: string): Promise<void>
}
```

#### メソッド詳細

##### `getCondition(userId: string)`
**目的**: ユーザーの実験条件を取得

**処理フロー**:
1. キャッシュをチェック
2. キャッシュにあればそれを返す
3. なければ未割り当て（condition: null）のオブジェクトを返す

**戻り値**:
```typescript
{
  userId: "user_xxx",
  condition: null | "dynamic_ui" | "static_ui",
  assignedAt: null | Date,
  method: "manual",
  experimentId: "exp_2025_10"
}
```

##### `assignConditionManually(userId, condition, assignedBy, note?)`
**目的**: 管理者が条件を手動割り当て

**パラメータ**:
- `userId`: ユーザーID
- `condition`: 'dynamic_ui' | 'static_ui'
- `assignedBy`: 割り当てを実施した管理者ID
- `note`: 割り当て時のメモ（オプション）

**処理フロー**:
1. 割り当て情報オブジェクトを作成
2. キャッシュに保存
3. コンソールログ出力

**戻り値**: ExperimentAssignment

##### `getAllAssignments()`
**目的**: 全ユーザーの割り当て状況を取得（管理画面用）

**処理フロー**:
1. キャッシュから全割り当て情報を取得
2. 配列として返す

**戻り値**: ExperimentAssignment[]

##### `getAssignmentCounts()`
**目的**: 条件別の人数を取得（管理画面用）

**処理フロー**:
1. キャッシュから各条件の人数をカウント
2. 未割り当て数を計算（TODO: 全ユーザー数から算出）

**戻り値**:
```typescript
{
  dynamic_ui: number,
  static_ui: number,
  unassigned: number
}
```

##### `removeAssignment(userId: string)`
**目的**: 割り当てを削除（リセット用）

**処理フロー**:
1. キャッシュから削除
2. コンソールログ出力

#### 制約・注意事項
- ⚠️ 現時点ではメモリキャッシュのみ（サーバー再起動で消失）
- ⚠️ データベース永続化は未実装（TODOコメント有り）
- ⚠️ 全ユーザー数の取得は未実装

---

### 2. 管理者用APIルート

**ファイル**: `/server/src/routes/admin.ts`

#### エンドポイント一覧

| Method | Path | 説明 |
|--------|------|------|
| GET | `/admin/assignments` | 全割り当て状況取得 |
| GET | `/admin/assignments/counts` | 条件別人数取得 |
| POST | `/admin/assignments` | 条件手動割り当て |
| DELETE | `/admin/assignments/:userId` | 割り当て削除 |
| GET | `/admin/health` | ヘルスチェック |

詳細は [API仕様](#api仕様) を参照。

---

### 3. 設定配布API更新

**ファイル**: `/server/src/routes/config.ts`

#### 変更内容
- `experimentService.getOrAssignCondition()` → `experimentService.getCondition()` に変更
- レスポンスに `experimentId` を追加
- `condition: null`（未割り当て）に対応
- `assignedBy` フィールドをレスポンスに含める

#### レスポンス例
```json
{
  "configVersion": "v1.0",
  "weightsVersion": "v1.0",
  "experimentId": "exp_2025_10",
  "experimentAssignment": {
    "condition": null,
    "assignedAt": null,
    "method": "manual",
    "assignedBy": null
  },
  "weights": { ... },
  "uiNoveltyPolicy": { ... },
  "model": { ... }
}
```

---

## クライアント側実装

### 1. ClientExperimentService

**ファイル**: `/concern-app/src/services/ClientExperimentService.ts`

#### 責務
- サーバーから実験条件を取得
- 実験条件をメモリとローカルDBにキャッシュ
- 未割り当てユーザーの検出
- デバッグ用の条件切り替え（開発環境のみ）

#### クラス構造

```typescript
export type ExperimentCondition = 'dynamic_ui' | 'static_ui' | null;

export class ClientExperimentService {
  private static instance: ClientExperimentService | null = null;
  private condition: ExperimentCondition = null;
  private experimentId: string | null = null;

  static getInstance(): ClientExperimentService
  async fetchCondition(): Promise<ExperimentCondition>
  getCachedCondition(): ExperimentCondition
  async switchCondition(newCondition): Promise<void>
  getExperimentId(): string | null
}
```

#### メソッド詳細

##### `fetchCondition()`
**目的**: 実験条件をサーバーから取得

**処理フロー**:
1. キャッシュをチェック（既にあればそれを返す）
2. userIdをlocalStorageから取得
3. `/v1/config` APIを呼び出し
4. レスポンスから条件を取得してキャッシュ
5. ローカルDBに保存
6. イベントログ記録（`experiment_condition_assigned`）
7. エラー時はローカルDBからフォールバック

**戻り値**: ExperimentCondition (null | 'dynamic_ui' | 'static_ui')

##### `getCachedCondition()`
**目的**: キャッシュされた条件を即座に取得

**戻り値**: ExperimentCondition

##### `switchCondition(newCondition)`
**目的**: デバッグ用の条件切り替え

**処理フロー**:
1. 本番環境チェック（本番では実行不可）
2. 条件をキャッシュに保存
3. ローカルDBに保存（`conditionOverriddenByUser: true`）
4. イベントログ記録（`experiment_condition_switched`）
5. ページリロード

**制約**:
- ⚠️ 開発環境（`import.meta.env.DEV`）でのみ実行可能
- ⚠️ 本番環境では早期リターン

---

### 2. App.tsx（条件別ルーティング）

**ファイル**: `/concern-app/src/App.tsx`

#### 責務
- アプリ起動時に実験条件を取得
- 条件に応じて適切なNavigatorを表示
- ローディング状態の管理

#### コンポーネント構造

```typescript
function App() {
  const [condition, setCondition] = useState<ExperimentCondition>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    experimentService.fetchCondition()
      .then(setCondition)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingScreen />;

  return (
    <Router>
      {condition === null ? (
        <UnassignedScreen />
      ) : condition === 'dynamic_ui' ? (
        <DynamicUINavigator />
      ) : (
        <StaticUINavigator />
      )}
    </Router>
  );
}
```

#### 処理フロー

```
起動
  ↓
実験条件取得（experimentService.fetchCondition()）
  ↓
├─ Loading...
│
├─ condition === null → UnassignedScreen
│   （管理者による割り当て待ち）
│
├─ condition === 'dynamic_ui' → DynamicUINavigator
│   （動的UI版フロー）
│
└─ condition === 'static_ui' → StaticUINavigator
    （固定UI版フロー）
```

---

### 3. UnassignedScreen

**ファイル**: `/concern-app/src/screens/UnassignedScreen.tsx`

#### 責務
- 未割り当てユーザー用の待機画面を表示
- ユーザーIDの表示・コピー機能
- 再読み込み機能

#### UI構成

```
┌────────────────────────────────────┐
│            ⏳                      │
│                                    │
│   実験条件の割り当て待ち           │
│                                    │
│   あなたのユーザーIDはまだ         │
│   実験条件に割り当てられて         │
│   いません。                       │
│                                    │
│   ┌──────────────────────┐       │
│   │ あなたのユーザーID   │       │
│   │ user_xxxxxxxx        │       │
│   │ [📋 IDをコピー]      │       │
│   └──────────────────────┘       │
│                                    │
│   研究者にこのユーザーIDを         │
│   伝えてください。                 │
│                                    │
│   [🔄 再読み込み]                 │
└────────────────────────────────────┘
```

#### 主要機能
- ユーザーIDをlocalStorageから取得して表示
- コピーボタンでクリップボードにコピー
- 再読み込みボタンで`window.location.reload()`

---

### 4. StaticUINavigator

**ファイル**: `/concern-app/src/navigators/StaticUINavigator.tsx`

#### 責務
- 固定UI条件（static_ui）用のルーティング設定
- 固定UIフロー画面へのルーティング

#### ルート定義

| Path | Component | 説明 |
|------|-----------|------|
| `/` | HomeScreen | ホーム |
| `/concern/input` | ConcernInputScreen | 関心事入力 |
| `/concern/level` | ConcernLevelScreen | 関心事レベル |
| `/concern/category` | CategorySelectionScreen | カテゴリ選択 |
| `/concern/approach` | ApproachScreen | アプローチ選択 |
| `/concern/breakdown` | BreakdownScreen | アクション分解 |
| `/tasks/recommend` | StaticTaskRecommendationScreen | タスク推奨（固定UI版） |
| `/tasks/recommend/static` | StaticTaskRecommendationScreen | タスク推奨（固定UI版） |
| `/tasks` | TaskListScreen | タスク一覧 |
| `/tasks/create` | TaskCreateScreen | タスク作成 |
| `/settings` | SettingsScreen | 設定 |

---

### 5. SettingsScreen

**ファイル**: `/concern-app/src/screens/SettingsScreen.tsx`

#### 責務
- ユーザーIDの表示
- 実験条件の表示
- 統計情報の表示
- デバッグ用条件切り替え（開発環境のみ）

#### UI構成

```
┌─────────────────────────────────────┐
│ 設定                                │
├─────────────────────────────────────┤
│ ユーザーID                          │
│ ┌─────────────────────────────────┐│
│ │ user_xxxxxxxxxx                 ││
│ └─────────────────────────────────┘│
├─────────────────────────────────────┤
│ 実験条件                            │
│ ┌─────────────────────────────────┐│
│ │ 動的UI版                        ││
│ │ LLMによる動的UI生成を使用       ││
│ │ 割り当て日時: 2025/10/19 12:00  ││
│ └─────────────────────────────────┘│
├─────────────────────────────────────┤
│ 統計情報                            │
│ ┌────────┬────────┬────────┬───────┐│
│ │タスク  │着手    │完了    │スッキリ││
│ │作成数  │回数    │回数    │度     ││
│ │   5    │   8    │   6    │  2.3  ││
│ └────────┴────────┴────────┴───────┘│
├─────────────────────────────────────┤
│ 🔧 デバッグ機能 (開発環境のみ)      │
│ [🔄 条件を切り替え]                 │
└─────────────────────────────────────┘
```

#### 表示情報

**ユーザーID**
- localStorageから取得
- monospace フォントで表示

**実験条件**
- `experimentService.getCachedCondition()`から取得
- 未割り当ての場合は警告表示
- 割り当て日時とexperimentIdを表示

**統計情報**
- タスク作成数: `db.tasks` から集計
- 着手回数: `db.actionReports` から集計
- 完了回数: `clarityImprovement` が定義されているレポート数
- 平均スッキリ度: 完了レポートの`clarityImprovement`の平均

**デバッグ機能**
- `import.meta.env.DEV` でのみ表示
- 警告ダイアログで確認後に `experimentService.switchCondition()` 実行

---

### 6. AdminUserManagement

**ファイル**: `/concern-app/src/screens/AdminUserManagement.tsx`

#### 責務
- 全ユーザーの割り当て状況を表示
- 条件別の人数サマリーを表示
- 条件の手動割り当て
- 割り当ての削除

#### UI構成

```
┌───────────────────────────────────────────────────────┐
│ 実験条件管理（管理者用）                              │
├───────────────────────────────────────────────────────┤
│ ┌────────────┬────────────┬────────────┐             │
│ │ 動的UI群   │ 固定UI群   │ 未割り当て │             │
│ │    2名     │    2名     │    1名     │             │
│ └────────────┴────────────┴────────────┘             │
├───────────────────────────────────────────────────────┤
│ ユーザーID | 実験条件 | 割り当て日時 | メモ | 操作 │
│───────────────────────────────────────────────────────│
│ user_001   │ 動的UI   │ 2025/10/19  │ -   │[動的]│
│            │          │   12:00     │     │[固定]│
│            │          │             │     │[削除]│
│───────────────────────────────────────────────────────│
│ user_002   │未割り当て│ -           │ -   │[動的]│
│            │          │             │     │[固定]│
│───────────────────────────────────────────────────────│
│                                                       │
│ ⚠️ 運用ガイド                                        │
│ • 被験者を均等に割り当ててください                   │
│ • 割り当て後、被験者にリロードしてもらってください   │
└───────────────────────────────────────────────────────┘
```

#### 主要機能

**データ取得**
- `/admin/assignments` から全割り当て状況を取得
- `/admin/assignments/counts` から条件別人数を取得
- ユーザー一覧は現時点ではlocalStorageから現在のユーザーのみ取得（TODO: 全ユーザー取得API実装）

**条件割り当て**
1. 「動的UI」または「固定UI」ボタンをクリック
2. メモ入力ダイアログ表示（オプション）
3. `POST /admin/assignments` API呼び出し
4. 成功したらデータ再読み込み

**割り当て削除**
1. 「削除」ボタンをクリック
2. 確認ダイアログ表示
3. `DELETE /admin/assignments/:userId` API呼び出し
4. 成功したらデータ再読み込み

---

## データモデル

### ExperimentAssignment（実験条件割り当て）

```typescript
interface ExperimentAssignment {
  userId: string;              // ユーザーID
  condition: 'dynamic_ui' | 'static_ui' | null;  // 実験条件
  assignedAt: Date | null;     // 割り当て日時
  method: 'manual';            // 割り当て方法（手動のみ）
  experimentId: string;        // 実験ID
  assignedBy?: string;         // 割り当てを実施した管理者ID
  note?: string;               // 割り当て時のメモ
}
```

### UserProfile拡張（IndexedDB）

```typescript
interface UserProfile {
  // 既存フィールド...
  
  // Phase 2 Step 5 追加フィールド
  experimentCondition?: 'dynamic_ui' | 'static_ui';
  experimentAssignedAt?: Date;
  conditionOverriddenByUser?: boolean;  // デバッグ用切り替えフラグ
}
```

---

## API仕様

### 1. GET /v1/config

#### 目的
クライアントに設定と実験条件を配布

#### リクエスト
```
GET /v1/config HTTP/1.1
Host: localhost:3000
X-User-ID: user_xxxxxxxxxx
```

#### レスポンス
```json
{
  "configVersion": "v1.0",
  "weightsVersion": "v1.0",
  "experimentId": "exp_2025_10",
  "experimentAssignment": {
    "condition": "dynamic_ui" | "static_ui" | null,
    "assignedAt": "2025-10-19T03:00:00.000Z" | null,
    "method": "manual",
    "assignedBy": "admin" | null
  },
  "weights": { /* ... */ },
  "uiNoveltyPolicy": { /* ... */ },
  "model": { /* ... */ }
}
```

#### 動作
- `X-User-ID` ヘッダーからユーザーIDを取得
- `ExperimentService.getCondition(userId)` を呼び出し
- 未割り当ての場合は `condition: null` を返す

---

### 2. GET /admin/assignments

#### 目的
全ユーザーの割り当て状況を取得（管理画面用）

#### リクエスト
```
GET /admin/assignments HTTP/1.1
Host: localhost:3000
```

#### レスポンス
```json
{
  "assignments": [
    {
      "userId": "user_001",
      "condition": "dynamic_ui",
      "assignedAt": "2025-10-19T03:00:00.000Z",
      "method": "manual",
      "experimentId": "exp_2025_10",
      "assignedBy": "admin",
      "note": "テスト被験者1"
    },
    {
      "userId": "user_002",
      "condition": "static_ui",
      "assignedAt": "2025-10-19T03:10:00.000Z",
      "method": "manual",
      "experimentId": "exp_2025_10",
      "assignedBy": "admin",
      "note": null
    }
  ]
}
```

---

### 3. GET /admin/assignments/counts

#### 目的
条件別の人数を取得（管理画面用）

#### リクエスト
```
GET /admin/assignments/counts HTTP/1.1
Host: localhost:3000
```

#### レスポンス
```json
{
  "dynamic_ui": 2,
  "static_ui": 2,
  "unassigned": 1
}
```

---

### 4. POST /admin/assignments

#### 目的
条件を手動割り当て

#### リクエスト
```json
POST /admin/assignments HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "userId": "user_003",
  "condition": "dynamic_ui",
  "assignedBy": "admin",
  "note": "テスト被験者3"
}
```

#### レスポンス（成功）
```json
{
  "success": true,
  "assignment": {
    "userId": "user_003",
    "condition": "dynamic_ui",
    "assignedAt": "2025-10-19T03:20:00.000Z",
    "method": "manual",
    "experimentId": "exp_2025_10",
    "assignedBy": "admin",
    "note": "テスト被験者3"
  }
}
```

#### レスポンス（エラー）
```json
{
  "error": "Invalid condition",
  "allowed": ["dynamic_ui", "static_ui"]
}
```

#### バリデーション
- `userId`: 必須
- `condition`: 必須、'dynamic_ui' または 'static_ui'
- `assignedBy`: 必須
- `note`: オプション

---

### 5. DELETE /admin/assignments/:userId

#### 目的
割り当てを削除

#### リクエスト
```
DELETE /admin/assignments/user_003 HTTP/1.1
Host: localhost:3000
```

#### レスポンス（成功）
```json
{
  "success": true
}
```

#### レスポンス（エラー）
```json
{
  "error": "Internal server error",
  "message": "User not found"
}
```

---

### 6. GET /admin/health

#### 目的
管理者APIのヘルスチェック（開発用）

#### リクエスト
```
GET /admin/health HTTP/1.1
Host: localhost:3000
```

#### レスポンス
```json
{
  "status": "ok",
  "service": "admin-api",
  "timestamp": "2025-10-19T03:00:00.000Z"
}
```

---

## 画面仕様

### 画面一覧

| 画面名 | ファイル | 表示条件 | 説明 |
|--------|---------|---------|------|
| UnassignedScreen | `UnassignedScreen.tsx` | condition === null | 未割り当てユーザー用待機画面 |
| SettingsScreen | `SettingsScreen.tsx` | 全条件（共通） | ユーザー用設定画面 |
| AdminUserManagement | `AdminUserManagement.tsx` | 管理者のみ | 管理者用条件管理画面 |

詳細は上記[クライアント側実装](#クライアント側実装)を参照。

---

## 運用フロー

### 通常運用フロー

```
1. 被験者登録
   ↓
   被験者がアプリにアクセス
   ↓
   自動的に匿名ユーザーIDが生成される (localStorage)
   ↓
   UnassignedScreen が表示される
   ↓
   被験者がユーザーIDをメモ・コピー

2. 管理者による割り当て
   ↓
   管理者が AdminUserManagement 画面にアクセス
   ↓
   ユーザーID一覧を確認
   ↓
   各ユーザーに条件を割り当て（動的UI / 固定UI）
   ↓
   均等割り当てを心がける（動的UI: 2-3名、固定UI: 2-3名）
   ↓
   必要に応じてメモを記録

3. 実験開始
   ↓
   被験者にアプリをリロードしてもらう
   ↓
   割り当てられた条件のUIが表示される
   ↓
   通常通り使用してもらう

4. データ収集
   ↓
   イベントログに条件情報が自動記録される
   ↓
   AdminDashboard で着手率・スッキリ度を確認（Phase 2 Step 6以降）
```

### デバッグフロー（開発環境のみ）

```
開発者がアプリにアクセス
   ↓
設定画面 (/settings) を開く
   ↓
「🔧 デバッグ機能」セクションが表示される（開発環境のみ）
   ↓
「🔄 条件を切り替え」ボタンをクリック
   ↓
警告ダイアログで確認
   ↓
条件が切り替わる (dynamic_ui ↔ static_ui)
   ↓
自動的にページリロード
   ↓
切り替わった条件のUIが表示される
```

---

## 実装の制約と注意事項

### 制約事項

1. **データベース永続化未実装**
   - 現時点ではメモリキャッシュ（Map）のみ
   - サーバー再起動で割り当て情報が消失
   - TODOコメントでDB実装箇所を明記

2. **全ユーザー一覧取得API未実装**
   - AdminUserManagement画面では現在のユーザーのみ表示
   - 実運用には全ユーザー取得APIが必要

3. **認証・認可なし**
   - AdminUserManagement画面は誰でもアクセス可能
   - 本番運用時は認証機構の追加が必要

4. **未割り当て数の計算が不正確**
   - 全ユーザー数が取得できないため、unassignedは常に0

### 注意事項

1. **デバッグ用条件切り替えの制限**
   - 開発環境（`import.meta.env.DEV`）でのみ有効
   - 本番環境では実行不可（早期リターン）
   - データの一貫性を損なう可能性があるため慎重に使用

2. **実験IDの固定**
   - `experimentId = 'exp_2025_10'` で固定
   - 複数の実験を並行実施する場合は設計変更が必要

3. **割り当て変更の影響**
   - 既に割り当てられているユーザーの条件を変更すると、過去のイベントログとの整合性が失われる可能性
   - 変更は慎重に行うこと

4. **キャッシュの一貫性**
   - サーバー側とクライアント側で独立したキャッシュ
   - サーバー再起動後はクライアントのキャッシュとずれる可能性
   - リロードで再取得されるため大きな問題はない

### 将来の拡張ポイント

1. **データベース実装**
   - SQLiteまたはPostgreSQLでの永続化
   - マイグレーションスクリプト作成

2. **全ユーザー管理**
   - `/admin/users` エンドポイント追加
   - ユーザー登録・削除機能

3. **認証・認可**
   - 管理者ログイン機能
   - JWTトークンによる認証

4. **割り当て履歴**
   - 割り当て変更履歴の記録
   - 誰が・いつ・何を変更したかの監査ログ

5. **自動割り当て機能の復活**
   - 被験者数が増えた場合の自動割り当てオプション
   - ハッシュベースまたはラウンドロビン方式

---

## コミット履歴

| Commit Hash | 日付 | 説明 |
|------------|------|------|
| f18e61e | 2025-10-19 | feat(phase2): Implement manual assignment ExperimentService and admin API |
| 2d08dfa | 2025-10-19 | feat(phase2): Implement ClientExperimentService |
| c1c7035 | 2025-10-19 | feat(phase2): Implement A/B testing manual assignment mechanism (client-side) |

---

**作成者**: AI Agent (Claude Sonnet 4.5)  
**参照**: `specs/project/phase2/ab_testing.md`  
**最終更新**: 2025年10月19日

