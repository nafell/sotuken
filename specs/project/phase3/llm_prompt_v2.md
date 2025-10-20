# LLM向けUISpec v2.0生成プロンプト

## 基本プロンプトテンプレート（全ステージ共通）

```markdown
# タスク
UISpec v2.0形式のJSONを生成してください。

## 形式
{
  "version": "2.0",
  "stage": "[STAGE]",
  "sections": [...],
  "actions": [...]
}

## 使用可能なフィールドタイプ
- text: テキスト入力
- number: 数値入力
- select: 選択肢
- list: リスト
- slider: スライダー
- toggle: ON/OFF切り替え
- cards: カード選択

## ルール
1. すべてのラベルは日本語で記述
2. ユーザーフレンドリーな表現を使用
3. placeholder と helperText で使い方を説明
4. 必須フィールドには required: true を設定

## 入力情報
- 関心事: [CONCERN_TEXT]
- ステージ: [STAGE]
- コンテキスト: [CONTEXT_FACTORS]

JSONのみを出力してください。説明は不要です。
```

---

## ステージ別プロンプト

### Captureステージ用プロンプト

```markdown
# UISpec生成: Captureステージ

関心事の詳細を収集する画面を生成してください。

## 必須セクション
1. main: 関心事の入力
   - concern_text (text, multiline, 必須)
   - category (select, buttons表示)
   - urgency (slider, 0-10)

2. context: 追加情報（任意）
   - 制約条件や背景情報を収集

## アクション
- next: 次へ進む（submitタイプ）
- save_draft: 下書き保存（saveタイプ）

## 生成例の構造
{
  "version": "2.0",
  "stage": "capture",
  "sections": [
    {
      "id": "main",
      "title": "気になっていること",
      "fields": [...]
    }
  ],
  "actions": [...]
}

関心事: [CONCERN_TEXT]

上記の関心事に適した入力フィールドを生成してください。
```

### Planステージ用プロンプト

```markdown
# UISpec生成: Planステージ

関心事への取り組み方を計画する画面を生成してください。

## 必須セクション
1. strategy: 戦略選択
   - approach (cards): 3つの異なるアプローチを提示

2. balance: バランス調整
   - 2-3個のsliderで優先度を調整

3. options: オプション設定
   - toggleで追加オプションを制御

## アクション
- confirm: 決定（submitタイプ）
- regenerate: 再生成（computeタイプ）
- back: 戻る（navigateタイプ）

## カード内容の生成指針
関心事「[CONCERN_TEXT]」に対して：
1. 積極的なアプローチ
2. 慎重なアプローチ
3. バランス型アプローチ

各アプローチには具体的な説明を含めてください。

JSONのみを出力：
```

### Breakdownステージ用プロンプト

```markdown
# UISpec生成: Breakdownステージ

具体的なタスクリストを生成する画面を作成してください。

## 必須セクション
1. tasks: タスクリスト
   - task_list (list): 実行可能なタスク一覧
   - 各タスクには title, duration, priority を含める

2. summary: サマリー
   - 合計時間、タスク数など（computed使用）

## タスク生成指針
関心事「[CONCERN_TEXT]」を解決するために：
- 5分以内でできる小さなタスクから開始
- 具体的で実行可能な行動
- 3-7個程度のタスク

## アクション
- start: 開始（submitタイプ）
- save: 保存（saveタイプ）

JSONのみを出力：
```

---

## 最適化されたワンショットプロンプト（実装用）

### 完全版プロンプト（約50行）

```markdown
# UISpec v2.0 JSON生成

以下の形式でJSONを生成：

{
  "version": "2.0",
  "stage": "[capture|plan|breakdown]",
  "sections": [
    {
      "id": "セクションID",
      "title": "セクションタイトル（日本語）",
      "fields": [
        {
          "id": "フィールドID",
          "label": "ラベル（日本語）",
          "type": "text|number|select|list|slider|toggle|cards",
          "value": "初期値（オプション）",
          "options": {
            // text用
            "multiline": true/false,
            "placeholder": "例：...",
            "minLength": 10,
            "maxLength": 500,

            // select用
            "choices": [
              {"value": "val1", "label": "表示名"}
            ],

            // slider用
            "min": 0, "max": 10,
            "leftLabel": "左", "rightLabel": "右",

            // list用
            "itemTemplate": {
              "field1": {"type": "text", "label": "項目1"}
            },
            "reorderable": true,

            // cards用
            "cards": [
              {
                "id": "card1",
                "title": "タイトル",
                "description": "説明",
                "icon": "🎯"
              }
            ],

            // 共通
            "required": true/false,
            "visibleWhen": "条件式",
            "computed": "計算式"
          }
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "action_id",
      "type": "submit|save|navigate|compute",
      "label": "ボタンラベル（日本語）",
      "position": "bottom",
      "style": "primary|secondary"
    }
  ]
}

入力:
- ステージ: [STAGE]
- 関心事: [CONCERN_TEXT]

適切な日本語UIを生成してください。JSONのみ出力。
```

---

## プロンプト比較

### 現行 v1.0
- **サイズ**: 約200行（8000文字）
- **複雑度**: 高（多数のレンダリングタイプ、ネストした構造）
- **成功率**: 約50%

### 新規 v2.0
- **サイズ**: 約50行（2000文字）
- **複雑度**: 低（7つの基本タイプ、フラット構造）
- **予想成功率**: 95%以上

### 改善ポイント
1. **75%のサイズ削減**: プロンプトトークン数を大幅削減
2. **明確な構造**: ネストを浅くし、理解しやすい
3. **具体例の提示**: 各フィールドタイプの使用例を含める
4. **日本語強調**: すべてのラベルを日本語にすることを明記

---

## 実装時の注意点

### 1. プロンプトの動的生成

```typescript
function generatePrompt(stage: string, concernText: string, factors?: any): string {
  const basePrompt = loadBasePrompt();
  const stagePrompt = loadStagePrompt(stage);

  return basePrompt
    .replace('[STAGE]', stage)
    .replace('[CONCERN_TEXT]', concernText)
    .replace('[CONTEXT_FACTORS]', JSON.stringify(factors || {}))
    + '\n\n' + stagePrompt;
}
```

### 2. レスポンスの後処理

```typescript
function postProcessResponse(llmOutput: string): any {
  // JSONの抽出（マークダウンコードブロックを除去）
  const jsonStr = llmOutput
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  // パース
  const parsed = JSON.parse(jsonStr);

  // デフォルト値の補完
  return fillDefaults(parsed);
}
```

### 3. エラーハンドリング

```typescript
async function generateWithRetry(prompt: string, maxRetries = 3): Promise<UISpecV2> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await callLLM(prompt);
      const parsed = postProcessResponse(response);
      const validated = validateWithZod(parsed);
      return validated;
    } catch (error) {
      console.log(`Attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) {
        throw error;
      }
      // プロンプトを少し調整して再試行
      prompt = adjustPrompt(prompt, error);
    }
  }
}
```

---

## テスト用プロンプト例

### 例1: 研究テーマ決定
```
ステージ: capture
関心事: 卒業研究のテーマが決まらない
```

### 例2: 英語学習再開
```
ステージ: plan
関心事: 英語学習を再開したいが、続かない
```

### 例3: ジム通い
```
ステージ: breakdown
関心事: ジムに通い始めたい
```

---

## 今後の改善案

1. **Few-shot learning**: 成功例を2-3個含める
2. **Chain of thought**: 思考過程を含めた生成
3. **Fine-tuning**: 専用モデルの作成
4. **プロンプト圧縮**: さらなる簡略化