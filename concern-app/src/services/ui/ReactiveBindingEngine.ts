/**
 * ReactiveBindingEngine.ts
 * Widget間のリアクティブなデータ連携を管理するエンジン
 *
 * Phase 4 - Task 2.2
 *
 * 機能:
 * - Debounce付きのPort値伝播
 * - 循環依存の検出・防止
 * - FlowValidationState（完了状態追跡）
 * - Transform関数の実行
 */

import type { DependencyGraphSpec, DependencySpec } from '../../types/ui-spec.types';
import { DependencyGraph } from './DependencyGraph';
import { DependencyExecutor } from './DependencyExecutor';

// =============================================================================
// 型定義
// =============================================================================

/**
 * Engine設定
 */
export interface EngineConfig {
  /** デフォルトのDebounce時間（ms） */
  defaultDebounceMs: number;

  /** 最大伝播深度（無限ループ防止） */
  maxPropagationDepth: number;

  /** デバッグモード */
  debug: boolean;
}

/**
 * デフォルト設定
 */
export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  defaultDebounceMs: 300,
  maxPropagationDepth: 10,
  debug: false,
};

/**
 * 伝播イベント
 */
export interface PropagationEvent {
  /** ソースのポートキー */
  sourcePortKey: string;

  /** ターゲットのポートキー */
  targetPortKey: string;

  /** 伝播後の値 */
  value: unknown;

  /** タイムスタンプ */
  timestamp: number;
}

/**
 * 伝播コールバック
 */
export type PropagationCallback = (events: PropagationEvent[]) => void;

/**
 * バリデーションエラーコールバック
 */
export type ValidationErrorCallback = (
  portKey: string,
  error: string
) => void;

/**
 * エラーPort値
 */
export interface ErrorPortValue {
  hasError: boolean;
  messages: string[];
}

/**
 * 完了Port値
 */
export interface CompletedPortValue {
  isCompleted: boolean;
  requiredFields?: string[];
}

/**
 * フローバリデーション状態
 */
export interface FlowValidationState {
  /** 全Widgetが完了しているか */
  canProceed: boolean;

  /** Widget別のエラー状態 */
  widgetErrors: Map<string, ErrorPortValue>;

  /** 未完了のWidgetリスト */
  incompleteWidgets: string[];
}

/**
 * 予約Port定数
 */
export const RESERVED_PORTS = {
  ERROR: '_error',
  COMPLETED: '_completed',
} as const;

// =============================================================================
// ReactiveBindingEngine
// =============================================================================

/**
 * ReactiveBindingEngine
 *
 * Widget間のリアクティブなデータ連携を管理。
 * Debounce付きの伝播、循環依存検出、FlowValidation機能を提供。
 */
export class ReactiveBindingEngine {
  private config: EngineConfig;
  private graph: DependencyGraph;
  private executor: DependencyExecutor;

  // Port値のキャッシュ
  private portValues: Map<string, unknown> = new Map();

  // Debounceタイマー（ポートキーごと）
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // 保留中の更新（Debounce中）
  private pendingUpdates: Map<string, unknown> = new Map();

  // コールバック
  private onPropagateCallback: PropagationCallback | null = null;
  private onValidationErrorCallback: ValidationErrorCallback | null = null;
  private onValidationStateChangeCallback: ((state: FlowValidationState) => void) | null = null;

  // 現在の伝播深度（無限ループ検出用）
  private currentPropagationDepth: number = 0;

  // 破棄フラグ
  private disposed: boolean = false;

  constructor(spec: DependencyGraphSpec, config?: Partial<EngineConfig>) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.graph = new DependencyGraph(spec);
    this.executor = new DependencyExecutor();

    // 循環依存チェック
    if (this.graph.detectCycle()) {
      throw new Error('Circular dependency detected in DependencyGraphSpec');
    }

