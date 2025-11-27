# DSL再設計提案書

**作成日**: 2025年10月20日
**目的**: LLMが理解・生成しやすいDSL仕様への根本的再設計

---

## 1. 現行DSL仕様の問題点分析

### 1.1 構造的複雑性の問題

#### 現行仕様の複雑な階層構造
```json
{
  "mappings": {
    "ENTITY.attribute": {
      "render": "custom",
      "component": "strategy_preview_picker",
      "props": {
        "allowMultiSelect": false
      }
    }
  }
}
```

**問題点**:
- エンティティパス形式（"ENTITY.attribute"）がLLMにとって理解困難
- カスタムウィジェットの仕様が曖昧
- ネストが深く、JSONの構造を正確に生成できない

### 1.2 レンダリングタイプの多様性

現行仕様では以下の多数のレンダリングタイプを定義：
- SVAL: paragraph, shortText, number, radio, category, hidden
- ARRY: expanded, summary
- PNTR: link, inline, card
- CUSTOM: tradeoff_slider, counterfactual_toggles, strategy_preview_picker

**問題点**:
- 選択肢が多すぎてLLMが適切な選択ができない
- カスタムウィジェットの動作仕様が不明確
- 型ごとに必須フィールドが異なり複雑

### 1.3 プロンプトの長大化

現行のUISpecGeneratorのプロンプトは200行以上：
- 基本仕様説明だけで100行以上
- ステージごとの詳細指示がさらに100行
- LLMのコンテキストウィンドウを圧迫

---

## 2. 新DSL仕様の設計方針

### 2.1 設計原則

1. **シンプリシティ**: 最小限の構造で最大の表現力
2. **明確性**: 曖昧さを排除し、一意に解釈可能
3. **日本語ファースト**: 日本語ラベルを標準化
4. **フラット構造**: ネストを浅くしてLLMの生成を容易に

### 2.2 新仕様の基本構造

```typescript
interface SimpleUISpec {
  version: "2.0";
  stage: "capture" | "plan" | "breakdown";
  sections: UISection[];
}

interface UISection {
  id: string;           // "main", "sub", etc.
  title: string;        // 日本語タイトル
  fields: UIField[];    // フィールドの配列
}

interface UIField {
  id: string;           // フィールドID
  label: string;        // 日本語ラベル（表示用）
  type: FieldType;      // シンプルな型
  value?: any;          // 初期値
  options?: FieldOptions; // オプション設定
}
```

### 2.3 フィールドタイプの簡略化

```typescript
type FieldType =
  | "text"        // テキスト入力（旧: paragraph, shortText統合）
  | "number"      // 数値入力
  | "select"      // 選択（旧: radio, category統合）
  | "list"        // リスト（旧: expanded, summary統合）
  | "slider"      // スライダー（旧: custom/tradeoff_slider）
  | "toggle"      // トグル（旧: custom/counterfactual_toggles）
  | "cards"       // カード選択（旧: custom/strategy_preview_picker）
;
```

---

## 3. 各ステージの新仕様

### 3.1 Captureステージ

```json
{
  "version": "2.0",
  "stage": "capture",
  "sections": [
    {
      "id": "main",
      "title": "気になっていること",
      "fields": [
        {
          "id": "concern_text",
          "label": "どんなことが気になっていますか？",
          "type": "text",
          "options": {
            "multiline": true,
            "placeholder": "例：卒業研究のテーマが決まらない",
            "minLength": 10,
            "maxLength": 500
          }
        },
        {
          "id": "category",
          "label": "カテゴリー",
          "type": "select",
          "options": {
            "choices": [
              { "value": "work", "label": "仕事・学業" },
              { "value": "personal", "label": "個人的なこと" },
              { "value": "health", "label": "健康・生活" }
            ]
          }
        },
        {
          "id": "urgency",
          "label": "緊急度",
          "type": "slider",
          "options": {
            "min": 0,
            "max": 10,
            "step": 1,
            "leftLabel": "急がない",
            "rightLabel": "とても急ぐ"
          }
        }
      ]
    }
  ]
}
```

### 3.2 Planステージ

```json
{
  "version": "2.0",
  "stage": "plan",
  "sections": [
    {
      "id": "strategies",
      "title": "取り組み方を選ぶ",
      "fields": [
        {
          "id": "strategy_cards",
          "label": "どの方法で進めますか？",
          "type": "cards",
          "options": {
            "cards": [
              {
                "id": "quick",
                "title": "すぐ行動",
                "description": "まず動いてみる。考えるより行動を優先",
                "icon": "🏃"
              },
              {
                "id": "careful",
                "title": "じっくり計画",
                "description": "しっかり準備してから始める",
                "icon": "📝"
              },
              {
                "id": "collaborative",
                "title": "誰かと一緒に",
                "description": "相談しながら進める",
                "icon": "👥"
              }
            ]
          }
        }
      ]
    },
    {
      "id": "adjustments",
      "title": "バランス調整",
      "fields": [
        {
          "id": "speed_quality",
          "label": "スピード vs 品質",
          "type": "slider",
          "options": {
            "leftLabel": "スピード重視",
            "rightLabel": "品質重視"
          }
        },
        {
          "id": "effort_level",
          "label": "力の入れ具合",
          "type": "slider",
          "options": {
            "leftLabel": "気楽に",
            "rightLabel": "全力で"
          }
        }
      ]
    }
  ]
}
```

