
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import os
import json

# Output directory
OUTPUT_DIR = "/Users/nagamine/development/sotuken/docs/research/figures"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 1. Load Data from JSON
json_path = "/Users/nagamine/development/sotuken/docs/research/DATA-FINISH/result-full-json-2057.json"

with open(json_path, 'r') as f:
    item = json.load(f)

trial_logs = item.get('trialLogs', [])

# 2. Group by trialNumber
trials = {}
for log in trial_logs:
    t_num = log.get('trialNumber')
    if t_num not in trials:
        trials[t_num] = []
    trials[t_num].append(log)

# 3. Precise Cost Calculation (Based on server/src/types/experiment-trial.types.ts)
# JPY per 1M tokens (Dec 2025 Azure OpenAI)
PRICES = {
    'gpt-5-chat':   {'in': 195.20, 'out': 1561.55},
    'gpt-5-mini':   {'in': 39.04,  'out': 312.31},
    'gpt-4.1':      {'in': 312.31, 'out': 1249.24},
    'gpt-4.1-mini': {'in': 62.47,  'out': 249.85},
    'model-router': {'in': 62.47,  'out': 249.85},
}

MODEL_MAP = {
    'A': ['gpt-5-chat', 'gpt-5-chat', 'gpt-5-chat'],
    'B': ['gpt-5-mini', 'gpt-5-mini', 'gpt-5-mini'],
    'C': ['gpt-5-chat', 'gpt-4.1', 'gpt-4.1'],
    'D': ['gpt-5-chat', 'gpt-5-mini', 'gpt-5-mini'],
    'E': ['model-router', 'model-router', 'model-router'],
}

def get_model_id(config_id, stage_num):
    # stage_num is 1, 2, 3
    stages = MODEL_MAP.get(config_id, MODEL_MAP['E'])
    idx = stage_num - 1
    if 0 <= idx < len(stages):
        return stages[idx]
    return 'model-router'

# Process trial records
trial_records_v2 = []

for t_num, group in trials.items():
    if not group:
        continue
    
    config_id = group[0].get('modelConfig')
    
    total_lat = 0
    total_cost = 0
    total_in = 0
    total_out = 0
    
    dsl_valid = True
    
    for log in group:
        stage = log.get('stage')
        lat = log.get('latencyMs', 0)
        in_tok = log.get('inputTokens', 0)
        out_tok = log.get('outputTokens', 0)
        
        # Cost Calc
        mid = get_model_id(config_id, stage)
        p = PRICES.get(mid, PRICES['model-router'])
        cost = (in_tok / 1_000_000 * p['in']) + (out_tok / 1_000_000 * p['out'])
        
        total_lat += lat
        total_cost += cost
        total_in += in_tok
        total_out += out_tok
        
        if log.get('dslErrors'):
            dsl_valid = False
            
    trial_records_v2.append({
        'trial_number': t_num,
        'model_config': config_id,
        'latency_ms': total_lat,
        'estimated_cost': total_cost, # Exact calculation
        'input_tokens': total_in,
        'output_tokens': total_out,
        'vr_success': dsl_valid
    })

df_trials = pd.DataFrame(trial_records_v2)

# Print Medians
medians = df_trials.groupby('model_config')[['latency_ms', 'estimated_cost']].median()
print("\n=== MEDIANS (Exact Pricing) ===")
print(medians)
print("============================================\n")

# --- PLOTTING ---
configs = ['A', 'B', 'C', 'D', 'E']
colors = ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5']

# 1. Layer 1 VR
vr_rates = []
for c in configs:
    subset = df_trials[df_trials['model_config'] == c]
    if len(subset) > 0:
        rate = (subset['vr_success'].sum() / len(subset)) * 100
    else:
        rate = 0
    vr_rates.append(rate)

plt.figure(figsize=(8, 5))
bars = plt.bar(configs, vr_rates, color=colors)
plt.ylim(0, 115)
plt.title("Layer 1: VR (DSL Validity Rate) by Configuration", fontsize=14)
plt.ylabel("Success Rate (%)", fontsize=12)
plt.xlabel("Model Configuration", fontsize=12)
plt.grid(axis='y', linestyle='--', alpha=0.7)
for bar in bars:
    h = bar.get_height()
    plt.text(bar.get_x() + bar.get_width()/2., h + 1, f'{h:.1f}%', 
             ha='center', va='bottom', fontweight='bold')
plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/layer1_vr.png")
plt.close()

# 2. Layer 1+
labels = configs
pres = [80.0, 77.8, 80.0, 79.6, 80.0]
binding = [60.0, 66.7, 60.0, 59.2, 60.0]
pattern = [80.0, 77.8, 80.0, 79.6, 80.0]

