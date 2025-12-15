/**
 * ReactiveBindingEngineV4.ts
 * DSL v4対応のWidget間リアクティブバインディングエンジン
 *
 * DSL v4 Phase 3 - TASK-3.3
 *
 * v3からの変更点:
 * - DependencyGraphSpec → ReactiveBindingSpec
 * - widgetId.portId形式のパス
 * - complexity閾値チェック
 * - UpdateMode (realtime/debounced/on_confirm)
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @since DSL v4.0
 */

import type {
  ReactiveBindingSpec,
  ReactiveBinding,
  WidgetRelationshipSpec,
  BindingMechanism,
  WidgetPortPath,
} from '../../types/v4/reactive-binding.types';

// =============================================================================
// Types
// =============================================================================

/**
 * エンジン設定
 */
export interface EngineConfigV4 {
  /** デフォルトのDebounce時間（ms） */
  defaultDebounceMs: number;
  /** 最大伝播深度（無限ループ防止） */
  maxPropagationDepth: number;
  /** complexity閾値（この値を超えるWidgetはrealtime更新を警告） */
  complexityThreshold: number;
  /** デバッグモード */
  debug: boolean;
}

/**
 * デフォルト設定
 */
export const DEFAULT_ENGINE_CONFIG_V4: EngineConfigV4 = {
  defaultDebounceMs: 300,
  maxPropagationDepth: 10,
  complexityThreshold: 0.5,
  debug: false,
};

/**
 * 伝播イベント
 */
export interface PropagationEventV4 {
  /** バインディングID */
  bindingId: string;
  /** ソースのポートパス */
  source: WidgetPortPath;
  /** ターゲットのポートパス */
  target: WidgetPortPath;
  /** 伝播後の値 */
  value: unknown;
  /** メカニズム */
  mechanism: BindingMechanism;
  /** タイムスタンプ */
  timestamp: number;
}

/**
 * 伝播コールバック
 */
export type PropagationCallbackV4 = (events: PropagationEventV4[]) => void;

/**
 * バリデーションエラーコールバック
 */
export type ValidationErrorCallbackV4 = (portPath: WidgetPortPath, error: string) => void;

/**
 * 確認待ちバインディング
 */
interface PendingConfirmBinding {
  binding: ReactiveBinding;
  value: unknown;
  timestamp: number;
}

// =============================================================================
// ReactiveBindingEngineV4
// =============================================================================

/**
 * ReactiveBindingEngineV4
 *
 * DSL v4 ReactiveBindingSpec対応のバインディングエンジン。
 * Widget間のリアクティブなデータ連携を管理。
 */
export class ReactiveBindingEngineV4 {
  private config: EngineConfigV4;
  private spec: ReactiveBindingSpec;

  // Port値のキャッシュ
  private portValues: Map<WidgetPortPath, unknown> = new Map();

  // Debounceタイマー
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // 確認待ちバインディング（on_confirm用）
  private pendingConfirmBindings: Map<string, PendingConfirmBinding> = new Map();

  // ソースPortからバインディングへのマッピング
  private sourceToBindings: Map<WidgetPortPath, ReactiveBinding[]> = new Map();

  // コールバック
  private onPropagateCallback: PropagationCallbackV4 | null = null;
  private onValidationErrorCallback: ValidationErrorCallbackV4 | null = null;

  // 現在の伝播深度
  private currentPropagationDepth: number = 0;

  // 破棄フラグ
  private disposed: boolean = false;

  constructor(spec: ReactiveBindingSpec, config?: Partial<EngineConfigV4>) {
    this.config = { ...DEFAULT_ENGINE_CONFIG_V4, ...config };
    this.spec = spec;

    this.buildBindingIndex();

    if (this.config.debug) {
      console.log('[ReactiveBindingEngineV4] Initialized with', {
        bindingCount: spec.bindings.length,
      });
    }
  }

  /**
   * バインディングインデックスを構築
   */
  private buildBindingIndex(): void {
    this.sourceToBindings.clear();

    for (const binding of this.spec.bindings) {
      if (binding.enabled === false) continue;

      if (!this.sourceToBindings.has(binding.source)) {
        this.sourceToBindings.set(binding.source, []);
      }
      this.sourceToBindings.get(binding.source)!.push(binding);
    }
  }

