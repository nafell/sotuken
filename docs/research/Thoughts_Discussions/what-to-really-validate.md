了解。方針はかなり良いです。

* **Layer1は「壊れてない」だけを見るので天井になりやすい**
* でも Layer1 が簡単すぎたか（＝タスクが“検証可能DSLに落ちるか”だけだと差が付かないか）を確かめたい
* そこで **LLM/人力なしで“もう1段だけ難しい自動検証”**（＝Layer3のうち “Level1相当の知識” を与える）で止める

…という整理にすると、研究ストーリーも実装工数も噛み合います。

以下、(A) 改訂プラン、(B) 実験設計（要件定義に貼れる形）を提示します。

---

## A. 改訂プラン（LLM/人力ゼロで成立する最小構成）

### A-1. 目標を「Layer1の天井検証」に寄せて再定義

あなたが示したいのは次の2点です。

1. **Layer1指標が天井**：どのモデル構成でもほぼ100%（差が付かない）
2. **“より強い自動検証(L1+)” では差が付く**：Layer1が簡単すぎたことを裏付ける

ここでいう **L1+（自動でできる“もう一段”）**は、意味評価（semantic usefulness）までは踏み込まず、**仕様適合・構造の合理性・静的健全性を強める**方向にします。

---

### A-2. 追加する評価は「仕様ベースの自動検証」に限定する

あなたのテストケース仕様には `expectedFlow` / `expectedW2WR` / `evaluationCriteria` があるので、ここを“正解ラベル”として使えます。これが強いです。

#### (1) Spec-Compliance（仕様適合）系：意味評価の代替として最も強い

* **REQ_W2WR_PRES**：`hasReactivity` が true のケースで、実際に binding が生成されているか（逆も）

  * 例：hasReactivity=true なのに bindings=0 は「仕様未達」
* **REQ_BINDING_COUNT_RANGE**：期待カテゴリに応じた binding 本数レンジを満たすか

  * A:0、B/C/D:1、E:2-3 …など（あなたのカテゴリ設計そのものを検証軸にする）
* **REQ_PATTERN_MATCH**：カテゴリB/C/D/Eで “passthrough / javascript / debounced / chain” の期待を満たすか

  * 例：Dは debounced が含まれるべき、Cは単純map主体、など
* **REQ_STAGE_FORWARD**：バインディングが diverge→organize→converge の“前方向”になっている比率

  * 逆流（converge→diverge）が多いなら「構造として不自然」

> これらは “意味的に正しいか” ではなく、“要件を満たしているか” なので完全自動で成立し、しかも天井になりにくいです。

#### (2) Static-Sanity（静的健全性）系：Layer1を一段強める（L1+の本命）

* **JS_PARSE_OK**：relationship.type=javascript のコードをパースできるか（構文エラー0か）
* **JS_POLICY_OK**：禁止トークン/副作用（`while`, `for(;;)`, `fetch`, `Date.now`, `Math.random`, `eval`, 外部参照）などが無いか

  * 「安全・再現性」主張にもつながる
* **DG_ACYCLIC**：依存グラフが巡回していないか（もし巡回禁止なら）
* **PORT_EXISTS_STRICT**：RRRを強化して「型だけでなく期待ポート種別」まで見る（可能なら）

> Layer1の“形式OK”は通っても、JSの構文やポリシーは落ちやすいので差が出やすいです。

#### (3) Expressiveness（表現力）系：補助（天井検証の主役にはしない）

* GC_NC/EC/DEN、HAS_SYNC、SYNC_COUNT、Flow/Meta/Sync分布、WS_ENT_ui

  * これは “できる/できない” より “傾向” を示すのに向く
  * 統計の主戦場は上の **Spec-Compliance / Static-Sanity** に寄せると、主張が締まります

---

### A-3. 検定対象を絞る（多重検定を軽くして時間も節約）

「天井検証」が目的なので、主指標は 3〜5 個で十分です。おすすめの **主指標セット**：

1. **REQ_W2WR_PRES**（binary）
2. **REQ_PATTERN_MATCH**（binary or ordinal）
3. **JS_PARSE_OK**（binary）
4. **JS_POLICY_OK**（binary）
5. （余裕があれば）**REQ_STAGE_FORWARD**（ratio）

他（GC/ENT/HAS_SYNCなど）は **記述＋図**に落とすのがコスパ最強です。

---

### A-4. 統計手順（対応ありデザインで最短）

* binary主指標：**Cochran’s Q（全体）→ McNemar（ペア）**、Holm補正
* ratio/ordinal：**Friedman（全体）→ Wilcoxon（ペア）**、Holm補正
* 効果量は最低1つ（ORなど）を主指標に付ければ十分

---

### A-5. 論文のストーリー（LLM/人力ゼロ版）

* **結果**：Layer1は天井（差が付かない）
* **追加結果（L1+）**：仕様適合・静的健全性では差が付く → Layer1タスクが簡単すぎた根拠
* **limitations**：意味的有用性（generatedValueの質、接続の妥当性）は評価していない
* **future work**：LLM-as-a-judge + 人手一致、ユーザスタディ、より厳しい意味評価

この形なら、指導教官の「定めた世界の正解/不正解→limitations→future work」に完全に乗ります。

