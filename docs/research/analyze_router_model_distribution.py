"""
Router Model Distribution Analysis
-----------------------------------
Determines which models the model-router (Config E) actually selected
by subtracting known Config A-D token usage from Azure billing totals.

Strategy:
  1. Parse experiment 1 & 2 JSON logs → aggregate tokens by model for configs A-D
  2. Parse Azure cost export TSV → reverse-engineer token counts from costs
  3. Residual (Azure total - known A-D usage) ≈ Config E actual usage + prototype noise

Data sources:
  - Experiment 1: DATA-LETSGO-BABY/results-full-json-12131345-*.json
  - Experiment 2: DATA-FINISH/result-full-json-2057.json
  - Azure export: DATA-FINISH/model-router-log-exported.tsv
"""

import json
import csv
import os
from collections import defaultdict

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

EXP1_JSON = os.path.join(
    SCRIPT_DIR,
    "DATA-LETSGO-BABY",
    "results-full-json-12131345-c091dbda-9320-48a3-843f-28e69530ac4c.json",
)
EXP2_JSON = os.path.join(SCRIPT_DIR, "DATA-FINISH", "result-full-json-2057.json")
AZURE_TSV = os.path.join(SCRIPT_DIR, "DATA-FINISH", "model-router-log-exported.tsv")

# JPY per 1M tokens (Dec 2025 Azure OpenAI)
PRICES = {
    "gpt-5-chat":     {"in": 195.20, "out": 1561.55, "cached_in": 97.60},
    "gpt-5-mini":     {"in": 39.04,  "out": 312.31,  "cached_in": 19.52},
    "gpt-4.1":        {"in": 312.31, "out": 1249.24, "cached_in": 31.23},
    "gpt-4.1-mini":   {"in": 62.47,  "out": 249.85,  "cached_in": 6.25},
    "gpt-4o-mini":    {"in": 62.47,  "out": 249.85,  "cached_in": 6.25},
    "gpt-5-nano":     {"in": 39.04,  "out": 312.31,  "cached_in": 19.52},
    "gpt-oss-120b":   {"in": 62.47,  "out": 249.85,  "cached_in": 6.25},
}

# Config -> [Stage1 model, Stage2 model, Stage3 model]
MODEL_MAP = {
    "A": ["gpt-5-chat", "gpt-5-chat", "gpt-5-chat"],
    "B": ["gpt-5-mini", "gpt-5-mini", "gpt-5-mini"],
    "C": ["gpt-5-chat", "gpt-4.1", "gpt-4.1"],
    "D": ["gpt-5-chat", "gpt-5-mini", "gpt-5-mini"],
}

# Azure TSV meter name → our model ID mapping
AZURE_METER_MAP = {
    "GPT 5 Chat outpt Glbl 1M Tokens":            ("gpt-5-chat", "out"),
    "GPT 5 Chat Inpt Glbl 1M Tokens":             ("gpt-5-chat", "in"),
    "GPT 5 Chat cchd Inpt Glbl 1M Tokens":        ("gpt-5-chat", "cached_in"),
    "GPT 5 Mini outpt Glbl 1M Tokens":             ("gpt-5-mini", "out"),
    "GPT 5 Mini Inpt Glbl 1M Tokens":              ("gpt-5-mini", "in"),
    "GPT 5 Mini cchd Inpt Glbl 1M Tokens":         ("gpt-5-mini", "cached_in"),
    "gpt 4.1 Outp glbl Tokens":                    ("gpt-4.1", "out"),
    "gpt 4.1 Inp glbl Tokens":                     ("gpt-4.1", "in"),
    "gpt 4.1 cached Inp glbl Tokens":              ("gpt-4.1", "cached_in"),
    "gpt 4.1 mini Outp glbl Tokens":               ("gpt-4.1-mini", "out"),
    "gpt 4.1 mini Inp glbl Tokens":                ("gpt-4.1-mini", "in"),
    "gpt 4.1 mini cached Inp glbl Tokens":         ("gpt-4.1-mini", "cached_in"),
    "gpt-4o-mini-0718-Outp-glbl Tokens":           ("gpt-4o-mini", "out"),
    "gpt-4o-mini-0718-Inp-glbl Tokens":            ("gpt-4o-mini", "in"),
    "gpt 4o mini 0718 cached Inp glbl Tokens":     ("gpt-4o-mini", "cached_in"),
    "GPT 5 Nano outpt Glbl 1M Tokens":             ("gpt-5-nano", "out"),
    "GPT 5 Nano Inpt Glbl 1M Tokens":              ("gpt-5-nano", "in"),
    "gpt-oss-120B Outp glbl Tokens":               ("gpt-oss-120b", "out"),
    "gpt-oss-120B Inp glbl Tokens":                ("gpt-oss-120b", "in"),
    "Model Routers GL 1M Tokens":                  ("router-fee", "fee"),
}


