/**
 * CapacitorIntegration - Capacitor API統合によるfactors収集
 * Phase 0 Day 4 - デバイス情報・位置情報・モーション統合
 */

import type { FactorValue, FactorsDict } from '../../types/database.js';

// Capacitor型定義（Web環境対応）
interface DeviceInfo {
  platform: string;
  manufacturer?: string;
  model?: string;
  operatingSystem?: string;
  osVersion?: string;
  webViewVersion?: string;
}

interface Position {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number | null;
    altitudeAccuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
  };
  timestamp: number;
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface LocationCategory {
  category: 'home' | 'work' | 'transit' | 'other' | 'unknown';
  confidence: number;
  method: 'gps_clustering' | 'time_inference' | 'manual' | 'unknown';
}

export class CapacitorIntegration {
  private deviceInfo: DeviceInfo | null = null;
  private lastKnownPosition: Position | null = null;

  /**
   * デバイス関連factorsを収集
   */
  async collectDeviceFactors(): Promise<Partial<FactorsDict>> {
    const factors: Partial<FactorsDict> = {};

    try {
      // Capacitor API使用を試行
      if (typeof window !== 'undefined' && 'Capacitor' in window) {
        const { Device } = await import('@capacitor/device');
        this.deviceInfo = await Device.getInfo();
        
        factors.device_platform = {
          value: this.deviceInfo.platform,
          source: 'capacitor_device_api',
          timestamp: new Date(),
          confidence: 1.0
        };

        factors.device_model = {
          value: `${this.deviceInfo.manufacturer || 'Unknown'} ${this.deviceInfo.model || 'Device'}`,
          source: 'capacitor_device_api',
          timestamp: new Date(),
          confidence: 1.0
        };
      } else {
        // Web環境のフォールバック
        this.deviceInfo = this.getWebDeviceInfo();
        
        factors.device_platform = {
          value: this.deviceInfo.platform,
          source: 'web_user_agent',
          timestamp: new Date(),
          confidence: 0.7
        };

        factors.device_model = {
          value: this.deviceInfo.model || 'Web Browser',
          source: 'web_user_agent',
          timestamp: new Date(),
          confidence: 0.5
        };
      }

      factors.device_orientation = {
        value: this.inferOrientation(),
        source: 'web_screen_api',
        timestamp: new Date(),
        confidence: 0.8
      };

      // バッテリー情報（可能な場合）
      await this.collectBatteryFactor(factors);

      console.log(`📱 Device factors collected: ${Object.keys(factors).length} items`);
      
    } catch (error) {
      console.warn('❌ Failed to collect device factors:', error);
      // フォールバック値
      factors.device_platform = {
        value: 'web',
        source: 'fallback',
        timestamp: new Date(),
        confidence: 0.1
      };

      factors.device_model = {
        value: 'Unknown Device',
        source: 'fallback',
        timestamp: new Date(),
        confidence: 0.1
      };
    }

    return factors;
  }

  /**
   * 位置情報関連factorsを収集
   */
  async collectLocationFactors(): Promise<Partial<FactorsDict>> {
    const factors: Partial<FactorsDict> = {};

    try {
      console.log('📍 Requesting location permission...');
      
      const options: GeolocationOptions = {
        enableHighAccuracy: false, // バッテリー節約
        timeout: 10000,            // 10秒タイムアウト
        maximumAge: 300000         // 5分間キャッシュ
      };

      let position: Position;

      // Capacitor API使用を試行
      if (typeof window !== 'undefined' && 'Capacitor' in window) {
        const { Geolocation } = await import('@capacitor/geolocation');
        position = await Geolocation.getCurrentPosition(options);
      } else {
        // Web Geolocation API使用
        position = await this.getWebLocation(options);
      }

      this.lastKnownPosition = position;

      console.log(`📍 Location obtained: lat=${position.coords.latitude.toFixed(4)}, lon=${position.coords.longitude.toFixed(4)}`);

      // 位置カテゴリ分類
      const locationCategory = this.categorizeLocation(position);
      factors.location_category = {
        value: locationCategory.category,
        confidence: locationCategory.confidence,
        source: `gps_abstraction_${locationCategory.method}`,
        timestamp: new Date(position.timestamp)
      };

      // 位置精度
      factors.location_accuracy = {
        value: position.coords.accuracy,
        source: 'gps_sensor',
        timestamp: new Date(position.timestamp),
        confidence: this.calculateAccuracyConfidence(position.coords.accuracy)
      };

      // 移動状態推定
      factors.movement_state = {
        value: this.estimateMovementState(position),
        source: 'gps_analysis',
        timestamp: new Date(),
        confidence: 0.6
      };

    } catch (error) {
      console.warn('❌ Location access failed:', error);
      
      // フォールバック：時間ベース推定
      const timeBasedLocation = this.inferLocationFromTime();
      factors.location_category = {
        value: timeBasedLocation.category,
        confidence: timeBasedLocation.confidence,
        source: 'time_inference_fallback',
        timestamp: new Date()
      };

      factors.location_permission = {
        value: 'denied',
        source: 'geolocation_api',
        timestamp: new Date(),
        confidence: 1.0
      };
    }

    return factors;
  }

