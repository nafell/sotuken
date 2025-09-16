## 「頭の棚卸しノート」（研究・再現性対応）

本プロジェクトは、状況適応型の動的UIとCBTフロー・優先スコアリングにより「関心事・気掛かり」を外在化し、脳のキャッシュメンテナンスとワーキングメモリ拡張を実現するiOSアプリ（研究用途）です。LLM（Gemini 2.5 mini）でWeb領域のUIをサーバサイド生成し、SwiftUIシェル＋WKWebViewで表示します。

### 特徴
- 匿名クラウド＋サーバサイド推論（再現性のための決定論モード/seed）
- CBTフロー（実態把握→方針立案→細分化）でprocrastination対策と脳の棚卸しを実現
- 状況認識に基づく動的優先付けと新規性制御
- UI DSLに基づく動的レイアウト（ホワイトリスト制御）
- 研究/実験のためのログスキーマ、リプレイAPI、configバージョニング

### ディレクトリ構成（初期）
- `config/` 固定配布設定（`config.v1.json`）
- `api/` OpenAPI 定義
- `specs/` 研究・仕様ドキュメント（イベント、プロンプト、DSL、実験など）

### 次の一歩（MVP）
1) `/v1/config` をこの`config.v1.json`で返すスタブAPI
2) `/v1/ui/generate` スタブ（固定DSL返却＋seed記録）
3) イベント受信 `/v1/events/batch` の受け口（JSONバリデーション）

### 参考
- 仕様の詳細は `specs/` 配下（`experiment_protocol.md`, `ui_generation_prompt.md`, `ui_dsl_v1.1.json` など）を参照。


