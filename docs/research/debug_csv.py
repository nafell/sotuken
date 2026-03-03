
import pandas as pd

csv_path = "/Users/nagamine/development/sotuken/docs/research/DATA-FINISH/result-summary-csv-2057.csv"
try:
    df = pd.read_csv(csv_path)
    print("Columns:", df.columns.tolist())
    if 'model_config' in df.columns:
        print("Unique model_config values:", df['model_config'].unique())
        print("Value counts:\n", df['model_config'].value_counts())
    else:
        print("model_config column NOT found.")
        
    if 'experiment_id' in df.columns:
        print("Number of unique experiment_ids:", df['experiment_id'].nunique())
        # Check rows per experiment_id
        counts = df['experiment_id'].value_counts()
        print("Most common experiment_ids count:\n", counts.head())
        
except Exception as e:
    print("Error reading CSV:", e)
