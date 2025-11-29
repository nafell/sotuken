# UISpec DSL v2.0 最終設計書

**作成日**: 2025年10月20日
**バージョン**: 2.0
**ステータス**: 最終版

---

## 1. 設計理念

### 1.1 コアコンセプト
- **シンプリシティ**: 7つの基本ウィジェットで全画面を構成
- **LLMフレンドリー**: 簡潔で理解しやすい構造
- **日本語ファースト**: 日本人ユーザー向けの直感的UI
- **モバイルファースト**: スマートフォン利用を前提とした設計

### 1.2 設計原則
1. フラットな構造（ネストは最小限）
2. 明確な型定義（曖昧さを排除）
3. 宣言的な記述（手続き的処理を避ける）
4. 段階的拡張性（将来の機能追加を考慮）

---

## 2. データ構造定義

### 2.1 ルート構造

```typescript
interface UISpecV2 {
  version: "2.0";
  stage: "capture" | "plan" | "breakdown";
  sections: UISection[];
  actions: UIAction[];
  metadata?: UIMetadata;
}
```

### 2.2 セクション定義

```typescript
interface UISection {
  id: string;           // セクションID (例: "main", "sub")
  title: string;        // セクションタイトル（日本語）
  description?: string; // 説明文（オプション）
  fields: UIField[];    // フィールドの配列
  visible?: boolean;    // 表示/非表示（デフォルト: true）
}
```

### 2.3 フィールド定義

```typescript
interface UIField {
  id: string;                    // フィールドID
  label: string;                 // 表示ラベル（日本語）
  type: FieldType;              // フィールドタイプ
  value?: any;                  // 初期値
  options?: FieldOptions;        // フィールドオプション
  validation?: FieldValidation;  // バリデーションルール
}

type FieldType =
  | "text"    // テキスト入力
  | "number"  // 数値入力
  | "select"  // 選択
  | "list"    // リスト
  | "slider"  // スライダー
  | "toggle"  // トグル
  | "cards";  // カード選択
```

### 2.4 フィールドオプション

```typescript
interface FieldOptions {
  // 共通オプション
  required?: boolean;           // 必須フィールド
  readonly?: boolean;           // 読み取り専用
  placeholder?: string;         // プレースホルダー
  helperText?: string;         // ヘルプテキスト
  visibleWhen?: string;        // 表示条件式
  enabledWhen?: string;        // 有効化条件式
  computed?: string;           // 計算式（他フィールド参照）

  // text専用
  multiline?: boolean;         // 複数行入力
  minLength?: number;          // 最小文字数
  maxLength?: number;          // 最大文字数
  inputType?: "text" | "email" | "url" | "tel";

  // number専用
  min?: number;                // 最小値
  max?: number;                // 最大値
  step?: number;               // ステップ値
  unit?: string;               // 単位（例: "分", "円"）

  // select専用
  choices?: Choice[];          // 選択肢
  multiple?: boolean;          // 複数選択
  display?: "dropdown" | "radio" | "buttons";

  // list専用
  itemTemplate?: ItemTemplate; // アイテムテンプレート
  minItems?: number;           // 最小項目数
  maxItems?: number;           // 最大項目数
  reorderable?: boolean;       // 並び替え可能
  addButton?: string;          // 追加ボタンラベル

  // slider専用
  leftLabel?: string;          // 左端ラベル
  rightLabel?: string;         // 右端ラベル
  showValue?: boolean;         // 値を表示
  marks?: SliderMark[];        // 目盛り

  // toggle専用
  onLabel?: string;            // ONラベル
  offLabel?: string;           // OFFラベル

  // cards専用
  cards?: CardOption[];        // カードオプション
  allowMultiple?: boolean;     // 複数選択可能
  columns?: 1 | 2 | 3;        // カラム数（モバイル用）
}
```

### 2.5 アクション定義

```typescript
interface UIAction {
  id: string;                  // アクションID
  type: ActionType;           // アクションタイプ
  label: string;              // ボタンラベル（日本語）
  icon?: string;              // アイコン（絵文字）
  target?: string;            // ターゲット（画面遷移先など）
  condition?: string;         // 実行条件式
  position?: ActionPosition;  // 配置位置
  style?: ActionStyle;        // ボタンスタイル
  confirmation?: string;      // 確認メッセージ
}

type ActionType =
  | "submit"     // データ送信
  | "save"       // 保存
  | "navigate"   // 画面遷移
  | "reset"      // リセット
  | "compute"    // 再計算
  | "validate"   // バリデーション
  | "cancel";    // キャンセル

type ActionPosition = "bottom" | "top" | "section" | "inline";
type ActionStyle = "primary" | "secondary" | "danger" | "text";
```

