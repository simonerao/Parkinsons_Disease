//VISUALIZATION 1 CODE
const svg = d3.select("#typing-viz");
const width = +svg.attr("width");
const height = +svg.attr("height");

const margin = { top: 20, right: 20, bottom: 40, left: 60 };
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

const chartArea = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const xScale = d3.scaleLinear().range([0, innerWidth]); // Time (s)
const yScale = d3.scaleLinear().range([innerHeight, 0]); // ms

let keyDownTimes = {};
let events = [];
let pdEvents = [];
let startTime = null;
let selectedMetric = "hold";

// Load Parkinson’s sample user data
d3.json("data/sample_pd_user.json").then(data => {
  pdEvents = data.map(d => ({
    timestamp: new Date(d.timestamp),
    holdTime: d.holdTime,
    latency: d.latency
  }));
  updateChart(); // draw initial chart
});

document.getElementById("typing-box").addEventListener("keydown", e => {
  if (!e.repeat) keyDownTimes[e.key] = performance.now();
});

document.getElementById("typing-box").addEventListener("keyup", e => {
  const now = performance.now();
  if (!startTime) startTime = now;
  const timestamp = (now - startTime) / 1000; // seconds since typing started

  const down = keyDownTimes[e.key];
  if (down) {
    const holdTime = now - down;
    const latency = events.length > 0 ? down - events[events.length - 1].raw : 0;

    events.push({
      timeElapsed: timestamp,
      holdTime,
      latency,
      raw: now
    });

    updateChart();
  }
});

document.getElementById("metric-select").addEventListener("change", e => {
  selectedMetric = e.target.value;
  updateChart();
});

