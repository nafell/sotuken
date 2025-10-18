/**
 * EventLogger（Phase 2）
 * イベントログ記録サービス
 */

import { db } from './database/localDB';
import type { EventType } from '../types/database';

/**
 * イベントログオプション
 */
interface EventLogOptions {
  eventType: EventType;
  screenId: string;
  componentId?: string;
  metadata?: Record<string, any>;
  sessionId?: string;
}

/**
 * イベントロガー
 * ローカルDB保存とバッファリング機能を提供
 */
class EventLogger {
  private buffer: any[] = [];
  private readonly BUFFER_SIZE = 10;
  private readonly FLUSH_INTERVAL = 30000; // 30秒
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    // 自動フラッシュタイマー開始
    this.startAutoFlush();
    
    // ページ離脱時にフラッシュ
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushSync();
      });
    }
  }

  /**
   * イベント記録（メイン）
   */
  async log(options: EventLogOptions): Promise<void> {
    try {
      // IndexedDBに保存
      await db.recordEvent({
        sessionId: options.sessionId || 'default_session',
        eventType: options.eventType,
        screenId: options.screenId,
        componentId: options.componentId,
        metadata: options.metadata || {},
      });
      
      // バッファに追加（将来のバッチ送信用）
      this.buffer.push({
        ...options,
        timestamp: new Date().toISOString(),
      });
      
      // バッファがいっぱいになったらフラッシュ
      if (this.buffer.length >= this.BUFFER_SIZE) {
        await this.flush();
      }
      
      console.log(`📝 Event logged: ${options.eventType} @ ${options.screenId}`);
      
    } catch (error) {
      console.error('❌ Event logging failed:', error);
    }
  }

  /**
   * バッファフラッシュ（非同期）
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const eventsToSend = [...this.buffer];
    this.buffer = [];
    
    try {
      // TODO: サーバーへのバッチ送信（Phase 2後半で実装）
      console.log(`📤 Would flush ${eventsToSend.length} events to server`);
      
    } catch (error) {
      console.error('❌ Event flush failed:', error);
      // 失敗時はバッファに戻す
      this.buffer = [...eventsToSend, ...this.buffer];
    }
  }

  /**
   * 同期フラッシュ（ページ離脱時用）
   */
  private flushSync(): void {
    if (this.buffer.length === 0) return;
    
    // Beacon APIで同期送信（ページ離脱時も送信できる）
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const data = JSON.stringify({
        batchId: crypto.randomUUID(),
        events: this.buffer,
      });
      
      navigator.sendBeacon(`${serverUrl}/v1/events/batch`, data);
      console.log(`📤 Sent ${this.buffer.length} events via Beacon`);
    }
    
    this.buffer = [];
  }

  /**
   * 自動フラッシュタイマー開始
   */
  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushSync();
  }
}

// シングルトンインスタンス
export const eventLogger = new EventLogger();

