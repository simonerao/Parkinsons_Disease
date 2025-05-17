import pandas as pd
import json

# Load the CSV file
df = pd.read_csv("data/keystroke_data_combined.csv")

# Make sure these columns exist and are clean
df['Parkinsons'] = df['Parkinsons'].astype(str).str.upper().str.strip()
df = df[df['HoldTime'].notna() & df['LatencyTime'].notna()]

# Split into PD and control groups
control = df[df['Parkinsons'] == 'FALSE']
parkinsons = df[df['Parkinsons'] == 'TRUE']

# Compute mean and std for both metrics
def stats(group, col):
    return {
        "mean": round(group[col].mean(), 1),
        "std": round(group[col].std(), 1)
    }

ranges = {
    "hold": {
        "control": stats(control, "HoldTime"),
        "parkinsons": stats(parkinsons, "HoldTime")
    },
    "latency": {
        "control": stats(control, "LatencyTime"),
        "parkinsons": stats(parkinsons, "LatencyTime")
    }
}

# Save as JSON
with open("data/keystroke_ranges.json", "w") as f:
    json.dump(ranges, f, indent=2)

print("✅ JSON file saved to data/keystroke_ranges.json")
