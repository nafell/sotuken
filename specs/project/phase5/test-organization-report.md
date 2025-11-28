# テスト整理報告

**実施日**: 2025-11-28

---

## テスト配置

| 場所 | 内容 |
|------|------|
| `tests/` | 統合テスト・E2Eテスト |
| `server/test/` | サーバーAPI・DSLテスト |
| `concern-app/src/*/__tests__/` | フロントエンドテスト |

## Legacyテスト

以下にLEGACYコメントを追加済み：
- `tests/phase1c_e2e_test.js` - DSL v1対象
- `tests/phase3_e2e_test.js` - DSL v2対象
- `server/test/phase1b_e2e.test.ts` - Phase 1B対象

## Widget v3 テスト状況

- Unit Test完備: 4/12 (BrainstormCards, EmotionPalette, MatrixPlacement, PrioritySliderGrid)
- E2E Test完備: 12/12

## 実行方法

```bash
node tests/run_all_tests.js          # 統合テスト
cd server && bun test                 # サーバーテスト
cd concern-app && bun run test        # フロントエンドテスト
```
