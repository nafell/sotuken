/**
 * useReactiveBinding.ts
 * Reactive Binding用フック
 *
 * Phase 4 - DSL v3
 * ソースWidgetの変更を監視し、ターゲットWidgetに自動反映する
 */

import { useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { getWidgetAtom } from '../store/widgetAtoms';
import { DependencyExecutor } from '../services/ui/DependencyExecutor';
import type {
  UpdateMode,
  RelationshipSpec,
} from '../types/ui-spec.types';

/**
 * Reactive Bindingを設定するフック
 *
 * ソースの値が変更されたときに、変換関数を適用してターゲットに反映する
 *
 * @param sourceKey ソースのキー（"widgetId.propertyName"形式）
 * @param targetKey ターゲットのキー（"widgetId.propertyName"形式）
 * @param relationship 変換方法の定義
 * @param updateMode 更新モード（realtime/debounced/on_confirm）
 */
export function useReactiveBinding(
  sourceKey: string,
  targetKey: string,
  relationship: RelationshipSpec,
  updateMode: UpdateMode = 'realtime'
): void {
  const sourceWidgetId = extractWidgetId(sourceKey);
  const targetWidgetId = extractWidgetId(targetKey);

  const sourceAtom = getWidgetAtom(sourceWidgetId);
  const targetAtom = getWidgetAtom(targetWidgetId);

  if (!sourceAtom || !targetAtom) {
    console.warn(
      `useReactiveBinding: atom not found for ${sourceKey} or ${targetKey}`
    );
    return;
  }

  const sourceValue = useAtomValue(sourceAtom);
  // @ts-ignore - Jotai型の互換性問題を回避
  const setTargetValue = useSetAtom(targetAtom);

  const executorRef = useRef(new DependencyExecutor());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updateTarget = () => {
      const result = executorRef.current.executeTransform(
        relationship,
        sourceValue
      );

      if (result.success) {
        setTargetValue(result.value);
      } else {
        console.error('Transform failed:', result.error);
      }
    };

    switch (updateMode) {
      case 'realtime':
        // 即座に更新
        updateTarget();
        break;

      case 'debounced':
        // 300msデバウンス
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(updateTarget, 300);
        break;

      case 'on_confirm':
        // on_confirmは手動トリガーなので、ここでは何もしない
        // 実際のトリガーは別途実装が必要
        break;
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [sourceValue, targetKey, relationship, updateMode, setTargetValue]);
}

/**
 * Widget IDを抽出
 * @param key "widgetId.propertyName" → "widgetId"
 */
function extractWidgetId(key: string): string {
  return key.split('.')[0];
}