def load_experiment(path: str) -> list[dict]:
    with open(path, "r") as f:
        data = json.load(f)
    return data.get("trialLogs", [])


def get_model_id(config_id: str, stage: int) -> str:
    stages = MODEL_MAP.get(config_id)
    if stages is None:
        return None  # Config E — unknown
    return stages[stage - 1] if 0 < stage <= len(stages) else None


def aggregate_known_tokens(logs: list[dict]) -> dict:
    """Aggregate tokens by model for configs A-D (known model mapping)."""
    tokens = defaultdict(lambda: {"in": 0, "out": 0})
    config_e_tokens = {"in": 0, "out": 0, "count": 0}

    for log in logs:
        cfg = log.get("modelConfig")
        stage = log.get("stage")
        in_tok = log.get("inputTokens", 0)
        out_tok = log.get("outputTokens", 0)

        if cfg == "E":
            config_e_tokens["in"] += in_tok
            config_e_tokens["out"] += out_tok
            config_e_tokens["count"] += 1
            continue

        model = get_model_id(cfg, stage)
        if model:
            tokens[model]["in"] += in_tok
            tokens[model]["out"] += out_tok

    return dict(tokens), config_e_tokens


def parse_azure_tsv(path: str) -> dict:
    """Parse Azure cost export TSV and reverse-engineer token counts."""
    azure = {}
    with open(path, "r") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            meter = row["Meter"]
            cost_jpy = float(row["Cost"])
            mapping = AZURE_METER_MAP.get(meter)
            if not mapping:
                print(f"  [WARN] Unknown meter: {meter}")
                continue

            model_id, token_type = mapping

            if model_id == "router-fee":
                azure["router-fee"] = {"cost_jpy": cost_jpy}
                continue

            if model_id not in azure:
                azure[model_id] = {}

            price_key = token_type  # "in", "out", or "cached_in"
            price_per_1m = PRICES.get(model_id, {}).get(price_key)

            if price_per_1m and price_per_1m > 0:
                tokens_estimated = int(cost_jpy / price_per_1m * 1_000_000)
            else:
                tokens_estimated = 0

            azure[model_id][token_type] = {
                "cost_jpy": cost_jpy,
                "tokens": tokens_estimated,
            }

    return azure


