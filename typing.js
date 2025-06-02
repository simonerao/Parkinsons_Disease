// Ensure d3 is available (it's loaded via script tag in HTML)
// import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm'; // This line is not strictly needed if d3 is global

document.addEventListener('DOMContentLoaded', () => {
  initializeTypingTest();
  initializePulseVisualization();
});

// --- VISUALIZATION 1: TYPING TEST ---
function initializeTypingTest() {
  const vizContainer = document.getElementById('viz1-container-typing');
  if (!vizContainer) {
    // console.log("Typing test container not found, skipping initialization.");
    return;
  }

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
  let selectedMetric = "hold"; // Default metric

  // Load Parkinson’s sample user data
  // IMPORTANT: Make sure this file path is correct relative to your HTML file.
  // If your HTML is in the root, and data is in a 'data' subfolder:
  d3.json("data/sample_pd_user.json").then(data => {
    pdEvents = data.map(d => ({
      timestamp: new Date(d.timestamp),
      holdTime: d.holdTime,
      latency: d.latency
    }));
    updateChart(); // draw initial chart
    console.log('Visualization 1 (Typing Test) data loaded and rendered!');
  }).catch(error => {
    console.error("Error loading sample_pd_user.json:", error);
    chartArea.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("fill", "#cc0000")
      .text("Error loading sample data. Please check console.");
  });

  const typingBox = document.getElementById("typing-box");
  if (typingBox) {
    typingBox.addEventListener("keydown", e => {
      if (!e.repeat) keyDownTimes[e.key] = performance.now();
    });

    typingBox.addEventListener("keyup", e => {
      const now = performance.now();
      if (!startTime) startTime = now;
      const timestamp = (now - startTime) / 1000; // seconds since typing started

      const down = keyDownTimes[e.key];
      if (down) {
        const holdTime = now - down;
        const latency = events.length > 0 ? down - events[events.length - 1].rawTime : 0; // use rawTime for latency

        events.push({
          timeElapsed: timestamp,
          holdTime,
          latency,
          rawTime: now // store raw timestamp for latency calculation
        });
        delete keyDownTimes[e.key]; // Clear the key after processing
        updateChart();
      }
    });
  } else {
    console.error("Typing box element not found for Typing Test.");
  }


  const metricSelectTyping = document.getElementById("metric-select-typing");
  if (metricSelectTyping) {
    metricSelectTyping.addEventListener("change", e => {
      selectedMetric = e.target.value;
      updateChart();
    });
  } else {
    console.error("Metric select element not found for Typing Test.");
  }


  function updateChart() {
    chartArea.selectAll("*").remove();

    if (events.length === 0 && pdEvents.length === 0) {
      chartArea.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "#888")
        .text("Start typing to see your rhythm vs. Parkinson’s sample.");
      return;
    }
    if (events.length === 0 && pdEvents.length > 0) {
      chartArea.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "#888")
        .text("Start typing to see your rhythm.");
      // Still draw PD line if available
    }


    const metricKey = selectedMetric === "hold" ? "holdTime" : "latency";

    // Normalize PD timestamps to timeElapsed relative to its own start
    let pdCleaned = [];
    if (pdEvents.length > 0) {
      const pdStartTime = pdEvents[0].timestamp;
      pdCleaned = pdEvents.map(d => ({
        timeElapsed: (d.timestamp - pdStartTime) / 1000,
        holdTime: d.holdTime,
        latency: d.latency
      }));
    }

    const userTimeMax = events.length > 0 ? d3.max(events, d => d.timeElapsed) : 0;
    const pdTimeMax = pdCleaned.length > 0 ? d3.max(pdCleaned, d => d.timeElapsed) : 0;

    // Determine a reasonable xMax for the chart based on available data
    let xMaxDomain = Math.max(userTimeMax, 10); // Default to at least 10s or current user max
    if (events.length === 0 && pdCleaned.length > 0) { // If only PD data, use its max time
      xMaxDomain = Math.max(pdTimeMax, 10);
    }

    // Filter PD data to the current xMaxDomain if user is typing, or show all PD data if user hasn't typed
    const pdSubset = pdCleaned.filter(d => d.timeElapsed <= xMaxDomain);

    const yMaxUser = events.length > 0 ? d3.max(events, d => d[metricKey]) : 0;
    const yMaxPD = pdSubset.length > 0 ? d3.max(pdSubset, d => d[metricKey]) : 0;
    const yOverallMax = Math.max(yMaxUser, yMaxPD, 200); // Ensure a minimum y-axis height, e.g., 200ms

    xScale.domain([0, xMaxDomain]);
    yScale.domain([0, yOverallMax * 1.1]); // Add a little padding to y-axis

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(Math.min(10, Math.floor(xMaxDomain))).tickFormat(d => `${d.toFixed(1)}s`);
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d => `${Math.round(d)} ms`);

    chartArea.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", "10px");


    chartArea.append("g").call(yAxis)
      .selectAll("text")
      .style("font-size", "10px");


    const lineGen = d3.line()
      .x(d => xScale(d.timeElapsed))
      .y(d => yScale(d[metricKey]))
      .defined(d => d[metricKey] != null && !isNaN(d[metricKey])); // Handle null/NaN data points


    // Draw user line if data exists
    if (events.length > 0) {
      chartArea.append("path")
        .datum(events)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", lineGen);
    }

    // Draw Parkinson's line if data exists
    if (pdSubset.length > 0) {
      chartArea.append("path")
        .datum(pdSubset)
        .attr("fill", "none")
        .attr("stroke", "darkred")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4")
        .attr("d", lineGen);
    }

    const avgUser = events.length > 0 ? d3.mean(events, d => d[metricKey]) : 0;
    const statsText = document.getElementById("typing-stats");
    if (statsText) {
      if (events.length > 0) {
        statsText.textContent = `Your Average ${selectedMetric === "hold" ? "Hold Time" : "Latency"}: ${avgUser.toFixed(1)} ms`;
      } else {
        statsText.textContent = ""; // Clear if no user events
      }
    }
  }

  const resetButton = document.getElementById("reset-button");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      events = [];
      startTime = null;
      keyDownTimes = {};
      if (typingBox) typingBox.value = ""; // clear input box
      const statsText = document.getElementById("typing-stats");
      if (statsText) statsText.textContent = ""; // clear stats
      updateChart(); // Redraw chart (will show initial message)
      if (typingBox) typingBox.focus();
    });
  } else {
    console.error("Reset button not found for Typing Test.");
  }
}
// --- END VISUALIZATION 1 ---


