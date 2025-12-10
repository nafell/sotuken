# 自動評価実験 要求仕様 + 設計書（Layer1 & Layer4）

本ドキュメントは、動的UI生成システムに対して **Layer1（構造健全性）および Layer4（実用性）** のみを対象とした
**完全自動評価実験** を実施するための要求仕様および設計仕様を定義するものである。

本実験は以下を目的とする：
- 各モデル構成における **DSL構造の信頼性・再現性・安定性** の定量比較
- **レイテンシおよびAPIコストの実運用比較**
- **人手評価に依存しない再現可能な実験系の確立**

---

## 開発者追記 重要な要件と設計:

### データ作成
現在postgresqlに正規化しながらデータ保存している．最終的な統計データJSONはカラムが若干異なるため，今の実験試行のテーブルに新たなJSONのカラムを作成して，
本書7章のJSONを丸ごと記録
データの被りが多少あるがこれでよし

### エラー検知
DSL生成結果の各種検証，rule-based-renderingやw2wrのjotai atom作成結果の検証が必要
実験結果にエラー題目(エラー名)をstring[] | nullで記録
エラー検出，検証機構が必要，既存に実装されているものもあるのでどう仕様適合できるか調査
例外処理ハンドリングもそれに伴い再確認
DSL検証はLLMを呼び出しているapiサーバ側，render系はフロントエンド側で検証するので，データをフィードバックする必要あり
現在,metricsのrender所要時間のDB保管で似たようなことをしているのでそれを利用できるか調査

### 実験環境
実験はヘッドレス環境で行えることが好ましい．統計的に有用なデータ数をとるために試行回数が250回と大変多いため，自動でサクサク回す必要がある．
よってwidget生成結果のユーザへの表示は省略できる．react componentの実際の描画などはいらない．ただしrule-based rendererのreactコンポーネント / Jotai atomの変換実行は各種計測のため実行される必要がある
実験用UIのフロントエンドは以下があれば良い:
- 実験実行操作
- asynchronousな状況確認
- バッチ実験結果のサマリー

apiサーバ(/server)とフロントエンド(/concern-app)の両方の改修必要

自動実行に関しては3つの実験モードの技術検証モードがなんとなくで実装されているため，どのように改修するか検討/もしくは別ページで新たに作成するべきか?
実験結果確認はすでにdata viewerなどが綺麗に実装されているのでこちらと親和できるように

### バッチ実行の並列化
- 1試行回数あたりの所要時間がそれなりにあり60秒~250秒かかっている
- 並列処理化が望ましい

### 段階的に大規模並列実行
- いきなり250試行を全て一気に試すのはAPIコストとシステム堅牢性に不安
- どこまで耐えられるか/現実的な時短を探す
- 並列*直列数を様子見ながら段階的に上げていく

---

## 1. 実験対象モデル構成

以下の5構成を比較対象とする。

| ID | 構成名 | Stage 1 | Stage 2 | Stage 3 |
|----|--------|---------|----------|----------|
| A | All-5-Chat | GPT-5-Chat | GPT-5-Chat | GPT-5-Chat |
| B | All-5-mini | GPT-5-mini | GPT-5-mini | GPT-5-mini |
| C | Hybrid-5Chat/4.1 | GPT-5-Chat | GPT-4.1 | GPT-4.1 |
| D | Hybrid-5Chat/5mini | GPT-5-Chat | GPT-5-mini | GPT-5-mini |
| E | Router-based | model-router | model-router | model-router |

開発者補足: model-routerはAzure OpenAIサービスがプロンプトに合わせてモデルリストの中から最適なものを自動選択してくれるAPIエンドポイントである

---

## 2. 実験スコープ

### 2.1 評価対象
- Stage 1: Widget選定
- Stage 2: ORS + DependencyGraph 生成
- Stage 3: UISpec + ReactiveBinding + generatedValue 生成

### 2.2 非評価対象
- Layer2（意味妥当性・人手評価）
- Layer3（UX評価・認知評価）

---

## 3. 採用評価指標

### 3.1 Layer1（構造健全性）

| 記号 | 指標名 | 定義 |
|------|--------|------|
| VR | DSL妥当率 | JSONパースおよびスキーマ検証およびrule-basedレンダリングに成功した割合 |
| TCR | 型整合率 | TypeScriptおよびZod検証で型エラーが0の割合 |
| RRR | 参照整合率 | PNTR・dataBindings等の参照解決が全て成功した割合 |
| CDR | 循環依存率 | DependencyGraphにおいて循環が検出された割合 |
| RGR | 再生成率 | バリデーション失敗により再生成が発生した割合 |

