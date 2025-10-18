/**
 * ConcernFlowStateManager
 * 
 * Phase 2 Step 3: 関心事フロー全体のstate管理
 * 
 * 責務:
 * - 関心事入力からタスク生成までのフロー状態を保持
 * - SessionStorageを使った永続化
 * - フロー間のデータ受け渡し
 */

import { Task } from '../types/database';

/**
 * ConcernFlowState
 * 
 * 関心事フロー全体の状態
 */
export interface ConcernFlowState {
  // 関心事の基本情報
  concernId: string;
  concernText: string;
  userId: string;
  
  // 各ステージの結果
  captureResult?: {
    clarifiedConcern: string;
    keyPoints: string[];
    timestamp: string;
  };
  
  planResult?: {
    approach: string;
    steps: string[];
    timestamp: string;
  };
  
  breakdownResult?: {
    tasks: Array<{
      title: string;
      description: string;
      importance?: number;
      urgency?: number;
      estimatedMinutes?: number;
    }>;
    timestamp: string;
  };
  
  // 生成されたタスク（IndexedDBに保存後）
  generatedTasks?: Task[];
  
  // フローのメタ情報
  currentStage?: 'capture' | 'plan' | 'breakdown' | 'tasks';
  startedAt?: string;
  completedAt?: string;
  uiCondition?: 'dynamic_ui' | 'static_ui';
}

/**
 * ConcernFlowStateManager
 * 
 * 関心事フロー状態の管理サービス
 * 
 * 使い方:
 * ```typescript
 * const flowManager = new ConcernFlowStateManager();
 * 
 * // 状態を保存
 * flowManager.saveState({
 *   concernId: 'concern_123',
 *   concernText: '英語学習の継続',
 *   userId: 'user_456'
 * });
 * 
 * // 状態を読み込み
 * const state = flowManager.loadState();
 * 
 * // ステージごとの結果を更新
 * flowManager.updateCaptureResult({
 *   clarifiedConcern: '...',
 *   keyPoints: ['...']
 * });
 * ```
 */
export class ConcernFlowStateManager {
  private storageKey = 'concernFlowState';

  /**
   * 状態を保存
   */
  saveState(state: Partial<ConcernFlowState>): void {
    try {
      // 既存の状態を読み込み
      const currentState = this.loadState();
      
      // マージして保存
      const newState: ConcernFlowState = {
        ...currentState,
        ...state,
      };
      
      sessionStorage.setItem(this.storageKey, JSON.stringify(newState));
      console.log('[ConcernFlowStateManager] State saved:', newState);
    } catch (error) {
      console.error('[ConcernFlowStateManager] Failed to save state:', error);
      throw error;
    }
  }

  /**
   * 状態を読み込み
   */
  loadState(): ConcernFlowState | null {
    try {
      const stored = sessionStorage.getItem(this.storageKey);
      
      if (!stored) {
        console.log('[ConcernFlowStateManager] No state found');
        return null;
      }
      
      const state = JSON.parse(stored) as ConcernFlowState;
      console.log('[ConcernFlowStateManager] State loaded:', state);
      return state;
    } catch (error) {
      console.error('[ConcernFlowStateManager] Failed to load state:', error);
      return null;
    }
  }

  /**
   * 状態をクリア
   */
  clearState(): void {
    try {
      sessionStorage.removeItem(this.storageKey);
      console.log('[ConcernFlowStateManager] State cleared');
    } catch (error) {
      console.error('[ConcernFlowStateManager] Failed to clear state:', error);
    }
  }

  /**
   * 新しいフローを開始
   */
  startNewFlow(concernId: string, concernText: string, userId: string, uiCondition?: 'dynamic_ui' | 'static_ui'): void {
    const state: ConcernFlowState = {
      concernId,
      concernText,
      userId,
      currentStage: 'capture',
      startedAt: new Date().toISOString(),
      uiCondition,
    };
    
    this.saveState(state);
  }

  /**
   * Captureステージの結果を更新
   */
  updateCaptureResult(result: ConcernFlowState['captureResult']): void {
    const state = this.loadState();
    
    if (!state) {
      throw new Error('No flow state found. Call startNewFlow() first.');
    }
    
    this.saveState({
      ...state,
      captureResult: {
        ...result!,
        timestamp: new Date().toISOString(),
      },
      currentStage: 'plan',
    });
  }

  /**
   * Planステージの結果を更新
   */
  updatePlanResult(result: ConcernFlowState['planResult']): void {
    const state = this.loadState();
    
    if (!state) {
      throw new Error('No flow state found. Call startNewFlow() first.');
    }
    
    this.saveState({
      ...state,
      planResult: {
        ...result!,
        timestamp: new Date().toISOString(),
      },
      currentStage: 'breakdown',
    });
  }

  /**
   * Breakdownステージの結果を更新
   */
  updateBreakdownResult(result: ConcernFlowState['breakdownResult']): void {
    const state = this.loadState();
    
    if (!state) {
      throw new Error('No flow state found. Call startNewFlow() first.');
    }
    
    this.saveState({
      ...state,
      breakdownResult: {
        ...result!,
        timestamp: new Date().toISOString(),
      },
      currentStage: 'tasks',
    });
  }

  /**
   * 生成されたタスクを保存
   */
  saveGeneratedTasks(tasks: Task[]): void {
    const state = this.loadState();
    
    if (!state) {
      throw new Error('No flow state found. Call startNewFlow() first.');
    }
    
    this.saveState({
      ...state,
      generatedTasks: tasks,
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * 現在のステージを取得
   */
  getCurrentStage(): ConcernFlowState['currentStage'] {
    const state = this.loadState();
    return state?.currentStage || 'capture';
  }

  /**
   * Breakdown結果を取得（タスク生成用）
   */
  getBreakdownResult(): ConcernFlowState['breakdownResult'] | null {
    const state = this.loadState();
    return state?.breakdownResult || null;
  }

  /**
   * 関心事情報を取得
   */
  getConcernInfo(): { concernId: string; concernText: string; userId: string } | null {
    const state = this.loadState();
    
    if (!state) {
      return null;
    }
    
    return {
      concernId: state.concernId,
      concernText: state.concernText,
      userId: state.userId,
    };
  }

  /**
   * フロー完了状態をチェック
   */
  isFlowCompleted(): boolean {
    const state = this.loadState();
    return !!state?.completedAt;
  }

  /**
   * デバッグ用: 全状態を出力
   */
  debugPrintState(): void {
    const state = this.loadState();
    console.log('=== ConcernFlowState (Debug) ===');
    console.log(JSON.stringify(state, null, 2));
    console.log('================================');
  }
}

// シングルトンインスタンス
export const flowStateManager = new ConcernFlowStateManager();

export default ConcernFlowStateManager;

