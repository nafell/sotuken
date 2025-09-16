# 開発者向けガイド（非研究者のプログラマ向け）

このドキュメントは、研究プロジェクトとしての要件（再現性・実験容易性）を満たしつつ、実装を効率化するための技術的な説明をまとめたものです。研究手法に関する事項には「注釈（研究意図）」を付け、なぜ必要かを明確にしています。

## 1. 目的と全体像
- iOSアプリ「頭の棚卸しノート」で「関心事・気掛かり」を外在化し、脳のキャッシュメンテナンスとワーキングメモリ拡張を実現します。
- CBTフロー（実態把握→方針立案→細分化）で段階的に具体化、細分化フェーズでUIはサーバ側 LLM（Gemini 2.5 Flash-Lite）で毎回 JSON DSL を生成。
- 再現性最優先: サーバで設定を凍結し、同一入力→同一出力を目指します。

注釈（研究意図）: 実験の信頼性を担保するため、設定・モデル・乱数種（seed）を固定し、同条件であれば同じ UI を再生成できるようにします。

## 2. リポジトリ構成（抜粋）
- `config/` 固定配布設定（プリセット重み・新規性ポリシ等）
  - `config.v1.json`: バージョン固定の設定スナップショット
- `api/` OpenAPI 定義
  - `openapi.yaml`: API 仕様（/v1/config, /v1/ui/generate など）
- `specs/` 仕様・スキーマ・研究文書
  - `experiment_protocol.md`: 実験プロトコル（仮説/指標/割付/保持）
  - `events-schema.json`: イベント送信スキーマ
  - `ui_dsl_v1.1.json`: UI DSL の JSON Schema
  - `prompt/ui_generation_prompt.md`: LLM プロンプト仕様
  - `replay_api.md`: リプレイ API 仕様
  - `data_dictionary.md`: 主要データ項目の辞書
- `server/` API スタブ実装（Node.js + TypeScript + Express）
  - `src/index.ts`: /v1 配下の最小エンドポイント

## 3. クイックスタート（API サーバ）
前提: Node.js 18+ 推奨

1) 依存関係インストール
```
cd server
npm i
```

2) 開発起動（デフォルト: http://localhost:3000）
```
npm run dev
```
- ポート競合時: `PORT=3001 bun run dev`

3) 動作確認（例）
```
# 設定スナップショット
curl http://localhost:3000/v1/config

# UI 生成（スタブ）
curl -X POST http://localhost:3000/v1/ui/generate -H 'Content-Type: application/json' -d '{"userAnonId":"u_demo","contextSnapshot":{"time":"2025-01-01T09:00:00Z"}}'
```

## 4. サーバ構成と設計ポイント
- ランタイム: Bun + Hono（TypeScript）
- モジュール: CommonJS（開発ツール互換を優先）
- 主なエンドポイント（スタブ）:
  - `GET /v1/config`: 凍結設定の配布
  - `POST /v1/ui/generate`: UI DSL 生成（現状はダミー返却）
  - `POST /v1/score/rank`: プリセット重みに基づく簡易スコア（現状は importance+urgency の和）
  - `POST /v1/events/batch`: イベントを受信（MVP は 202 Accepted のみ）
  - `POST /v1/replay/generate`: リプレイ（現状 501）

注釈（研究意図）: `GET /v1/config` で設定を「固定配布」することで、どのユーザ/セッションがどの設定で動いていたかを明示し、後から結果を再現可能にします。

## 5. 設定ファイル（config/config.v1.json）
主要キー:
- `weights`: 優先スコアの重み（プリセット）
- `uiNoveltyPolicy`: 新規性の強さの判定閾値/1日の上限
- `dslVersion`: UI DSL のバージョン
- `model`: LLM のモデル名・バージョン・パラメータ（temperature, topP, topK, seed 戦略）
- `retention`: データの保持期間（研究/運用）

注釈（研究意図）: `configVersion` と `configSnapshot` をレスポンス/イベントに必ず添付し、どの設定で生成された UI/行動ログかを追跡できるようにします。

## 6. UI DSL v1.1 の要点
- ルート: `version`, `theme`, `layoutHints`, `layout`, `actions`
- `theme.noveltyLevel`: `low|med|high` に応じて色/配置/動きの強度を調整
- `layout.sections`: `headline|cards|widget` を最大 5 ブロックまで
- `cards.items`: 最大 3 枚、各カードに `actions` を最大 2 つ
- `actions`: `navigate` または `nativeTimer`

参考: スキーマは `specs/ui_dsl_v1.1.json` を参照

注釈（研究意図）: ホワイトリスト型 DSL に制限することで、安全性と審査対応を担保します。また、出力の厳格バリデーションにより、LLM 出力の揺れを検出します。

