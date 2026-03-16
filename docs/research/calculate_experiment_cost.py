"""
Experiment 2 Cost Analysis Script
----------------------------------
Calculates per-config, per-stage costs from the experiment CSV data
using Azure OpenAI token pricing (Dec 2025).

Data source: DATA-FINISH/result-summary-csv-2057.csv (Experiment 2 only)
Pricing source: Azure OpenAI pricing (same as generate_charts.py)

Note on Config E (model-router):
  The router selects models dynamically, so exact per-call pricing is unknown.
  We approximate using gpt-4.1-mini pricing. The router fee (~31.8 JPY total
  across both experiments) is reported separately.
"""

import pandas as pd
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(SCRIPT_DIR, "DATA-FINISH", "result-summary-csv-2057.csv")

# JPY per 1M tokens (Dec 2025 Azure OpenAI)
PRICES = {
    'gpt-5-chat':   {'in': 195.20, 'out': 1561.55},
    'gpt-5-mini':   {'in': 39.04,  'out': 312.31},
    'gpt-4.1':      {'in': 312.31, 'out': 1249.24},
    'gpt-4.1-mini': {'in': 62.47,  'out': 249.85},
    'model-router': {'in': 62.47,  'out': 249.85},  # approx
}

# Config -> [Stage1 model, Stage2 model, Stage3 model]
MODEL_MAP = {
    'A': ['gpt-5-chat', 'gpt-5-chat', 'gpt-5-chat'],
    'B': ['gpt-5-mini', 'gpt-5-mini', 'gpt-5-mini'],
    'C': ['gpt-5-chat', 'gpt-4.1', 'gpt-4.1'],
    'D': ['gpt-5-chat', 'gpt-5-mini', 'gpt-5-mini'],
    'E': ['model-router', 'model-router', 'model-router'],
}

CONFIG_NAMES = {
    'A': 'All-5-Chat',
    'B': 'All-5-mini',
    'C': 'Hybrid-1 (Chat+4.1)',
    'D': 'Hybrid-2 (Chat+mini)',
    'E': 'Router Based',
}


def get_model_id(config_id: str, stage: int) -> str:
    stages = MODEL_MAP.get(config_id, MODEL_MAP['E'])
    return stages[stage - 1] if 0 < stage <= len(stages) else 'model-router'


def calc_cost(model_id: str, input_tokens: int, output_tokens: int) -> float:
    p = PRICES.get(model_id, PRICES['model-router'])
    return (input_tokens / 1_000_000 * p['in']) + (output_tokens / 1_000_000 * p['out'])