  /**
   * アクティビティ関連factorsを収集
   */
  async collectActivityFactors(): Promise<Partial<FactorsDict>> {
    const factors: Partial<FactorsDict> = {};

    try {
      // Phase 0では基本実装のみ
      // Phase 1でMotion APIによる詳細なアクティビティ検出を実装

      // 静的推定
      factors.activity_level = {
        value: this.estimateActivityFromContext(),
        source: 'context_inference',
        timestamp: new Date(),
        confidence: 0.4
      };

      // ユーザーエージェント分析
      factors.interaction_mode = {
        value: this.detectInteractionMode(),
        source: 'user_agent_analysis',
        timestamp: new Date(),
        confidence: 0.7
      };

    } catch (error) {
      console.warn('❌ Activity factors collection failed:', error);
    }

    return factors;
  }

  /**
   * 全Capacitor factorsを一度に収集
   */
  async collectAllCapacitorFactors(): Promise<FactorsDict> {
    console.log('🔄 Collecting all Capacitor factors...');
    
    const [deviceFactors, locationFactors, activityFactors] = await Promise.allSettled([
      this.collectDeviceFactors(),
      this.collectLocationFactors(),
      this.collectActivityFactors()
    ]);

    const allFactors: FactorsDict = {};

    // 結果をマージ
    if (deviceFactors.status === 'fulfilled') {
      Object.assign(allFactors, deviceFactors.value);
    }
    if (locationFactors.status === 'fulfilled') {
      Object.assign(allFactors, locationFactors.value);
    }
    if (activityFactors.status === 'fulfilled') {
      Object.assign(allFactors, activityFactors.value);
    }

    console.log(`✅ Capacitor factors collected: ${Object.keys(allFactors).length} total`);
    
    return allFactors;
  }

  // ========================================
  // プライベートヘルパーメソッド
  // ========================================

  /**
   * デバイス向き推定
   */
  private inferOrientation(): 'portrait' | 'landscape' {
    if (typeof window !== 'undefined') {
      return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }
    return 'portrait'; // デフォルト
  }

  /**
   * WebデバイスInfo取得
   */
  private getWebDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent.toLowerCase();
    
    let platform = 'web';
    if (userAgent.includes('mobile')) platform = 'mobile_web';
    if (userAgent.includes('tablet')) platform = 'tablet_web';
    
    let manufacturer = 'Unknown';
    let model = 'Web Browser';
    
    if (userAgent.includes('chrome')) {
      manufacturer = 'Google';
      model = 'Chrome';
    } else if (userAgent.includes('firefox')) {
      manufacturer = 'Mozilla';
      model = 'Firefox';
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      manufacturer = 'Apple';
      model = 'Safari';
    } else if (userAgent.includes('edge')) {
      manufacturer = 'Microsoft';
      model = 'Edge';
    }
    
