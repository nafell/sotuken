/**
 * UUID生成ユーティリティ
 * crypto.randomUUID() のポリフィル実装
 */

/**
 * UUID v4 を生成する
 * crypto.randomUUID() が利用できない環境のためのフォールバック実装
 */
export function generateUUID(): string {
  // ブラウザでcrypto.randomUUID()が利用可能な場合はそれを使用
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (error) {
      console.warn('crypto.randomUUID() failed, falling back to custom implementation:', error);
    }
  }

  // フォールバック実装: UUID v4 形式
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 短縮UUID（最初の8文字のみ）を生成
 * デバッグ・ログ出力用
 */
export function generateShortUUID(): string {
  return generateUUID().substring(0, 8);
}

/**
 * 匿名ID生成（研究用）
 * タイムスタンプとランダム要素を組み合わせ
 */
export function generateAnonymousId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `anon_${timestamp}_${random}`;
}

/**
 * プレフィックス付きID生成
 * Phase 2で使用
 * 
 * @param prefix - IDのプレフィックス（例: 'task', 'concern', 'user'）
 * @returns プレフィックス付きUUID（例: 'task_550e8400-e29b-41d4-a716'）
 */
export function generateId(prefix: string): string {
  const uuid = generateUUID();
  const shortUuid = uuid.split('-').slice(0, 3).join('-'); // 最初の3セグメントのみ使用
  return `${prefix}_${shortUuid}`;
}
