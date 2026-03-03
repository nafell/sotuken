
import json

json_path = "/Users/nagamine/development/sotuken/docs/research/DATA-FINISH/result-full-json-2057.json"

with open(json_path, 'r') as f:
    data = json.load(f)

logs = data.get('trialLogs', [])
print(f"Number of logs: {len(logs)}")

if len(logs) > 0:
    first_log = logs[0]
    print("Keys in first log:", first_log.keys())
    # Check identifying info
    print("Model Config:", first_log.get('modelConfigId'))
    print("Case ID:", first_log.get('caseId'))
    
    # Check stages
    if 'stages' in first_log:
        print("Number of stages:", len(first_log['stages']))
        print("First stage keys:", first_log['stages'][0].keys())
        # Check latency in stage
        print("Stage 1 Latency:", first_log['stages'][0].get('latencyMs'))
