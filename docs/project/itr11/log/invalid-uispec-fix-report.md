# INVALID_UISPEC エラーハンドリング修正レポート

## 1. 問題概要

### 1.1 発生したエラー
バッチ実験実行時、Stage 3（UISpec生成）において以下のTypeErrorが発生：

```
TypeError: undefined is not an object (evaluating 'uiSpec.widgets.length')
  at validateUISpec (/server/src/services/v4/ValidationService.ts:396:32)
  at executeStage (/server/src/services/BatchExecutionService.ts:448:37)
```

### 1.2 エラー発生条件
- LLMがUISpecを生成する際に`widgets`プロパティを省略した場合
- LLMが不正なJSON構造を返した場合
- LLM出力がnullまたはundefinedの場合

### 1.3 問題の影響
- 本来DSL検証エラー（`INVALID_UISPEC_STRUCTURE`等）として記録すべきケースが`RUNTIME_ERROR`として記録されていた
- エラーの定性分析が困難になっていた
- バッチ実験の統計精度に影響

---

## 2. 根本原因分析

### 2.1 コードフロー
```
BatchExecutionService.executeStage()
  → validateStageOutput()
    → ValidationService.validateUISpec()
      → uiSpec.widgets.length  // ← null/undefined時にTypeError
```

### 2.2 原因箇所
`ValidationService.validateUISpec()`（修正前 line 384付近）で、`uiSpec.widgets`の存在チェックなしに直接アクセスしていた。

**修正前のコード:**
```typescript
validateUISpec(uiSpec: UISpec, ors?: ORS): ValidationResult {
  // バージョンチェック
  if (uiSpec.version !== '4.0') {
    errors.push(this.createError('INVALID_VERSION', ...));
  }

  // Widget検証 - ここでTypeError
  for (let i = 0; i < uiSpec.widgets.length; i++) {
    // ...
  }
}
```

### 2.3 DSLバージョン問題の発見
調査中に追加で発見された問題：
- 本番環境ではDSL v5.0（PlanUISpec構造）が使用されている
- `ValidationService`がv5.0の`sections`構造に未対応だった
- Stage 3は`PlanUISpec`（3セクション構造）のみを生成

---

## 3. DSL構造調査結果

### 3.1 DSL v4.0 (UISpec) 構造
```typescript
interface UISpec {
  version: "4.0";
  sessionId: string;
  stage: 'diverge' | 'organize' | 'converge' | 'summary';
  widgets: WidgetSpec[];  // フラット配列
  reactiveBindings: ReactiveBindingSpec;
  layout: LayoutSpec;
  metadata: MetadataSpec;
}
```

### 3.2 DSL v5.0 (PlanUISpec) 構造
```typescript
interface PlanUISpec {
  version: "5.0";
  sessionId: string;
  stage: 'plan';
  sections: {
    diverge: { header: SectionHeader; widgets: WidgetSpec[] };
    organize: { header: SectionHeader; widgets: WidgetSpec[] };
    converge: { header: SectionHeader; widgets: WidgetSpec[] };
  };
  reactiveBindings: ReactiveBindingSpec;  // cross-section W2WR
  layout: { type: 'sectioned'; ... };
  metadata: MetadataSpec;
}
```

### 3.3 主な違い

| 観点 | v4.0 | v5.0 |
|------|------|------|
| Widget配置 | `widgets[]` フラット | `sections.{diverge,organize,converge}.widgets[]` |
| ステージ | 4段階（diverge, organize, converge, summary） | plan + summary |
| W2WRスコープ | 同一ステージ内のみ | クロスセクション可能 |
| 検証パス | `widgets[i]` | `sections.{section}.widgets[i]` |

---

## 4. 修正内容

### 4.1 ValidationService.ts - null/構造チェック追加

**ファイル:** `server/src/services/v4/ValidationService.ts`