// --- VISUALIZATION 6: PULSE VISUALIZATION ---
function initializePulseVisualization() {
  const vizContainer = document.getElementById('pulse-viz-page');
  if (!vizContainer) {
    // console.log("Pulse viz container not found, skipping initialization.");
    return;
  }

  const meds = [
    { name: 'Levadopa', file: 'data/short_levadopa_events.csv' },
    { name: 'DA', file: 'data/da_events.csv' },
    { name: 'MAOB', file: 'data/maob_events.csv' },
    { name: 'Other', file: 'data/other_events.csv' },
    { name: 'No Med', file: 'data/nomed_events.csv' }
  ];

  const dataPromises = meds.map(m =>
    d3.csv(m.file, d => ({
      medication: m.name,
      Hold: +d.Hold,
      Flight: +d.Flight
    })).catch(error => {
      console.error(`Error loading ${m.file}:`, error);
      return []; // Return empty array on error for this file
    })
  );

  Promise.all(dataPromises).then(datasets => {
    const data = datasets.flat();
    if (data.length === 0) {
      console.error("No data loaded for pulse visualization. Check CSV paths and files.");
      const pulseInfoBox = document.getElementById('pulse-info-box');
      if (pulseInfoBox) {
        pulseInfoBox.innerHTML = "<p>Error: Could not load pulse data.</p>";
        pulseInfoBox.style.visibility = 'visible';
      }
      return;
    }

    const button = d3.select('#big-button');
    const pulseHoldTimeEl = document.getElementById('pulse-hold-time');
    const pulseFlightTimeEl = document.getElementById('pulse-flight-time');
    const pulseInfoBoxEl = document.getElementById('pulse-info-box');

    let tempo = +d3.select('#tempo-slider').property('value');
    let currentEvents = [];
    let stopSignal = false;
    let animationTimeout = null; // To store timeout ID

    d3.select('#tempo-slider').on('input', function () {
      tempo = +this.value;
      d3.select('#tempo-value').text(tempo + 'x');
    });

    d3.selectAll('.med-btn').on('click', function () {
      stopSignal = true; // Signal to stop current animation
      if (animationTimeout) clearTimeout(animationTimeout); // Clear pending timeout

      d3.selectAll('.med-btn').classed('active', false);
      d3.select(this).classed('active', true);

      const medName = d3.select(this).attr('data-med');
      currentEvents = data.filter(d => d.medication === medName);

      if (currentEvents.length === 0) {
        console.warn(`No events found for medication: ${medName}`);
        if (pulseInfoBoxEl) pulseInfoBoxEl.style.visibility = 'hidden';
        return;
      }

      stopSignal = false; // Reset stop signal for new animation
      // Start playing events after a short delay to ensure stopSignal is processed
      animationTimeout = setTimeout(() => playEvents(0), 100);
    });

    function playEvents(i) {
      if (stopSignal || i >= currentEvents.length) {
        // Animation stopped or finished
        if (!stopSignal && pulseInfoBoxEl) { // If finished normally
          // Optionally, clear the info or leave the last one
          // pulseInfoBoxEl.style.visibility = 'hidden'; 
        }
        return;
      }
      const ev = currentEvents[i];
      if (!ev || typeof ev.Hold !== 'number' || typeof ev.Flight !== 'number') {
        console.warn("Skipping invalid event:", ev);
        animationTimeout = setTimeout(() => playEvents(i + 1), 50); // Skip to next quickly
        return;
      }

      const holdDur = ev.Hold / tempo;
      const gapDur = ev.Flight / tempo;

      if (pulseHoldTimeEl) pulseHoldTimeEl.textContent = ev.Hold.toFixed(1);
      if (pulseFlightTimeEl) pulseFlightTimeEl.textContent = ev.Flight.toFixed(1);
      if (pulseInfoBoxEl) pulseInfoBoxEl.style.visibility = 'visible';

      button
        .transition()
        .duration(holdDur > 0 ? holdDur : 10) // Ensure minimum duration for transition
        .style('transform', 'scale(0.85)')
        .on('end', () => {
          button
            .transition()
            .duration(50) // Quick return to normal scale
            .style('transform', 'scale(1)')
            .on('end', () => {
              // Schedule next event
              animationTimeout = setTimeout(() => playEvents(i + 1), gapDur > 0 ? gapDur : 10);
            });
        });
    }
    console.log('Visualization 6 (Pulse) initialized!');

    // show loading screen while website is loading
    const loader = document.getElementById('loader');
    loader.style.display = 'none';
  }).catch(err => {
    console.error("Error processing pulse visualization data:", err);
    const pulseInfoBox = document.getElementById('pulse-info-box');
    if (pulseInfoBox) {
      pulseInfoBox.innerHTML = "<p>Error: Could not load pulse data.</p>";
      pulseInfoBox.style.visibility = 'visible';
    }
  });
}
// --- END VISUALIZATION 6 ---