  // ==========================================================================
  // Port操作
  // ==========================================================================

  /**
   * Portを初期化（即座に設定、伝播なし）
   */
  initPort(portPath: WidgetPortPath, value: unknown): void {
    if (this.disposed) return;

    this.portValues.set(portPath, value);

    if (this.config.debug) {
      console.log('[ReactiveBindingEngineV4] initPort:', portPath, value);
    }
  }

  /**
   * Portを更新（バインディングに応じて伝播）
   */
  updatePort(portPath: WidgetPortPath, value: unknown): void {
    if (this.disposed) return;

    this.portValues.set(portPath, value);

    // このPortをソースとするバインディングを取得
    const bindings = this.sourceToBindings.get(portPath);
    if (!bindings || bindings.length === 0) {
      if (this.config.debug) {
        console.log('[ReactiveBindingEngineV4] No bindings for port:', portPath);
      }
      return;
    }

    // 各バインディングを処理
    for (const binding of bindings) {
      this.processBinding(binding, value);
    }
  }

  /**
   * バインディングを処理
   */
  private processBinding(binding: ReactiveBinding, value: unknown): void {
    switch (binding.updateMode) {
      case 'realtime':
        this.executeBinding(binding, value);
        break;

      case 'debounced':
        this.debouncedExecute(binding, value);
        break;

      case 'on_confirm':
        this.queueForConfirmation(binding, value);
        break;
    }
  }

  /**
   * バインディングを実行
   */
  private executeBinding(binding: ReactiveBinding, sourceValue: unknown): void {
    if (this.currentPropagationDepth >= this.config.maxPropagationDepth) {
      console.error(`[ReactiveBindingEngineV4] Max propagation depth exceeded at binding: ${binding.id}`);
      return;
    }

    this.currentPropagationDepth++;

    try {
      // 関係仕様に基づいて値を変換
      const targetValue = this.applyRelationship(binding.relationship, sourceValue, binding.target);

      if (binding.mechanism === 'validate') {
        // バリデーションモード：結果がfalseならエラー通知
        if (targetValue === false) {
          this.onValidationErrorCallback?.(binding.target, `Validation failed for ${binding.id}`);
        }
      } else {
        // 更新モード：ターゲットPortを更新
        this.portValues.set(binding.target, targetValue);

        // 伝播イベントを通知
        const event: PropagationEventV4 = {
          bindingId: binding.id,
          source: binding.source,
          target: binding.target,
          value: targetValue,
          mechanism: binding.mechanism,
          timestamp: Date.now(),
        };
        this.onPropagateCallback?.([event]);

        // ターゲットからさらに伝播
        const nextBindings = this.sourceToBindings.get(binding.target);
        if (nextBindings) {
          for (const nextBinding of nextBindings) {
            this.processBinding(nextBinding, targetValue);
          }
        }
      }
    } finally {
      this.currentPropagationDepth--;
    }
  }

  /**
   * 関係仕様を適用して値を変換
   */
  private applyRelationship(relationship: WidgetRelationshipSpec, sourceValue: unknown, targetPath: WidgetPortPath): unknown {
    switch (relationship.type) {
      case 'passthrough':
        return sourceValue;

      case 'javascript':
        try {
          const targetCurrentValue = this.portValues.get(targetPath);
          const fn = new Function('source', 'target', `return ${relationship.javascript}`);
          return fn(sourceValue, targetCurrentValue);
        } catch (e) {
          console.error('[ReactiveBindingEngineV4] JavaScript execution error:', e);
          return sourceValue;
        }

      case 'transform':
        // 簡易的な変換処理
        // 実際の実装ではより複雑な変換ロジックが必要
        try {
          const transformFn = new Function('source', `return ${relationship.transform}`);
          return transformFn(sourceValue);
        } catch (e) {
          console.error('[ReactiveBindingEngineV4] Transform error:', e);
          return sourceValue;
        }

      case 'llm':
        // LLM処理はここでは実行できない（非同期のため）
        // 実際の実装では別のサービスに委譲
        console.warn('[ReactiveBindingEngineV4] LLM relationship requires async processing');
        return sourceValue;

      default:
        return sourceValue;
    }
  }

