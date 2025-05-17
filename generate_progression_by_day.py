import pandas as pd

# Load your full keystroke dataset
df = pd.read_csv("data/keystroke_data_combined.csv")

# Convert the custom datetime format (like 3/1/2017 8:45:42 AM)
df['Datetime'] = pd.to_datetime(df['Datetime'], format='%m/%d/%Y %I:%M:%S %p', errors='coerce')

# Drop rows that are missing necessary columns
df = df.dropna(subset=['Datetime', 'HoldTime', 'LatencyTime', 'UserKey', 'Parkinsons'])

# Extract just the date for daily grouping
df['Date'] = df['Datetime'].dt.date

# Group by User, Date, and Parkinsons status
agg = (
    df.groupby(['UserKey', 'Date', 'Parkinsons'])
      .agg(
          medianHoldTime=('HoldTime', 'median'),
          medianLatency=('LatencyTime', 'median')
      )
      .reset_index()
)

# Save it to your data folder
agg.to_csv("data/progression_by_day_with_latency.csv", index=False)

print("✅ progression_by_day_with_latency.csv has been generated!")