x = np.arange(len(labels))
width = 0.25
plt.figure(figsize=(10, 6))
plt.bar(x - width, pres, width, label='REQ_W2WR_PRES')
plt.bar(x, binding, width, label='REQ_BINDING_COUNT_OK')
plt.bar(x + width, pattern, width, label='REQ_PATTERN_MATCH')
plt.ylim(0, 100)
plt.ylabel('Conformance Rate (%)')
plt.title('Layer 1+: Specification Conformance')
plt.xticks(x, labels)
plt.legend(loc='lower right')
plt.grid(axis='y', linestyle='--', alpha=0.5)
plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/layer1plus_grouped.png")
plt.close()

# 3. Layer 2 Scatter
lat_meds = []
cost_meds = []
for c in configs:
    subset = df_trials[df_trials['model_config'] == c]
    lat_meds.append(subset['latency_ms'].median())
    cost_meds.append(subset['estimated_cost'].median())

plt.figure(figsize=(8, 6))
plt.scatter(lat_meds, cost_meds, s=300, c=colors, edgecolors='black', zorder=2)
for i, txt in enumerate(configs):
    plt.annotate(txt, (lat_meds[i]+(max(lat_meds)*0.02), cost_meds[i]), fontsize=12, fontweight='bold')
plt.title("Layer 2: Latency vs Cost Trade-off (Medians)", fontsize=14)
plt.xlabel("Latency (ms)")
plt.ylabel("Cost (JPY)")
plt.grid(True, linestyle='--', alpha=0.7, zorder=1)
plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/layer2_scatter.png")
plt.close()

# 4. Layer 2 Boxplots
data_lat = [df_trials[df_trials['model_config'] == c]['latency_ms'].values for c in configs]
plt.figure(figsize=(8, 6))
plt.boxplot(data_lat, tick_labels=configs, patch_artist=True, 
            boxprops=dict(facecolor='#D9EAD3'))
plt.title("Layer 2: Latency Distribution", fontsize=14)
plt.ylabel("Latency (ms)", fontsize=12)
plt.xlabel("Model Configuration", fontsize=12)
plt.grid(axis='y', linestyle='--', alpha=0.7)
plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/layer2_dist_lat.png")
plt.close()

data_cost = [df_trials[df_trials['model_config'] == c]['estimated_cost'].values for c in configs]
plt.figure(figsize=(8, 6))
plt.boxplot(data_cost, tick_labels=configs, patch_artist=True, 
            boxprops=dict(facecolor='#F4CCCC'))
plt.title("Layer 2: Estimated Cost Distribution", fontsize=14)
plt.ylabel("Cost (JPY)", fontsize=12)
plt.xlabel("Model Configuration", fontsize=12)
plt.grid(axis='y', linestyle='--', alpha=0.7)
plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/layer2_dist_cost.png")
plt.close()

# ------------------------------------------------------------------
# NEW: Histograms for Statistical Hypothesis Testing Justification
# ------------------------------------------------------------------

# Function to plot histograms for a metric
def plot_histograms(metric_col, metric_name, unit, filename, x_limit=None):
    fig, axes = plt.subplots(1, 5, figsize=(20, 4), sharey=True)
    fig.suptitle(f"{metric_name} Distribution by Configuration", fontsize=16)
    
    # Determine common bin range for comparability
    all_vals = df_trials[metric_col].values
    min_val = min(all_vals)
    max_val = max(all_vals)
    bins = np.linspace(min_val, max_val, 20)
    
    for i, config in enumerate(configs):
        subset = df_trials[df_trials['model_config'] == config][metric_col]
        
        ax = axes[i]
        ax.hist(subset, bins=bins, color=colors[i], alpha=0.7, edgecolor='black')
        ax.set_title(f"Config {config}", fontweight='bold')
        ax.set_xlabel(f"{metric_name} ({unit})")
        
        # Add basic stats
        mu = subset.mean()
        med = subset.median()
        sigma = subset.std()
        
        stats_text = f"Mean: {mu:.1f}\nMed: {med:.1f}\nStd: {sigma:.1f}"
        ax.text(0.95, 0.95, stats_text, transform=ax.transAxes, 
                fontsize=10, verticalalignment='top', horizontalalignment='right',
                bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
        
        if x_limit:
            ax.set_xlim(0, x_limit)
        ax.grid(axis='y', linestyle=':', alpha=0.5)

    axes[0].set_ylabel("Frequency")
    plt.tight_layout(rect=[0, 0.03, 1, 0.95])
    plt.savefig(f"{OUTPUT_DIR}/{filename}")
    plt.close()

# Latency Histogram
plot_histograms('latency_ms', 'Latency', 'ms', 'layer2_hist_latency.png')

# Cost Histogram
plot_histograms('estimated_cost', 'Cost', 'JPY', 'layer2_hist_cost.png')


print("All charts + Histograms generated successfully.")
