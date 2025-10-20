# TypeScriptビルドエラー分析

**作成日**: 2025年10月20日
**対象**: Phase 3 Task 3.1 - TypeScriptビルドエラー調査
**ビルドコマンド**: `cd concern-app && bun run build`

---

## エラー概要

- **総エラー数**: 26件
- **影響ファイル数**: 10ファイル
- **ビルド結果**: 失敗 (Type check failed)

---

## エラー分類

### カテゴリA: 実行時エラーの原因（必ず修正） - 5件

これらのエラーは型安全性を損ない、実行時エラーを引き起こす可能性が高い。

#### A-1: FactorsDict export問題 (ApiService.ts:6)
```
src/services/api/ApiService.ts(6,15): error TS2459: Module '"../context/ContextService"' declares 'FactorsDict' locally, but it is not exported.
```

**影響度**: 🔴 **高**
**説明**: `FactorsDict`型がContextServiceからエクスポートされていないため、ApiServiceでimportできない。
**修正コスト**: 5分（exportを追加するだけ）
**修正方針**: `concern-app/src/services/context/ContextService.ts`で`FactorsDict`を`export`に追加

---

#### A-2: Dexie orderByメソッド不在 (localDB.ts:119)
```
src/services/database/localDB.ts(119,8): error TS2339: Property 'orderBy' does not exist on type 'Collection<ConcernSession, any, ConcernSession>'.
```

**影響度**: 🔴 **高**
**説明**: Dexieの`where()`の後に`orderBy()`を直接呼ぶのは誤り。Dexieでは`orderBy()`は`where()`の前に呼ぶか、`toArray()`後にソートする。
**修正コスト**: 10分（Dexie APIの正しい使い方に修正）
**修正方針**: `this.concernSessions.orderBy('startTime').reverse().filter(...).limit(...).toArray()`のように修正

---

#### A-3: boolean型をIndexableTypeに代入不可 (localDB.ts:142, 187)
```
src/services/database/localDB.ts(142,15): error TS2345: Argument of type 'boolean' is not assignable to parameter of type 'IndexableType'.
src/services/database/localDB.ts(187,15): error TS2345: Argument of type 'boolean' is not assignable to parameter of type 'IndexableType'.
```

**影響度**: 🔴 **高**
**説明**: Dexieの`.equals()`はboolean型を直接受け取れない。数値(0/1)で検索する必要がある。
**修正コスト**: 5分
**修正方針**: `.equals(false)` → `.equals(0)` に修正

---

#### A-4: Dexie filterメソッドの型エラー (localDB.ts:291)
```
src/services/database/localDB.ts(291,23): error TS2769: No overload matches this call.
  Type 'boolean | undefined' is not assignable to type 'boolean'.
    Type 'undefined' is not assignable to type 'boolean'.
```

**影響度**: 🟡 **中**
**説明**: `task.lastTouchAt`が`undefined`の可能性があるため、filterの条件が`boolean | undefined`になっている。
**修正コスト**: 5分
**修正方針**: `filter(task => task.lastTouchAt !== undefined && task.lastTouchAt < thresholdDate)`のようにundefinedチェックを追加

---

#### A-5: ConcernSession型の不整合 (SessionManager.ts:50, 84, 91, 93, 99, 132, 193)

```
src/services/session/SessionManager.ts(50,9): error TS2353: Object literal may only specify known properties, and 'concernText' does not exist in type '{ rawInput?: string | undefined; ...'
src/services/session/SessionManager.ts(84,9): error TS2322: Type 'string | undefined' is not assignable to type '"now" | "this_week" | "this_month" | "someday" | undefined'.
src/services/session/SessionManager.ts(91,9): error TS2322: Type 'string | undefined' is not assignable to type '"other" | "learning_research" | ... | undefined'.
src/services/session/SessionManager.ts(93,9): error TS2322: Type 'string | undefined' is not assignable to type '"information_gathering" | ... | undefined'.
src/services/session/SessionManager.ts(99,9): error TS2561: Object literal may only specify known properties, but 'selectedAction' does not exist...
src/services/session/SessionManager.ts(132,9): error TS2353: Object literal may only specify known properties, and 'completionTime' does not exist...
src/services/session/SessionManager.ts(193,31): error TS2339: Property 'mentalLoadChange' does not exist on type '{ actionStarted?: boolean | undefined; ...'
```