### 2.6 補助型定義

```typescript
// 選択肢
interface Choice {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

// リストアイテムテンプレート
interface ItemTemplate {
  [key: string]: {
    type: "text" | "number" | "toggle";
    label: string;
    placeholder?: string;
  };
}

// スライダーマーク
interface SliderMark {
  value: number;
  label: string;
}

// カードオプション
interface CardOption {
  id: string;
  title: string;
  description: string;
  icon?: string;
  badge?: string;
  disabled?: boolean;
}

// バリデーションルール
interface FieldValidation {
  pattern?: string;           // 正規表現パターン
  custom?: string;            // カスタム検証式
  message?: string;           // エラーメッセージ
}

// メタデータ
interface UIMetadata {
  generatedAt: string;        // 生成日時
  generationId: string;       // 生成ID
  concernId?: string;         // 関心事ID
  userId?: string;            // ユーザーID
}
```

---

## 3. 各ステージの具体例

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
            "required": true,
            "multiline": true,
            "placeholder": "例：卒業研究のテーマが決まらなくて焦っている",
            "minLength": 10,
            "maxLength": 500,
            "helperText": "具体的に書くほど、より良い提案ができます"
          }
        },
        {
          "id": "category",
          "label": "カテゴリー",
          "type": "select",
          "value": "work",
          "options": {
            "required": true,
            "display": "buttons",
            "choices": [
              {
                "value": "work",
                "label": "仕事・学業",
                "description": "研究、課題、就活など"
              },
              {
                "value": "personal",
                "label": "個人的なこと",
                "description": "人間関係、趣味など"
              },
              {
                "value": "health",
                "label": "健康・生活",
                "description": "体調、生活習慣など"
              }
            ]
          }
        },
        {
          "id": "urgency",
          "label": "どのくらい急いでいますか？",
          "type": "slider",
          "value": 5,
          "options": {
            "min": 0,
            "max": 10,
            "step": 1,
            "leftLabel": "急がない",
            "rightLabel": "とても急ぐ",
            "showValue": true
          }
        }
      ]
    },
    {
      "id": "context",
      "title": "追加情報（任意）",
      "fields": [
        {
          "id": "tried_before",
          "label": "すでに試したこと",
          "type": "text",
          "options": {
            "multiline": true,
            "placeholder": "これまでに試した対処法があれば教えてください"
          }
        },
        {
          "id": "constraints",
          "label": "制約条件",
          "type": "list",
          "options": {
            "itemTemplate": {
              "constraint": {
                "type": "text",
                "label": "制約",
                "placeholder": "例：予算1万円まで"
              }
            },
            "maxItems": 5,
            "addButton": "制約を追加"
          }
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "next",
      "type": "submit",
      "label": "次へ進む",
      "target": "plan",
      "condition": "concern_text.length >= 10",
      "position": "bottom",
      "style": "primary"
    },
    {
      "id": "save_draft",
      "type": "save",
      "label": "下書き保存",
      "position": "bottom",
      "style": "secondary"
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
      "id": "strategy",
      "title": "取り組み方を選びましょう",
      "description": "あなたに合った進め方を選んでください",
      "fields": [
        {
          "id": "approach",
          "label": "どのアプローチで進めますか？",
          "type": "cards",
          "options": {
            "columns": 1,
            "cards": [
              {
                "id": "quick",
                "title": "すぐに行動する",
                "description": "考えすぎずにまず動いてみる。小さな一歩から始める。",
                "icon": "🏃",
                "badge": "おすすめ"
              },
              {
                "id": "careful",
                "title": "じっくり計画する",
                "description": "しっかりと準備してから始める。確実に進める。",
                "icon": "📝"
              },
              {
                "id": "collaborative",
                "title": "誰かと相談する",
                "description": "一人で抱え込まず、周りの人と一緒に考える。",
                "icon": "👥"
              }
            ]
          }
        }
      ]
    },
    {
      "id": "balance",
      "title": "バランス調整",
      "description": "あなたの状況に合わせて調整してください",
      "fields": [
        {
          "id": "speed_quality",
          "label": "重視したいこと",
          "type": "slider",
          "value": 0.5,
          "options": {
            "min": 0,
            "max": 1,
            "step": 0.1,
            "leftLabel": "スピード重視",
            "rightLabel": "品質重視",
            "marks": [
              { "value": 0, "label": "速" },
              { "value": 0.5, "label": "バランス" },
              { "value": 1, "label": "質" }
            ]
          }
        },
        {
          "id": "effort",
          "label": "力の入れ方",
          "type": "slider",
          "value": 0.7,
          "options": {
            "min": 0,
            "max": 1,
            "step": 0.1,
            "leftLabel": "気楽に",
            "rightLabel": "全力で"
          }
        },
        {
          "id": "solo_team",
          "label": "進め方",
          "type": "slider",
          "value": 0.3,
          "options": {
            "min": 0,
            "max": 1,
            "step": 0.1,
            "leftLabel": "一人で",
            "rightLabel": "みんなで"
          }
        }
      ]
    },
    {
      "id": "options",
      "title": "オプション",
      "fields": [
        {
          "id": "use_deadline",
          "label": "期限を設定する",
          "type": "toggle",
          "value": false
        },
        {
          "id": "deadline_days",
          "label": "何日以内に完了？",
          "type": "number",
          "options": {
            "min": 1,
            "max": 90,
            "unit": "日",
            "visibleWhen": "use_deadline == true",
            "placeholder": "30"
          }
        },
        {
          "id": "reminder",
          "label": "リマインダーを設定",
          "type": "toggle",
          "value": true
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "regenerate",
      "type": "compute",
      "label": "別の提案を見る",
      "icon": "🔄",
      "position": "section",
      "style": "text"
    },
    {
      "id": "confirm",
      "type": "submit",
      "label": "この方針で決定",
      "target": "breakdown",
      "position": "bottom",
      "style": "primary",
      "condition": "approach != null"
    },
    {
      "id": "back",
      "type": "navigate",
      "label": "戻る",
      "target": "capture",
      "position": "bottom",
      "style": "secondary"
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
      "title": "具体的なタスクリスト",
      "description": "実行可能な行動に分解しました",
      "fields": [
        {
          "id": "task_list",
          "label": "やることリスト",
          "type": "list",
          "value": [
            {
              "title": "まず研究室の先輩に相談のアポを取る",
              "duration": 5,
              "priority": 1,
              "done": false
            },
            {
              "title": "過去の卒論テーマ一覧を確認する",
              "duration": 30,
              "priority": 2,
              "done": false
            },
            {
              "title": "興味のあるキーワードを5つ書き出す",
              "duration": 15,
              "priority": 3,
              "done": false
            }
          ],
          "options": {
            "itemTemplate": {
              "title": {
                "type": "text",
                "label": "タスク",
                "placeholder": "何をする？"
              },
              "duration": {
                "type": "number",
                "label": "時間",
                "placeholder": "分"
              },
              "priority": {
                "type": "number",
                "label": "優先度",
                "placeholder": "1-5"
              },
              "done": {
                "type": "toggle",
                "label": "完了"
              }
            },
            "reorderable": true,
            "minItems": 1,
            "maxItems": 20,
            "addButton": "タスクを追加"
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
          "label": "合計所要時間",
          "type": "text",
          "options": {
            "readonly": true,
            "computed": "sum(task_list.*.duration) + ' 分'",
            "helperText": "すべてのタスクを完了するまでの目安時間"
          }
        },
        {
          "id": "task_count",
          "label": "タスク数",
          "type": "text",
          "options": {
            "readonly": true,
            "computed": "count(task_list) + ' 個'"
          }
        },
        {
          "id": "completed_count",
          "label": "完了済み",
          "type": "text",
          "options": {
            "readonly": true,
            "computed": "count(task_list[done==true]) + ' / ' + count(task_list)"
          }
        },
        {
          "id": "first_action",
          "label": "最初の一歩",
          "type": "text",
          "value": "まず研究室の先輩に相談のアポを取る（5分）",
          "options": {
            "readonly": true,
            "computed": "task_list[0].title + '（' + task_list[0].duration + '分）'"
          }
        }
      ]
    },
    {
      "id": "motivation",
      "title": "モチベーション",
      "fields": [
        {
          "id": "confidence",
          "label": "できそうな感じ",
          "type": "slider",
          "value": 0.7,
          "options": {
            "min": 0,
            "max": 1,
            "step": 0.1,
            "leftLabel": "難しそう",
            "rightLabel": "できそう",
            "showValue": false
          }
        },
        {
          "id": "note",
          "label": "メモ",
          "type": "text",
          "options": {
            "multiline": true,
            "placeholder": "気づいたことや感想を自由に書いてください"
          }
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "start",
      "type": "submit",
      "label": "タスクを開始する",
      "icon": "🚀",
      "position": "bottom",
      "style": "primary",
      "target": "execution"
    },
    {
      "id": "save",
      "type": "save",
      "label": "保存して後で",
      "position": "bottom",
      "style": "secondary"
    },
    {
      "id": "regenerate",
      "type": "compute",
      "label": "タスクを再生成",
      "position": "top",
      "style": "text",
      "confirmation": "現在のタスクリストは失われます。よろしいですか？"
    }
  ]
}
```

---

## 4. 条件式と計算式

### 4.1 条件式（visibleWhen, enabledWhen, condition）

```javascript
// 基本的な比較
"field_id == 'value'"
"field_id != null"
"field_id > 5"
"field_id >= 10 && field_id <= 20"

// 論理演算
"field1 == true || field2 == true"
"field1 != null && field2 != null"

// 配列操作
"count(list_field) > 0"
"list_field[0].done == true"

// 文字列操作
"text_field.length >= 10"
```

### 4.2 計算式（computed）

```javascript
// 数値計算
"field1 + field2"
"sum(list_field.*.duration)"
"avg(list_field.*.priority)"
"max(list_field.*.priority)"

// 文字列結合
"field1 + ' - ' + field2"
"'合計: ' + sum(list_field.*.duration) + ' 分'"

// カウント
"count(list_field)"
"count(list_field[done==true])"

// 配列アクセス
"list_field[0].title"
"list_field[priority==1].title"
```

---

## 5. バリデーション仕様

### 5.1 組み込みバリデーション

```json
{
  "validation": {
    "pattern": "^[a-zA-Z0-9]+$",
    "message": "英数字のみ入力可能です"
  }
}
```

### 5.2 カスタムバリデーション

```json
{
  "validation": {
    "custom": "value.length >= 10 && value.includes('@')",
    "message": "10文字以上で@を含む必要があります"
  }
}
```

---

## 6. イベントフロー

### 6.1 ユーザーインタラクション

```
1. ユーザーがフィールドに入力
   ↓
2. リアルタイムバリデーション実行
   ↓
3. computed フィールドの再計算
   ↓
4. visibleWhen/enabledWhen の評価
   ↓
5. UIの更新
```

### 6.2 アクション実行フロー

```
1. ユーザーがアクションボタンをクリック
   ↓
2. condition の評価（falseなら中止）
   ↓
3. confirmation の表示（設定されている場合）
   ↓
4. アクションタイプに応じた処理
   - submit: バリデーション → データ送信 → 画面遷移
   - save: データ保存
   - compute: 再計算/再生成
   - navigate: 画面遷移
   ↓
5. 結果のフィードバック
```

---

## 7. エラーハンドリング

### 7.1 フィールドレベルエラー

```typescript
interface FieldError {
  fieldId: string;
  message: string;
  type: "validation" | "required" | "system";
}
```

### 7.2 システムレベルエラー

```typescript
interface SystemError {
  code: string;
  message: string;
  recovery?: {
    action: "retry" | "fallback" | "cancel";
    fallbackUI?: UISpecV2;
  };
}
```

---

## 8. パフォーマンス最適化

### 8.1 レンダリング最適化
- フィールドごとのメモ化
- 計算式の結果キャッシュ
- 条件式の遅延評価

### 8.2 データサイズ制限
- sections: 最大10個
- fields per section: 最大20個
- list items: 最大100個
- text length: 最大10,000文字

---

## 9. 将来の拡張性

### 9.1 予約済みフィールドタイプ
- "date": 日付選択
- "time": 時刻選択
- "file": ファイルアップロード
- "image": 画像選択
- "location": 位置情報

### 9.2 予約済みアクションタイプ
- "share": 共有
- "export": エクスポート
- "import": インポート
- "schedule": スケジュール設定

---

## 10. 実装チェックリスト

### Phase 1: 基本実装（Day 1-2）
- [ ] UISpecV2の型定義（TypeScript）
- [ ] Zodスキーマの実装
- [ ] バリデーション関数の実装
- [ ] 基本的なウィジェットコンポーネント（7種類）

### Phase 2: 高度な機能（Day 3-4）
- [ ] 条件式エンジンの実装
- [ ] 計算式エンジンの実装
- [ ] アクションハンドラーの実装
- [ ] エラーハンドリング

### Phase 3: 統合とテスト（Day 5）
- [ ] UISpecGeneratorの改修
- [ ] UIRendererの改修
- [ ] E2Eテストの実装
- [ ] パフォーマンステスト

---

## 付録A: 型定義ファイル（完全版）

TypeScriptの完全な型定義は `UISpecV2.ts` として別途提供

## 付録B: Zodスキーマ（完全版）

Zodバリデーションスキーマは `UISpecV2Schema.ts` として別途提供

## 付録C: LLMプロンプトテンプレート

LLM向けプロンプトは `UISpecV2Prompt.md` として別途提供