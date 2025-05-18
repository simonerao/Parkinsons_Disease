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
    console.log("Loaded data:", data.slice(0, 5));
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
    const userGroups = d3.group(allData, d => d.UserKey);
    const users = Array.from(userGroups.keys());
  
    xScale2.domain(d3.extent(allData, d => d.Date));
    const maxY = d3.max(allData, d => d[metricKey]) || 300;
    yScale2.domain([0, maxY * 1.1]);
  
    const lineGen = d3.line()
      .x(d => xScale2(d.Date))
      .y(d => yScale2(d[metricKey]));
  
    userGroups.forEach((userData, userKey, i) => {
      if (userData.length < 2) return;
      userData.sort((a, b) => a.Date - b.Date);
      const isPD = userData[0].Parkinsons;
      const color = isPD ? colorPD(i / users.length) : colorControl(i / users.length);
  
      chart2.append("path")
        .datum(userData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 1.5)
        .attr("class", "user-line")
        .attr("stroke-opacity", 1)
        .attr("d", lineGen);
    });
  
    // Draw dots for debugging
    chart2.selectAll(".dot")
      .data(allData)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale2(d.Date))
      .attr("cy", d => yScale2(d[metricKey]))
      .attr("r", 2)
      .attr("fill", d => d.Parkinsons ? "red" : "blue")
      .attr("opacity", 0.6);
  
    chart2.append("g")
      .attr("transform", `translate(0,${innerHeight2})`)
      .call(d3.axisBottom(xScale2));
  
    chart2.append("g").call(d3.axisLeft(yScale2));
  
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
  }
  

chart2.selectAll(".dot")
  .data(allData)
  .enter()
  .append("circle")
  .attr("cx", d => xScale2(d.Date))
  .attr("cy", d => yScale2(d[metricKey]))
  .attr("r", 3)
  .attr("fill", d => d.Parkinsons ? "red" : "blue");


