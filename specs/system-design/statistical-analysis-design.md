# 統計分析機能 設計書

## 1. 概要

本設計書は、Layer1/Layer4自動評価実験の統計分析機能を定義する。
バッチ実験結果に対してz検定およびMann-Whitney U検定を実施し、
論文掲載可能な形式で結果を出力する。

**参照文書:**
- `/specs/system-design/experiment_spec_layer_1_layer_4.md` - 実験仕様
- `/specs/system-design/test-corpus-50-cases-spec.md` - テストコーパス設計

---

## 2. 統計検定の仕様

### 2.1 検定手法

| 指標タイプ | 対象指標 | 検定手法 | 理由 |
|-----------|---------|----------|------|
| 成功率系 | VR, TCR, RRR, CDR, RGR, W2WR_SR, RC_SR, JA_SR | 2標本比例z検定 | 二項分布に従う成功/失敗データ |
| 実数値系 | LAT, COST | Mann-Whitney U検定 | 正規分布を仮定しないノンパラメトリック検定 |

### 2.2 帰無仮説・対立仮説

**成功率系（z検定）:**
- H0: π1 = π2（2つのモデルの成功率に差はない）
- H1: π1 ≠ π2（両側検定）

**実数値系（Mann-Whitney U検定）:**
- H0: 2群の分布に差はない
- H1: 2群の分布に差がある（両側検定）

### 2.3 有意水準

- **基準有意水準**: α = 0.05
- **Bonferroni補正後**: α' = 0.05 / 10 = 0.005
  - 理由: 5モデル構成 → C(5,2) = 10ペアの多重比較

### 2.4 効果量

| 検定 | 効果量指標 | 解釈基準 |
|------|-----------|---------|
| z検定 | Cohen's h | 0.2: small, 0.5: medium, 0.8: large |
| Mann-Whitney U | rank-biserial correlation (r) | 0.1: small, 0.3: medium, 0.5: large |

---

## 3. 比較対象

### 3.1 主要分析: モデル構成間ペアワイズ比較

5モデル構成（A, B, C, D, E）の全ペア比較:

| ペア | 比較 |
|------|------|
| 1 | A vs B |
| 2 | A vs C |
| 3 | A vs D |
| 4 | A vs E |
| 5 | B vs C |
| 6 | B vs D |
| 7 | B vs E |
| 8 | C vs D |
| 9 | C vs E |
| 10 | D vs E |

### 3.2 サブ分析: W2WRカテゴリ別（オプション）

W2WRカテゴリ（A～E、各10ケース）でフィルタリング後の比較:
- 特定カテゴリでのモデル間差異を検証
- サンプルサイズが小さいため参考値として扱う

---

## 4. データ構造設計

### 4.1 検定結果スキーマ

```typescript
interface StatisticalTestResult {
  // 識別情報
  metric: string;                    // 'VR', 'LAT' など
  testType: 'z-test' | 'mann-whitney-u';

  // 比較対象
  model1: string;                    // 'A'
  model2: string;                    // 'B'

  // 観測値
  model1Stats: {
    n: number;                       // サンプルサイズ
    value: number;                   // 成功率 or 中央値
    successes?: number;              // z検定: 成功数
    values?: number[];               // U検定: 生データ（オプション）
  };
  model2Stats: {
    n: number;
    value: number;
    successes?: number;
    values?: number[];
  };

  // 検定結果
  testStatistic: number;             // z値 or U値
  pValue: number;                    // p値（補正なし）
  pValueCorrected: number;           // p値（Bonferroni補正後）
  significant: boolean;              // p < 0.05
  significantCorrected: boolean;     // p < 0.005 (補正後)

  // 効果量
  effectSize: number;                // Cohen's h or rank-biserial r
  effectSizeInterpretation: 'negligible' | 'small' | 'medium' | 'large';
}

interface BatchStatisticsResult {
  batchId: string;
  experimentId: string;
  generatedAt: string;               // ISO 8601

  // 設定
  alpha: number;                     // 0.05
  alphaCorrected: number;            // 0.005
  correctionMethod: 'bonferroni';
  totalComparisons: number;          // 10

  // 検定結果
  layer1Comparisons: StatisticalTestResult[];  // 成功率系指標
  layer4Comparisons: StatisticalTestResult[];  // 実数値系指標

  // サマリー
  summary: {
    layer1: {
      totalTests: number;
      significantCount: number;
      significantCorrectedCount: number;
    };
    layer4: {
      totalTests: number;
      significantCount: number;
      significantCorrectedCount: number;
    };
  };
}
```

### 4.2 エクスポート形式

#### Markdown表（優先）

```markdown
## Layer1 構造健全性 - モデル間比較

### VR (DSL妥当率) ペアワイズ比較

| 比較 | Model 1 | Model 2 | p値 | p値(補正) | 有意 | 効果量 |
|------|---------|---------|-----|----------|------|--------|
| A vs B | 95.0% (n=50) | 87.0% (n=50) | 0.023 | 0.230 | * | 0.28 (small) |
| A vs C | 95.0% (n=50) | 92.0% (n=50) | 0.312 | 1.000 | - | 0.11 (negligible) |
...
```

#### CSV出力

```csv
metric,test_type,model1,model2,model1_n,model1_value,model2_n,model2_value,test_statistic,p_value,p_value_corrected,significant,significant_corrected,effect_size,effect_size_interpretation
VR,z-test,A,B,50,0.95,50,0.87,2.12,0.023,0.230,true,false,0.28,small
```

---

## 5. 算出アルゴリズム

### 5.1 2標本比例z検定

