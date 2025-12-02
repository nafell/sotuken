/**
 * DataBindingProcessor.ts
 * ORS-Widget間のデータバインディングを処理
 *
 * DSL v4 Phase 3 - TASK-3.2
 *
 * 機能:
 * - ORSからWidget初期値を取得
 * - Widget出力をORSに反映
 * - PNTR参照の解決
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @since DSL v4.0
 */

import type { ORS, Entity, Attribute, StageType } from '../../types/v4/ors.types';
import type { DataBindingSpec } from '../../types/v4/ui-spec.types';

// =============================================================================
// Types
// =============================================================================

/**
 * DataBindingProcessor設定
 */
export interface DataBindingProcessorConfig {
  /** デバッグモード */
  debug?: boolean;
}

/**
 * ORS更新結果
 */
export interface ORSUpdateResult {
  /** 更新成功 */
  success: boolean;
  /** 更新されたエンティティID */
  entityId?: string;
  /** 更新された属性名 */
  attributeName?: string;
  /** エラーメッセージ */
  error?: string;
}

// =============================================================================
// DataBindingProcessor
// =============================================================================

/**
 * DataBindingProcessor
 *
 * ORS（データモデル）とWidget間のデータバインディングを処理。
 * DataBindingSpecに基づいて初期値取得と出力反映を行う。
 */
export class DataBindingProcessor {
  private ors: ORS;
  private debug: boolean;

  // ORS値のキャッシュ（ランタイム更新用）
  private runtimeValues: Map<string, unknown> = new Map();

  constructor(ors: ORS, config?: DataBindingProcessorConfig) {
    this.ors = ors;
    this.debug = config?.debug ?? false;

    // 初期値をキャッシュに展開
    this.initializeRuntimeValues();
  }

  /**
   * ランタイム値を初期化
   */
  private initializeRuntimeValues(): void {
    for (const entity of this.ors.entities) {
      for (const attr of entity.attributes) {
        const key = `${entity.id}.${attr.name}`;
        if (attr.defaultValue !== undefined) {
          this.runtimeValues.set(key, attr.defaultValue);
        }
      }
    }

    if (this.debug) {
      console.log('[DataBindingProcessor] Initialized with values:', [...this.runtimeValues.entries()]);
    }
  }

  /**
   * DataBindingからWidget初期値を取得
   */
  getInitialValue(binding: DataBindingSpec): unknown {
    if (binding.direction === 'out') {
      // 出力専用バインディングには初期値を返さない
      return undefined;
    }

    const value = this.getValue(binding.entityAttribute);

    // 変換関数があれば適用
    if (binding.transform?.toWidget) {
      try {
        const transformFn = new Function('value', `return ${binding.transform.toWidget}`);
        return transformFn(value);
      } catch (e) {
        console.error(`[DataBindingProcessor] Transform error for ${binding.portId}:`, e);
        return value;
      }
    }

    return value;
  }

  /**
   * エンティティ属性パスから値を取得
   */
  getValue(entityAttributePath: string): unknown {
    // ランタイムキャッシュから取得
    if (this.runtimeValues.has(entityAttributePath)) {
      return this.runtimeValues.get(entityAttributePath);
    }

    // ORS定義から取得
    const [entityId, attributeName] = entityAttributePath.split('.');
    if (!entityId || !attributeName) {
      console.warn(`[DataBindingProcessor] Invalid path: ${entityAttributePath}`);
      return undefined;
    }

    const entity = this.ors.entities.find((e) => e.id === entityId);
    if (!entity) {
      console.warn(`[DataBindingProcessor] Entity not found: ${entityId}`);
      return undefined;
    }

    const attribute = entity.attributes.find((a) => a.name === attributeName);
    if (!attribute) {
      console.warn(`[DataBindingProcessor] Attribute not found: ${attributeName} in entity ${entityId}`);
      return undefined;
    }

    // PNTR型の場合は参照先を解決
    if (attribute.structuralType === 'PNTR' && attribute.ref) {
      return this.resolvePNTR(attribute.ref);
    }

    return attribute.defaultValue;
  }

  /**
   * Widget出力をORSに反映
   */
  updateValue(binding: DataBindingSpec, value: unknown): ORSUpdateResult {
    if (binding.direction === 'in') {
      // 入力専用バインディングは更新不可
      return {
        success: false,
        error: 'Cannot update input-only binding',
      };
    }

    const [entityId, attributeName] = binding.entityAttribute.split('.');
    if (!entityId || !attributeName) {
      return {
        success: false,
        error: `Invalid entity attribute path: ${binding.entityAttribute}`,
      };
    }

    // 変換関数があれば適用
    let transformedValue = value;
    if (binding.transform?.toORS) {
      try {
        const transformFn = new Function('value', `return ${binding.transform.toORS}`);
        transformedValue = transformFn(value);
      } catch (e) {
        return {
          success: false,
          error: `Transform error: ${e instanceof Error ? e.message : 'Unknown error'}`,
        };
      }
    }

    // ランタイムキャッシュを更新
    this.runtimeValues.set(binding.entityAttribute, transformedValue);

    if (this.debug) {
      console.log(`[DataBindingProcessor] Updated ${binding.entityAttribute}:`, transformedValue);
    }

    return {
      success: true,
      entityId,
      attributeName,
    };
  }

  /**
   * PNTR参照を解決して実際の値を取得
   */
  resolvePNTR(ref: string): unknown {
    const [entityId, attributeName] = ref.split('.');
    if (!entityId || !attributeName) {
      console.warn(`[DataBindingProcessor] Invalid PNTR ref: ${ref}`);
      return undefined;
    }

    // 循環参照検出（簡易版）
    const visited = new Set<string>();
    let currentRef: string | undefined = ref;

    while (currentRef) {
      if (visited.has(currentRef)) {
        console.warn(`[DataBindingProcessor] Circular PNTR reference detected: ${currentRef}`);
        return undefined;
      }
      visited.add(currentRef);

      const entity = this.ors.entities.find((e) => e.id === currentRef!.split('.')[0]);
      if (!entity) return undefined;

      const attr = entity.attributes.find((a) => a.name === currentRef!.split('.')[1]);
      if (!attr) return undefined;

      if (attr.structuralType === 'PNTR' && attr.ref) {
        currentRef = attr.ref;
      } else {
        // ランタイム値またはデフォルト値を返す
        return this.runtimeValues.get(currentRef) ?? attr.defaultValue;
      }
    }

    return undefined;
  }

  /**
   * エンティティを取得
   */
  getEntity(entityId: string): Entity | undefined {
    return this.ors.entities.find((e) => e.id === entityId);
  }

  /**
   * 属性を取得
   */
  getAttribute(entityId: string, attributeName: string): Attribute | undefined {
    const entity = this.getEntity(entityId);
    return entity?.attributes.find((a) => a.name === attributeName);
  }

  /**
   * 現在のORSステージを取得
   */
  getStage(): StageType {
    return this.ors.metadata.stage;
  }

  /**
   * 全ランタイム値を取得（デバッグ用）
   */
  getAllValues(): Map<string, unknown> {
    return new Map(this.runtimeValues);
  }

  /**
   * ORSを更新
   */
  updateORS(newORS: ORS): void {
    this.ors = newORS;
    this.initializeRuntimeValues();
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.runtimeValues.clear();
  }
}

// =============================================================================
// ファクトリ関数
// =============================================================================

/**
 * DataBindingProcessorインスタンスを作成
 */
export function createDataBindingProcessor(ors: ORS, config?: DataBindingProcessorConfig): DataBindingProcessor {
  return new DataBindingProcessor(ors, config);
}
