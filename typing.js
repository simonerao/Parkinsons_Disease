// file_path: typing.js
// Ensure d3 is available (it's loaded via script tag in HTML)

function dropdownTriangle() {
    const dropdownSvgs = d3.selectAll('.dropdown')
        .attr('width', 19)
        .attr('height', 19);

    dropdownSvgs.append("polygon")
        .attr('class', 'dropdown-triangles')
        .attr("points", "5,15 10,6.34 15,15") // upward triangle
        .attr("fill", "#384E77")
        .style("cursor", "pointer")
        .style('stroke-width', 1)
        .style('stroke', 'black');

    d3.selectAll('.directions-title')
        .style('cursor', 'pointer')
        .on('click', function () { toggleDropdown.call(this); }); // fix is here
}

function toggleDropdown() {
    const directions = d3.select(this.nextElementSibling);
    const node = directions.node();
    const isOpen = node.style.height !== "0px" && node.offsetHeight > 0;

    if (isOpen) {
        const currentHeight = node.scrollHeight;

        directions
        .style("height", currentHeight + "px")
        .transition()
        .duration(800)
        .style("height", "0px");
    } else {
        const fullHeight = node.scrollHeight;

        directions
        .style("height", "0px")
        .transition()
        .duration(800)
        .style("height", fullHeight + "px")
        .on("end", () => {
            directions.style("height", "auto");
        });
    }

    // Optional: rotate the triangle
    d3.select(this)
        .selectAll('.dropdown-triangles')
        .attr("transform", isOpen ? null : "rotate(180, 10, 10.67)"); // rotate around center
}

function enableTabInteraction() {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        // Hide all content
        contents.forEach(c => c.classList.add('hidden'));

        // Activate clicked tab
        tab.classList.add('active');
        const target = tab.dataset.tab;
        document.getElementById(target).classList.remove('hidden');
        });
    });
}

enableTabInteraction();
dropdownTriangle();

