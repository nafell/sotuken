# バッチ実験UI改善 Phase 3 実装報告書

## 概要

バッチ実験UIの3つの改善項目を実装しました。

| 項目 | 内容 |
|------|------|
| 実装日 | 2025-12-11 |
| ブランチ | feat/experiment |
| 変更ファイル数 | 4 |

---

## 1. Batch実行中ページ: タスク履歴ログUI追加

### 課題
- 現在実行中のタスク状態のみ表示され、過去のタスク履歴が確認できない

### 解決策
SSE進捗イベント受信時にフロントエンド側で履歴を蓄積し、ログ形式で表示。

### 実装詳細

**ファイル**: `concern-app/src/pages/research-experiment/BatchProgress.tsx`

```typescript
interface TaskLogEntry {
  id: string;           // `${modelConfig}-${inputId}-${stage}`
  timestamp: Date;      // タスク開始時刻
  modelConfig: string;
  inputId: string;
  stage: number;
  status: 'running' | 'completed';
}
```

- `taskHistory` stateで履歴を管理
- 新しいタスク検出時に前のタスクを`completed`に更新
- スクロール可能なUI（max-height: 300px）
- 各ログに時刻・モデル構成・ステージ・入力ID・ステータスを表示

---

## 2. Batch結果ページ: タブを廃止して縦配置に変更

### 課題
- タブUIで画面切り替えが必要で一覧性が低い

### 解決策
全セクションを1ページに縦配置し、スクロールで全体を確認可能に。

### 実装詳細

**ファイル**: `concern-app/src/pages/research-experiment/BatchResults.tsx`

変更前:
- タブUI（overview, layer1, layer4, trials, export）
- タブ切り替えで表示を変更
- Trialsタブ選択時にデータ読み込み

変更後:
- 全セクションを縦に配置
- データ読み込みを並列化（`Promise.all`でサマリーとトライアルを同時取得）
- セクション間に32pxのmargin

---

## 3. バッチ履歴・セッション一覧のリンク問題修正

### 課題
- `/research-experiment/batch/list`と`/research-experiment/sessions`のルートが未設定
- キャッチオール`*`により`/`にリダイレクトされていた

### 解決策
`BatchList.tsx`を新規作成し、App.tsxに2つのルートを追加。

### 実装詳細

**新規ファイル**: `concern-app/src/pages/research-experiment/BatchList.tsx`
- `getBatches()` APIを使用してバッチ履歴を取得
- テーブル形式で一覧表示
- 各行クリックで進捗/結果ページへ遷移
- 表示項目: 実験ID、ステータス、試行数、モデル構成、開始時刻

**修正ファイル**: `concern-app/src/App.tsx`
```tsx
// 追加したルート
<Route path="/research-experiment/batch/list" element={<BatchList />} />
<Route path="/research-experiment/sessions" element={<SessionList />} />
```

---

## 修正ファイル一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `concern-app/src/pages/research-experiment/BatchProgress.tsx` | 修正 | タスク履歴ログUI追加 |
| `concern-app/src/pages/research-experiment/BatchResults.tsx` | 修正 | タブ廃止、縦配置化 |
| `concern-app/src/pages/research-experiment/BatchList.tsx` | 新規 | バッチ履歴一覧UI |
| `concern-app/src/App.tsx` | 修正 | ルート2つ追加、BatchList lazy import |

---

## ビルド確認

```
vite v7.1.5 building for development...
✓ 216 modules transformed.
✓ built in 5.05s

関連チャンク:
- BatchList-DK3SYI4O.js      5.15 kB
- BatchProgress-b1Oe_T2D.js  8.84 kB
- BatchResults-CUWvH2OG.js  19.43 kB
```

TypeScriptエラー: HeadlessValidator.tsx, ExperimentPlanUnified.tsx（既存エラー、今回の変更とは無関係）

---

## テスト確認項目

- [ ] `/research-experiment/batch/list` にアクセスしてバッチ履歴一覧が表示される
- [ ] `/research-experiment/sessions` にアクセスしてセッション一覧が表示される
- [ ] バッチ実行中にタスク履歴ログが蓄積される
- [ ] バッチ結果ページで全セクションが縦に表示される
- [ ] 結果ページのナビゲーションボタンが正しく動作する
