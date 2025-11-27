/**
 * ConcernFlowStateManager
 *
 *
 * Phase 2 Step 3: 関心事フロー全体のstate管理
 * Phase 3 v2.1: FormData保存とリアルタイム永続化対応
 *
 * Phase 3 v2.1: FormData保存とリアルタイム永続化対応
 *
 * 責務:
 * - 関心事入力からタスク生成までのフロー状態を保持
 * - SessionStorage + LocalStorageを使った永続化
 * - フロー間のデータ受け渡し
 * - 各ステージのフォーム入力データの保存（v2.1）
 */

import type { Task } from '../types/database';
import type { FormData } from '../../../server/src/types/UISpecV2';
import type { BottleneckAnalysis } from '../types/BottleneckTypes';

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

  // v2.1: 各ステージの生のフォームデータ
  stages?: {
    capture?: FormData;
    plan?: FormData;
    breakdown?: FormData;
  };

  // Phase 4: ボトルネック診断結果（Capture → Plan連携用）
  bottleneckAnalysis?: BottleneckAnalysis;

  // 各ステージの結果（後方互換性のため保持）
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
  updatedAt?: string;  // v2.1: 最終更新日時
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
      
      // マージして保存（必須フィールドのバリデーション）
      const newState = {
        ...currentState,
        ...state,
      } as ConcernFlowState;
      
      // 必須フィールドチェック
      if (!newState.concernId || !newState.concernText || !newState.userId) {
        throw new Error('concernId, concernText, userId are required fields');
      }
      
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
   * v2.1: ステージのフォームデータを保存
   */
  saveStageFormData(stage: 'capture' | 'plan' | 'breakdown', formData: FormData): void {
    const state = this.loadState();

    if (!state) {
      throw new Error('No flow state found. Call startNewFlow() first.');
    }

    const stages = state.stages || {};
    stages[stage] = formData;

    this.saveState({
      ...state,
      stages,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * v2.1: ステージのフォームデータを読み込み
   */
  loadStageFormData(stage: 'capture' | 'plan' | 'breakdown'): FormData | null {
    const state = this.loadState();

    if (!state || !state.stages) {
      return null;
    }

    return state.stages[stage] || null;
  }

  /**
   * Phase 4: ボトルネック診断結果を保存
   */
  saveBottleneckAnalysis(analysis: BottleneckAnalysis): void {
    const state = this.loadState();

    if (!state) {
      throw new Error('No flow state found. Call startNewFlow() first.');
    }

    this.saveState({
      ...state,
      bottleneckAnalysis: analysis,
      updatedAt: new Date().toISOString()
    });

    console.log('[ConcernFlowStateManager] Bottleneck analysis saved:', analysis);
  }

  /**
   * Phase 4: ボトルネック診断結果を読み込み
   */
  loadBottleneckAnalysis(): BottleneckAnalysis | null {
    const state = this.loadState();
    return state?.bottleneckAnalysis || null;
  }

  /**
   * v2.1: 現在のステージを更新
   */
  updateCurrentStage(stage: 'capture' | 'plan' | 'breakdown' | 'tasks'): void {
    const state = this.loadState();

    if (!state) {
      throw new Error('No flow state found. Call startNewFlow() first.');
    }

    this.saveState({
      ...state,
      currentStage: stage,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * v2.1: LocalStorageへの下書き保存（永続化）
   */
  saveDraft(): void {
    try {
      const state = this.loadState();

      if (!state) {
        console.warn('[ConcernFlowStateManager] No state to save as draft');
        return;
      }

      // LocalStorageに保存（ブラウザ閉じても残る）
      const draftKey = `draft_${state.concernId}`;
      localStorage.setItem(draftKey, JSON.stringify({
        ...state,
        savedAt: new Date().toISOString()
      }));

      console.log('[ConcernFlowStateManager] Draft saved to localStorage:', draftKey);
    } catch (error) {
      console.error('[ConcernFlowStateManager] Failed to save draft:', error);
      throw error;
    }
  }

  /**
   * v2.1: LocalStorageから下書きを読み込み
   */
  loadDraft(concernId: string): ConcernFlowState | null {
    try {
      const draftKey = `draft_${concernId}`;
      const stored = localStorage.getItem(draftKey);

      if (!stored) {
        console.log('[ConcernFlowStateManager] No draft found for:', concernId);
        return null;
      }

      const draft = JSON.parse(stored) as ConcernFlowState;
      console.log('[ConcernFlowStateManager] Draft loaded:', draft);
      return draft;
    } catch (error) {
      console.error('[ConcernFlowStateManager] Failed to load draft:', error);
      return null;
    }
  }

  /**
   * v2.1: 下書き一覧を取得
   */
  listDrafts(): Array<{ concernId: string; concernText: string; savedAt: string }> {
    try {
      const drafts: Array<{ concernId: string; concernText: string; savedAt: string }> = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (key && key.startsWith('draft_')) {
          const stored = localStorage.getItem(key);

          if (stored) {
            const draft = JSON.parse(stored) as ConcernFlowState & { savedAt: string };
            drafts.push({
              concernId: draft.concernId,
              concernText: draft.concernText,
              savedAt: draft.savedAt
            });
          }
        }
      }

      return drafts.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    } catch (error) {
      console.error('[ConcernFlowStateManager] Failed to list drafts:', error);
      return [];
    }
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