## 7. 動的 UI と新規性（Novelty）ポリシー
- `AttentionNeed`（注意喚起の必要度）に応じて `noveltyLevel` を切替
  - low: 安定性重視
  - med: 色・枠の変化
  - high: 配置も含む変化＋軽微なモーション
- 1日の「新規性予算」を超えない制御を実装

注釈（研究意図）: ADHD 傾向ユーザは新規性が着手を促す一方、過刺激は逆効果。実験で最適領域を探索するため、上限と閾値を固定し効果を評価します。

## 8. 優先スコアリング（プリセット）
関心事・タスクのスコア例: importance, urgency, cognitive_relief, deadlineProximity, contextFit, timeFit, staleness, energyMatch, switchCost を線形結合。

注釈（研究意図）: 初期は個人化を避け、プリセットで固定。これにより群間比較が可能になり、効果を純粋に測定できます（再現性）。

## 9. イベント送信（計測）
- 送信先: `POST /v1/events/batch`
- バリデーション: `specs/events-schema.json`
- 共通フィールド: `eventId`, `userAnonId`, `ts`, `configVersion`, `abCondition`, `responseId?`, `contextHash?`
- 主要イベント: `ui_generated`, `ui_rendered`, `card_clicked`, `action_executed`, `concern_organized`, `task_completed`, `notification_shown/clicked`, `cognitive_load_reported`

注釈（研究意図）: 全イベントに `configVersion` と `responseId`（可能なもの）を付与し、後から当時の UI を再生（リプレイ）できるようにします。

## 10. リプレイ（再現性の要）
- 目的: 過去の UI を同設定・同 seed で再生成し一致性を検証
- API: `POST /v1/replay/generate`（将来実装）
- 手順: `responseId`→当時の `configSnapshot`/`seed`/`contextHash` を復元→再生成→差分比較

注釈（研究意図）: 「同一入力→同一出力」がどの程度成立するかを継続検査し、モデル更新や設定変更が効果測定に与える影響を監視します。

## 11. 生体情報（HealthKit Phase 0）
- 対象: 心拍・HRV の粗区分（low/med/high）
- 端末で要約→サーバへは区分と時刻帯のみ送信（生値は送らない）
- 許諾は必須ではなく、OFF でも致命的に劣化しない設計

注釈（研究意図）: 生体情報はセンシティブ。粗区分・オンデバイス要約・同意ベースでリスクを下げつつ、エネルギー推定の補助に限定します。

## 12. セキュリティ/プライバシー
- 匿名 ID（UUID）で識別。PII は保存しない。
- 位置はカテゴリ化（home/work/transit など）、カレンダーは自由時間の統計のみ。
- 送信データは TLS、端末保存は OS 既定の保護領域を使用。

注釈（研究意図）: 研究公開用データセットを個人に逆照合できない形に保つため、ハッシュ化や区分化に徹します。

## 13. iOS/クライアント実装の目安
- シェル: SwiftUI + WKWebView（細分化フェーズの動的UI用）
- CBTフロー初期（実態把握→方針立案）:
  1. 関心事の自由入力
  2. 関心度・切迫度測定
  3. 性質分類とアプローチ選択
- 細分化フェーズ（動的UI）:
  4. `GET /v1/config` で設定受領
  5. 関心事データ＋コンテキスト要約を作成
  6. `POST /v1/ui/generate` で DSL を受領
  7. Web レンダラに DSL を渡して描画
  8. 主要操作を `/v1/events/batch` に送信
- 失敗時: 直近キャッシュ DSL か固定テンプレにフォールバック

## 14. Web レンダラ（概要）
- 技術: React/Vite 想定（任意）
- 役割: DSL（v1.1）をバリデート→コンポーネントにマッピング→postMessage でネイティブと連携
- 最小対応: `headline`, `cards`, `widget: breathing/timer/quote`

## 15. よくあるトラブル
- 開発ポートが埋まっている: `PORT=3001 npm run dev`
- LLM 未接続: 現在はスタブ応答。Gemini 接続はサーバ側で追加実装が必要です。
- スキーマ不一致: `specs/ui_dsl_v1.1.json` で JSON Validate を実施してください。

## 16. 今後の実装タスク（抜粋）
- `/v1/ui/generate` に Gemini 呼び出しを実装（決定論モード / seed / キャッシュ）
- イベント受信の JSON スキーマ検証 / バッチ書き込み
- リプレイ API 実装と一致率テスト
- iOS シェル + Web レンダラ最小版

---
このガイドに沿って開発すれば、研究で要求される「再現性」を損なわずに、通常のアプリ開発と同様のフローで実装できます。疑問点があれば `specs/` 配下の各文書（特に `experiment_protocol.md` と `replay_api.md`）を参照してください。
