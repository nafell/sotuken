/**
 * Phase 2 Step 3.5: UI保持・入力保持機能の型定義
 * UIGenerationCache - UI生成結果のキャッシュ型
 */

// UIGenerationCache interface定義
export interface UIGenerationCache {
  cacheId: string;              // キャッシュID
  stage: 'capture' | 'plan' | 'breakdown';
  concernId: string;            // 関連する関心事ID
  
  // 生成されたUI（Phase 1Cの成果物）
  uiSpec: any;                  // UISpecDSL
  dataSchema: any;              // DataSchemaDSL
  generationId: string;
  
  // メタデータ
  generatedAt: Date;
  lastAccessedAt: Date;
  
  // 入力内容
  formData: Record<string, any>;
}

// CacheEntry interface定義
export interface CacheEntry {
  cache: UIGenerationCache;
  expiresAt: Date;              // 有効期限（1時間）
}