#### validateUISpec() の修正（line 389-411）
```typescript
validateUISpec(uiSpec: UISpec, ors?: ORS): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const info: ValidationError[] = [];

  // NEW: null/undefinedチェック
  if (!uiSpec || typeof uiSpec !== 'object') {
    errors.push(this.createError('INVALID_UISPEC', 'UISpec is null or not an object', 'root'));
    return this.buildResult(errors, warnings, info);
  }

  // NEW: v5.0 PlanUISpec判定 → 専用メソッドへルーティング
  if ('sections' in uiSpec) {
    return this.validatePlanUISpec(uiSpec as unknown as PlanUISpec, ors);
  }

  // NEW: widgets配列チェック
  if (!Array.isArray(uiSpec.widgets)) {
    errors.push(
      this.createError('INVALID_UISPEC_STRUCTURE', 'UISpec.widgets is missing or not an array', 'widgets')
    );
    return this.buildResult(errors, warnings, info);
  }

  // バージョンチェック
  if (uiSpec.version !== '4.0') {
    errors.push(this.createError('INVALID_VERSION', ...));
  }

  // Widget検証（既存ロジック - 安全にアクセス可能）
  for (let i = 0; i < uiSpec.widgets.length; i++) {
    // ...
  }
}
```

#### validatePlanUISpec() の新規追加（line 444-514）
```typescript
validatePlanUISpec(planUISpec: PlanUISpec, ors?: ORS): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const info: ValidationError[] = [];

  // null/undefinedチェック
  if (!planUISpec || typeof planUISpec !== 'object') {
    errors.push(this.createError('INVALID_UISPEC', 'PlanUISpec is null or not an object', 'root'));
    return this.buildResult(errors, warnings, info);
  }

  // sections構造チェック
  if (!planUISpec.sections || typeof planUISpec.sections !== 'object') {
    errors.push(
      this.createError('INVALID_UISPEC_STRUCTURE', 'PlanUISpec.sections is missing or not an object', 'sections')
    );
    return this.buildResult(errors, warnings, info);
  }

  // バージョンチェック
  if (planUISpec.version !== '5.0') {
    errors.push(
      this.createError('INVALID_VERSION', `Invalid version: ${planUISpec.version}, expected 5.0`, 'version')
    );
  }

  // 各セクションのwidgets配列チェック
  const widgetIds = new Set<string>();
  for (const sectionName of ['diverge', 'organize', 'converge'] as const) {
    const section = planUISpec.sections[sectionName];
    if (!section || !Array.isArray(section.widgets)) {
      errors.push(
        this.createError(
          'INVALID_UISPEC_STRUCTURE',
          `PlanUISpec.sections.${sectionName}.widgets is missing or not an array`,
          `sections.${sectionName}.widgets`
        )
      );
      continue;
    }

    // セクション内の各Widgetを検証
    for (let i = 0; i < section.widgets.length; i++) {
      const widget = section.widgets[i];
      const path = `sections.${sectionName}.widgets[${i}]`;

      // 重複チェック、Widget定義チェック、DataBinding検証...
    }
  }

  // ReactiveBinding検証
  if (planUISpec.reactiveBindings) {
    this.validateReactiveBindings(planUISpec.reactiveBindings, widgetIds, errors, warnings, info);
  }

  return this.buildResult(errors, warnings, info);
}
```

### 4.2 DSL_ERROR_TYPES 更新

**ファイル:**
- `server/src/services/v4/ValidationService.ts` (line 738-744)
- `server/src/types/experiment-trial.types.ts` (line 243-244)

```typescript
export const DSL_ERROR_TYPES = [
  // ... 既存エラー ...
  'INVALID_VERSION',
  'NO_WIDGETS',
  'DUPLICATE_WIDGET',
  'SELF_REFERENCE',
  'INVALID_RELATIONSHIP',
  // NEW: 追加されたエラータイプ
  'INVALID_UISPEC',           // UISpec自体がnull/undefined/非オブジェクト
  'INVALID_UISPEC_STRUCTURE', // widgets/sections構造の欠落
] as const;
```

