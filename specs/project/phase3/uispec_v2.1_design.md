# UISpec v2.1 設計書

**日付**: 2025-10-20
**バージョン**: 2.1
**ステータス**: 設計中
**前バージョン**: 2.0

---

## 🎯 v2.1の目的

v2.0で発見された**レイヤー混在問題**を解決し、責務を明確化する。

### v2.0の問題点

1. **actionsの責務が不明確**: メタ機能（ナビゲーション）とステージ内機能が混在
2. **ルーティング依存**: LLMが`target: "plan"`を生成するが、実パスは`/concern/plan`で齟齬
3. **状態管理の欠如**: フロー全体の状態管理がない
4. **フォールバックの脆弱性**: LLMの失敗でナビゲーションが壊れる

---

## 🏗️ v2.1のアーキテクチャ

### レイヤー分離の原則

```
┌─────────────────────────────────────────────────────────┐
│ メタUI層 (Meta UI Layer)                                │
│ - 責務: フロー制御、状態管理、ナビゲーション            │
│ - 実装: クライアント（React）が完全制御                 │
│ - 構成要素:                                             │
│   * ヘッダー: プログレス表示、ステージ名                │
│   * フッター: 次へ/戻る/下書き保存ボタン                │
│   * 状態管理: ConcernFlowStateManager拡張               │
├─────────────────────────────────────────────────────────┤
│ コンテンツ層 (Content Layer)                            │
│ - 責務: ユーザー入力の収集、動的なUI要素               │
│ - 実装: LLMが生成、クライアントがレンダリング           │
│ - 構成要素: UISpec v2.1                                 │
│   * sections: フォームフィールド                        │
│   * actions: ステージ内補助機能のみ                     │
│     （例: 再生成、AIアドバイス、プレビュー）            │
└─────────────────────────────────────────────────────────┘
```

---

## 📐 UISpec v2.1 型定義

### 主要な変更点

| 項目 | v2.0 | v2.1 | 理由 |
|-----|------|------|------|
| `actions` | 必須、すべてのアクションを含む | **オプショナル**、ステージ内補助機能のみ | メタ機能をクライアントに移譲 |
| ActionType | 7種類（submit, save, navigate, ...） | **3種類**（compute, validate, custom） | 責務を限定 |
| `target`属性 | 画面遷移先を指定 | **廃止** | ルーティングはクライアントが管理 |
| `position` | 4種類（top, bottom, section, inline） | **2種類**（section, inline） | top/bottomはメタUI層で使用 |

### TypeScript型定義

```typescript
/**
 * UISpec v2.1
 */
export interface UISpecV2_1 {
  /** バージョン */
  version: "2.1";

  /** ステージ */
  stage: UIStage;

  /** UIセクション */
  sections: UISection[];

  /** ステージ内補助アクション（オプショナル） */
  auxiliaryActions?: AuxiliaryAction[];

  /** メタデータ */
  metadata?: UIMetadata;
}

/**
 * ステージ内補助アクション
 *
 * フロー制御には関与しない、ステージ内で完結する機能のみ
 */
export interface AuxiliaryAction {
  /** アクションID */
  id: string;

  /** アクションタイプ */
  type: AuxiliaryActionType;

  /** ボタンラベル（日本語） */
  label: string;

  /** アイコン（絵文字） */
  icon?: string;

  /** 配置位置（sectionまたはinlineのみ） */
  position: "section" | "inline";

  /** 関連フィールドID（position="inline"時） */
  targetFieldId?: string;

  /** ボタンスタイル */
  style?: "primary" | "secondary" | "text";

  /** 実行条件式 */
  condition?: string;

  /** 確認メッセージ */
  confirmation?: string;
}

/**
 * 補助アクションタイプ
 */
export type AuxiliaryActionType =
  | "compute"    // 再計算・再生成（例: "別の提案を見る"）
  | "validate"   // バリデーション実行（例: "入力内容を確認"）
  | "custom";    // カスタムアクション（例: "AIに相談"）

/**
 * UIStage
 */
export type UIStage = "capture" | "plan" | "breakdown";

// UISection, UIField, FieldOptions等は v2.0 と同じ
```

---

## 🎨 メタUI層の仕様

### 固定UI要素

#### 1. **ヘッダー（ProgressHeader）**

```tsx
<ProgressHeader stage={stage} />
```

