# DSL Archive

このディレクトリには、現在は使用していない旧バージョンのDSL仕様書を格納しています。

## アーカイブ日
2025-11-28

## 現行バージョン
**DSL v3.0** (`../v3/`)

## アーカイブされたファイル

### v0.5（初期仕様）
- `dsl_specification_v0.5.md` - 初期DSL仕様書

### v1.0（第1世代）
- `DSL_Overview_v1.0.md` - v1.0概要
- `DataSchemaDSL_v1.0.md` - DataSchema仕様
- `UISpecDSL_v1.0.md` - UISpec仕様
- `TaskRecommendationDSL_v1.0.md` - TaskRecommendation仕様

## 注意
これらのファイルは歴史的参照のために保持されています。
新規開発では `../v3/` の仕様を使用してください。

## 変遷
```
v0.5 (初期)
  ↓
v1.0 (3種DSL分離: DataSchema/UISpec/TaskRecommendation)
  ↓
v2.x (Phase 3で一時的に使用)
  ↓
v3.0 (現行: Jellyベース3層構造 OODM/DpG/UISpec)
```
