# ユーザテスト当日チェックリスト

## 開始前（30分前）

### 環境確認
- [ ] Wi-Fi接続確認
- [ ] 電源確保
- [ ] 静かな環境

### サーバー起動
```bash
# ターミナル1
cd /home/tk220307/sotuken/server && bun run dev

# ターミナル2
cd /home/tk220307/sotuken/concern-app && bun run dev
```

### 動作確認
- [ ] `curl http://localhost:8000/api/experiment/health` → "healthy"
- [ ] `http://localhost:5173` でアプリ表示
- [ ] テスト操作（悩み入力→Widget操作→完了）

### 書類準備
- [ ] 同意書（人数分）
- [ ] アンケート用紙（人数分）
- [ ] メモ用紙

---

## 参加者ごとのチェック

### 参加者 #___  開始時刻: ___:___

#### 受付（5分）
- [ ] 挨拶・説明
- [ ] 同意書署名
- [ ] 質問対応

#### 操作説明（3分）
- [ ] アプリの目的説明
- [ ] 操作の流れ説明
- [ ] 「正解はない」と伝達

#### タスク実施（15-20分）
- [ ] URL共有・アクセス確認
- [ ] 悩み入力（自分 or サンプル）
- [ ] コンテキスト質問回答
- [ ] Widget操作

**観察メモ**:
```
迷った箇所:

質問内容:

特記事項:

```

#### 事後アンケート（10分）
- [ ] アンケート記入
- [ ] 自由記述確認

#### 終了
- [ ] お礼
- [ ] セッションID記録: _______________
- [ ] 終了時刻: ___:___

---

## 終了後

### データ確認
```bash
# セッション確認
curl http://localhost:8000/api/experiment/sessions | jq '.sessions | length'
```

- [ ] 全参加者のセッション記録確認
- [ ] リプレイ動作確認

### データバックアップ
```bash
mkdir -p exports/$(date +%Y%m%d)
curl http://localhost:8000/api/experiment/sessions > exports/$(date +%Y%m%d)/sessions.json
```

- [ ] JSONエクスポート完了
- [ ] アンケート用紙回収

### 片付け
- [ ] サーバー停止 (Ctrl+C)
- [ ] 機材片付け
- [ ] 謝礼処理（該当する場合）

---

## 緊急対応

### サーバーエラー時
```bash
# プロセス確認・終了
lsof -i :8000 && kill -9 $(lsof -t -i :8000)
lsof -i :5173 && kill -9 $(lsof -t -i :5173)

# 再起動
cd server && bun run dev
cd concern-app && bun run dev
```

### API呼び出し失敗時
```bash
# 環境変数確認
cat server/.env | grep GEMINI
```

### 参加者デバイスで表示されない
1. 同一ネットワーク確認
2. IPアドレス再確認: `ip addr | grep inet`
3. URL再共有: `http://[IP]:5173`
