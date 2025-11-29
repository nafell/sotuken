# README.md 調査報告

**実施日**: 2025-11-28

---

## 1. 現状

### 1.1 既存README.md一覧

| ファイル | 状態 | 備考 |
|---------|------|------|
| `/README.md` | 要更新 | MVP段階の記述、古い |
| `/server/README.md` | 要更新 | bun initのデフォルト |
| `/concern-app/README.md` | 要更新 | Viteテンプレートのデフォルト |
| `/specs/project/phase4/DSLv3-design/README.md` | OK | 現行 |
| `/specs/testing/README.md` | 要整理 | testing自体の整理が必要 |
| `/specs/discussions/README.md` | OK | 作成済み |
| `/specs/dsl-design/v3/README.md` | OK | 現行 |
| `/specs/dsl-design/archive/README.md` | OK | 作成済み |
| `/concern-app/src/legacy/README.md` | OK | 作成済み |
| `/tests/README.md` | OK | 作成済み |

---

## 2. 更新が必要なREADME

### 2.1 /README.md (root)

**現状**: MVP段階の古い記述

**推奨内容**:
- プロジェクト概要（研究目的）
- 技術スタック
- ディレクトリ構成（現状版）
- 開発コマンド（フロントエンド/バックエンド）
- 関連ドキュメントへのリンク

### 2.2 /server/README.md

**現状**: bun initデフォルト

**推奨内容**:
- サーバー機能概要
- API概要（エンドポイント一覧）
- 開発/本番コマンド
- 環境変数設定
- データベース操作コマンド

### 2.3 /concern-app/README.md

**現状**: Viteテンプレートデフォルト

**推奨内容**:
- フロントエンド機能概要
- 主要コンポーネント構成
- 開発/ビルドコマンド
- ルーティング説明

---

## 3. 新規作成が推奨される場所

### 3.1 /specs/README.md

**目的**: 仕様ドキュメント全体のナビゲーション

**推奨内容**:
- specs/配下のディレクトリ説明
- 主要ドキュメントへのリンク
- バージョン別仕様の対応表

### 3.2 /concern-app/src/components/widgets/v3/README.md

**目的**: Widget v3の概要とナビゲーション

**推奨内容**:
- 12種Widgetの一覧と概要
- 共通インターフェース説明
- 各Widgetディレクトリへのリンク

### 3.3 /concern-app/src/services/README.md

**目的**: サービス層の概要

**推奨内容**:
- 各サービスの役割
- API連携フロー
- 状態管理概要

---

## 4. 優先順位

| 優先度 | 対象 | 理由 |
|--------|------|------|
| 高 | /README.md | プロジェクトの顔 |
| 高 | /server/README.md | 開発効率 |
| 高 | /concern-app/README.md | 開発効率 |
| 中 | /specs/README.md | ナビゲーション |
| 低 | その他新規 | 必要に応じて |