// --- VISUALIZATION 6: PULSE VISUALIZATION & MEDICATION LINE CHART ---
function initializePulseVisualization() {
  const vizContainer = document.getElementById('pulse-viz-page');
  if (!vizContainer) {
    console.error("Pulse viz container not found");
    return;
  }

  const meds = [
    { name: 'Levadopa', file: 'data/short_levadopa_events.csv', color: '#1f77b4' },
    { name: 'DA', file: 'data/da_events.csv', color: '#ff7f0e' },
    { name: 'MAOB', file: 'data/maob_events.csv', color: '#2ca02c' },
    { name: 'Other', file: 'data/other_events.csv', color: '#d62728' },
    { name: 'No Med', file: 'data/nomed_events.csv', color: '#9467bd' }
  ];

  let currentChartMetric = 'Hold'; // 'Hold' or 'Flight'
  let visibleMedications = new Set(meds.map(m => m.name)); // Initially all visible
  let allMedicationData = []; // To store loaded data for all meds
  let currentPulseMedicationName = ''; // Name of medication active in PULSE animation

  const chartLoader = document.getElementById('chart-loading-overlay');
  const globalLoader = document.getElementById('loader'); // Global page loader
  const chartContainer = d3.select("#medication-line-chart-container");
  const medicationTogglesContainer = d3.select('#chart-medication-toggles');

  // Populate medication toggles
  meds.forEach(med => {
    const label = medicationTogglesContainer.append('label');
    label.append('input')
      .attr('type', 'checkbox')
      .attr('name', 'medToggle')
      .attr('value', med.name)
      .property('checked', true)
      .on('change', function() {
        if (this.checked) {
          visibleMedications.add(med.name);
        } else {
          visibleMedications.delete(med.name);
        }
        renderMedicationLineChart();
      });
    label.append('span').text(med.name);
  });
  
  // Event listener for chart metric toggle (Hold/Flight)
  d3.selectAll('input[name="chartMetric"]').on('change', function() {
    currentChartMetric = this.value;
    renderMedicationLineChart();
  });

  if (chartLoader) chartLoader.style.display = 'flex';

  const dataPromises = meds.map(m =>
    d3.csv(m.file, d => ({
      medication: m.name,
      Hold: +d.Hold,
      Flight: +d.Flight,
      color: m.color
    })).catch(error => {
      console.error(`Error loading ${m.file}:`, error);
      return [];
    })
  );

  Promise.all(dataPromises).then(datasets => {
    allMedicationData = datasets; // Store all loaded datasets
    
    if (chartLoader) chartLoader.style.display = 'none';
    if (globalLoader) globalLoader.style.display = 'none'; // Also hide global loader if it was waiting for this

    if (allMedicationData.every(ds => ds.length === 0)) {
      console.error("No data loaded for pulse visualization or line chart.");
      const pulseInfoBox = document.getElementById('pulse-info-box');
      if (pulseInfoBox) {
        pulseInfoBox.innerHTML = "<p>Error: Could not load data.</p>";
        pulseInfoBox.style.visibility = 'visible';
      }
      if (chartContainer) {
        chartContainer.html("<p>Error: Could not load data for the chart.</p>");
      }
      return;
    }

    renderMedicationLineChart(); // Initial chart render

    // --- Pulse Animation Logic ---
    const button = d3.select('#big-button');
    const pulseHoldTimeEl = document.getElementById('pulse-hold-time');
    const pulseFlightTimeEl = document.getElementById('pulse-flight-time');
    const pulseInfoBoxEl = document.getElementById('pulse-info-box');

    let tempo = +d3.select('#tempo-slider').property('value');
    let currentEventsForAnimation = [];
    let stopSignal = false;
    let animationTimeout = null;

    d3.select('#tempo-slider').on('input', function () {
      tempo = +this.value;
      d3.select('#tempo-value').text(tempo + 'x');
    });

    d3.selectAll('.med-btn').on('click', function () {
      stopSignal = true;
      if (animationTimeout) clearTimeout(animationTimeout);
      d3.select(".pulsing-point").remove(); // Remove any existing pulse point

      d3.selectAll('.med-btn').classed('active', false);
      d3.select(this).classed('active', true);

      currentPulseMedicationName = d3.select(this).attr('data-med');
      const activeDataset = allMedicationData.find(ds => ds.length > 0 && ds[0].medication === currentPulseMedicationName);
      currentEventsForAnimation = activeDataset || [];

      if (currentEventsForAnimation.length === 0) {
        if (pulseInfoBoxEl) pulseInfoBoxEl.style.visibility = 'hidden';
        return;
      }

      stopSignal = false;
      animationTimeout = setTimeout(() => playEvents(0), 100);
    });

    function playEvents(i) {
      if (stopSignal || i >= currentEventsForAnimation.length) {
        d3.select(".pulsing-point").remove(); // Clean up last point
        return;
      }
      const ev = currentEventsForAnimation[i];
      if (!ev || typeof ev[currentChartMetric] !== 'number' || isNaN(ev[currentChartMetric])) {
        animationTimeout = setTimeout(() => playEvents(i + 1), 50);
        return;
      }

      const holdDur = Math.max(10, ev.Hold / tempo);
      const gapDur = Math.max(10, ev.Flight / tempo);

      if (pulseHoldTimeEl) pulseHoldTimeEl.textContent = ev.Hold.toFixed(1);
      if (pulseFlightTimeEl) pulseFlightTimeEl.textContent = ev.Flight.toFixed(1);
      if (pulseInfoBoxEl) pulseInfoBoxEl.style.visibility = 'visible';

      // Show point on chart
      if (visibleMedications.has(currentPulseMedicationName)) {
         showPulsePointOnChart(i, ev[currentChartMetric], ev.color);
      }


      button
        .style('background-color', '#3e7ac0') // Active pulse color
        .transition()
        .duration(holdDur)
        .style('transform', 'scale(0.85)')
        .on('end', () => {
          button
            .style('background-color', '#4A90E2') // Default button color
            .transition()
            .duration(50) // Short transition back to normal
            .style('transform', 'scale(1)')
            .on('end', () => {
              animationTimeout = setTimeout(() => playEvents(i + 1), gapDur);
            });
        });
    }
    // --- End of Pulse Animation Logic ---

  }).catch(err => {
    console.error("Error processing pulse visualization data:", err);
    if (chartLoader) chartLoader.style.display = 'none';
    if (globalLoader) globalLoader.style.display = 'none';
    const pulseInfoBox = document.getElementById('pulse-info-box');
    if (pulseInfoBox) {
      pulseInfoBox.innerHTML = "<p>Error: Could not load data.</p>";
      pulseInfoBox.style.visibility = 'visible';
    }
    if (chartContainer) {
        chartContainer.html("<p>Error: Could not load data for the chart.</p>");
    }
  });

  // --- Medication Line Chart Rendering Function ---
  let chartSvg, xScale, yScale; // Make scales accessible for pulse point

  function renderMedicationLineChart() {
    if (allMedicationData.length === 0) return;

    chartContainer.select("svg").remove(); // Clear previous chart

    const margin = { top: 30, right: 150, bottom: 50, left: 60 };
    const containerWidth = chartContainer.node().getBoundingClientRect().width || 600;
    const containerHeight = 350; 
    
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    chartSvg = chartContainer.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const dataToPlot = allMedicationData.filter(ds => ds.length > 0 && visibleMedications.has(ds[0].medication));

    let maxEvents = 0;
    dataToPlot.forEach(ds => {
      if (ds.length > maxEvents) maxEvents = ds.length;
    });
    const displayMaxEvents = Math.min(maxEvents, 200); 

    let maxYValue = 0;
    dataToPlot.forEach(ds => {
        const slicedDs = ds.slice(0, displayMaxEvents);
        const currentMaxY = d3.max(slicedDs, d => d[currentChartMetric]);
        if (currentMaxY > maxYValue) maxYValue = currentMaxY;
    });
    if (maxYValue === 0 || isNaN(maxYValue)) maxYValue = (currentChartMetric === 'Hold') ? 500 : 1000; // Default max Y

    xScale = d3.scaleLinear()
      .domain([0, displayMaxEvents > 0 ? displayMaxEvents - 1 : 1])
      .range([0, width]);

    yScale = d3.scaleLinear()
      .domain([0, maxYValue])
      .nice()
      .range([height, 0]);

    const line = d3.line()
      .x((d, i) => xScale(i))
      .y(d => yScale(d[currentChartMetric]))
      .defined(d => d[currentChartMetric] != null && !isNaN(d[currentChartMetric]));

    chartSvg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(Math.min(10, displayMaxEvents)))
      .append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("fill", "#000")
        .style("text-anchor", "middle")
        .text("Keystroke Event Index");

    chartSvg.append("g")
      .call(d3.axisLeft(yScale))
      .append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("fill", "#000")
        .style("text-anchor", "middle")
        .text(`${currentChartMetric} Time (ms)`);

    dataToPlot.forEach(medData => {
      if (medData.length > 0) {
        const slicedData = medData.slice(0, displayMaxEvents);
        chartSvg.append("path")
          .datum(slicedData)
          .attr("class", "medication-line")
          .attr("fill", "none")
          .attr("stroke", d => d[0].color)
          .attr("stroke-width", 1.5)
          .attr("d", line);
      }
    });

    const legend = chartSvg.selectAll(".legend")
      .data(meds.filter(m => visibleMedications.has(m.name) && allMedicationData.some(ds => ds.length > 0 && ds[0].medication === m.name)))
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(${width + 20},${i * 20})`);

    legend.append("rect")
      .attr("x", 0)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", d => d.color);

    legend.append("text")
      .attr("x", 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "start")
      .text(d => d.name);
  }
  // --- End of Medication Line Chart Rendering Function ---

  // --- Function to show pulse point on chart ---
  function showPulsePointOnChart(index, value, color) {
    if (!chartSvg || !xScale || !yScale || isNaN(value) || value === null) return;

    d3.select(".pulsing-point").remove(); // Remove previous point

    const cx = xScale(index);
    const cy = yScale(value);

    // Ensure point is within chart boundaries if scales are valid
    if (cx >= 0 && cx <= xScale.range()[1] && cy >= 0 && cy <= yScale.range()[0]) {
        chartSvg.append("circle")
          .attr("class", "pulsing-point")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", 5)
          .attr("fill", color)
          .style("opacity", 1)
          .transition()
            .duration(1000) // Match a reasonable pulse interval or slightly longer
            .style("opacity", 0)
            .remove(); // Optional: remove after fade for cleanliness, or rely on next .remove()
    }
  }
  // --- End of showPulsePointOnChart ---

  console.log('Visualization: Pulse Visualization and Medication Line Chart setup complete!');
}
// --- END VISUALIZATION 6 ---

window.initializePulseVisualization = initializePulseVisualization;