# 開発・デバッグガイド
*「頭の棚卸しノート」アプリ - Phase 0 Day 10完了版*

**作成日**: 2025年9月18日  
**対象**: 開発者・研究者・QA担当者  
**ステータス**: Phase 0完了版

---

## 🚀 開発環境セットアップ

### **必要環境**
- **Node.js**: v18以上
- **Bun**: 最新版（推奨）
- **PostgreSQL**: 接続可能なインスタンス
- **ブラウザ**: Chrome/Firefox（開発ツール対応）

### **起動手順**
```bash
# 1. バックエンド起動
cd /home/tk220307/sotuken/server
export PATH="$HOME/.bun/bin:$PATH"
bun run dev
# → http://localhost:3000 で起動

# 2. フロントエンド起動（別ターミナル）
cd /home/tk220307/sotuken/concern-app
export PATH="$HOME/.bun/bin:$PATH"
bun run dev
# → http://localhost:5173 で起動
```

---

## 🔍 デバッグツール・URL一覧

### **基本アクセスURL**
| 目的 | URL | 説明 |
|------|-----|------|
| **メインアプリ** | http://localhost:5173 | ユーザー向けアプリケーション |
| **データベーステスト** | http://localhost:5173/dev/database | IndexedDB動作確認画面 |
| **factors辞書テスト** | http://localhost:5173/dev/factors | factors収集・API連携テスト |
| **API健康チェック** | http://localhost:3000/health | サーバー・DB状態確認 |
| **設定API** | http://localhost:3000/v1/config | 実験条件・重み配布 |

### **開発専用機能**
- **React Developer Tools**: ブラウザ拡張機能で状態管理確認
- **Network Tab**: API呼び出し・レスポンス監視
- **Application Tab**: IndexedDB・PWA機能確認
- **Console**: リアルタイムログ・エラー表示

---

## 🧪 統合テストツール

### **自動テストスクリプト**
```bash
cd /home/tk220307/sotuken

# 全機能統合テスト（100%成功）
node integration_test.js

# factors辞書システムテスト（100%成功）
node test_factors.js

# データベース統合テスト（100%成功）
node test_database.js

# PWA機能テスト（開発モード制限あり）
node test_pwa.js
```

### **API直接テスト**
```bash
# 健康チェック
curl http://localhost:3000/health

# 設定取得
curl http://localhost:3000/v1/config

# UI生成（サンプル）
curl -X POST http://localhost:3000/v1/ui/generate \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","userExplicitInput":{"concernText":"テスト","concernLevel":"medium"},"factors":{"time_of_day":"morning"}}'

# イベント送信（サンプル）
curl -X POST http://localhost:3000/v1/events/batch \
  -H "Content-Type: application/json" \
  -d '{"events":[{"eventId":"test","sessionId":"test","anonymousUserId":"test","eventType":"ui_shown","timestamp":"2025-09-18T00:00:00Z"}]}'
```

---

## 🗄️ データベース確認

### **IndexedDB（クライアント）**
**ブラウザ確認方法:**
1. F12 → Application タブ
2. Storage → IndexedDB → ConcernApp
3. テーブル: `userProfile`, `concernSessions`, `contextData`, `interactionEvents`

**プログラム確認:**
```javascript
// ブラウザConsoleで実行
window.indexedDB.databases().then(console.log);
```

### **PostgreSQL（サーバー）**
**接続確認:**
```bash
# ヘルスチェックでDB状態確認
curl http://localhost:3000/health | jq .database
```

**主要テーブル:**
- `experiments`: 実験管理
- `ui_generation_requests`: UI生成履歴
- `measurement_events`: 研究測定データ

---

## 📊 factors辞書システム

### **収集可能なfactors**
| カテゴリ | factors | 取得方法 | 信頼度 |
|----------|---------|----------|--------|
| **時系列** | `time_of_day`, `day_of_week`, `available_time_min` | システム時計 | 高 |
| **デバイス** | `device_platform`, `device_orientation` | Web/Capacitor API | 高 |
| **位置** | `location_category` | GPS→抽象化 | 中-高 |
| **活動** | `activity_level`, `network_connection` | 推定・検出 | 中 |