### 3.2 Layer4（実用性）

| 記号 | 指標名 | 定義 |
|------|--------|------|
| LAT | 平均レイテンシ | 各Stageおよび全体処理時間（ms） |
| COST | 推定APIコスト | 1セッションあたりの推定APIコスト（JPY） |
| FR | 異常終了率 | タイムアウト・JSON破損・API失敗の割合 |

---

## 4. 入力データ仕様

- ユーザー入力テキスト数：**N = 50件以上**
- 全モデル構成で **完全に同一の入力を使用**
- プロンプトは **全構成で完全固定**

---

## 5. LLM呼び出し共通パラメータ

```json
{
  "temperature": 0.0,
  "top_p": 1.0
}
```

目的：
- 乱数ゆらぎの排除
- 結果の再現性確保

---

## 6. 実験総試行数

```
総試行数 = 入力数 × モデル構成数
        = 50 × 5 = 250

LLMリクエスト回数 = 総試行回数 ×　
```

---

## 7. ログ設計仕様

### 7.1 共通ログJSONスキーマ

```json
{
  "experiment_id": "exp_001",
  "model_config": "Hybrid-5Chat/5mini",
  "stage": 2,
  "input_tokens": 3124,
  "output_tokens": 2011,
  "latency_ms": 1840,

  "dsl_errors": null,
  "render_errors": null,
  
  "type_error_count": 0,
  "reference_error_count": 0,
  "cycle_detected": false,
  "regenerated": false,
  
  "runtime_error": false,

  "timestamp": "2025-12-10T16:21:33Z"
}
```

### 7.2 dsl_errors, render_errors フィールド仕様（調整反映）

- 型: `string[] | null`
- `null`：エラーなし
- 配列：1つ以上のエラー種別

#### 例

```json
"dsl_errors": null
```

```json
"dsl_errors": ["JSON_PARSE_ERROR", "ZOD_SCHEMA_MISMATCH"]
```

目的：
- 定量評価（エラー件数）と定性評価（エラー内容分類）の両立

---

## 8. 自動集計仕様

### 8.1 指標算出ルール

| 指標 | 算出方法 |
|------|----------|
| VR | `dsl_errors`,`render_errors` が null の割合 |
| TCR | `type_error_count == 0` の割合 |
| RRR | `reference_error_count == 0` の割合 |
| CDR | `cycle_detected == true` の割合 |
| RGR | `regenerated == true` の割合 |
| LAT | `latency_ms` の平均 |
| COST | トークン数 × 単価による推定 |
| FR | `runtime_error == true` の割合 |

---

## 9. 統計解析仕様

### 9.1 成功率系（VR, TCR, RRR, CDR, RGR, FR）

- 使用検定：**2標本比例検定（z検定）**
- 帰無仮説：各モデルの成功率に差はない
- 有意水準：\( \alpha = 0.05 \)

### 9.2 実数値系（LAT, COST）

- 使用検定：**Mann–Whitney U 検定（ノンパラメトリック）**
- 理由：正規分布を仮定しないため

---

## 10. 結果出力仕様（論文用テーブル）

### 10.1 構造健全性（Layer1）

| Model | VR | TCR | RRR | CDR | RGR |
|-------|----|-----|-----|-----|-----|
| All-5-Chat |  |  |  |  |  |
| All-5-mini |  |  |  |  |  |
| 5Chat/4.1 |  |  |  |  |  |
| 5Chat/5mini |  |  |  |  |  |
| Router-based |  |  |  |  |  |

### 10.2 実用性（Layer4）

| Model | LAT (ms) | COST (JPY) | FR |
|--------|----------|-------------|-----|
| All-5-Chat |  |  |  |
| All-5-mini |  |  |  |
| 5Chat/4.1 |  |  |  |
| 5Chat/5mini |  |  |  |
| Router-based |  |  |  |

---

## 11. 実験実行フロー（確定版）

1. 入力テキスト 50件以上をJSON化
2. 5構成すべてでバッチ実行
3. 全ログを JSON 形式で保存
4. 自動バリデータ（Zod + DFS + 参照検証）実行
5. ログ → CSV 集計
6. 統計検定（比例検定 / U検定）実行
7. LaTeX Table へ転写
8. 論文「実装評価章」へ反映

---

## 12. 成果物一覧

| 成果物 | 形式 |
|--------|------|
| 生ログ | JSON |
| 集計データ | CSV |
| 検定結果 | CSV / JSON |
| 論文用表 | LaTeX / PDF |

---

以上が、Layer1 & Layer4 に特化した **自動評価実験の正式な要求仕様および設計仕様** である。