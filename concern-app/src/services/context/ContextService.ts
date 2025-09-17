/**
 * ContextService - factors辞書システム基盤
 * Phase 0 Day 2 - factors収集とコンテキスト管理
 * @see specs/system-design/database_schema.md
 */

import { FactorValue, FactorsDict, BaseFactors, ContextData } from '../../types/database';
import { db } from '../database/localDB';

export class ContextService {
  private factors: FactorsDict = {};

  /**
   * 現在のコンテキストfactorsを収集
   */
  async collectCurrentFactors(): Promise<BaseFactors> {
    this.factors = {};

    // 基本的な時系列factors
    await this.collectTimeFactors();

    // デバイス関連factors
    await this.collectDeviceFactors();

    // Capacitor統合factors（将来実装）
    await this.collectCapacitorFactors();

    return this.factors as BaseFactors;
  }

  /**
   * セッション用のコンテキストデータを保存
   */
  async saveContextForSession(sessionId: string): Promise<ContextData> {
    const factors = await this.collectCurrentFactors();
    
    const contextData: ContextData = {
      contextId: crypto.randomUUID(),
      sessionId,
      collectedAt: new Date(),
      timeOfDay: factors.time_of_day.value as any,
      dayOfWeek: factors.day_of_week.value as number,
      availableTimeMin: factors.available_time_min?.value as number,
      factors
    };

    await db.saveContextData(contextData);
    return contextData;
  }

  /**
   * 特定factorの取得
   */
  getFactor(factorName: string): FactorValue | undefined {
    return this.factors[factorName];
  }

  /**
   * factorの手動設定（テスト・デバッグ用）
   */
  setFactor(factorName: string, value: FactorValue): void {
    this.factors[factorName] = value;
  }

  /**
   * 全factorsの取得
   */
  getAllFactors(): FactorsDict {
    return { ...this.factors };
  }

  // ========================================
  // プライベートメソッド - factors収集
  // ========================================

  /**
   * 時系列関連factors
   */
  private async collectTimeFactors(): Promise<void> {
    const now = new Date();

    // 時間帯
    this.factors.time_of_day = {
      value: this.getTimeOfDay(now),
      source: 'system_clock',
      timestamp: now,
      confidence: 1.0
    };

    // 曜日
    this.factors.day_of_week = {
      value: now.getDay(),
      source: 'system_clock',
      timestamp: now,
      confidence: 1.0
    };

    // 利用可能時間の推定（簡易版）
    this.factors.available_time_min = {
      value: this.estimateAvailableTime(now),
      source: 'time_heuristic',
      timestamp: now,
      confidence: 0.7
    };
  }

  /**
   * デバイス関連factors
   */
  private async collectDeviceFactors(): Promise<void> {
    try {
      // 画面向き
      const orientation = window.screen?.orientation?.type || 'portrait-primary';
      this.factors.device_orientation = {
        value: orientation.includes('portrait') ? 'portrait' : 'landscape',
        source: 'screen_orientation_api',
        timestamp: new Date(),
        confidence: 1.0
      };

      // ネットワーク状態（簡易）
      this.factors.network_connection = {
        value: navigator.onLine ? 'online' : 'offline',
        source: 'navigator_api',
        timestamp: new Date(),
        confidence: 1.0
      };

    } catch (error) {
      console.warn('Failed to collect device factors:', error);
    }
  }

  /**
   * Capacitor統合factors（将来実装）
   */
  private async collectCapacitorFactors(): Promise<void> {
    // Phase 0では基本実装のみ
    // 将来的にGeolocation、Motion、Device APIを統合

    try {
      // プレースホルダー実装
      this.factors.location_category = {
        value: 'unknown',
        source: 'capacitor_placeholder',
        timestamp: new Date(),
        confidence: 0.0
      };

      this.factors.activity_level = {
        value: 'stationary',
        source: 'capacitor_placeholder', 
        timestamp: new Date(),
        confidence: 0.0
      };

    } catch (error) {
      console.warn('Capacitor factors collection failed:', error);
    }
  }

  // ========================================
  // ヘルパーメソッド
  // ========================================

  private getTimeOfDay(date: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = date.getHours();
    
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  private estimateAvailableTime(date: Date): number {
    const hour = date.getHours();
    const dayOfWeek = date.getDay();

    // 曜日・時間帯による簡易推定
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // 週末
      return hour < 10 ? 60 : 30;
    } else {
      // 平日
      if (hour < 9 || hour > 18) return 45;
      if (hour >= 12 && hour < 14) return 15; // ランチタイム
      return 10; // 就業時間中
    }
  }

  /**
   * factors辞書のサニタイズ（サーバー送信用）
   */
  sanitizeForServer(factors: FactorsDict): FactorsDict {
    const sanitized: FactorsDict = {};

    Object.entries(factors).forEach(([key, factor]) => {
      sanitized[key] = {
        value: factor.value,
        confidence: factor.confidence,
        source: factor.source,
        // rawDataは除外（プライバシー保護）
      };
    });

    return sanitized;
  }

  /**
   * デバッグ情報出力
   */
  getDebugInfo() {
    return {
      factorCount: Object.keys(this.factors).length,
      lastCollected: this.factors.time_of_day?.timestamp,
      factors: Object.keys(this.factors),
      confidenceScores: Object.fromEntries(
        Object.entries(this.factors).map(([key, factor]) => [
          key, 
          factor.confidence || 0
        ])
      )
    };
  }
}

// シングルトンインスタンス
export const contextService = new ContextService();