**影響度**: 🔴 **高**
**説明**:
- `SessionManager`が使用するフィールド名と`ConcernSession`型定義が不一致
- `concernText` → `rawInput`
- `selectedAction` → `selectedActionId`
- `completionTime`、`mentalLoadChange`が`outcomes`型に存在しない
- リテラル型のキャストが必要

**修正コスト**: 20分
**修正方針**:
1. SessionManager.tsの使用箇所を型定義に合わせて修正
2. または型定義を実装に合わせて修正（どちらが正しい仕様か確認が必要）

---

### カテゴリB: 型安全性の問題（修正推奨） - 4件

実行時エラーにはならないが、型安全性が低下する。

#### B-1: FactorsDict型定義の不整合 (database.ts:26-29)

```
src/types/database.ts(26,3): error TS2411: Property 'location_category' of type '(FactorValue & { value: "home" | "work" | "transit" | "other"; }) | undefined' is not assignable to 'string' index type 'FactorValue'.
src/types/database.ts(27,3): error TS2411: Property 'activity_level' of type '(FactorValue & { value: "stationary" | "light" | "active"; }) | undefined' is not assignable to 'string' index type 'FactorValue'.
src/types/database.ts(28,3): error TS2411: Property 'device_orientation' of type '(FactorValue & { value: "portrait" | "landscape"; }) | undefined' is not assignable to 'string' index type 'FactorValue'.
src/types/database.ts(29,3): error TS2411: Property 'available_time_min' of type '(FactorValue & { value: number; }) | undefined' is not assignable to 'string' index type 'FactorValue'.
```

**影響度**: 🟡 **中**
**説明**: `BaseFactors`インターフェースで特定フィールドに詳細な型を指定しているが、親インターフェース`FactorsDict`のindex signatureと衝突している。
**修正コスト**: 15分
**修正方針**:
```typescript
// 案1: index signatureを削除
export interface FactorsDict {
  [factorName: string]: FactorValue; // これを削除
}

// 案2: BaseFactorsをextendsではなく独立させる
export interface BaseFactors {
  time_of_day: FactorValue & { value: 'morning' | ... };
  ...
}
```

---

#### B-2: FactorsTest.tsのAPI呼び出し不整合 (FactorsTest.tsx:69, 87)

```
src/components/FactorsTest.tsx(69,43): error TS2554: Expected 2-3 arguments, but got 1.
src/components/FactorsTest.tsx(87,9): error TS2353: Object literal may only specify known properties, and 'events' does not exist in type '{ eventType: string; eventData: any; timestamp: string; sessionId?: string | undefined; }[]'.
```

**影響度**: 🟡 **中**
**説明**:
- `apiService.generateUI()`の引数が不足（現在の実装では3引数必要）
- `apiService.sendEvents()`の引数の型が不一致

**修正コスト**: 10分
**修正方針**: FactorsTest.tsxをApiServiceの現在のシグネチャに合わせて修正

---

### カテゴリC: 低優先度（警告レベル） - 17件

未使用変数の警告。実行時には影響なし。

#### C-1: 未使用変数 (TS6133)

```
src/components/ActionReportModal.tsx(21,3): error TS6133: 'reportId' is declared but its value is never read.
src/components/DatabaseTest.tsx(33,13): error TS6133: 'factors' is declared but its value is never read.
src/components/screens/ApproachScreen.tsx(25,9): error TS6133: 'suggestedApproaches' is declared but its value is never read.
src/components/ui/widgets/SummaryListWidget.tsx(22,3): error TS6133: 'editable' is declared but its value is never read.
src/services/context/CapacitorIntegration.ts(376,30): error TS6133: 'position' is declared but its value is never read.
src/services/database/localDB.ts(380,33): error TS6133: 'userId' is declared but its value is never read.
../server/src/types/UISpecDSL.ts(363,15): error TS6133: 'supportedComponents' is declared but its value is never read.
```

