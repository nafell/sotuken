# Phase 2 エンドユーザーテストドキュメント

**Phase 2 Step 1-2実装完了版のテストドキュメント集**

---

## 📚 ドキュメント一覧

### 1. テスト計画書（詳細版）

**ファイル**: [`phase2_user_testing_plan.md`](./phase2_user_testing_plan.md)  
**所要時間**: 約90分  
**対象者**: 詳細にテストを実施したい方

**内容**:
- 9つのテストシナリオ
- 事前準備手順
- 各機能の詳細なテスト手順
- 合格基準とチェックリスト
- 結果記録シート

**こんな場合に使用**:
- 正式なテスト報告書を作成する
- 全機能を網羅的にテストする
- 問題を詳細に記録する

---

### 2. クイックテストガイド（簡易版）

**ファイル**: [`quick_test_guide.md`](./quick_test_guide.md)  
**所要時間**: 約15分  
**対象者**: 主要機能を素早く確認したい方

**内容**:
- 5つの必須テスト
- 簡潔な手順
- 期待結果のチェックリスト

**こんな場合に使用**:
- 開発中の動作確認
- 新機能追加後の回帰テスト
- デモ前の最終確認

---

### 3. デバッグコマンド集

**ファイル**: [`debug_commands.md`](./debug_commands.md)  
**対象者**: テスト実施者・開発者

**内容**:
- IndexedDB データ確認コマンド
- ActionReport検証スクリプト
- イベントログ分析ツール
- テストデータ生成ヘルパー
- トラブルシューティング
- データエクスポート

**こんな場合に使用**:
- データが正しく保存されているか確認
- 問題の原因を調査
- テストデータを生成

---

## 🚀 テスト実施の流れ

### 初めての方

```
1. phase2_user_testing_plan.md の「事前準備」を実施
   ↓
2. quick_test_guide.md でクイックテスト（15分）
   ↓
3. 問題があれば debug_commands.md で調査
```

### 定期的な動作確認

```
1. quick_test_guide.md のみ実施（15分）
   ↓
2. 問題なければ完了
   ↓
3. 問題あれば phase2_user_testing_plan.md の該当テストを実施
```

### 正式なテスト報告書作成

```
1. phase2_user_testing_plan.md の全テスト実施（90分）
   ↓
2. 結果記録シートに記入
   ↓
3. 問題発見時は debug_commands.md で詳細調査
   ↓
4. データエクスポート・スクリーンショット添付
```

---

## ⚡ クイックスタート

### 環境起動（3分）

```bash
# ターミナル1: サーバー
cd /home/tk220307/sotuken/server
bun run dev

# ターミナル2: フロントエンド
cd /home/tk220307/sotuken/concern-app
bun run dev

# ブラウザ
# http://localhost:5173 を開く
```

### 最小テスト（5分）

1. **タスク作成**
   - TaskCreateScreen でタスク作成
   - IndexedDB → tasks に保存確認

2. **着手測定** ⭐️最重要
   - TaskRecommendationScreen でタスク推奨
   - 10秒待って「着手する」クリック
   - IndexedDB → actionReports の `timeToStartSec` を確認
   - **期待値**: 約10秒（9-11秒）

3. **データ確認**
   ```javascript
   // Console で実行
   const db = new Dexie('ConcernApp');
   db.version(2).stores({ actionReports: 'reportId' });
   await db.open();
   const report = await db.actionReports.toArray();
   console.log('Time to start:', report[0].timeToStartSec, 'seconds');
   ```

✅ `timeToStartSec` が正確なら基本動作OK

---

## 🎯 重要な測定項目

### Phase 2 の核心機能

| 項目 | 重要度 | 確認方法 |
|------|--------|---------|
| timeToStartSec | ⭐️⭐️⭐️ | quick_test_guide.md テスト3 |
| clarityImprovement | ⭐️⭐️⭐️ | quick_test_guide.md テスト4 |
| イベントログ記録 | ⭐️⭐️⭐️ | debug_commands.md イベントログ確認 |
| タスクカウンター | ⭐️⭐️ | debug_commands.md タスク確認 |
| データ永続性 | ⭐️⭐️ | phase2_user_testing_plan.md テスト8 |