    return {
      platform,
      manufacturer,
      model,
      operatingSystem: navigator.platform || 'Unknown',
      osVersion: 'Unknown',
      webViewVersion: 'N/A'
    };
  }

  /**
   * Web Geolocation API使用
   */
  private async getWebLocation(options: GeolocationOptions): Promise<Position> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed
            },
            timestamp: position.timestamp
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: options.enableHighAccuracy,
          timeout: options.timeout,
          maximumAge: options.maximumAge
        }
      );
    });
  }

  /**
   * バッテリー情報収集（可能な場合）
   */
  private async collectBatteryFactor(factors: Partial<FactorsDict>): Promise<void> {
    try {
      // Web Battery APIが利用可能な場合
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        factors.battery_level = {
          value: Math.round(battery.level * 100),
          source: 'web_battery_api',
          timestamp: new Date(),
          confidence: 0.9
        };
      }
    } catch (error) {
      // バッテリー情報取得失敗は無視
    }
  }

  /**
   * 位置情報を家/職場/その他に分類
   */
  private categorizeLocation(position: Position): LocationCategory {
    // Phase 0では時間ベースの簡易分類
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour <= 18) {
      // 平日日中 = 職場の可能性
      return {
        category: 'work',
        confidence: 0.6,
        method: 'time_inference'
      };
    } else if (hour >= 22 || hour <= 7) {
      // 夜間・早朝 = 家の可能性
      return {
        category: 'home',
        confidence: 0.7,
        method: 'time_inference'
      };
    } else {
      return {
        category: 'other',
        confidence: 0.4,
        method: 'time_inference'
      };
    }
    
    // TODO: Phase 1で過去の位置履歴によるクラスタリング実装
  }

  /**
   * 時間ベースの位置推定（フォールバック用）
   */
  private inferLocationFromTime(): LocationCategory {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();

    if (hour >= 22 || hour <= 7) {
      return { category: 'home', confidence: 0.6, method: 'time_inference' };
    } else if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour <= 18) {
      return { category: 'work', confidence: 0.5, method: 'time_inference' };
    } else {
      return { category: 'other', confidence: 0.3, method: 'time_inference' };
    }
  }

  /**
   * GPS精度から信頼度を計算
   */
  private calculateAccuracyConfidence(accuracy: number): number {
    // 精度が良いほど信頼度が高い（逆相関）
    if (accuracy <= 10) return 1.0;      // 10m以下 = 高精度
    if (accuracy <= 50) return 0.8;      // 50m以下 = 中精度
    if (accuracy <= 100) return 0.6;     // 100m以下 = 低精度
    return 0.3;                          // それ以上 = 非常に低精度
  }

  /**
   * 移動状態推定
   */
  private estimateMovementState(position: Position): 'stationary' | 'walking' | 'transit' | 'unknown' {
    // Phase 0では静的推定のみ
    // TODO: Phase 1で速度・加速度センサーによる詳細分析
    
    if (position.coords.speed !== null && position.coords.speed !== undefined) {
      const speedKmh = position.coords.speed * 3.6; // m/s to km/h
      
      if (speedKmh < 2) return 'stationary';
      if (speedKmh < 10) return 'walking';
      return 'transit';
    }
    
    return 'unknown';
  }

  /**
   * コンテキストからアクティビティレベル推定
   */
  private estimateActivityFromContext(): 'stationary' | 'light' | 'active' {
    const hour = new Date().getHours();
    
    // 時間帯による簡易推定
    if (hour >= 22 || hour <= 6) return 'stationary'; // 夜間
    if (hour >= 7 && hour <= 9) return 'active';      // 朝の準備時間
    if (hour >= 12 && hour <= 14) return 'light';     // ランチタイム
    return 'stationary'; // デフォルト
  }

  /**
   * インタラクションモード検出
   */
  private detectInteractionMode(): 'touch' | 'mouse' | 'hybrid' | 'unknown' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('mobile') || userAgent.includes('tablet')) {
      return 'touch';
    } else if (userAgent.includes('mac') || userAgent.includes('win') || userAgent.includes('linux')) {
      return 'mouse';
    }
    
    return 'unknown';
  }

  /**
   * デバッグ情報取得
   */
  getDebugInfo() {
    const isCapacitorAvailable = typeof window !== 'undefined' && 'Capacitor' in window;
    
    return {
      environment: isCapacitorAvailable ? 'capacitor' : 'web',
      deviceInfo: this.deviceInfo,
      lastKnownPosition: this.lastKnownPosition ? {
        timestamp: new Date(this.lastKnownPosition.timestamp).toISOString(),
        accuracy: this.lastKnownPosition.coords.accuracy,
        latitude: this.lastKnownPosition.coords.latitude.toFixed(4),
        longitude: this.lastKnownPosition.coords.longitude.toFixed(4)
      } : null,
      capabilities: {
        capacitorAvailable: isCapacitorAvailable,
        geolocationAvailable: typeof navigator !== 'undefined' && 'geolocation' in navigator,
        batteryApiAvailable: typeof navigator !== 'undefined' && 'getBattery' in navigator,
        screenOrientationAvailable: typeof screen !== 'undefined' && 'orientation' in screen
      },
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      permissions: {
        location: 'unknown' // TODO: 権限状態の詳細取得
      }
    };
  }
}

// シングルトンインスタンス
export const capacitorIntegration = new CapacitorIntegration();
