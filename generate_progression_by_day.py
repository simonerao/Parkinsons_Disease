import pandas as pd

# Step 1: Load the dataset
df = pd.read_csv("data/keystroke_data_combined.csv", low_memory=False)

# Step 2: Parse the 'Datetime' column (auto format detection)
df['Datetime'] = pd.to_datetime(df['Datetime'], errors='coerce')

# Step 3: Drop any rows with missing critical data
df = df.dropna(subset=['Datetime', 'HoldTime', 'LatencyTime', 'UserKey', 'Parkinsons'])

# Step 4: Ensure correct types (especially for Parkinsons)
df['Parkinsons'] = df['Parkinsons'].astype(str).str.lower().map({'true': True, 'false': False})
df = df.dropna(subset=['Parkinsons'])  # Drop rows with unclear/missing Parkinsons status

# Step 5: Extract date only from full datetime
df['Date'] = df['Datetime'].dt.date

# Step 6: Group by User, Date, Parkinsons status
agg = (
    df.groupby(['UserKey', 'Date', 'Parkinsons'])
      .agg(
          medianHoldTime=('HoldTime', 'median'),
          medianLatency=('LatencyTime', 'median')
      )
      .reset_index()
)

# Step 7: Save output for use in your D3 visualization
agg.to_csv("data/progression_by_day_with_latency.csv", index=False)

print("✅ File saved: data/progression_by_day_with_latency.csv")
print("📊 Sample output:")
print(agg.head())
