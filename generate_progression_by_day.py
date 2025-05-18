import pandas as pd

# Step 1: Load your keystroke dataset
df = pd.read_csv("data/keystroke_data_combined.csv", low_memory=False)

# Step 2: Parse datetime flexibly (let pandas auto-infer the format)
df['Datetime'] = pd.to_datetime(df['Datetime'], errors='coerce', infer_datetime_format=True)

# Step 3: Drop rows missing required values
df = df.dropna(subset=['Datetime', 'HoldTime', 'LatencyTime', 'UserKey', 'Parkinsons'])

# Step 4: Convert date to just the day
df['Date'] = df['Datetime'].dt.date

# Step 5: Group by User, Date, Parkinsons, and calculate medians
agg = (
    df.groupby(['UserKey', 'Date', 'Parkinsons'])
      .agg(
          medianHoldTime=('HoldTime', 'median'),
          medianLatency=('LatencyTime', 'median')
      )
      .reset_index()
)

# Step 6: Save the output for your D3.js visualization
agg.to_csv("data/progression_by_day_with_latency.csv", index=False)

print("✅ File saved: data/progression_by_day_with_latency.csv")
print("📊 Preview:")
print(agg.head())
