/**
 * Phase 2 Step 3.5: UIGenerationCacheService
 * UIキャッシュ管理サービス
 */

import type { UIGenerationCache, CacheEntry } from '../types/cache';

class UIGenerationCacheService {
  private cacheKey = 'uiGenerationCache';
  private cacheExpiration = 60 * 60 * 1000; // 1時間

  /**
   * UIキャッシュをSessionStorageに保存
   */
  saveCache(cache: UIGenerationCache): void {
    try {
      // 既存のキャッシュを読み込み
      const stored = sessionStorage.getItem(this.cacheKey);
      const caches: Record<string, CacheEntry> = stored ? JSON.parse(stored) : {};
      
      // 新しいキャッシュを追加
      const key = `${cache.stage}_${cache.concernId}`;
      caches[key] = {
        cache,
        expiresAt: new Date(Date.now() + this.cacheExpiration)
      };
      
      // 保存
      sessionStorage.setItem(this.cacheKey, JSON.stringify(caches));
      
      console.log('[UIGenerationCacheService] Cache saved:', key);
    } catch (error) {
      console.error('[UIGenerationCacheService] Failed to save cache:', error);
    }
  }

  /**
   * SessionStorageからUIキャッシュを読み込み
   */
  loadCache(stage: string, concernId: string): UIGenerationCache | null {
    try {
      const stored = sessionStorage.getItem(this.cacheKey);
      if (!stored) {
        console.log('[UIGenerationCacheService] No cache found');
        return null;
      }
      
      const caches: Record<string, CacheEntry> = JSON.parse(stored);
      const key = `${stage}_${concernId}`;
      const entry = caches[key];
      
      if (!entry) {
        console.log('[UIGenerationCacheService] Cache not found for key:', key);
        return null;
      }
      
      // 有効期限チェック
      if (new Date() > new Date(entry.expiresAt)) {
        console.log('[UIGenerationCacheService] Cache expired:', key);
        delete caches[key];
        sessionStorage.setItem(this.cacheKey, JSON.stringify(caches));
        return null;
      }
      
      // lastAccessedAtを更新
      entry.cache.lastAccessedAt = new Date();
      caches[key] = entry;
      sessionStorage.setItem(this.cacheKey, JSON.stringify(caches));
      
      console.log('[UIGenerationCacheService] Cache loaded:', key);
      return entry.cache;
      
    } catch (error) {
      console.error('[UIGenerationCacheService] Failed to load cache:', error);
      return null;
    }
  }

  /**
   * 特定の関心事のキャッシュをクリア
   */
  clearCache(concernId: string): void {
    try {
      const stored = sessionStorage.getItem(this.cacheKey);
      if (!stored) return;
      
      const caches: Record<string, CacheEntry> = JSON.parse(stored);
      
      // 指定されたconcernIdのキャッシュを削除
      const keysToDelete = Object.keys(caches).filter(key => 
        caches[key].cache.concernId === concernId
      );
      
      keysToDelete.forEach(key => delete caches[key]);
      
      sessionStorage.setItem(this.cacheKey, JSON.stringify(caches));
      
      console.log('[UIGenerationCacheService] Cache cleared for concernId:', concernId, 
                  'Deleted keys:', keysToDelete.length);
    } catch (error) {
      console.error('[UIGenerationCacheService] Failed to clear cache:', error);
    }
  }

  /**
   * 全キャッシュをクリア
   */
  clearAllCaches(): void {
    try {
      sessionStorage.removeItem(this.cacheKey);
      console.log('[UIGenerationCacheService] All caches cleared');
    } catch (error) {
      console.error('[UIGenerationCacheService] Failed to clear all caches:', error);
    }
  }

  /**
   * 有効期限切れのキャッシュを削除
   */
  clearExpiredCaches(): void {
    try {
      const stored = sessionStorage.getItem(this.cacheKey);
      if (!stored) return;
      
      const caches: Record<string, CacheEntry> = JSON.parse(stored);
      const now = new Date();
      
      const keysToDelete = Object.keys(caches).filter(key => 
        new Date(caches[key].expiresAt) < now
      );
      
      keysToDelete.forEach(key => delete caches[key]);
      
      sessionStorage.setItem(this.cacheKey, JSON.stringify(caches));
      
      console.log('[UIGenerationCacheService] Expired caches cleared:', keysToDelete.length);
    } catch (error) {
      console.error('[UIGenerationCacheService] Failed to clear expired caches:', error);
    }
  }
}

// シングルトンインスタンス
export const uiCacheService = new UIGenerationCacheService();

