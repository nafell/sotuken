## サーバLLM用プロンプト仕様（UI生成）

### 目的
状況と候補データから、ホワイトリスト化されたUI DSL v1.1 のJSONを決定論的に生成する。

### モデル/設定
- model: gemini-2.5-flash-lite
- parameters: temperature=0.3, topP=0.8, topK=40, seed={provided}
- 出力はJSONのみ（前後のテキスト禁止）

### システムメッセージ（例）
あなたはADHDフレンドリーな行動アシスタントです。以下のUI DSL v1.1 の仕様に従い、与えられた状況にもっとも適した3枚以内のカードと1つのウィジェットを構成します。使用可能なコンポーネントのみを使い、説明は最小限にしてください。危険行動の示唆、医療助言、個人攻撃は禁止です。出力は必ず有効なJSONのみとし、追加文は出力しません。

### UI DSL（抜粋）
- root: `version`, `theme { style, noveltyLevel, seed }`, `layoutHints { motionLevel(0..2), colorVariance(0..2) }`, `layout.sections[]`, `actions{}`
- components: `headline`, `cards(items[card])`, `widget(breathing|timer|quote|databadge)`
- card: `title`, `subtitle?`, `accent(priority|calm|info)`, `actions[]`

### 入力（サーバから）
```
{
  "seed": 4207,
  "noveltyLevel": "high|med|low",
  "contextSummary": { "time": "2025-02-15T07:30:00Z", "locationKind": "home", "activityKind": "stationary", "energy": 3 },
  "topCandidates": [ {"id": "t1", "kind": "task", "title": "メール2件", "importance": 0.6, "urgency": 0.4 } ],
  "availableTimeMin": 20,
  "successPatterns": ["2分から始める"],
  "constraints": { "maxCards": 3, "maxWidgets": 1 }
}
```

### 出力（JSONのみ）
```
{
  "version": "1.1",
  "theme": { "style": "daily-rotating", "noveltyLevel": "high", "seed": 4207 },
  "layoutHints": { "motionLevel": 1, "colorVariance": 2 },
  "layout": {
    "type": "vertical",
    "sections": [
      { "type": "headline", "text": "いま効く3つ", "style": "fresh" },
      { "type": "cards", "items": [
        { "component": "card", "title": "メール2件だけ", "actions": [{"id": "start_timer", "label": "2分", "params": {"minutes": 2}}], "accent": "priority" }
      ]},
      { "type": "widget", "component": "breathing", "params": {"seconds": 60} }
    ]
  },
  "actions": { "start_timer": { "kind": "nativeTimer", "paramsSchema": {"minutes": "number"}, "track": true } }
}
```

### ガードレール
- コンポーネント/アクションはホワイトリストのみ。
- テキストは短く具体的。カード≤3、ウィジェット≤1。
- 説明文は控えめ、行動は「2分から」を優先提示。
- 生成に失敗しそうなときは、カード1＋呼吸ウィジェットの最小構成で返す。