### 3.3 Breakdownステージ

```json
{
  "version": "2.0",
  "stage": "breakdown",
  "sections": [
    {
      "id": "tasks",
      "title": "やることリスト",
      "fields": [
        {
          "id": "task_list",
          "label": "具体的な行動",
          "type": "list",
          "options": {
            "itemTemplate": {
              "title": "タスク名",
              "duration": "所要時間（分）",
              "priority": "優先度"
            },
            "defaultItems": [
              {
                "title": "まず情報を集める",
                "duration": 30,
                "priority": 1
              }
            ],
            "addButton": "タスクを追加",
            "allowReorder": true,
            "allowDelete": true
          }
        }
      ]
    },
    {
      "id": "summary",
      "title": "サマリー",
      "fields": [
        {
          "id": "total_time",
          "label": "合計時間",
          "type": "text",
          "options": {
            "readonly": true,
            "computed": "sum(task_list.duration)"
          }
        },
        {
          "id": "task_count",
          "label": "タスク数",
          "type": "text",
          "options": {
            "readonly": true,
            "computed": "count(task_list)"
          }
        }
      ]
    }
  ]
}
```

---

## 4. LLM向けプロンプトの簡略化

### 4.1 新プロンプト構造（大幅に簡略化）

```markdown
# UISpec生成タスク

以下の形式でJSONを生成してください：

## 基本構造
- version: "2.0"（固定）
- stage: "[指定されたステージ]"
- sections: セクションの配列

## フィールドタイプ
- text: テキスト入力
- number: 数値入力
- select: 選択肢から選ぶ
- list: リスト形式
- slider: スライダー
- toggle: オン/オフ切り替え
- cards: カード選択

## 入力情報
- 関心事: [concernText]
- ステージ: [stage]

適切な日本語ラベルを使用してUIを生成してください。
```

### 4.2 プロンプトサイズの比較

- **現行**: 約200行（約8000文字）
- **新仕様**: 約30行（約1000文字）
- **削減率**: 85%削減

---

## 5. 実装への影響と対応

### 5.1 UISpecGenerator.tsの変更

```typescript
class UISpecGenerator {
  buildUISpecPrompt(dataSchema: DataSchemaDSL, stage: string): string {
    // 大幅に簡略化されたプロンプト
    return `
# UISpec生成

以下のJSONを生成：
- version: "2.0"
- stage: "${stage}"
- sections: 適切なセクション

関心事: ${dataSchema.entities.CONCERN?.concernText || ''}

フィールドタイプ: text, number, select, list, slider, toggle, cards
日本語ラベルを使用すること。
    `.trim();
  }
}
```

### 5.2 UIRenderer.tsxの変更

```typescript
const renderField = (field: UIField) => {
  switch (field.type) {
    case 'text':
      return <TextInput {...field} />;
    case 'number':
      return <NumberInput {...field} />;
    case 'select':
      return <SelectInput {...field} />;
    case 'list':
      return <ListInput {...field} />;
    case 'slider':
      return <SliderInput {...field} />;
    case 'toggle':
      return <ToggleInput {...field} />;
    case 'cards':
      return <CardsInput {...field} />;
    default:
      return <TextInput {...field} />; // フォールバック
  }
};
```

---

## 6. 移行計画

### Phase 1: 新仕様の実装（1-2日）
1. 新しいUISpecDSL_v2.tsの作成
2. SimpleUISpecValidator.tsの実装
3. 新仕様対応のUISpecGenerator_v2.tsの実装

### Phase 2: UIレンダラーの更新（1-2日）
1. 新しいUIRenderer_v2.tsxの実装
2. 各フィールドタイプのコンポーネント実装
3. 日本語ラベルの標準化

### Phase 3: 統合とテスト（1日）
1. 既存システムとの統合
2. 各ステージのE2Eテスト
3. エラーハンドリングとフォールバックの実装

---

## 7. 期待される効果

### 7.1 LLM生成の改善
- **生成成功率**: 50% → 95%以上
- **生成時間**: 10秒 → 5秒
- **エラー率**: 高 → 極小

### 7.2 ユーザビリティの向上
- 日本語ラベルによる理解性向上
- 統一されたUIパターン
- 直感的な操作性

### 7.3 開発効率の向上
- コードの簡略化（50%削減）
- デバッグの容易化
- 将来の拡張性確保

---

## 8. リスクと対策

### リスク
1. 既存データとの互換性
2. 表現力の低下
3. 移行期間中の不安定性

### 対策
1. バージョン管理による段階的移行
2. 必要最小限の表現力は確保
3. フィーチャーフラグによる切り替え

---

## 次のステップ

1. この提案書のレビューと承認
2. 新仕様の詳細設計
3. プロトタイプ実装
4. 段階的な本実装
