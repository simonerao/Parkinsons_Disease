import pandas as pd
import json

# Load the dataset
df = pd.read_csv("data/keystroke_data_combined.csv")

# Parse datetime column
df['Datetime'] = pd.to_datetime(df['Datetime'], errors='coerce')

# Filter: Parkinson's only, with timing info
pd_df = df[
    (df['Parkinsons'].astype(str).str.upper() == 'TRUE') &
    df['HoldTime'].notna() &
    df['LatencyTime'].notna() &
    df['Datetime'].notna()
]

# Select one Parkinson’s user (or random)
sample_user_id = pd_df['UserKey'].iloc[0]
user_df = pd_df[pd_df['UserKey'] == sample_user_id]

# Sort and clean
user_df = user_df.sort_values('Datetime')[['Datetime', 'HoldTime', 'LatencyTime']]

# Convert to list of dicts
output = []
for _, row in user_df.iterrows():
    output.append({
        "timestamp": row['Datetime'].isoformat(),
        "holdTime": round(row['HoldTime'], 1),
        "latency": round(row['LatencyTime'], 1)
    })

# Save as JSON
with open("data/sample_pd_user.json", "w") as f:
    json.dump(output, f, indent=2)

print(f"✅ Saved {len(output)} rows for PD user {sample_user_id} to data/sample_pd_user.json")
