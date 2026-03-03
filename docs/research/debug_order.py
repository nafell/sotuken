
import pandas as pd

csv_path = "/Users/nagamine/development/sotuken/docs/research/DATA-FINISH/result-summary-csv-2057.csv"
df = pd.read_csv(csv_path)

print("First 20 rows:")
print(df[['model_config', 'stage']].head(20))

print("\nValue counts of stage:")
print(df['stage'].value_counts())

# Check if stages are always in 1, 2, 3 triplets?
stages = df['stage'].tolist()
triplets_ok = True
for i in range(0, len(stages), 3):
    chunk = stages[i:i+3]
    # Check if chunk contains 1, 2, 3 (order might vary strictly speaking, but usually ordered)
    # But usually it is 1, 2, 3.
    # Let's just print the first few chunks
    pass

print("\nChunk verification (first 5 chunks):")
for i in range(0, 15, 3):
    print(f"Chunk {i//3}: {stages[i:i+3]}")