### 4.3 プロンプト強化（v4.0用）

**ファイル:** `server/src/prompts/v4/uispec-generation.prompt.ts` (line 238-266)

```markdown
## 出力構造の必須要件【重要】
以下のフィールドは**絶対に省略しないでください**。省略するとシステムエラーになります。

1. **widgets**: 必ず配列として定義してください。Widgetが0件でも空配列 `"widgets": []` を出力してください
2. **reactiveBindings**: 必ずオブジェクトとして定義してください。バインディングが0件でも `"reactiveBindings": { "bindings": [] }` を出力してください
3. **version**: 必ず "4.0" を指定してください

**エラー例（NG - 絶対に避けてください）**:
\`\`\`json
{
  "version": "4.0",
  "sessionId": "...",
  "stage": "diverge"
  // widgets が省略されている - これは無効です！システムエラーになります
}
\`\`\`

**正しい例（OK）**:
\`\`\`json
{
  "version": "4.0",
  "sessionId": "...",
  "stage": "diverge",
  "widgets": [],
  "reactiveBindings": { "bindings": [] },
  "layout": { "type": "single_column" },
  "metadata": { "generatedAt": ..., "llmModel": "..." }
}
\`\`\`
```

---

## 5. テストケース

**ファイル:** `server/src/services/v4/__tests__/ValidationService.test.ts`

### 5.1 v4.0 UISpec構造検証テスト（6件追加）

| テスト名 | 検証内容 |
|----------|----------|
| `null UISpecでINVALID_UISPECエラー` | `null`入力時にINVALID_UISPECエラー |
| `undefined UISpecでINVALID_UISPECエラー` | `undefined`入力時にINVALID_UISPECエラー |
| `widgets未定義でINVALID_UISPEC_STRUCTUREエラー` | widgetsプロパティ欠落時 |
| `widgetsがnullでINVALID_UISPEC_STRUCTUREエラー` | `widgets: null`時 |
| `widgetsがオブジェクト（非配列）でINVALID_UISPEC_STRUCTUREエラー` | `widgets: {}`時 |
| `空のwidgets配列は構造エラーにならない` | `widgets: []`は許容 |

### 5.2 v5.0 PlanUISpec構造検証テスト（8件追加）

| テスト名 | 検証内容 |
|----------|----------|
| `null PlanUISpecでINVALID_UISPECエラー` | `null`入力時 |
| `undefined PlanUISpecでINVALID_UISPECエラー` | `undefined`入力時 |
| `sections未定義でINVALID_UISPEC_STRUCTUREエラー` | sectionsプロパティ欠落時 |
| `sectionsがnullでINVALID_UISPEC_STRUCTUREエラー` | `sections: null`時 |
| `セクション内widgets未定義でINVALID_UISPEC_STRUCTUREエラー` | `sections.diverge.widgets`欠落時 |
| `バージョン不一致でINVALID_VERSIONエラー` | `version: "4.0"`時（5.0期待） |
| `有効なPlanUISpecは構造エラーなし` | 正しい構造のパス |
| `validateUISpecからPlanUISpecへの自動ルーティング` | sections検出時の自動ルーティング |

### 5.3 テスト実行結果
```
bun test src/services/v4/__tests__/ValidationService.test.ts
 22 pass
 1 fail  (既存の無関係なテスト)
 38 expect() calls
```

---

## 6. 検証フロー図

### 6.1 修正後の検証フロー

