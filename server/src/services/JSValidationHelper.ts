/**
 * JSValidationHelper
 *
 * JavaScript コードの構文検証とポリシー準拠チェックを行うヘルパー。
 * L1+ Static-Sanity指標（JS_PARSE_OK, JS_POLICY_OK）の算出に使用。
 *
 * @see docs/research/DEV-REQUIREMENTS-L1PLUS-METRICS.md
 */

// ========================================
// 禁止トークン定義
// ========================================

/**
 * 禁止キーワード/パターン
 * - 副作用を持つ可能性があるもの
 * - 非決定的な結果を生むもの
 * - セキュリティリスクのあるもの
 */
export const FORBIDDEN_TOKENS = [
  // 制御フロー（無限ループリスク）
  'while',
  'for',

  // 危険な評価
  'eval',
  'Function',

  // 外部通信
  'fetch',
  'XMLHttpRequest',
  'WebSocket',

  // 非決定性
  'Date.now',
  'Math.random',
  'crypto.randomUUID',

  // タイマー（副作用）
  'setTimeout',
  'setInterval',
  'setImmediate',
  'requestAnimationFrame',

  // Node.js/外部モジュール
  'process',
  'require',
  'import',
  '__dirname',
  '__filename',

  // DOM操作（想定外の副作用）
  'document.',
  'window.',
  'localStorage',
  'sessionStorage',

  // 危険なプロトタイプ操作
  '__proto__',
  'prototype',
  'constructor',
] as const;

/**
 * 安全なJSパターン（ホワイトリスト用、参考）
 */
export const SAFE_PATTERNS = [
  // プロパティアクセス
  /^[\w.[\]]+$/,
  // アロー関数（単純）
  /^\([^)]*\)\s*=>\s*[^{]+$/,
  // 三項演算子
  /^\s*\w+\s*\?\s*[^:]+\s*:\s*[^;]+$/,
];

// ========================================
// Types
// ========================================

export interface JSParseResult {
  success: boolean;
  error?: string;
  /** エラーの行番号（取得可能な場合） */
  line?: number;
  /** エラーの列番号（取得可能な場合） */
  column?: number;
}

export interface JSPolicyResult {
  compliant: boolean;
  violations: string[];
  /** 検出された禁止トークンとその出現位置 */
  details: Array<{
    token: string;
    position: number;
  }>;
}

export interface JSValidationResult {
  parseResult: JSParseResult;
  policyResult: JSPolicyResult;
  /** 両方の検証に合格したか */
  valid: boolean;
}

// ========================================
// Implementation
// ========================================

/**
 * JavaScriptコードの構文を検証
 *
 * @param code - 検証するJSコード
 * @returns パース結果
 */
export function parseJavaScript(code: string): JSParseResult {
  if (!code || code.trim() === '') {
    return { success: true }; // 空のコードは有効とみなす
  }

  try {
    // アロー関数として評価可能かチェック
    // 実際に実行はせず、構文のみ検証
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function(`return (${code})`);
    return { success: true };
  } catch (e) {
    if (e instanceof SyntaxError) {
      // SyntaxErrorから詳細情報を抽出
      const message = e.message;
      const lineMatch = message.match(/line (\d+)/i);
      const columnMatch = message.match(/column (\d+)/i);

      return {
        success: false,
        error: message,
        line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
        column: columnMatch ? parseInt(columnMatch[1], 10) : undefined,
      };
    }

    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown parse error',
    };
  }
}

/**
 * JavaScriptコードのポリシー準拠をチェック
 *
 * @param code - 検証するJSコード
 * @param additionalForbidden - 追加の禁止トークン（オプション）
 * @returns ポリシーチェック結果
 */
export function checkPolicyCompliance(
  code: string,
  additionalForbidden: string[] = []
): JSPolicyResult {
  if (!code || code.trim() === '') {
    return { compliant: true, violations: [], details: [] };
  }

  const allForbidden = [...FORBIDDEN_TOKENS, ...additionalForbidden];
  const violations: string[] = [];
  const details: Array<{ token: string; position: number }> = [];

  for (const token of allForbidden) {
    // トークンを検索（単語境界を考慮）
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 単語の場合は境界チェック、そうでない場合（ドット付き等）はそのまま
    const pattern = /^\w+$/.test(token)
      ? new RegExp(`\\b${escapedToken}\\b`, 'g')
      : new RegExp(escapedToken, 'g');

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(code)) !== null) {
      // コメント内かどうかをチェック（簡易版）
      const beforeMatch = code.substring(0, match.index);
      const inSingleLineComment = /\/\/[^\n]*$/.test(beforeMatch);
      const inMultiLineComment = (beforeMatch.match(/\/\*/g)?.length ?? 0) >
                                  (beforeMatch.match(/\*\//g)?.length ?? 0);

      if (!inSingleLineComment && !inMultiLineComment) {
        violations.push(`Forbidden token: "${token}"`);
        details.push({ token, position: match.index });
      }
    }
  }

  return {
    compliant: violations.length === 0,
    violations: [...new Set(violations)], // 重複除去
    details,
  };
}

/**
 * JavaScriptコードの総合検証（構文 + ポリシー）
 *
 * @param code - 検証するJSコード
 * @param additionalForbidden - 追加の禁止トークン（オプション）
 * @returns 総合検証結果
 */
export function validateJavaScript(
  code: string,
  additionalForbidden: string[] = []
): JSValidationResult {
  const parseResult = parseJavaScript(code);
  const policyResult = checkPolicyCompliance(code, additionalForbidden);

  return {
    parseResult,
    policyResult,
    valid: parseResult.success && policyResult.compliant,
  };
}

/**
 * 複数のJSコードを一括検証
 *
 * @param codes - 検証するJSコードの配列
 * @returns 全体の検証結果
 */
export function validateMultipleJavaScript(
  codes: string[]
): {
  allParseOk: boolean;
  allPolicyOk: boolean;
  parseErrors: string[];
  policyViolations: string[];
  results: JSValidationResult[];
} {
  const results = codes.map((code) => validateJavaScript(code));

  const parseErrors: string[] = [];
  const policyViolations: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (!r.parseResult.success) {
      parseErrors.push(`[${i}] ${r.parseResult.error}`);
    }
    if (!r.policyResult.compliant) {
      policyViolations.push(...r.policyResult.violations.map((v) => `[${i}] ${v}`));
    }
  }

  return {
    allParseOk: parseErrors.length === 0,
    allPolicyOk: policyViolations.length === 0,
    parseErrors,
    policyViolations: [...new Set(policyViolations)],
    results,
  };
}

// ========================================
// Utility
// ========================================

/**
 * コードから変数参照を抽出（デバッグ用）
 */
export function extractVariableReferences(code: string): string[] {
  if (!code) return [];

  // 識別子パターン（簡易版）
  const identifierPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
  const keywords = new Set([
    'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
    'if', 'else', 'return', 'const', 'let', 'var', 'function',
    'new', 'typeof', 'instanceof', 'in', 'of', 'this',
  ]);

  const matches = code.match(identifierPattern) ?? [];
  const unique = [...new Set(matches)].filter((m) => !keywords.has(m));

  return unique;
}
