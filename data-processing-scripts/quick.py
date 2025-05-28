import csv

input_file = 'data/levadopa_events.csv'    # Replace with your input CSV filename
output_file = 'data/short_levadopa_events.csv'  # Replace with your output CSV filename
max_lines = 300000

with open(input_file, 'r', newline='', encoding='utf-8') as infile, \
     open(output_file, 'w', newline='', encoding='utf-8') as outfile:
    
    reader = csv.reader(infile)
    writer = csv.writer(outfile)
    
    for i, row in enumerate(reader):
        if i >= max_lines:
            break
        writer.writerow(row)

print(f"Copied first {max_lines} lines from {input_file} to {output_file}.")