### **factors収集テスト**
```bash
# factors辞書テストページでリアルタイム確認
open http://localhost:5173/dev/factors

# APIテスト
curl -X POST http://localhost:3000/v1/ui/generate \
  -H "Content-Type: application/json" \
  -d '{"factors":{"time_of_day":"morning","day_of_week":1},"userExplicitInput":{"concernText":"test"}}'
```

---

## ⚡ パフォーマンス監視

### **指標**
- **API応答時間**: < 100ms（目標）
- **factors収集時間**: < 500ms
- **UI生成時間**: < 2000ms
- **データベース書き込み**: < 50ms

### **監視方法**
```javascript
// ブラウザConsoleでAPIパフォーマンス測定
const start = performance.now();
fetch('/api/endpoint').then(() => {
  console.log(`応答時間: ${performance.now() - start}ms`);
});
```

---

## 🛠️ トラブルシューティング

### **よくある問題と解決法**

#### **1. サーバー起動エラー**
```
Error: ENOENT: no such file or directory, open 'drizzle/meta/_journal.json'
```
**解決法:**
```bash
cd server && bun run db:generate && bun run db:migrate
```

#### **2. ポート競合**
```
Error: listen EADDRINUSE: address already in use :::3000
```
**解決法:**
```bash
lsof -ti:3000 | xargs kill -9  # ポート3000使用プロセス終了
lsof -ti:5173 | xargs kill -9  # ポート5173使用プロセス終了
```

#### **3. Capacitor関連エラー**
```
Uncaught SyntaxError: The requested module does not provide an export
```
**解決法**: Web環境では動的インポートとフォールバックが自動実行されます

#### **4. IndexedDB初期化エラー**
**解決法:**
```javascript
// ブラウザConsoleで実行（データベースリセット）
indexedDB.deleteDatabase('ConcernApp');
location.reload();
```

#### **5. PWA機能不完全**
**原因**: 開発モードではService Worker・Manifestが動的生成  
**解決法**: 本番ビルドで確認
```bash
cd concern-app && bun run build && bun run preview
```

---

## 🔧 カスタマイズ・拡張

### **新しいfactorsの追加**
1. **型定義更新**: `src/types/database.ts` の `BaseFactors` インターフェース
2. **収集実装**: `src/services/context/ContextService.ts` の `collectCurrentFactors()`
3. **テスト追加**: `test_factors.js` の検証項目

### **新しいAPIエンドポイント**
1. **ルート追加**: `server/src/routes/` に新ファイル
2. **メインサーバー統合**: `server/src/index.ts` に追加
3. **テスト追加**: `integration_test.js` に項目追加

### **新しい画面の追加**
1. **コンポーネント作成**: `src/components/screens/`
2. **ルート定義**: `src/App.tsx` の `Routes`
3. **型定義**: React Router用の `LocationState` 更新

---

## 📈 Phase 0 完了状況

### **✅ 完了機能**
- [x] **統合テスト**: 100% 成功
- [x] **API基盤**: 全エンドポイント動作
- [x] **factors辞書**: 15+項目自動収集
- [x] **データベース**: IndexedDB + PostgreSQL
- [x] **5画面フロー**: 完全実装
- [x] **エラーハンドリング**: フォールバック機構
- [x] **PWA基盤**: インストール可能構成

### **⚠️ 制限・改善点**
- **PWA**: 開発モードでのService Worker制限
- **UI生成**: Phase 0では固定UI（Phase 1でLLM統合予定）
- **Capacitor**: Web環境での機能制限（ネイティブ機能は本格実装後）

### **🚀 Phase 1への準備**
- **LLM統合**: GoogleGenerativeAI導入準備完了
- **A/B実験**: 条件割り当て基盤完成
- **測定システム**: 全イベント追跡機能実装済み

---

## 📞 サポート・問い合わせ

### **ログ確認場所**
- **フロントエンド**: ブラウザConsole
- **バックエンド**: サーバーターミナル出力
- **データベース**: `/health` API レスポンス

### **緊急時の復旧**
```bash
# 全環境リセット
cd /home/tk220307/sotuken
pkill -f "bun run dev"  # 全開発サーバー停止
sleep 2
./tmux-fullstack.sh     # 統合起動（もしスクリプトが存在する場合）
```

---

**Phase 0 統合テスト完了**: 2025年9月18日  
**次フェーズ**: LLM統合・動的UI生成（Phase 1）  
**成功率**: 統合テスト100%・factors辞書100%・データベース100%