---

## B. 要件定義に貼れる「実験設計」（実験プログラム改修用）

以下はそのまま設計書に貼れる体裁で書きます。

---

### B-1. 目的

本実験は、Prism Lattice UI の動的UI生成パイプラインにおいて、既存Layer1評価が天井効果（ceiling effect）を示す可能性を検証する。そのために、LLM評価・人手評価を用いず、ログから自動算出可能な **仕様適合（Spec-Compliance）** および **静的健全性（Static-Sanity）** 指標（= L1+）を導入し、モデル構成間で差が生じるかを検証する。

### B-2. 実験デザイン

* **独立試行**：1ケース×1モデル構成の1回のパイプライン実行（既存ログを再評価）
* **ケース数**：50
* **モデル構成**：A, B, C, D（必要ならEも追加）
* **デザイン**：同一ケースに対して全モデル構成を評価する **対応あり（反復測定）** デザイン
* **評価対象データ**：各試行の Step2/Step3 出力（Object Relation Model + Dependency Graph + UI Spec）、エラー情報

### B-3. 入力（Evaluatorが読むもの）

* 実行ログ（run_id, case_id, model_config, outputs, errors）
* テストケース定義（case JSON）

  * `hasReactivity`
  * `expectedW2WR`（期待binding仕様）
  * `expectedFlow`（期待widget配置/段階）
  * `evaluationCriteria`（必要に応じて）

### B-4. 出力（結果テーブル）

1行=1試行（case_id×model_config）として以下の列を出力する（CSV/JSONL）：

* 既存Layer1/2指標（既にあるもの）
* 追加L1+指標（下記）

### B-5. 追加評価指標（L1+）

#### (1) Spec-Compliance（仕様適合）

* **REQ_W2WR_PRES**（binary）

  * 定義：`hasReactivity` と `actualBindingCount>0` の一致
  * 期待：カテゴリAは0、B/C/Dは>=1、Eは>=2 を満たすこと
* **REQ_BINDING_COUNT_OK**（binary）

  * 定義：期待カテゴリに応じた binding 本数レンジを満たす
* **REQ_PATTERN_MATCH**（binary）

  * 定義：期待される relationship パターン（passthrough/javascript/debounced/chain 等）を満たす
* **REQ_STAGE_FORWARD_RATE**（ratio, 0..1）

  * 定義：bindingの向きが diverge→organize→converge の“前方向”になっている割合

#### (2) Static-Sanity（静的健全性）

* **JS_PARSE_OK**（binary）

  * 定義：relationship.type=javascript のコードをパース可能（構文エラーなし）
* **JS_POLICY_OK**（binary）

  * 定義：禁止要素（外部参照・副作用・非決定性・危険構文）を含まない
* **DG_ACYCLIC**（binary, 任意）

  * 定義：dependency graphが巡回を含まない（巡回禁止仕様の場合）

### B-6. 仮説（この条件下での“正解/不正解”）

* **H1（天井効果）**：既存Layer1指標は全モデル構成で高水準（差が小さい）
* **H2（L1+で差が出る）**：Spec-Compliance / Static-Sanity 指標ではモデル構成間に差が生じる
* **H3（タスク難易度反映）**：W2WRカテゴリ（A〜E）に応じて L1+ 指標の失敗率が増加する（難しいカテゴリほど落ちやすい）

### B-7. 統計解析

* 対応ありデザインとして解析する
* **binary指標**：Cochran’s Q（全体差）→ 有意なら McNemar（ペア比較）
* **ratio/ordinal**：Friedman（全体差）→ 有意なら Wilcoxon符号付順位（ペア比較）
* **多重比較補正**：ペア比較に Holm を適用
* **効果量**：binaryは OR（可能ならCI）、順位系は rank-biserial など

### B-8. 欠損/除外規則

* 実行ログが欠落している試行は欠損（NA）として扱う
* JS系指標は javascript binding が存在しない試行では NA とし、該当試行のみで解析する（または0扱いのルールを明示）
* W2WR意味に関わる人手/LLM評価は本設計では実施しない（limitationsに回す）

### B-9. 再現性

* evaluator のバージョン、禁止トークンリスト、カテゴリ別期待仕様を固定し、実行環境差で結果が変わらないことを保証する
* 結果テーブル生成 → 統計解析 → 図表生成をワンコマンドで再実行可能にする

---

## すぐ実装に落とす「改修要件（超短縮）」

* 既存ログに `case_id` と `model_config` が確実に入っていること
* evaluatorが **(ログ出力JSON + case JSON)** を突き合わせて L1+ 指標を算出すること
* 出力は 1試行=1行の表（CSV/JSONL）
* 統計プログラムは対応あり検定（Q/Friedman→ペア→Holm）に統一

---

この方針だと、あなたの目的（Layer1が簡単すぎた可能性の検証）に一直線で、かつ **LLM/人力を完全に排除しても論文として自然に成立**します。

次にやるなら、あなたの実ログのフィールド名（bindingsの実構造、stage情報の持ち方、javascript文字列の場所）に合わせて、上の指標を「実装できる擬似コード」と「結果テーブル列仕様（完全版）」に落とし込みます。
