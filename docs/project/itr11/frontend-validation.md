# フロントエンド検証機能（reactComponentErrors / jotaiAtomErrors）

## 概要

バッチ実験のStage 3（UISpec生成）完了時に、フロントエンド側でUISpecの検証を行い、`reactComponentErrors`と`jotaiAtomErrors`をAPIサーバーに送信してDBに保存する機能。

## 背景

- バッチ実験では、LLMが生成したUISpecの品質を評価するため、複数の検証指標を収集している
- `w2wrErrors`（W2WR検証）はサーバー側で実行されていた
- `reactComponentErrors`（Reactコンポーネント変換エラー）と`jotaiAtomErrors`（Jotai atom変換エラー）は、フロントエンド側でのUISpec検証が必要

## アーキテクチャ

```
[バッチ実行（サーバー）]
     │
     ▼
[SSE: Stage 3完了通知]
     │
     ▼
[BatchProgress.tsx: 試行ログ取得]
     │
     ▼
[validateUISpecHeadless(uiSpec)]
     │
     ├─ reactComponentErrors: Reactコンポーネント変換に影響するエラー
     ├─ jotaiAtomErrors: Jotai atom作成に影響するエラー
     ├─ renderErrors: 全般的なレンダリングエラー
     └─ typeErrorCount, referenceErrorCount, cycleDetected
     │
     ▼
[sendRenderFeedback() → API]
     │
     ▼
[DB: experiment_trial_logs テーブル更新]
```

## 修正ファイル

### 1. `concern-app/src/services/BatchExperimentApiService.ts`

`sendRenderFeedback()`メソッドを追加:

```typescript
async sendRenderFeedback(
  trialId: string,
  feedback: {
    stage: number;
    renderErrors?: string[] | null;
    reactComponentErrors?: string[] | null;
    jotaiAtomErrors?: string[] | null;
    typeErrorCount?: number;
    referenceErrorCount?: number;
    cycleDetected?: boolean;
  }
): Promise<void>
```

### 2. `concern-app/src/pages/research-experiment/BatchProgress.tsx`

Stage 3完了時の検証処理を追加:

```typescript
// Stage 3 (UISpec生成) の場合のみフロントエンド検証を実行
if (trial.stage === 3 && trial.generatedData) {
  const uiSpec = trial.generatedData as UISpec;
  const validationResult = validateUISpecHeadless(uiSpec);

  api.sendRenderFeedback(trial.id, {
    stage: 3,
    renderErrors: validationResult.renderErrors,
    reactComponentErrors: validationResult.reactComponentErrors,
    jotaiAtomErrors: validationResult.jotaiAtomErrors,
    typeErrorCount: validationResult.typeErrorCount,
    referenceErrorCount: validationResult.referenceErrorCount,
    cycleDetected: validationResult.cycleDetected,
  });
}
```

### 3. `concern-app/src/components/experiment/HeadlessValidator.tsx`

既存のバグを修正:
- 未使用のimport削除
- `validateBindingMechanisms()`の型参照修正（`mechanism` → `type`）
- `ReactiveBindingEngineV4`コンストラクタ呼び出し修正

## 検証項目

`validateUISpecHeadless()`が検出するエラー:

| カテゴリ | エラー種別 | 説明 |
|---------|-----------|------|
| reactComponentErrors | NO_WIDGETS | ウィジェットが存在しない |
| reactComponentErrors | DUPLICATE_WIDGET_ID | ウィジェットID重複 |
| reactComponentErrors | MISSING_COMPONENT | コンポーネント定義欠落 |
| jotaiAtomErrors | ATOM_CREATION_FAILED:structure_error | 構造エラーによるatom作成失敗 |
| jotaiAtomErrors | ATOM_CREATION_FAILED:engine_init | エンジン初期化失敗 |
| renderErrors | CYCLIC_DEPENDENCY | 循環依存検出 |
| renderErrors | UNKNOWN_WIDGET | 不明なウィジェット参照 |
| renderErrors | MISSING_JAVASCRIPT | JavaScript式欠落 |
| renderErrors | MISSING_TRANSFORM | 変換式欠落 |
| renderErrors | MISSING_LLM_PROMPT | LLMプロンプト欠落 |

## APIエンドポイント

```
POST /api/experiment/trials/:trialId/render-feedback
```

リクエストボディ:
```json
{
  "stage": 3,
  "renderErrors": ["CYCLIC_DEPENDENCY"],
  "reactComponentErrors": null,
  "jotaiAtomErrors": null,
  "typeErrorCount": 0,
  "referenceErrorCount": 0,
  "cycleDetected": true
}
```

## 結果画面での表示

`BatchResults.tsx`のLayer1（構造健全性）テーブルに以下の指標を追加:

| 指標 | 説明 | 計算式 |
|-----|------|-------|
| RCR (RC_SR) | React変換成功率 | react_component_errors=null の割合 |
| JAR (JA_SR) | Jotai Atom変換成功率 | jotai_atom_errors=null の割合 |

## 関連コミット

- `25e550b` - バッチ実験に`w2wrErrors`, `reactComponentErrors`, `jotaiAtomErrors`フィールド追加
- `4aaa145` - フロントエンド検証機能の実装
- 本コミット - 結果画面にRCR/JAR指標を追加