```
pooled_p = (x1 + x2) / (n1 + n2)
se = sqrt(pooled_p * (1 - pooled_p) * (1/n1 + 1/n2))
z = (p1 - p2) / se
p_value = 2 * (1 - Φ(|z|))  // 両側検定
```

**Cohen's h（効果量）:**
```
h = 2 * arcsin(sqrt(p1)) - 2 * arcsin(sqrt(p2))
```

### 5.2 Mann-Whitney U検定

```
1. 両群を統合してランク付け
2. 各群のランク和を計算 (R1, R2)
3. U1 = n1*n2 + n1*(n1+1)/2 - R1
4. U2 = n1*n2 + n2*(n2+1)/2 - R2
5. U = min(U1, U2)
6. 正規近似: z = (U - n1*n2/2) / sqrt(n1*n2*(n1+n2+1)/12)
7. p_value = 2 * (1 - Φ(|z|))  // 両側検定
```

**Rank-biserial correlation（効果量）:**
```
r = 1 - (2*U) / (n1*n2)
```

---

## 6. API設計

### 6.1 新規エンドポイント

```
GET /api/batch/:batchId/statistics
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "batchId": "...",
    "experimentId": "exp_001",
    "generatedAt": "2025-12-12T10:00:00Z",
    "alpha": 0.05,
    "alphaCorrected": 0.005,
    "correctionMethod": "bonferroni",
    "totalComparisons": 10,
    "layer1Comparisons": [...],
    "layer4Comparisons": [...],
    "summary": {...}
  }
}
```

### 6.2 エクスポートエンドポイント

```
GET /api/batch/:batchId/statistics/export?format=markdown
GET /api/batch/:batchId/statistics/export?format=csv
```

---

## 7. UI設計

### 7.1 BatchResults.tsx タブ構成

```
[概要] [Layer1] [Layer4] [統計検定] [エクスポート]
```

### 7.2 統計検定タブの構成

```
┌─────────────────────────────────────────────────────────────┐
│ 統計検定結果                                                 │
├─────────────────────────────────────────────────────────────┤
│ [検定設定]                                                   │
│ 有意水準: α = 0.05                                          │
│ 補正後: α' = 0.005 (Bonferroni, 10比較)                     │
├─────────────────────────────────────────────────────────────┤
│ [サマリー]                                                   │
│ Layer1: 8指標 × 10ペア = 80検定 → 有意: 12件 (補正後: 5件)  │
│ Layer4: 2指標 × 10ペア = 20検定 → 有意: 3件 (補正後: 1件)   │
├─────────────────────────────────────────────────────────────┤
│ [Layer1検定結果]                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 指標選択: [VR ▼]                                        │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ | 比較    | M1値  | M2値  | p値   | 有意 | 効果量      | │
│ │ |---------|-------|-------|-------|------|-------------| │
│ │ | A vs B  | 95.0% | 87.0% | 0.023 | *    | 0.28 (S)    | │
│ │ | A vs C  | 95.0% | 92.0% | 0.312 | -    | 0.11        | │
│ │ | ...                                                   | │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [Layer4検定結果]                                             │
│ 指標選択: [LAT ▼]                                           │
│ (同様のテーブル)                                             │
├─────────────────────────────────────────────────────────────┤
│ [エクスポート]                                               │
│ [Markdown] [CSV]                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 視覚的表現

- **有意な結果**: 背景色ハイライト（黄色）
- **補正後も有意**: 背景色ハイライト（緑）
- **効果量**: S=Small, M=Medium, L=Large のバッジ

---

## 8. ファイル構成

### 8.1 新規ファイル

```
server/src/services/
├── StatisticalAnalysisService.ts   # 検定計算ロジック
└── StatisticalExportService.ts     # エクスポート生成

server/src/types/
└── statistics.types.ts             # 型定義

concern-app/src/pages/research-experiment/
└── components/
    ├── StatisticsTab.tsx           # 統計検定タブ
    └── StatisticsExport.tsx        # エクスポートUI
```

### 8.2 既存ファイル変更

```
server/src/routes/batch-experiment.ts   # API追加
concern-app/src/pages/research-experiment/BatchResults.tsx  # タブUI追加
concern-app/src/services/BatchExperimentApiService.ts      # API呼び出し追加
```

---

## 9. 実装タスク

### Phase 1: バックエンド統計計算
1. 型定義ファイル作成 (`statistics.types.ts`)
2. z検定アルゴリズム実装
3. Mann-Whitney U検定アルゴリズム実装
4. `StatisticalAnalysisService` 実装
5. 単体テスト作成

### Phase 2: APIエンドポイント
6. `/api/batch/:id/statistics` 実装
7. Markdownエクスポート実装
8. CSVエクスポート実装
9. APIテスト作成

### Phase 3: フロントエンドUI
10. `BatchResults.tsx` タブUI追加
11. `StatisticsTab.tsx` コンポーネント作成
12. API連携実装
13. エクスポートボタン実装

### Phase 4: 統合・検証
14. 実データでの動作確認
15. 論文用出力の最終調整

---

## 10. 注意事項

### 10.1 統計的前提条件

- **z検定**: n ≥ 30 かつ np ≥ 5, n(1-p) ≥ 5 の正規近似条件
  - 50試行/モデルなので条件を満たす
- **Mann-Whitney U**: n1, n2 ≥ 20 で正規近似が有効
  - 50試行/モデルなので条件を満たす

### 10.2 解釈上の注意

- Bonferroni補正は保守的（Type II エラー増加の可能性）
- 効果量も併せて報告し、実質的な差異を評価
- p値だけでなく信頼区間も検討（将来拡張）

---

## 11. 参考文献

- Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.)
- Mann, H. B., & Whitney, D. R. (1947). On a test of whether one of two random variables is stochastically larger than the other.