function updateChart() {
    chartArea.selectAll("*").remove();
  
    if (events.length === 0 || pdEvents.length === 0) {
      chartArea.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "#888")
        .text("Start typing to see your rhythm vs. Parkinson’s sample.");
      return;
    }
  
    const metricKey = selectedMetric === "hold" ? "holdTime" : "latency";

    // Normalize PD timestamps to timeElapsed
    const pdStart = pdEvents[0].timestamp;
    const pdCleaned = pdEvents.map(d => ({
      timeElapsed: (d.timestamp - pdStart) / 1000,
      holdTime: d.holdTime,
      latency: d.latency
    }));
  
    const userTimeMax = d3.max(events, d => d.timeElapsed);
    const pdSubset = pdCleaned.filter(d => d.timeElapsed <= userTimeMax);
  
    const xMax = userTimeMax;
    const yMax = Math.max(
      d3.max(events, d => d[metricKey]),
      d3.max(pdSubset, d => d[metricKey]),
      300
    );
  
    xScale.domain([0, xMax]);
    yScale.domain([0, yMax * 1.1]);
  
    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(5).tickFormat(d => `${d.toFixed(1)}s`);
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d} ms`);
  
    chartArea.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis);
  
    chartArea.append("g").call(yAxis);
  
    const lineGen = d3.line()
      .x(d => xScale(d.timeElapsed))
      .y(d => yScale(d[metricKey]));
  
    // Draw user line
    chartArea.append("path")
      .datum(events)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", lineGen);
  
    // Draw Parkinson's line (only to current time)
    chartArea.append("path")
      .datum(pdSubset)
      .attr("fill", "none")
      .attr("stroke", "darkred")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4")
      .attr("d", lineGen);
  
    const avg = d3.mean(events, d => d[metricKey]) || 0;
    document.getElementById("typing-stats").textContent =
      `Your Average ${selectedMetric === "hold" ? "Hold Time" : "Latency"}: ${avg.toFixed(1)} ms`;
  }
  
// Reset button functionality
document.getElementById("reset-button").addEventListener("click", () => {
    events = [];
    startTime = null;
    keyDownTimes = {};
    updateChart();
    document.getElementById("typing-box").value = ""; // clear input box
    document.getElementById("typing-stats").textContent = ""; // clear stats
  });

//END VISUALIZATION 1 CODE

//VISUALIZATION 2 CODE
// VISUALIZATION 2 CODE
const svg2 = d3.select("#progression-viz");
const width2 = +svg2.attr("width");
const height2 = +svg2.attr("height");

const margin2 = { top: 20, right: 20, bottom: 40, left: 60 };
const innerWidth2 = width2 - margin2.left - margin2.right;
const innerHeight2 = height2 - margin2.top - margin2.bottom;

const chart2 = svg2.append("g").attr("transform", `translate(${margin2.left},${margin2.top})`);

const xScale2 = d3.scaleTime().range([0, innerWidth2]);
const yScale2 = d3.scaleLinear().range([innerHeight2, 0]);

const colorPD = d3.scaleSequential(d3.interpolateReds);
const colorControl = d3.scaleSequential(d3.interpolateBlues);
const tooltip = d3.select("#tooltip");

let allData;
let currentMetric = "medianHoldTime";

d3.csv("data/progression_by_day_with_latency.csv").then(data => {
  data.forEach(d => {
    d.Date = new Date(d.Date);
    d.medianHoldTime = +d.medianHoldTime;
    d.medianLatency = +d.medianLatency;
    d.Parkinsons = d.Parkinsons.toLowerCase() === "true";
  });

  allData = data;
  renderProgression(currentMetric);
});

document.getElementById("metric-toggle").addEventListener("change", e => {
  currentMetric = e.target.value;
  chart2.selectAll("*").remove();
  renderProgression(currentMetric);
});

function renderProgression(metricKey) {
  console.log("Rendering with metric:", metricKey);

  chart2.selectAll("*").remove();

  const userGroups = d3.group(allData, d => d.UserKey);
  const users = Array.from(userGroups.keys());

  // Set x and y domains
  const xExtent = d3.extent(allData, d => d.Date);
  const yMax = d3.max(allData, d => d[metricKey]);
  if (!xExtent[0] || !xExtent[1] || !yMax) {
    console.error("Invalid axis data:", { xExtent, yMax });
    return;
  }

  xScale2.domain(xExtent);
  yScale2.domain([0, yMax * 1.1]);

  const lineGen = d3.line()
    .x(d => xScale2(d.Date))
    .y(d => yScale2(d[metricKey]));

  let drawn = 0;

  userGroups.forEach((userData, userKey, i) => {
    userData = userData.filter(d => d[metricKey] != null);
    if (userData.length < 2) return;

    userData.sort((a, b) => a.Date - b.Date);

    const pathD = lineGen(userData);
    if (!pathD) {
      console.warn(`Skipping user ${userKey}, invalid path`);
      return;
    }

    const isPD = userData[0].Parkinsons;
    const color = isPD ? "darkred" : "steelblue";

    chart2.append("path")
      .datum(userData)
      .attr("class", "user-line")
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.8)
      .attr("d", pathD);

    drawn++;
  });

  console.log(`Drew ${drawn} user lines`);

  // Axes
  chart2.append("g")
    .attr("transform", `translate(0,${innerHeight2})`)
    .call(d3.axisBottom(xScale2));

  chart2.append("g").call(d3.axisLeft(yScale2));

  // Labels
  chart2.append("text")
    .attr("x", innerWidth2 / 2)
    .attr("y", height2 - 5)
    .attr("text-anchor", "middle")
    .text("Date");

  chart2.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight2 / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text(metricKey === "medianHoldTime" ? "Hold Time (ms)" : "Latency (ms)");

  // Remove existing legend if re-rendering
chart2.selectAll(".legend").remove();

// Legend group
const legend = chart2.append("g")
  .attr("class", "legend")
  .attr("transform", `translate(${innerWidth2 - 150}, 10)`);

// Parkinson's entry
legend.append("rect")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", 15)
  .attr("height", 15)
  .attr("fill", "darkred");

legend.append("text")
  .attr("x", 20)
  .attr("y", 12)
  .text("Parkinson’s")
  .attr("font-size", "12px")
  .attr("alignment-baseline", "middle");

// Control entry
legend.append("rect")
  .attr("x", 0)
  .attr("y", 20)
  .attr("width", 15)
  .attr("height", 15)
  .attr("fill", "steelblue");

legend.append("text")
  .attr("x", 20)
  .attr("y", 32)
  .text("Control")
  .attr("font-size", "12px")
  .attr("alignment-baseline", "middle");

}

// END OF VISUALIZATION 2

// START OF VISUALIZATION 3
d3.csv("data/keystroke_data_combined.csv", d3.autoType).then((data) => {
    createVisualizationThree(data);
});

function createVisualizationThree(data) {
    // Sort by user and datetime
    data.sort((a, b) => d3.ascending(a.UserKey, b.UserKey) || d3.ascending(a.Datetime, b.Datetime));

    // Filter to only rows with transition and LatencyTime
    const filtered = data.filter(d => d.Direction && d.LatencyTime != null && d.Parkinsons != null);

    const grouped = d3.groups(filtered, d => d.Direction, d => d.Parkinsons);

    // Compute boxplot stats
    const boxData = [];
    grouped.forEach(([direction, parkinsonsGroups]) => {
        parkinsonsGroups.forEach(([parkinsons, values]) => {
            const latencies = values.map(d => d.LatencyTime).sort(d3.ascending);
            const q1 = d3.quantile(latencies, 0.25);
            const median = d3.quantile(latencies, 0.5);
            const q3 = d3.quantile(latencies, 0.75);
            const iqr = q3 - q1;
            const lower = q1 - 1.5 * iqr;
            const upper = q3 + 1.5 * iqr;
            const min = d3.min(latencies.filter(d => d >= lower));
            const max = d3.max(latencies.filter(d => d <= upper));
            const parkinsons_bool = parkinsons === 'TRUE' ? true : false;
            
            boxData.push({
                direction,
                parkinsons_bool,
                q1,
                median,
                q3,
                min,
                max,
            });
        });
    });

    // Set up SVG
    const svg = d3.select("#direction-viz"),
        margin = {top: 60, right: 60, bottom: 60, left: 60},
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const directions = ["LL", "RR", "LR", "RL", "SL", "SR", "RS", "LS", "SS"];
    const groups = [false, true]; // Parkinsons: false (no), true (yes)

    const x0 = d3.scaleBand()
        .domain(directions)
        .range([0, width])
        .paddingInner(0.2);

    const x1 = d3.scaleBand()
        .domain(groups)
        .range([0, x0.bandwidth()])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(boxData, d => d.max)])
        .range([height, 0]);

    // X Axis
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x0));

    svg.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "middle")
        .attr("x", margin.left + width / 2)
        .attr("y", height + margin.top + 40)
        .text("Key Transition (i.e. Right Hand → Left Hand, Left Hand → Space)");

    // Y Axis
    g.append("g")
        .call(d3.axisLeft(y));

    svg.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "middle")
        .attr("x", margin.left / 3)
        .attr("y", margin.top + height / 2)
        .attr("transform", `rotate(-90, ${margin.left / 3}, ${margin.top + height / 2})`)
        .text("Latency Time (ms)");

    // Draw boxplots
    g.selectAll(".box")
        .data(boxData)
        .enter()
        .append("rect")
        .attr("class", "box")
        .attr("x", d => x0(d.direction) + x1(d.parkinsons_bool))
        .attr("y", d => y(d.q3))
        .attr("height", d => y(d.q1) - y(d.q3))
        .attr("width", x1.bandwidth())
        .attr("fill", "none")
        .attr("stroke", d => !d.parkinsons_bool ? "firebrick" : "steelblue")
        .attr("stroke-width", 2)
        .attr("rx", 6)
        .attr("ry", 6);

    // Median lines
    g.selectAll(".median")
        .data(boxData)
        .enter()
        .append("line")
        .attr("class", "median")
        .attr("x1", d => x0(d.direction) + x1(d.parkinsons_bool))
        .attr("x2", d => x0(d.direction) + x1(d.parkinsons_bool) + x1.bandwidth())
        .attr("y1", d => y(d.median))
        .attr("y2", d => y(d.median))
        .attr("stroke", d => !d.parkinsons_bool ? "firebrick" : "steelblue")
        .attr("stroke-width", 2);

    // Whiskers
    g.selectAll(".min-line")
        .data(boxData)
        .enter()
        .append("line")
        .attr("x1", d => x0(d.direction) + x1(d.parkinsons_bool) + x1.bandwidth() / 2)
        .attr("x2", d => x0(d.direction) + x1(d.parkinsons_bool) + x1.bandwidth() / 2)
        .attr("y1", d => y(d.min))
        .attr("y2", d => y(d.q1))
        .attr("stroke-width", 2)
        .attr("stroke", d => !d.parkinsons_bool ? "firebrick" : "steelblue");

    g.selectAll(".max-line")
        .data(boxData)
        .enter()
        .append("line")
        .attr("x1", d => x0(d.direction) + x1(d.parkinsons_bool) + x1.bandwidth() / 2)
        .attr("x2", d => x0(d.direction) + x1(d.parkinsons_bool) + x1.bandwidth() / 2)
        .attr("y1", d => y(d.q3))
        .attr("y2", d => y(d.max))
        .attr("stroke-width", 2)
        .attr("stroke", d => !d.parkinsons_bool ? "firebrick" : "steelblue");

    g.selectAll(".min-cap")
        .data(boxData)
        .enter()
        .append("line")
        .attr("class", "min-cap")
        .attr("x1", d => x0(d.direction) + x1(d.parkinsons_bool) + x1.bandwidth() * 0.25)
        .attr("x2", d => x0(d.direction) + x1(d.parkinsons_bool) + x1.bandwidth() * 0.75)
        .attr("y1", d => y(d.min))
        .attr("y2", d => y(d.min))
        .attr("stroke", "steelblue")
        .attr("stroke", d => !d.parkinsons_bool ? "firebrick" : "steelblue");

    g.selectAll(".max-cap")
        .data(boxData)
        .enter()
        .append("line")
        .attr("class", "max-cap")
        .attr("x1", d => x0(d.direction) + x1(d.parkinsons_bool) + x1.bandwidth() * 0.25)
        .attr("x2", d => x0(d.direction) + x1(d.parkinsons_bool) + x1.bandwidth() * 0.75)
        .attr("y1", d => y(d.max))
        .attr("y2", d => y(d.max))
        .attr("stroke", d => !d.parkinsons_bool ? "firebrick" : "steelblue")
        .attr("stroke-width", 2);

    const legend = svg.append("g").attr("transform", `translate(100, 50)`);

    legend.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 20)
        .attr("height", 10)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr('rx', 4)
        .attr('ry', 4);
    legend.append("text")
        .attr("x", 25)
        .attr("y", 10)
        .text("No Parkinson's");

    legend.append("rect")
        .attr("x", 0)
        .attr("y", 20)
        .attr("width", 20)
        .attr("height", 10)
        .attr("fill", "none")
        .attr("stroke", "firebrick")
        .attr('rx', 4)
        .attr('ry', 4);
    legend.append("text")
        .attr("x", 25)
        .attr("y", 30)
        .text("Parkinson's");
};

// END OF VISUALIZATION 3

// START OF VISUALIZATION 4
d3.csv("data/keystroke_data_individuals.csv", d3.autoType).then((data) => {
    createVisualizationFour(data);
});

function createVisualizationFour(data) {
    data.forEach(d => {
        d.ageAtDiagnosis = d.DiagnosisYear - d.BirthYear;
        });

    // Setup
    const margin = { top: 40, right: 40, bottom: 60, left: 70 },
        width = 700 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#scatterplot")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    const xAxis = svg.append("g").attr("transform", `translate(0,${height})`);
    const yAxis = svg.append("g");

    svg.append("text")
    .attr("class", "x-label")
    .attr("x", width / 2)
    .attr("y", height + 45)
    .attr("text-anchor", "middle")
    .text("Age at Diagnosis");

    svg.append("text")
    .attr("class", "y-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle");

    const circles = svg.append("g").attr("class", "circles");

    // Initial render
    update("LatencyTime");

    d3.select("#metric-select-4")
        .on("change", function (event) {
            update(event.target.value);
        });

    function linearRegression(data, xKey, yKey) {
        const xMean = d3.mean(data, d => d[xKey]);
        const yMean = d3.mean(data, d => d[yKey]);

        const numerator = d3.sum(data, d => (d[xKey] - xMean) * (d[yKey] - yMean));
        const denominator = d3.sum(data, d => (d[xKey] - xMean) ** 2);
        const slope = numerator / denominator;
        const intercept = yMean - slope * xMean;

        return { slope, intercept };
    }

    function update(metric) {
        // Update scales
        x.domain(d3.extent(data, d => d.ageAtDiagnosis)).nice();
        y.domain(d3.extent(data, d => d[metric])).nice();

        xAxis.transition().duration(500).call(d3.axisBottom(x));
        yAxis.transition().duration(500).call(d3.axisLeft(y));

        svg.select(".y-label").text(`${metric} (ms)`);

        // DATA JOIN
        const dots = circles.selectAll("circle").data(data, d => d.UserKey + metric);

        // ENTER + UPDATE
        dots.join(
            enter => enter.append("circle")
            .attr("r", 5)
            .attr("fill", "steelblue")
            .attr("cx", d => x(d.ageAtDiagnosis))
            .attr("cy", d => y(d[metric])),
            update => update
            .transition()
            .duration(500)
            .attr("cx", d => x(d.ageAtDiagnosis))
            .attr("cy", d => y(d[metric]))
        );

        // Compute linear regression
        const { slope, intercept } = linearRegression(data, "ageAtDiagnosis", metric);

        // Define the x range
        const xRange = d3.extent(data, d => d.ageAtDiagnosis);

        // Compute corresponding y values
        const linePoints = xRange.map(xVal => ({
            x: xVal,
            y: slope * xVal + intercept
        }));

        // Bind line data (just 2 points) and draw/update line
        const regressionLine = svg.selectAll(".regression-line")
            .data([linePoints]);

        regressionLine.join("line")
            .attr("class", "regression-line")
            .attr("x1", d => x(d[0].x))
            .attr("y1", d => y(d[0].y))
            .attr("x2", d => x(d[1].x))
            .attr("y2", d => y(d[1].y))
            .attr("stroke", "darkorange")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4 2");
    }
}

// END OF VISUALIZATION 4

// START OF VISUALIZATION 5

// END OF VISUALIZATION 5

// START OF VISUALIZATION 6

// END OF VISUALIZATION 6