```
validateUISpec(uiSpec)
    │
    ├─ uiSpec が null/undefined/非オブジェクト?
    │   └─ YES → INVALID_UISPEC エラーで即時リターン
    │
    ├─ 'sections' in uiSpec?
    │   └─ YES → validatePlanUISpec()へルーティング
    │               │
    │               ├─ sections が null/非オブジェクト?
    │               │   └─ YES → INVALID_UISPEC_STRUCTURE
    │               │
    │               ├─ version !== '5.0'?
    │               │   └─ YES → INVALID_VERSION
    │               │
    │               └─ 各セクション (diverge/organize/converge) の widgets 検証
    │
    ├─ uiSpec.widgets が配列でない?
    │   └─ YES → INVALID_UISPEC_STRUCTURE エラーで即時リターン
    │
    ├─ version !== '4.0'?
    │   └─ YES → INVALID_VERSION エラー
    │
    └─ widgets[] 内の各Widgetを検証
        ├─ 重複ID → DUPLICATE_WIDGET_ID
        ├─ 未知コンポーネント → UNKNOWN_WIDGET
        └─ DataBinding検証
```

### 6.2 エラー分類体系

```
DSLエラー
├── 構造エラー（即時リターン）
│   ├── INVALID_UISPEC         : 入力がnull/undefined/非オブジェクト
│   └── INVALID_UISPEC_STRUCTURE: 必須構造(widgets/sections)の欠落
│
├── バージョンエラー
│   └── INVALID_VERSION        : バージョン不一致
│
├── Widget定義エラー
│   ├── UNKNOWN_WIDGET         : 未知のコンポーネント
│   ├── DUPLICATE_WIDGET_ID    : ID重複
│   └── NO_WIDGETS             : Widget数が0
│
└── バインディングエラー
    ├── CIRCULAR_DEPENDENCY    : 循環依存
    ├── SELF_REFERENCE         : 自己参照
    └── INVALID_BINDING        : 不正なバインディング定義
```

---

## 7. 修正の効果

### 7.1 エラー分類の改善

| シナリオ | 修正前 | 修正後 |
|----------|--------|--------|
| LLMがwidgets省略 | `RUNTIME_ERROR` (TypeError) | `INVALID_UISPEC_STRUCTURE` |
| LLMがnull出力 | `RUNTIME_ERROR` (TypeError) | `INVALID_UISPEC` |
| v5.0構造をv4検証 | バージョンエラー後にTypeError | 自動ルーティングで正常検証 |

### 7.2 定量的改善
- **エラーの定性分析可能性**: 向上（エラータイプで原因特定可能）
- **バッチ実験の安定性**: 向上（TypeErrorでのクラッシュ防止）
- **DSL妥当率(VR)計算精度**: 向上（正しいエラー分類）

---

## 8. 関連ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `server/src/services/v4/ValidationService.ts` | validateUISpec修正、validatePlanUISpec追加、DSL_ERROR_TYPES更新 |
| `server/src/types/experiment-trial.types.ts` | DSL_ERROR_TYPES同期 |
| `server/src/prompts/v4/uispec-generation.prompt.ts` | 必須要件セクション追加 |
| `server/src/services/v4/__tests__/ValidationService.test.ts` | 14件のテストケース追加 |

---

## 9. 今後の推奨事項

1. **v5.0プロンプト強化**: `plan-unified.prompt.ts`にも同様の必須要件セクションを追加
2. **ORSの同様のチェック**: `validateORS()`にも同様のnull/構造チェックが既に実装済み（参考パターン）
3. **エラー統計ダッシュボード**: エラータイプ別の発生率を可視化するUIの追加検討

---

## 付録: 元のエラーログ

```
Stage 3 error: 391 |       errors.push(this.createError('INVALID_VERSION', ...));
392 |     }
393 |
394 |     // Widget検証
395 |     const widgetIds = new Set<string>();
396 |     for (let i = 0; i < uiSpec.widgets.length; i++) {
                                    ^
TypeError: undefined is not an object (evaluating 'uiSpec.widgets.length')
```

**原因**: LLM出力に`widgets`プロパティが含まれていなかった。

**解決**: null/構造チェックを追加し、適切なDSLエラータイプで記録するよう修正。