**表示内容**:
```
┌─────────────────────────────────────┐
│ ●━━━○━━━○  Step 1/3: 関心事の把握  │
└─────────────────────────────────────┘
```

- ステージ進捗（capture → plan → breakdown）
- 現在のステージ名（日本語）

#### 2. **フッター（NavigationFooter）**

```tsx
<NavigationFooter
  stage={stage}
  onBack={handleBack}
  onSave={handleSaveDraft}
  onNext={handleNext}
  isNextEnabled={isValid}
/>
```

**表示内容**:
```
┌─────────────────────────────────────┐
│  [← 戻る]  [💾 下書き保存]  [次へ →] │
└─────────────────────────────────────┘
```

**動作**:
- **戻る**: 前のステージに遷移（captureでは非表示）
- **下書き保存**: 現在の入力内容をLocalStorageに保存
- **次へ**: バリデーション後、次のステージに遷移

#### 3. **状態管理（ConcernFlowStateManager拡張）**

```typescript
interface FlowState {
  sessionId: string;
  concernText: string;

  // ステージごとの入力データ
  stages: {
    capture?: FormData;
    plan?: FormData;
    breakdown?: FormData;
  };

  // 現在のステージ
  currentStage: UIStage;

  // タイムスタンプ
  createdAt: string;
  updatedAt: string;
}
```

**保存タイミング**:
- フィールド変更時（debounce 500ms）
- 下書き保存ボタン押下時
- 次へボタン押下時

---

## 📊 actionsの使用例

### ✅ 正しい使用例（ステージ内補助機能）

#### Planステージの例

```json
{
  "version": "2.1",
  "stage": "plan",
  "sections": [...],
  "auxiliaryActions": [
    {
      "id": "regenerate_approaches",
      "type": "compute",
      "label": "別のアプローチを提案",
      "icon": "🔄",
      "position": "section",
      "style": "text"
    },
    {
      "id": "ask_ai_advice",
      "type": "custom",
      "label": "AIにアドバイスを求める",
      "icon": "💡",
      "position": "inline",
      "targetFieldId": "approach",
      "style": "secondary"
    },
    {
      "id": "preview_tasks",
      "type": "compute",
      "label": "タスクをプレビュー",
      "icon": "👁️",
      "position": "section",
      "style": "secondary",
      "condition": "approach != null"
    }
  ]
}
```

**各アクションの意味**:
1. **regenerate_approaches**: 現在の関心事に基づいて別のアプローチを再生成
2. **ask_ai_advice**: 選択したアプローチについてAIからアドバイスを受ける
3. **preview_tasks**: 現在の計画からタスクリストのプレビューを表示

#### Breakdownステージの例

```json
{
  "version": "2.1",
  "stage": "breakdown",
  "sections": [...],
  "auxiliaryActions": [
    {
      "id": "suggest_subtasks",
      "type": "compute",
      "label": "サブタスクを提案",
      "icon": "➕",
      "position": "inline",
      "targetFieldId": "task_list",
      "style": "text"
    },
    {
      "id": "optimize_order",
      "type": "compute",
      "label": "最適な順序に並べ替え",
      "icon": "🔀",
      "position": "section",
      "style": "secondary"
    }
  ]
}
```

### ❌ 誤った使用例（メタ機能）

```json
// ❌ これらは auxiliaryActions に含めない
{
  "id": "next",
  "type": "submit",
  "label": "次へ進む",
  "target": "plan"  // ← NG: ルーティングはクライアントが管理
}

{
  "id": "save_draft",
  "type": "save",
  "label": "下書き保存"  // ← NG: メタ機能はクライアントが提供
}

{
  "id": "back",
  "type": "navigate",
  "label": "戻る"  // ← NG: フロー制御はクライアントが管理
}
```

---

## 🔄 v2.0 → v2.1 移行ガイド

### 変更が必要なファイル

#### 1. 型定義
- ✏️ `server/src/types/UISpecV2.ts` → `UISpecV2_1.ts`に拡張
- ✏️ `server/src/types/UISpecV2Schema.ts` → Zodスキーマ更新

#### 2. バックエンド
- ✏️ `server/src/services/UISpecGeneratorV2.ts`
  - プロンプトから`必須アクション`セクション削除
  - `auxiliaryActions`の生成ロジック追加（オプショナル）