### 合格基準

- ✅ timeToStartSec 誤差 ±1秒以内
- ✅ clarityImprovement 正確に記録（1-3）
- ✅ 全イベントが IndexedDB に記録
- ✅ タスクカウンターが正確に更新
- ✅ ページリロード後もデータ保持

---

## 🐛 トラブルシューティング

### よくある問題

| 問題 | 原因 | 解決方法 | 参照 |
|------|------|---------|------|
| タスクが作成できない | IndexedDB エラー | データベースクリア | debug_commands.md 🧹 |
| API エラー | サーバー未起動 | `bun run dev` 実行 | phase2_user_testing_plan.md 事前準備 |
| timeToStartSec = 0 | 推奨未表示 | 推奨画面を最初から操作 | debug_commands.md 🐛 |
| イベント記録されない | EventLogger 初期化失敗 | ページリロード | quick_test_guide.md 問題発生時 |

### サポート

問題が解決しない場合:
1. debug_commands.md のトラブルシューティングセクション参照
2. データをエクスポートして保存
3. エラーメッセージのスクリーンショット撮影

---

## 📊 テスト結果の記録

### 推奨フォーマット

```
【テスト実施日】: 2025/10/18
【テスト実施者】: 氏名
【テスト環境】: Chrome 119, macOS 14

【テスト結果】:
- タスク作成: ✅ Pass
- タスク推奨: ✅ Pass
- 着手測定: ✅ Pass (timeToStartSec: 10.2秒)
- スッキリ度: ✅ Pass (clarity: 3)
- フルフロー: ✅ Pass

【発見した問題】:
なし

【改善提案】:
- UIの配色を調整してほしい
- タイマーの表示を大きくしてほしい
```

### データ保存

1. **IndexedDBエクスポート**
   ```javascript
   // debug_commands.md の「データエクスポート」参照
   ```

2. **スクリーンショット**
   - TaskRecommendationScreen
   - ActionReportModal
   - ClarityFeedbackModal

3. **Consoleログ**
   - 右クリック → Save as...

---

## 📝 チェックリスト

### テスト実施前

- [ ] サーバーが起動している
- [ ] フロントエンドが起動している
- [ ] Chrome DevTools が開いている
- [ ] テスト計画書を読んだ
- [ ] 必要なツール・ドキュメントを準備

### テスト実施中

- [ ] 手順通りに実行している
- [ ] 結果を記録している
- [ ] スクリーンショットを撮影
- [ ] 気づいた点をメモ

### テスト完了後

- [ ] 全項目を実施した
- [ ] 結果をまとめた
- [ ] データをエクスポートした
- [ ] 問題を記録した

---

## 🎓 参考資料

### Phase 2 設計書

- [`specs/project/phase2/overview.md`](../project/phase2/overview.md) - Phase 2全体概要
- [`specs/project/phase2/data_models.md`](../project/phase2/data_models.md) - データモデル詳細
- [`specs/project/phase2/event_logging.md`](../project/phase2/event_logging.md) - イベントログ仕様
- [`specs/project/task/phase2_detailed_tasks.md`](../project/task/phase2_detailed_tasks.md) - 実装タスク一覧

### 実装コード

- `concern-app/src/screens/TaskRecommendationScreen.tsx` - タスク推奨画面
- `concern-app/src/components/ActionReportModal.tsx` - 行動報告モーダル
- `concern-app/src/components/ClarityFeedbackModal.tsx` - スッキリ度測定モーダル
- `concern-app/src/services/EventLogger.ts` - イベントログサービス
- `server/src/services/ExperimentService.ts` - 実験条件管理

---

## 📞 お問い合わせ

テスト実施中に問題が発生した場合:

1. **まず確認**: debug_commands.md のトラブルシューティング
2. **データ保存**: エクスポート機能でデータを保存
3. **情報収集**: エラーメッセージ、スクリーンショット
4. **報告**: 上記情報と共に問題を報告

---

**最終更新**: 2025年10月18日  
**対象バージョン**: Phase 2 Step 1-2 実装完了版  
**ドキュメント管理**: `/specs/testing/`