  /**
   * Debounce付きで実行
   */
  private debouncedExecute(binding: ReactiveBinding, value: unknown): void {
    const timerId = this.debounceTimers.get(binding.id);
    if (timerId) {
      clearTimeout(timerId);
    }

    const debounceMs = binding.debounceMs ?? this.config.defaultDebounceMs;

    const newTimerId = setTimeout(() => {
      this.debounceTimers.delete(binding.id);
      this.executeBinding(binding, value);
    }, debounceMs);

    this.debounceTimers.set(binding.id, newTimerId);
  }

  /**
   * 確認待ちキューに追加
   */
  private queueForConfirmation(binding: ReactiveBinding, value: unknown): void {
    this.pendingConfirmBindings.set(binding.id, {
      binding,
      value,
      timestamp: Date.now(),
    });

    if (this.config.debug) {
      console.log('[ReactiveBindingEngineV4] Queued for confirmation:', binding.id);
    }
  }

  /**
   * 確認待ちバインディングを実行
   */
  confirmBinding(bindingId: string): void {
    const pending = this.pendingConfirmBindings.get(bindingId);
    if (!pending) {
      console.warn('[ReactiveBindingEngineV4] No pending binding found:', bindingId);
      return;
    }

    this.pendingConfirmBindings.delete(bindingId);
    this.executeBinding(pending.binding, pending.value);
  }

  /**
   * 全ての確認待ちバインディングを実行
   */
  confirmAllBindings(): void {
    for (const [, pending] of this.pendingConfirmBindings) {
      this.executeBinding(pending.binding, pending.value);
    }
    this.pendingConfirmBindings.clear();
  }

  /**
   * 確認待ちバインディングをキャンセル
   */
  cancelBinding(bindingId: string): void {
    this.pendingConfirmBindings.delete(bindingId);
  }

  // ==========================================================================
  // 取得系
  // ==========================================================================

  /**
   * Port値を取得
   */
  getPortValue(portPath: WidgetPortPath): unknown {
    return this.portValues.get(portPath);
  }

  /**
   * 全Port値を取得
   */
  getAllPortValues(): Map<WidgetPortPath, unknown> {
    return new Map(this.portValues);
  }

  /**
   * Widget IDから関連するPort値を取得
   */
  getWidgetPortValues(widgetId: string): Map<string, unknown> {
    const result = new Map<string, unknown>();
    const prefix = `${widgetId}.`;

    for (const [portPath, value] of this.portValues) {
      if (portPath.startsWith(prefix)) {
        const portId = portPath.substring(prefix.length);
        result.set(portId, value);
      }
    }

    return result;
  }

  /**
   * 確認待ちバインディングを取得
   */
  getPendingConfirmBindings(): string[] {
    return [...this.pendingConfirmBindings.keys()];
  }

  // ==========================================================================
  // コールバック設定
  // ==========================================================================

  /**
   * 伝播コールバックを設定
   */
  setOnPropagate(callback: PropagationCallbackV4): void {
    this.onPropagateCallback = callback;
  }

  /**
   * バリデーションエラーコールバックを設定
   */
  setOnValidationError(callback: ValidationErrorCallbackV4): void {
    this.onValidationErrorCallback = callback;
  }

  // ==========================================================================
  // ライフサイクル
  // ==========================================================================

  /**
   * エンジンを破棄
   */
  dispose(): void {
    if (this.disposed) return;

    // Debounceタイマーをクリア
    for (const timerId of this.debounceTimers.values()) {
      clearTimeout(timerId);
    }
    this.debounceTimers.clear();

    this.portValues.clear();
    this.pendingConfirmBindings.clear();
    this.sourceToBindings.clear();
    this.onPropagateCallback = null;
    this.onValidationErrorCallback = null;
    this.disposed = true;

    if (this.config.debug) {
      console.log('[ReactiveBindingEngineV4] Disposed');
    }
  }
}

// =============================================================================
// ファクトリ関数
// =============================================================================

/**
 * ReactiveBindingEngineV4インスタンスを作成
 */
export function createReactiveBindingEngineV4(
  spec: ReactiveBindingSpec,
  config?: Partial<EngineConfigV4>
): ReactiveBindingEngineV4 {
  return new ReactiveBindingEngineV4(spec, config);
}
