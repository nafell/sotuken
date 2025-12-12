# Lessons Learned / 反省点

このドキュメントは開発中に気づいた設計上の反省点を記録するものです。
今後の開発や類似プロジェクトでの参考にしてください。

---

## 2024-12 バッチ実験システム

### LL-001: null に特別な意味を持たせない

**問題:**
`experimentTrialLogs` テーブルの `renderErrors`, `reactComponentErrors`, `jotaiAtomErrors` カラムで `null` が以下の2つの状態を表していた：
1. 未検証（フロントエンド検証がまだ実行されていない）
2. 検証済み・エラーなし

**影響:**
- SSE切断後に再接続した際、どのログが未検証なのか判別できない
- 検証漏れのデータを後から特定・補完する機能が作れない

**改善案:**
```typescript
// Bad: null が曖昧な意味を持つ
renderErrors: string[] | null  // null = 未検証 or エラーなし

// Good: 明示的なセンチネル値を使う
renderErrors: string[] | null  // null = 未検証のみ
// エラーなしの場合は空配列 [] を使う

// Better: 検証タイムスタンプを別カラムで管理
frontendValidatedAt: Date | null  // null = 未検証
renderErrors: string[] | null     // null = エラーなし（検証済み前提）
```

**教訓:**
- センチネル値（特別な意味を持つ値）を使う場合は、その意味を明確に文書化する
- 「未設定」と「空」は異なる概念。混同しないよう設計する
- 可能であれば、状態を明示的に管理するカラムを追加する

---

### LL-002: フロントエンド依存の検証をバックエンドで完結させる

**問題:**
Stage 3 の検証（UISpec の構造検証、循環依存検出など）をフロントエンドで実行し、SSE 経由で結果をサーバーにフィードバックする設計だった。

**影響:**
- SSE 切断時にフロントエンド検証が実行されない
- ブラウザリフレッシュで再開しても、切断中に完了したステージは検証されない
- ネットワーク不安定な環境で検証漏れが発生

**改善案:**
```typescript
// Bad: フロントエンドで検証してフィードバック
// BatchProgress.tsx
if (log.stage === 3 && log.generatedData) {
  const result = validateUISpecHeadless(uiSpec);
  api.sendRenderFeedback(log.id, result);
}

// Good: バックエンドで検証を完結
// BatchExecutionService.ts
const stage3Result = await this.executePlanUISpecGeneration(...);
const frontendValidation = this.validateUISpecOnServer(stage3Result.data);
await this.logTrialStage(context, 3, {
  ...stage3Result,
  renderErrors: frontendValidation.renderErrors,
  reactComponentErrors: frontendValidation.reactComponentErrors,
  // ...
});
```

**教訓:**
- データの完全性に関わる処理は、ネットワーク切断の影響を受けないサーバーサイドで実行する
- フロントエンドは「表示」と「操作」に徹し、「検証」はサーバーで行う
- ブラウザ非依存のロジック（pure function）はサーバーに移植可能

---

<!-- 以下、新しい反省点を追記 -->
