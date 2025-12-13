import { useMemo, useState, useEffect } from 'react';

type ColumnAlign = 'l' | 'c' | 'r';

export interface LatexColumn<T> {
  key: string;
  label: string;
  align?: ColumnAlign;
  formatter: (row: T) => string;
}

export interface LatexTableExporterProps<T> {
  title: string;
  caption?: string;
  label?: string;
  columns: LatexColumn<T>[];
  rows: T[];
  defaultIncludedKeys?: string[];
  helperText?: string;
}

const escapeLatex = (value: string): string => {
  return value
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\^/g, '\\^{}')
    .replace(/~/g, '\\textasciitilde{}');
};

function buildLatexTable<T>(
  title: string,
  caption: string | undefined,
  label: string | undefined,
  columns: LatexColumn<T>[],
  rows: T[],
): string {
  if (columns.length === 0) {
    return '% 列が選択されていません';
  }

  const columnSpec = columns.map((col, idx) => col.align ?? (idx === 0 ? 'l' : 'r')).join('');
  const headerRow = columns.map(col => escapeLatex(col.label)).join(' & ');
  const bodyRows = rows
    .map(row => columns.map(col => escapeLatex(col.formatter(row))).join(' & '))
    .map(row => `${row} \\\\`)
    .join('\n');

  return [
    '% booktabs パッケージを利用する想定です',
    '\\begin{table}[htbp]',
    '\\centering',
    `\\caption{${escapeLatex(caption || title)}}`,
    `\\label{${escapeLatex(label || `tab:${title.toLowerCase().replace(/\s+/g, '-')}`)}}`,
    `\\begin{tabular}{${columnSpec}}`,
    '\\toprule',
    `${headerRow} \\\\`,
    '\\midrule',
    bodyRows || '% データなし',
    '\\bottomrule',
    '\\end{tabular}',
    '\\end{table}',
  ].join('\n');
}

export function LatexTableExporter<T>({
  title,
  caption,
  label,
  columns,
  rows,
  defaultIncludedKeys,
  helperText,
}: LatexTableExporterProps<T>) {
  const columnKeySignature = useMemo(
    () => columns.map(col => col.key).join('|'),
    [columns],
  );
  const defaultKeySignature = useMemo(
    () => (defaultIncludedKeys ?? columns.map(col => col.key)).join('|'),
    [columns, defaultIncludedKeys],
  );

  const [includedKeys, setIncludedKeys] = useState<Set<string>>(
    new Set(defaultIncludedKeys ?? columns.map(col => col.key)),
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIncludedKeys(new Set(defaultIncludedKeys ?? columns.map(col => col.key)));
  }, [columnKeySignature, defaultKeySignature]);

  const activeColumns = useMemo(
    () => columns.filter(col => includedKeys.has(col.key)),
    [columns, includedKeys],
  );

  const latex = useMemo(
    () => buildLatexTable(title, caption, label, activeColumns, rows),
    [activeColumns, caption, label, rows, title],
  );

  const toggleColumn = (key: string) => {
    setIncludedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      style={{
        marginTop: '12px',
        padding: '12px',
        border: '1px solid #e0e0e0',
        borderRadius: '6px',
        backgroundColor: '#fafafa',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{title} - 論文用TeX出力</div>
          {helperText && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{helperText}</div>
          )}
        </div>
        <button
          onClick={copyToClipboard}
          disabled={activeColumns.length === 0}
          style={{
            padding: '8px 14px',
            backgroundColor: activeColumns.length === 0 ? '#bdbdbd' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: activeColumns.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {copied ? 'コピーしました' : 'TeXをコピー'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginTop: '12px', alignItems: 'flex-start' }}>
        <div style={{ flex: '0 0 260px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>含める列</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '6px' }}>
            {columns.map(col => (
              <label key={col.key} style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={includedKeys.has(col.key)}
                  onChange={() => toggleColumn(col.key)}
                  style={{ width: '14px', height: '14px' }}
                />
                {col.label}
              </label>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <textarea
            readOnly
            value={latex}
            style={{
              width: '100%',
              minHeight: '180px',
              padding: '10px',
              fontFamily: 'monospace',
              fontSize: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white',
              resize: 'vertical',
            }}
          />
        </div>
      </div>
    </div>
  );
}
