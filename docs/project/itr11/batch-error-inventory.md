# Batch実験のエラー記録方式と指標別エラー一覧

## 記録形式の差分
- **バックエンド検証 (Stage1-3)**: `ValidationService` が詳細な `ValidationError` を生成するが、バッチ処理では `errors.map(e => e.type)` で型名だけに潰して `dslErrors` として保存する。つまり配列には `INVALID_ORS` などエラーIDのみが並ぶ。【F:server/src/services/BatchExecutionService.ts†L495-L605】
- **フロントエンドのヘッドレス検証**: `HeadlessValidator` は React 側でレンダリングせずに検証し、`renderErrors` / `reactComponentErrors` / `jotaiAtomErrors` にそのまま文字列を push する。`UNKNOWN_WIDGET: foo` のようにIDを含むものや `ENGINE_INIT_ERROR: ...` のような動的メッセージ付きの文字列が混在するのはこのため。【F:concern-app/src/components/experiment/HeadlessValidator.tsx†L243-L327】

## 指標別に取りうるエラー
### dsl_errors (VR計算用)
- バックエンド検証エラーの型名:
  - Widget選定: `INVALID_VERSION`, `MISSING_BOTTLENECK_TYPE`, `NO_WIDGETS`, `DUPLICATE_WIDGET`, `UNKNOWN_WIDGET` など。【F:server/src/services/v4/ValidationService.ts†L105-L199】
  - ORS/PlanORS: `INVALID_ORS`, `INVALID_ENTITIES`, `DUPLICATE_ENTITY`, `DUPLICATE_ATTRIBUTE`, `INVALID_STRUCTURAL_TYPE`, `MISSING_REF`, `UNKNOWN_ENTITY`, `UNKNOWN_ATTRIBUTE`, `INVALID_PATH`, `MISSING_REQUIRED_FIELD` など。【F:server/src/services/v4/ValidationService.ts†L206-L336】
  - UISpec/PlanUISpec/ReactiveBindings: `INVALID_UISPEC`, `INVALID_UISPEC_STRUCTURE`, `DUPLICATE_WIDGET_ID`, `UNKNOWN_WIDGET`, `UNKNOWN_PORT`, `UNKNOWN_ENTITY`, `UNKNOWN_ATTRIBUTE`, `INVALID_PATH`, `DUPLICATE_BINDING`, `CIRCULAR_BINDING` など。【F:server/src/services/v4/ValidationService.ts†L501-L725】
- 生成処理そのものの失敗フォールバック: `WIDGET_SELECTION_FAILED`, `ORS_GENERATION_FAILED`, `UISPEC_GENERATION_FAILED` (モデル呼び出し失敗時に単発で格納)。【F:server/src/services/BatchExecutionService.ts†L495-L606】
- ランタイム例外時の保険: `RUNTIME_ERROR` (試行エラー時に強制付与)。【F:server/src/services/BatchExecutionService.ts†L670-L688】

### render_errors (VR計算用)
- UISpec構造系: `MISSING_UISPEC`, `NO_WIDGETS`, `DUPLICATE_WIDGET_ID`, `MISSING_WIDGET_ID`, `MISSING_COMPONENT: <widgetId>` など。【F:concern-app/src/components/experiment/HeadlessValidator.tsx†L181-L257】
- リアクティブバインディング系: `CYCLIC_DEPENDENCY`, `UNKNOWN_WIDGET: <id>`, `MISSING_JAVASCRIPT|MISSING_TRANSFORM|MISSING_LLM_PROMPT: <bindingId>` など。【F:concern-app/src/components/experiment/HeadlessValidator.tsx†L264-L283】
- エンジン初期化・例外系: `ENGINE_INIT_ERROR: <message>`, `VALIDATION_ERROR: <message>`（例外メッセージ付きで記録）。【F:concern-app/src/components/experiment/HeadlessValidator.tsx†L284-L309】

### w2wr_errors (W2WR_SR計算用)
- UISpec検証後に `['CIRCULAR_DEPENDENCY', 'SELF_REFERENCE', 'INVALID_BINDING', 'UNKNOWN_SOURCE_WIDGET', 'UNKNOWN_TARGET_WIDGET']` のみを抽出して格納。該当が無ければ null。【F:server/src/services/BatchExecutionService.ts†L585-L603】

### react_component_errors (RC_SR計算用)
- UISpec欠落・構造不備: `MISSING_UISPEC`, `NO_WIDGETS`, `DUPLICATE_WIDGET_ID`, `MISSING_WIDGET_ID`, `MISSING_COMPONENT: <widgetId>`。【F:concern-app/src/components/experiment/HeadlessValidator.tsx†L243-L303】
- 例外捕捉: `RENDER_EXCEPTION`（バリデーション処理自体の例外時に付与）。【F:concern-app/src/components/experiment/HeadlessValidator.tsx†L306-L309】

### jotai_atom_errors (JA_SR計算用)
- ReactiveBindingエンジン初期化失敗: `ATOM_CREATION_FAILED:engine_init`。【F:concern-app/src/components/experiment/HeadlessValidator.tsx†L284-L295】
- UISpec構造不備推定: `ATOM_CREATION_FAILED:structure_error`（NO_WIDGETSやMISSING_WIDGET_IDがある場合に付与）。【F:concern-app/src/components/experiment/HeadlessValidator.tsx†L298-L304】

## 集計済みエラーメトリクス

各ステージ結果には、エラー配列とは別に以下の集計済みフィールドが保存される。【F:server/src/services/v4/ValidationService.ts†L948-L960】

### type_error_count
- `TYPE_MISMATCH` または `ZOD_SCHEMA_MISMATCH` エラーの件数。
- スキーマ型不整合の定量的評価に使用。

### reference_error_count
- `REFERENCE_ERROR`, `UNKNOWN_ENTITY`, `UNKNOWN_ATTRIBUTE`, `INVALID_PATH` エラーの件数。
- 参照整合性違反の定量的評価に使用。

### cycle_detected
- `CIRCULAR_DEPENDENCY` エラーが1件以上存在するかの真偽値。
- リアクティブバインディングの循環参照検出フラグ。
