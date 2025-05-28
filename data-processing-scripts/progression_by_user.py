import pandas as pd

# Load your full dataset
df = pd.read_csv("data/keystroke_data_combined.csv")

# Parse your custom datetime format
df['Datetime'] = pd.to_datetime(df['Datetime'], format='%m/%d/%Y %I:%M:%S %p', errors='coerce')

# Drop rows with missing values
df = df.dropna(subset=['Datetime', 'HoldTime', 'UserKey', 'Parkinsons'])

# Round to date only (per day)
df['Date'] = df['Datetime'].dt.date

# Group by user and date
agg = (
    df.groupby(['UserKey', 'Date', 'Parkinsons'])
      .agg(medianHoldTime=('HoldTime', 'median'))
      .reset_index()
)

# Save for D3
agg.to_csv("data/progression_by_day.csv", index=False)
print("✅ Saved: data/progression_by_day.csv")