def main():
    # =========================================================
    # 1. Load and aggregate experiment logs
    # =========================================================
    print("=" * 72)
    print("  Loading experiment logs...")
    print("=" * 72)

    exp1_logs = load_experiment(EXP1_JSON)
    exp2_logs = load_experiment(EXP2_JSON)
    print(f"  Experiment 1: {len(exp1_logs)} logs")
    print(f"  Experiment 2: {len(exp2_logs)} logs")

    exp1_known, exp1_e = aggregate_known_tokens(exp1_logs)
    exp2_known, exp2_e = aggregate_known_tokens(exp2_logs)

    # Combine both experiments
    combined_known = defaultdict(lambda: {"in": 0, "out": 0})
    for src in [exp1_known, exp2_known]:
        for model, tok in src.items():
            combined_known[model]["in"] += tok["in"]
            combined_known[model]["out"] += tok["out"]

    combined_e = {
        "in": exp1_e["in"] + exp2_e["in"],
        "out": exp1_e["out"] + exp2_e["out"],
        "count": exp1_e["count"] + exp2_e["count"],
    }

    # =========================================================
    # 2. Print known A-D token usage
    # =========================================================
    print(f"\n{'=' * 72}")
    print("  Config A-D: Known Token Usage (Exp1 + Exp2 combined)")
    print("=" * 72)
    print(f"  {'Model':<16} {'Input Tokens':>14} {'Output Tokens':>14} {'Est. Cost (JPY)':>16}")
    print(f"  {'─' * 62}")

    total_known_cost = 0
    for model in ["gpt-5-chat", "gpt-5-mini", "gpt-4.1"]:
        tok = combined_known.get(model, {"in": 0, "out": 0})
        p = PRICES[model]
        cost = (tok["in"] / 1e6 * p["in"]) + (tok["out"] / 1e6 * p["out"])
        total_known_cost += cost
        print(f"  {model:<16} {tok['in']:>14,} {tok['out']:>14,} {cost:>15.2f}")

    print(f"  {'─' * 62}")
    print(f"  {'TOTAL':<16} {'':>14} {'':>14} {total_known_cost:>15.2f}")

    print(f"\n  Config E total tokens (model unknown):")
    print(f"    Input:  {combined_e['in']:>12,}")
    print(f"    Output: {combined_e['out']:>12,}")
    print(f"    Calls:  {combined_e['count']:>12,}")

    # =========================================================
    # 3. Parse Azure TSV
    # =========================================================
    print(f"\n{'=' * 72}")
    print("  Azure Billing: Token Estimates (reverse-engineered from costs)")
    print("=" * 72)

    azure = parse_azure_tsv(AZURE_TSV)

    total_azure_cost = 0
    print(f"  {'Model':<16} {'Type':<12} {'Cost (JPY)':>12} {'Est. Tokens':>14}")
    print(f"  {'─' * 56}")

    for model_id in ["gpt-5-chat", "gpt-5-mini", "gpt-4.1", "gpt-4.1-mini",
                      "gpt-4o-mini", "gpt-5-nano", "gpt-oss-120b"]:
        if model_id not in azure:
            continue
        for ttype in ["in", "cached_in", "out"]:
            if ttype not in azure[model_id]:
                continue
            entry = azure[model_id][ttype]
            total_azure_cost += entry["cost_jpy"]
            label = "input" if ttype == "in" else ("cached" if ttype == "cached_in" else "output")
            print(f"  {model_id:<16} {label:<12} {entry['cost_jpy']:>11.2f} {entry['tokens']:>14,}")

    if "router-fee" in azure:
        fee = azure["router-fee"]["cost_jpy"]
        total_azure_cost += fee
        print(f"  {'router-fee':<16} {'fee':<12} {fee:>11.2f} {'---':>14}")

    print(f"  {'─' * 56}")
    print(f"  {'TOTAL':<29} {total_azure_cost:>11.2f}")

    # =========================================================
    # 4. Residual analysis: Azure - known A-D = Config E + noise
    # =========================================================
    print(f"\n{'=' * 72}")
    print("  Residual Analysis: Azure Total - Known A-D = Config E + Other")
    print("=" * 72)

    # For models used by A-D (gpt-5-chat, gpt-5-mini, gpt-4.1):
    # subtract known tokens from Azure-estimated tokens
    print(f"\n  Models shared with A-D (residual = router's share of that model):")
    print(f"  {'Model':<16} {'Azure Tok':>14} {'Known A-D':>14} {'Residual':>14} {'Direction'}")
    print(f"  {'─' * 70}")

    for model in ["gpt-5-chat", "gpt-5-mini", "gpt-4.1"]:
        for direction in ["in", "out"]:
            az_entry = azure.get(model, {}).get(direction, {"tokens": 0, "cost_jpy": 0})
            az_tokens = az_entry["tokens"]
            known_tokens = combined_known.get(model, {"in": 0, "out": 0})[direction]
            residual = az_tokens - known_tokens

            # Also add cached input to the "in" direction for Azure
            if direction == "in":
                cached = azure.get(model, {}).get("cached_in", {"tokens": 0})
                az_tokens_with_cache = az_tokens + cached["tokens"]
                residual_with_cache = az_tokens_with_cache - known_tokens
                print(f"  {model:<16} {az_tokens_with_cache:>14,} {known_tokens:>14,} "
                      f"{residual_with_cache:>14,}  {direction} (incl. cached)")
            else:
                print(f"  {model:<16} {az_tokens:>14,} {known_tokens:>14,} "
                      f"{residual:>14,}  {direction}")

    # Models NOT used by A-D — entirely from router or prototype
    print(f"\n  Models NOT used by A-D (entirely from router or prototype testing):")
    print(f"  {'Model':<16} {'Input Tok':>14} {'Output Tok':>14} {'Total Cost':>12}")
    print(f"  {'─' * 58}")

    router_only_models = ["gpt-4.1-mini", "gpt-4o-mini", "gpt-5-nano", "gpt-oss-120b"]
    for model in router_only_models:
        if model not in azure:
            continue
        in_tok = sum(azure[model].get(t, {}).get("tokens", 0) for t in ["in", "cached_in"])
        out_tok = azure[model].get("out", {}).get("tokens", 0)
        cost = sum(azure[model].get(t, {}).get("cost_jpy", 0) for t in ["in", "cached_in", "out"])
        print(f"  {model:<16} {in_tok:>14,} {out_tok:>14,} {cost:>11.2f}")

    # =========================================================
    # 5. Estimate router model distribution by cost proportion
    # =========================================================
    print(f"\n{'=' * 72}")
    print("  Config E: Estimated Model Distribution (by cost)")
    print("=" * 72)

    # Collect all residual costs attributable to Config E
    residual_costs = {}

    # Shared models: residual tokens × price
    for model in ["gpt-5-chat", "gpt-5-mini", "gpt-4.1"]:
        cost_residual = 0
        for direction in ["in", "out"]:
            az_tok = azure.get(model, {}).get(direction, {"tokens": 0})["tokens"]
            if direction == "in":
                cached = azure.get(model, {}).get("cached_in", {"tokens": 0})["tokens"]
                az_tok += cached
            known = combined_known.get(model, {"in": 0, "out": 0})[direction]
            residual_tok = max(0, az_tok - known)
            p = PRICES[model].get(direction, PRICES[model].get("in"))
            cost_residual += residual_tok / 1e6 * p
        if cost_residual > 0:
            residual_costs[model] = cost_residual

    # Router-only models: entire Azure cost
    for model in router_only_models:
        if model not in azure:
            continue
        cost = sum(azure[model].get(t, {}).get("cost_jpy", 0) for t in ["in", "cached_in", "out"])
        if cost > 0:
            residual_costs[model] = cost

    total_residual = sum(residual_costs.values())

    print(f"  {'Model':<16} {'Est. Cost (JPY)':>16} {'Share (%)':>10}")
    print(f"  {'─' * 44}")
    for model, cost in sorted(residual_costs.items(), key=lambda x: -x[1]):
        pct = (cost / total_residual * 100) if total_residual > 0 else 0
        print(f"  {model:<16} {cost:>15.2f} {pct:>9.1f}%")
    print(f"  {'─' * 44}")
    print(f"  {'TOTAL':<16} {total_residual:>15.2f} {'100.0%':>10}")

    if "router-fee" in azure:
        print(f"\n  Router fee (separate): {azure['router-fee']['cost_jpy']:.2f} JPY")

    # =========================================================
    # 6. Per-experiment breakdown for Config E
    # =========================================================
    print(f"\n{'=' * 72}")
    print("  Config E Token Summary by Experiment")
    print("=" * 72)
    for label, e_data in [("Exp1", exp1_e), ("Exp2", exp2_e)]:
        print(f"  {label}: input={e_data['in']:,}, output={e_data['out']:,}, calls={e_data['count']}")

    # =========================================================
    # 7. Token-constrained attribution: what portion of the
    #    residual can actually belong to Config E?
    # =========================================================
    print(f"\n{'=' * 72}")
    print("  Token-Constrained Attribution")
    print("  (Config E has exactly {0:,} input + {1:,} output tokens)".format(
        combined_e["in"], combined_e["out"]))
    print("=" * 72)

    # Residual tokens by model (shared models only)
    residual_tokens = {}
    for model in ["gpt-5-chat", "gpt-5-mini", "gpt-4.1"]:
        res = {}
        for direction in ["in", "out"]:
            az_tok = azure.get(model, {}).get(direction, {"tokens": 0})["tokens"]
            if direction == "in":
                cached = azure.get(model, {}).get("cached_in", {"tokens": 0})["tokens"]
                az_tok += cached
            known = combined_known.get(model, {"in": 0, "out": 0})[direction]
            res[direction] = max(0, az_tok - known)
        residual_tokens[model] = res

    # Add router-only models
    for model in router_only_models:
        if model not in azure:
            continue
        in_tok = sum(azure[model].get(t, {}).get("tokens", 0) for t in ["in", "cached_in"])
        out_tok = azure[model].get("out", {}).get("tokens", 0)
        residual_tokens[model] = {"in": in_tok, "out": out_tok}

    total_residual_in = sum(v["in"] for v in residual_tokens.values())
    total_residual_out = sum(v["out"] for v in residual_tokens.values())

    print(f"\n  Total residual tokens:  input={total_residual_in:,}  output={total_residual_out:,}")
    print(f"  Config E known tokens:  input={combined_e['in']:,}  output={combined_e['out']:,}")
    print(f"  Excess (prototype/test): input={total_residual_in - combined_e['in']:,}  "
          f"output={total_residual_out - combined_e['out']:,}")

    # Scale residual proportionally to fit Config E's known token budget
    scale_in = combined_e["in"] / total_residual_in if total_residual_in > 0 else 0
    scale_out = combined_e["out"] / total_residual_out if total_residual_out > 0 else 0

    print(f"\n  Scaling factors: input={scale_in:.3f}, output={scale_out:.3f}")
    print(f"  (i.e., ~{scale_in*100:.1f}% of residual input and "
          f"~{scale_out*100:.1f}% of residual output is Config E)")

    print(f"\n  Estimated Config E model distribution (token-constrained):")
    print(f"  {'Model':<16} {'Input Tok':>12} {'Output Tok':>12} {'Est.Cost':>10} {'Share':>8}")
    print(f"  {'─' * 62}")

    constrained_costs = {}
    for model, res in sorted(residual_tokens.items(), key=lambda x: -(x[1]["in"] + x[1]["out"])):
        est_in = int(res["in"] * scale_in)
        est_out = int(res["out"] * scale_out)
        if est_in == 0 and est_out == 0:
            continue
        p = PRICES.get(model, PRICES["gpt-4.1-mini"])
        cost = (est_in / 1e6 * p["in"]) + (est_out / 1e6 * p["out"])
        constrained_costs[model] = {"in": est_in, "out": est_out, "cost": cost}

    total_constrained_cost = sum(v["cost"] for v in constrained_costs.values())

    for model, v in sorted(constrained_costs.items(), key=lambda x: -x[1]["cost"]):
        pct = (v["cost"] / total_constrained_cost * 100) if total_constrained_cost > 0 else 0
        print(f"  {model:<16} {v['in']:>12,} {v['out']:>12,} {v['cost']:>9.2f} {pct:>7.1f}%")

    print(f"  {'─' * 62}")
    print(f"  {'TOTAL':<16} {combined_e['in']:>12,} {sum(v['out'] for v in constrained_costs.values()):>12,} "
          f"{total_constrained_cost:>9.2f} {'100.0%':>8}")

    # =========================================================
    # 8. Compare approximation strategies
    # =========================================================
    print(f"\n{'=' * 72}")
    print("  Config E: Approximation Strategy Comparison")
    print("=" * 72)

    strategies = {
        "gpt-4.1-mini (current paper)": PRICES["gpt-4.1-mini"],
        "gpt-4o-mini":                  PRICES["gpt-4o-mini"],
        "gpt-5-mini":                   PRICES["gpt-5-mini"],
        "gpt-5-chat":                   PRICES["gpt-5-chat"],
    }

    print(f"\n  {'Strategy':<32} {'Exp2 Cost (JPY)':>16} {'Per-call':>10} {'vs Constrained':>16}")
    print(f"  {'─' * 76}")

    # Constrained estimate for exp2 only
    exp2_constrained = total_constrained_cost * (combined_e["count"] and exp2_e["count"] / combined_e["count"])

    for name, p in strategies.items():
        cost = (exp2_e["in"] / 1e6 * p["in"]) + (exp2_e["out"] / 1e6 * p["out"])
        per_call = cost / exp2_e["count"] if exp2_e["count"] > 0 else 0
        ratio = cost / exp2_constrained if exp2_constrained > 0 else 0
        print(f"  {name:<32} {cost:>15.2f} {per_call:>9.4f} {ratio:>15.2f}x")

    print(f"  {'─' * 76}")
    print(f"  {'Constrained estimate':<32} {exp2_constrained:>15.2f} "
          f"{exp2_constrained/exp2_e['count'] if exp2_e['count'] else 0:>9.4f} {'1.00x':>16}")

    # =========================================================
    # 9. Summary and recommendation
    # =========================================================
    print(f"\n{'=' * 72}")
    print("  Summary")
    print("=" * 72)
    print(f"""
  Azure billing residual (after subtracting known A-D) contains both
  Config E router usage and prototype/development testing.

  Total residual tokens significantly exceed Config E's logged tokens:
    Input:  {total_residual_in:,} residual vs {combined_e['in']:,} Config E ({scale_in*100:.1f}%)
    Output: {total_residual_out:,} residual vs {combined_e['out']:,} Config E ({scale_out*100:.1f}%)

  After proportional scaling to Config E's token budget, the estimated
  model distribution suggests the router predominantly selected
  higher-tier models (gpt-5-chat, gpt-5-mini), not gpt-4.1-mini.

  The gpt-4.1-mini approximation used in the paper is therefore a
  conservative LOWER BOUND on Config E's actual cost.
""")


if __name__ == "__main__":
    main()