    if (this.config.debug) {
      console.log('[ReactiveBindingEngine] Initialized with', {
        nodeCount: this.graph.getNodeCount(),
        edgeCount: this.graph.getEdgeCount(),
      });
    }
  }

  // ==========================================================================
  // Port操作
  // ==========================================================================

  /**
   * Portを初期化（Debounceなしで即座に設定）
   */
  public initPort(portKey: string, value: unknown): void {
    if (this.disposed) return;

    this.portValues.set(portKey, value);

    // 予約Portの場合はバリデーション状態を更新
    if (this.isReservedPort(portKey)) {
      this.notifyValidationStateChange();
    }

    if (this.config.debug) {
      console.log('[ReactiveBindingEngine] initPort:', portKey, value);
    }
  }

  /**
   * Portを更新（Debounce付き）
   */
  public updatePort(portKey: string, value: unknown): void {
    if (this.disposed) return;

    // 値を即座にキャッシュ
    this.portValues.set(portKey, value);
    this.pendingUpdates.set(portKey, value);

    // 予約Portの場合は即座にバリデーション状態を更新（Debounceなし）
    if (this.isReservedPort(portKey)) {
      this.notifyValidationStateChange();
      return; // 予約Portは伝播しない
    }

    // 既存のタイマーをキャンセル
    const existingTimer = this.debounceTimers.get(portKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 新しいDebounceタイマーを設定
    const timer = setTimeout(() => {
      this.debounceTimers.delete(portKey);
      this.executePropagation(portKey);
    }, this.config.defaultDebounceMs);

    this.debounceTimers.set(portKey, timer);

    if (this.config.debug) {
      console.log('[ReactiveBindingEngine] updatePort (debounced):', portKey, value);
    }
  }

  /**
   * Port値を取得
   */
  public getPortValue(portKey: string): unknown {
    return this.portValues.get(portKey);
  }

  /**
   * 全Port値を取得
   */
  public getAllPortValues(): Map<string, unknown> {
    return new Map(this.portValues);
  }

  // ==========================================================================
  // 伝播処理
  // ==========================================================================

  /**
   * 伝播を実行
   */
  private executePropagation(sourcePortKey: string): void {
    if (this.disposed) return;

    // 深度チェック
    if (this.currentPropagationDepth >= this.config.maxPropagationDepth) {
      console.warn(
        `[ReactiveBindingEngine] Max propagation depth (${this.config.maxPropagationDepth}) reached. Stopping.`
      );
      return;
    }

    this.currentPropagationDepth++;

    try {
      const sourceValue = this.portValues.get(sourcePortKey);
      const dependencies = this.graph.getDependencies(sourcePortKey);
      const events: PropagationEvent[] = [];

      for (const dep of dependencies) {
        const result = this.executor.execute(dep, sourceValue);

        if (result.type === 'update') {
          // ターゲットPortを更新
          this.portValues.set(result.target, result.value);

          events.push({
            sourcePortKey,
            targetPortKey: result.target,
            value: result.value,
            timestamp: Date.now(),
          });

          if (this.config.debug) {
            console.log('[ReactiveBindingEngine] Propagated:', {
              source: sourcePortKey,
              target: result.target,
              value: result.value,
            });
          }
        } else if (result.type === 'validation_error') {
          // バリデーションエラーを通知
          if (this.onValidationErrorCallback) {
            this.onValidationErrorCallback(result.target, result.message || 'Validation failed');
          }
        }
      }

      // 伝播イベントを通知
      if (events.length > 0 && this.onPropagateCallback) {
        this.onPropagateCallback(events);
      }

      // 連鎖伝播（更新されたターゲットからさらに伝播）
      for (const event of events) {
        const targetDeps = this.graph.getDependencies(event.targetPortKey);
        if (targetDeps.length > 0) {
          this.executePropagation(event.targetPortKey);
        }
      }
    } finally {
      this.currentPropagationDepth--;
    }

    // 保留中の更新をクリア
    this.pendingUpdates.delete(sourcePortKey);
  }

  // ==========================================================================
  // コールバック設定
  // ==========================================================================

  /**
   * 伝播コールバックを設定
   */
  public setOnPropagate(callback: PropagationCallback): void {
    this.onPropagateCallback = callback;
  }

  /**
   * バリデーションエラーコールバックを設定
   */
  public setOnValidationError(callback: ValidationErrorCallback): void {
    this.onValidationErrorCallback = callback;
  }

  /**
   * バリデーション状態変更コールバックを設定
   */
  public setOnValidationStateChange(
    callback: (state: FlowValidationState) => void
  ): void {
    this.onValidationStateChangeCallback = callback;
  }

  // ==========================================================================
  // FlowValidationState
  // ==========================================================================

  /**
   * 現在のフローバリデーション状態を取得
   */
  public getFlowValidationState(): FlowValidationState {
    const widgetErrors = new Map<string, ErrorPortValue>();
    const incompleteWidgets: string[] = [];
    const completedWidgets = new Set<string>();

    // 全Port値をスキャン
    for (const [portKey, value] of this.portValues) {
      const { widgetId, portId } = this.parsePortKey(portKey);

      if (portId === RESERVED_PORTS.ERROR) {
        const errorValue = value as ErrorPortValue;
        if (errorValue?.hasError) {
          widgetErrors.set(widgetId, errorValue);
        }
      } else if (portId === RESERVED_PORTS.COMPLETED) {
        const completedValue = value as CompletedPortValue;
        if (completedValue?.isCompleted) {
          completedWidgets.add(widgetId);
        } else {
          incompleteWidgets.push(widgetId);
        }
      }
    }

    // canProceed: エラーなし かつ 未完了Widgetなし
    const canProceed = widgetErrors.size === 0 && incompleteWidgets.length === 0;

    return {
      canProceed,
      widgetErrors,
      incompleteWidgets,
    };
  }

  /**
   * バリデーション状態変更を通知
   */
  private notifyValidationStateChange(): void {
    if (this.onValidationStateChangeCallback) {
      const state = this.getFlowValidationState();
      this.onValidationStateChangeCallback(state);
    }
  }

  // ==========================================================================
  // ユーティリティ
  // ==========================================================================

  /**
   * ポートキーをパース
   */
  private parsePortKey(portKey: string): { widgetId: string; portId: string } {
    const parts = portKey.split('.');
    return {
      widgetId: parts[0] || '',
      portId: parts.slice(1).join('.') || '',
    };
  }

  /**
   * 予約Portかどうか判定
   */
  private isReservedPort(portKey: string): boolean {
    const { portId } = this.parsePortKey(portKey);
    return (
      portId === RESERVED_PORTS.ERROR || portId === RESERVED_PORTS.COMPLETED
    );
  }

  /**
   * DependencyGraphを取得（テスト用）
   */
  public getGraph(): DependencyGraph {
    return this.graph;
  }

  /**
   * 設定を取得
   */
  public getConfig(): EngineConfig {
    return { ...this.config };
  }

  // ==========================================================================
  // ライフサイクル
  // ==========================================================================

  /**
   * 全てのDebounceタイマーを即座に実行
   */
  public flush(): void {
    for (const [portKey, timer] of this.debounceTimers) {
      clearTimeout(timer);
      this.executePropagation(portKey);
    }
    this.debounceTimers.clear();
  }

  /**
   * エンジンを破棄
   */
  public dispose(): void {
    this.disposed = true;

    // 全タイマーをクリア
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // キャッシュをクリア
    this.portValues.clear();
    this.pendingUpdates.clear();

    // コールバックをクリア
    this.onPropagateCallback = null;
    this.onValidationErrorCallback = null;
    this.onValidationStateChangeCallback = null;

    if (this.config.debug) {
      console.log('[ReactiveBindingEngine] Disposed');
    }
  }

  /**
   * 破棄されたかどうか
   */
  public isDisposed(): boolean {
    return this.disposed;
  }
}