#### 3. フロントエンド
- ✅ **新規作成** `concern-app/src/components/meta/ProgressHeader.tsx`
- ✅ **新規作成** `concern-app/src/components/meta/NavigationFooter.tsx`
- ✏️ `concern-app/src/services/ConcernFlowStateManager.ts` - 拡張
- ✏️ `concern-app/src/components/screens/DynamicThoughtScreenV2.tsx`
  - メタUI層の統合
  - `auxiliaryActions`のハンドリング追加

#### 4. ルーティング
- ✅ 変更不要（`DynamicUINavigator.tsx`は既にv2対応済み）

---

## 🎯 実装の優先順位

### Phase 1: メタUI層の実装（高優先度）
1. ✅ `ProgressHeader`コンポーネント作成
2. ✅ `NavigationFooter`コンポーネント作成
3. ✅ `ConcernFlowStateManager`拡張（フロー全体の状態管理）
4. ✅ `DynamicThoughtScreenV2`にメタUI統合

### Phase 2: UISpec v2.1対応（中優先度）
5. ✅ 型定義の作成（`UISpecV2_1.ts`）
6. ✅ Zodスキーマ更新
7. ✅ プロンプト修正（`auxiliaryActions`化）

### Phase 3: 補助アクション実装（低優先度）
8. ⏳ `auxiliaryActions`のハンドラー実装
9. ⏳ ステージごとの補助機能実装
   - 再生成
   - AIアドバイス
   - プレビュー

---

## 🧪 テスト計画

### E2Eテスト更新

```javascript
// tests/phase3_v2.1_e2e_test.js

// Test 1: UISpec v2.1構造チェック
async function testUISpecV2_1Structure() {
  const { uiSpec } = await generateUISpec('capture', concernText);

  assertEqual(uiSpec.version, '2.1', 'version');
  assertExists(uiSpec.sections, 'sections');

  // actionsではなくauxiliaryActions
  if (uiSpec.auxiliaryActions) {
    assert(Array.isArray(uiSpec.auxiliaryActions), 'auxiliaryActions is array');

    // 各actionがステージ内機能のみ
    uiSpec.auxiliaryActions.forEach(action => {
      assert(['compute', 'validate', 'custom'].includes(action.type),
        `Invalid action type: ${action.type}`);
      assert(!action.target, 'auxiliaryActions should not have target');
    });
  }
}

// Test 2: メタUI層の動作確認
async function testMetaUILayer() {
  // ProgressHeaderの表示確認
  // NavigationFooterのボタン動作確認
  // 状態保存・復元の確認
}

// Test 3: フロー全体の状態管理
async function testFlowStateManagement() {
  // capture → plan → breakdown の遷移
  // 各ステージで入力 → 保存 → 復元
  // ブラウザバックでの状態維持
}
```

---

## 📚 参考: ActionType比較表

| ActionType | v2.0 | v2.1 | 用途 |
|-----------|------|------|------|
| `submit` | ✅ | ❌ 削除 | → メタUI層の"次へ"ボタンに統合 |
| `save` | ✅ | ❌ 削除 | → メタUI層の"下書き保存"ボタンに統合 |
| `navigate` | ✅ | ❌ 削除 | → メタUI層の"戻る"ボタンに統合 |
| `reset` | ✅ | ❌ 削除 | → メタUI層の機能として実装 |
| `cancel` | ✅ | ❌ 削除 | → メタUI層の機能として実装 |
| `compute` | ✅ | ✅ 継続 | ステージ内の再計算・再生成 |
| `validate` | ✅ | ✅ 継続 | ステージ内のバリデーション |
| `custom` | ❌ | ✅ 新規 | カスタム補助機能（AIアドバイスなど） |

---

## ✅ まとめ

### v2.1の改善ポイント

1. ✅ **責務の明確化**: メタ機能とコンテンツ機能を分離
2. ✅ **堅牢性の向上**: LLMの失敗がナビゲーションに影響しない
3. ✅ **状態管理の強化**: フロー全体の状態を一元管理
4. ✅ **ユーザー体験の向上**: 一貫したナビゲーションUI
5. ✅ **保守性の向上**: ルーティング変更時にプロンプト修正不要

### 次のステップ

1. この設計書のレビューとフィードバック
2. Phase 1の実装開始（メタUI層）
3. 既存v2.0との共存期間の設定
4. v2.1移行後のv2.0廃止計画

---

**作成者**: Claude Code
**レビュー**: 未実施
**承認**: 未実施
