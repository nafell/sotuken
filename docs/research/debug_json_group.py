
import json
from collections import Counter

json_path = "/Users/nagamine/development/sotuken/docs/research/DATA-FINISH/result-full-json-2057.json"

with open(json_path, 'r') as f:
    data = json.load(f)
logs = data.get('trialLogs', [])

# Check trialNumber counts
trial_nums = [l.get('trialNumber') for l in logs]
tn_counts = Counter(trial_nums)
print("Most common trialNumbers:", tn_counts.most_common(5))

# Check inputId counts
input_ids = [l.get('inputId') for l in logs]
iid_counts = Counter(input_ids)
print("Most common inputIds:", iid_counts.most_common(5))

# Check modelConfig values
configs = [l.get('modelConfig') for l in logs]
c_counts = Counter(configs)
print("Model Configs:", c_counts)

# Check content of one group
if trial_nums:
    target = trial_nums[0]
    group = [l for l in logs if l.get('trialNumber') == target]
    print(f"\nGroup for trialNumber {target}:")
    for item in group:
        print(f"Stage: {item.get('stage')}, Config: {item.get('modelConfig')}, Lat: {item.get('latencyMs')}")