def main():
    df = pd.read_csv(CSV_PATH)

    # Strip quotes from string columns
    for col in df.select_dtypes(include='object').columns:
        df[col] = df[col].str.strip('"')

    df['stage'] = df['stage'].astype(int)
    df['input_tokens'] = df['input_tokens'].astype(int)
    df['output_tokens'] = df['output_tokens'].astype(int)
    df['latency_ms'] = df['latency_ms'].astype(int)

    # Calculate per-row cost
    df['model_id'] = df.apply(
        lambda r: get_model_id(r['model_config'], r['stage']), axis=1
    )
    df['cost_jpy'] = df.apply(
        lambda r: calc_cost(r['model_id'], r['input_tokens'], r['output_tokens']),
        axis=1,
    )

    # =========================================================
    # 1. Per-config summary
    # =========================================================
    print("=" * 70)
    print("  Experiment 2: Per-Configuration Cost Summary")
    print("=" * 70)

    config_summary = (
        df.groupby('model_config')
        .agg(
            trials=('stage', lambda x: len(x) // 3),
            total_input_tokens=('input_tokens', 'sum'),
            total_output_tokens=('output_tokens', 'sum'),
            total_cost_jpy=('cost_jpy', 'sum'),
            mean_cost_per_trial=('cost_jpy', lambda x: x.sum() / (len(x) // 3)),
            median_latency_ms=('latency_ms', 'median'),
        )
        .reindex(['A', 'B', 'C', 'D', 'E'])
    )
    config_summary['config_name'] = [CONFIG_NAMES[c] for c in config_summary.index]

    for cfg in config_summary.index:
        row = config_summary.loc[cfg]
        print(f"\n  Config {cfg} ({row['config_name']})")
        print(f"    Trials:           {int(row['trials'])}")
        print(f"    Input tokens:     {int(row['total_input_tokens']):,}")
        print(f"    Output tokens:    {int(row['total_output_tokens']):,}")
        print(f"    Total cost:       {row['total_cost_jpy']:.2f} JPY")
        print(f"    Mean cost/trial:  {row['mean_cost_per_trial']:.2f} JPY")

    total_cost = config_summary['total_cost_jpy'].sum()
    total_in = config_summary['total_input_tokens'].sum()
    total_out = config_summary['total_output_tokens'].sum()
    print(f"\n  {'─' * 50}")
    print(f"  TOTAL (all configs):  {total_cost:.2f} JPY")
    print(f"  Total input tokens:   {int(total_in):,}")
    print(f"  Total output tokens:  {int(total_out):,}")

    # =========================================================
    # 2. Per-config, per-stage breakdown
    # =========================================================
    print(f"\n\n{'=' * 70}")
    print("  Per-Configuration, Per-Stage Breakdown")
    print("=" * 70)

    for cfg in ['A', 'B', 'C', 'D', 'E']:
        cfg_df = df[df['model_config'] == cfg]
        print(f"\n  Config {cfg} ({CONFIG_NAMES[cfg]})")
        print(f"  {'Stage':<8} {'Model':<16} {'InTok':>10} {'OutTok':>10} {'Cost(JPY)':>12} {'MdnLat(ms)':>12}")
        print(f"  {'─' * 68}")

        for s in [1, 2, 3]:
            stage_df = cfg_df[cfg_df['stage'] == s]
            mid = get_model_id(cfg, s)
            in_tok = stage_df['input_tokens'].sum()
            out_tok = stage_df['output_tokens'].sum()
            cost = stage_df['cost_jpy'].sum()
            lat_med = stage_df['latency_ms'].median()
            print(f"  S{s:<7} {mid:<16} {in_tok:>10,} {out_tok:>10,} {cost:>11.2f} {lat_med:>11.0f}")

        total_cfg = cfg_df['cost_jpy'].sum()
        print(f"  {'─' * 68}")
        print(f"  {'Total':<26} {cfg_df['input_tokens'].sum():>10,} {cfg_df['output_tokens'].sum():>10,} {total_cfg:>11.2f}")

    # =========================================================
    # 3. Cross-validation with Azure billing
    # =========================================================
    print(f"\n\n{'=' * 70}")
    print("  Cross-Validation with Azure Billing")
    print("=" * 70)
    print(f"""
  Azure TSV total (both experiments):   ~4,102 JPY
  Experiment 1 cost (known):            ~2,301 JPY
  Expected Experiment 2 cost:           ~1,801 JPY
  Calculated Experiment 2 cost:          {total_cost:.2f} JPY

  Notes:
  - Config E uses gpt-4.1-mini pricing as approximation.
  - Azure TSV includes router fee (~31.8 JPY across both experiments),
    which is NOT included in the token-based calculation above.
  - Difference may also arise from cached-input discounts reflected
    in Azure billing but not in this token-based estimate.
""")

    # =========================================================
    # 4. LaTeX-ready table output
    # =========================================================
    print(f"{'=' * 70}")
    print("  LaTeX Table: Per-Config Summary")
    print("=" * 70)
    print(r"""
\begin{table}[htbp]
\centering
\caption{モデル構成別の推定APIコスト（実験2）}
\label{tab:cost_per_config}
\begin{tabular}{llrrrrr}
\toprule
ID & 構成名 & 試行数 & 入力トークン & 出力トークン & 合計コスト (円) & 平均コスト/試行 (円) \\
\midrule""")
    for cfg in ['A', 'B', 'C', 'D', 'E']:
        row = config_summary.loc[cfg]
        note = "$^{*}$" if cfg == 'E' else ""
        print(f"{cfg}{note} & {row['config_name']:<24s} & {int(row['trials'])} & "
              f"{int(row['total_input_tokens']):,} & {int(row['total_output_tokens']):,} & "
              f"{row['total_cost_jpy']:.2f} & {row['mean_cost_per_trial']:.2f} \\\\")
    print(r"""\midrule
\multicolumn{3}{l}{合計} & """ + f"{int(total_in):,} & {int(total_out):,} & {total_cost:.2f} & --- \\\\" + r"""
\bottomrule
\end{tabular}
\begin{tablenotes}
\small
\item[$*$] 構成Eはmodel-routerを使用するため，gpt-4.1-miniの単価で近似している．
\end{tablenotes}
\end{table}
""")

    # =========================================================
    # 5. LaTeX table: Per-Stage breakdown
    # =========================================================
    print(f"{'=' * 70}")
    print("  LaTeX Table: Per-Config Per-Stage Breakdown")
    print("=" * 70)
    print(r"""
\begin{table}[htbp]
\centering
\caption{モデル構成別・ステージ別のコスト内訳（実験2）}
\label{tab:cost_per_stage}
\begin{tabular}{llrrrr}
\toprule
構成 & Stage & モデル & 入力トークン & 出力トークン & コスト (円) \\
\midrule""")
    for cfg in ['A', 'B', 'C', 'D', 'E']:
        cfg_df = df[df['model_config'] == cfg]
        for s in [1, 2, 3]:
            stage_df = cfg_df[cfg_df['stage'] == s]
            mid = get_model_id(cfg, s)
            in_tok = int(stage_df['input_tokens'].sum())
            out_tok = int(stage_df['output_tokens'].sum())
            cost = stage_df['cost_jpy'].sum()
            label = cfg if s == 1 else ""
            print(f"{label} & S{s} & {mid} & {in_tok:,} & {out_tok:,} & {cost:.2f} \\\\")
        total_cfg = cfg_df['cost_jpy'].sum()
        print(f"\\multicolumn{{2}}{{l}}{{\\textbf{{{cfg} 小計}}}} & & "
              f"{int(cfg_df['input_tokens'].sum()):,} & {int(cfg_df['output_tokens'].sum()):,} & "
              f"\\textbf{{{total_cfg:.2f}}} \\\\")
        print(r"\midrule")
    print(r"""\bottomrule
\end{tabular}
\end{table}
""")


if __name__ == '__main__':
    main()