**影響度**: 🟢 **低**
**説明**: 宣言されているが使用されていない変数。
**修正コスト**: 5分（変数名の先頭に`_`をつけるか削除）
**修正方針**: 使用予定がない場合は削除、将来使用予定の場合は`_reportId`のようにリネーム

---

#### C-2: 未使用import (TS6196)

```
src/services/context/CapacitorIntegration.ts(6,15): error TS6196: 'FactorValue' is declared but never used.
```

**影響度**: 🟢 **低**
**説明**: importされているが使用されていない型。
**修正コスト**: 1分
**修正方針**: import文から削除

---

## 修正優先度と工数見積もり

| 優先度 | カテゴリ | エラー数 | 修正工数 | 備考 |
|--------|---------|---------|---------|------|
| 🔴 P0 | A-1 (FactorsDict export) | 1件 | 5分 | 即座に修正 |
| 🔴 P0 | A-2 (Dexie orderBy) | 1件 | 10分 | 即座に修正 |
| 🔴 P0 | A-3 (boolean型) | 2件 | 5分 | 即座に修正 |
| 🔴 P0 | A-4 (filter型エラー) | 1件 | 5分 | 即座に修正 |
| 🔴 P0 | A-5 (SessionManager型不整合) | 7件 | 20分 | 仕様確認後修正 |
| 🟡 P1 | B-1 (FactorsDict型定義) | 4件 | 15分 | P0修正後に対応 |
| 🟡 P1 | B-2 (FactorsTest不整合) | 2件 | 10分 | P0修正後に対応 |
| 🟢 P2 | C-1 (未使用変数) | 7件 | 5分 | Phase 3完了前に対応 |
| 🟢 P2 | C-2 (未使用import) | 1件 | 1分 | Phase 3完了前に対応 |

**合計修正工数**: 約 **76分** (1時間16分)

---

## 修正判断の結果

### ✅ 修正する (カテゴリA + B)

**理由**:
- カテゴリAは実行時エラーの原因となるため必須
- カテゴリBは型安全性向上のため推奨
- 修正コストが低い（合計60分程度）
- Phase 3の堅牢性向上の目標に合致

**合計**: 15件 (A: 11件, B: 4件)
**工数**: 約 **70分**

---

### ⚠️ 条件付き修正 (カテゴリC)

**理由**:
- 実行時エラーには影響しない
- Phase 3完了前の余裕があれば修正
- コードクリーンアップとして有益

**合計**: 8件
**工数**: 約 **6分**

---

## 修正計画

### Step 1: カテゴリA修正 (所要時間: 45分)

1. **A-1**: ContextService.tsで`FactorsDict`をexport
2. **A-2**: localDB.tsのDexie orderBy修正
3. **A-3**: localDB.tsのboolean検索を数値化
4. **A-4**: localDB.tsのfilter条件にundefinedチェック追加
5. **A-5**: SessionManager.tsの型不整合を修正
   - 仕様確認: `concernText` vs `rawInput`
   - 仕様確認: `selectedAction` vs `selectedActionId`
   - `outcomes`型に不足フィールド追加

### Step 2: カテゴリB修正 (所要時間: 25分)

6. **B-1**: database.tsの`FactorsDict`型定義を修正
7. **B-2**: FactorsTest.tsxのAPI呼び出しを修正

### Step 3: カテゴリC修正 (余裕があれば, 所要時間: 6分)

8. **C-1, C-2**: 未使用変数・importの削除またはリネーム

### Step 4: 再ビルド・確認

```bash
cd concern-app
bun run build
```

すべてのエラーが解消されることを確認。

---

## 結論

**Phase 3 Task 3.1の判断**: ✅ **全エラーを修正する**

**理由**:
1. カテゴリAは実行時エラーの原因となるため必須
2. カテゴリBも型安全性向上のため修正推奨
3. 修正コストが低い（1時間強）
4. Phase 3の堅牢性向上の目標に合致
5. 技術的負債を解消し、今後の開発を円滑化

**次のアクション**: Task 3.1完了後、Task 3.2（動的UIの問題点調査）に進む
