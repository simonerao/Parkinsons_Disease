// file_path: typing.js
// Ensure d3 is available (it's loaded via script tag in HTML)

// Provided medication descriptions (ensure this is the only definition)
const medDescriptions = {
    "Levadopa": "The most common and effective drug for Parkinson's. Levodopa converts to dopamine in the brain, helping to improve motor control, reduce tremors, stiffness, and slowness. This can lead to smoother and more consistent typing patterns.",
    "DA": "Dopamine Agonists mimic the effects of dopamine in the brain by stimulating dopamine receptors. They help manage motor symptoms and can improve movement fluidity, which may be reflected in typing rhythm.",
    "MAOB": "MAO-B Inhibitors help prevent the breakdown of dopamine in the brain, making it last longer. This can offer mild symptom relief or help smooth out Levodopa's effects, potentially improving typing steadiness.",
    "Other": "This category represents various other medications used to manage Parkinson's symptoms. They work through different mechanisms to help improve motor function, and their impact on typing can vary.",
    "No Med": "This represents individuals with Parkinson's not currently taking medication. It serves as a baseline to observe how motor symptoms might directly affect typing patterns without pharmacological intervention."
};

function dropdownTriangle() {
    const dropdownSvgs = d3.selectAll('.dropdown') // Selects all SVGs with class dropdown
        .attr('width', 19)
        .attr('height', 19);

    // Appends a polygon to EACH selected SVG
    dropdownSvgs.append("polygon")
        .attr('class', 'dropdown-arrow-polygon') // Added a class for easier selection if needed
        .attr("points", "5,6.34 10,15 15,6.34") // downward triangle
        .attr("fill", "#384E77")
        // .style("cursor", "pointer") // Cursor is on the parent .directions-title
        .style('stroke-width', 1)
        .style('stroke', 'black');
        // Initial transform is "rotate(0)" by default (points down)

    d3.selectAll('.directions-title')
        .style('cursor', 'pointer') // Set cursor on the entire title for better UX
        .on('click', function () { toggleDropdown.call(this); }); // 'this' will be the .directions-title
}

function toggleDropdown() {
    const directionsDiv = d3.select(this.nextElementSibling); // The div with class 'directions'
    const node = directionsDiv.node();
    // Check if it's currently open (height is not 0px and offsetHeight is greater than 0)
    const isOpen = node.style.height !== "0px" && node.style.height !== "" && node.offsetHeight > 0;

    if (isOpen) { // If currently open, we are closing it
        const currentHeight = node.scrollHeight;
        directionsDiv
            .style("height", currentHeight + "px") // Set to current scrollHeight to start transition from
            .transition()
            .duration(800)
            .style("height", "0px"); // Transition to 0px
    } else { // If currently closed, we are opening it
        const fullHeight = node.scrollHeight;
        directionsDiv
            .style("height", "0px") // Start from 0px
            .transition()
            .duration(800)
            .style("height", fullHeight + "px") // Transition to full scrollHeight
            .on("end", () => {
                // Set to auto after transition to accommodate dynamic content,
                // but only if it was actually opened to fullHeight (not interrupted)
                if (parseFloat(directionsDiv.style("height")) === fullHeight) {
                    directionsDiv.style("height", "auto");
                }
            });
    }

    // Select ALL svg polygons within the clicked .directions-title element
    // .dropdown is the class of the SVG, .dropdown-arrow-polygon is the class of the polygon
    const triangles = d3.select(this).selectAll('svg.dropdown polygon.dropdown-arrow-polygon');
    
    if (!triangles.empty()) {
        // Determine the target transform based on the 'isOpen' state (state *before* this click)
        // If it was open (isOpen is true), it's now closing, so rotate to 0 degrees (points down).
        // If it was closed (isOpen is false), it's now opening, so rotate to 180 degrees (points up).
        const targetTransform = isOpen ? "rotate(0, 10, 10.5)" : "rotate(180, 10, 10.5)";
        // Using 10, 10.5 as the approximate center of the 19x19 SVG for rotation

        triangles.transition() // Apply transition to all selected triangles
            .duration(800)
            .attr("transform", targetTransform);
    }
}

dropdownTriangle();

// --- VISUALIZATION 6: PULSE VISUALIZATION & MEDICATION LINE CHART ---
function initializePulseVisualization() {
  console.log("initializePulseVisualization called");
  const vizContainer = document.getElementById('pulse-viz-page');
  if (!vizContainer) {
    console.error("Pulse viz container not found");
    return;
  }

  console.log("Attempting to set tooltips for med buttons...");
  const medButtons = d3.selectAll('#pulse-viz-page .med-btn');
  console.log("Found medButtons selection:", medButtons);
  console.log("Number of medButtons found:", medButtons.size());

  if (medButtons.empty()) {
      console.warn("No medication buttons found with selector '#pulse-viz-page .med-btn'");
  }

  medButtons.each(function(d, i) {
      const buttonNode = this;
      const medName = buttonNode.dataset.med;

      if (medDescriptions[medName]) {
          buttonNode.setAttribute('title', medDescriptions[medName]);
      } else {
          console.warn(`No description found in medDescriptions for medName: "${medName}"`);
          if (buttonNode.hasAttribute('title')) {
              console.log(`Button "${medName}" already has an HTML title: "${buttonNode.getAttribute('title').substring(0,30)}..."`);
          } else {
              console.warn(`Button "${medName}" has no HTML title and no JS description found.`);
          }
      }
  });

  const meds = [
    { name: 'Levadopa', file: 'data/short_levadopa_events.csv', color: '#1f77b4' },
    { name: 'DA', file: 'data/da_events.csv', color: '#ff7f0e' },
    { name: 'MAOB', file: 'data/maob_events.csv', color: '#2ca02c' },
    { name: 'Other', file: 'data/other_events.csv', color: '#d62728' },
    { name: 'No Med', file: 'data/nomed_events.csv', color: '#9467bd' }
  ];

  let currentChartMetric = 'Hold';
  let visibleMedications = new Set(meds.map(m => m.name));
  let allMedicationData = [];
  let currentPulseMedicationName = '';

  const chartLoader = document.getElementById('chart-loading-overlay');
  const globalLoader = document.getElementById('loader');
  const chartContainer = d3.select("#medication-line-chart-container");
  const medicationTogglesContainer = d3.select('#chart-medication-toggles');

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

  // --- NEW: Medication Info Tabs Logic ---
  const medTabsNavContainer = d3.select('#pulse-viz-page .med-tabs-nav');
  const medTabDescriptionContent = d3.select('#pulse-viz-page .med-tab-description-content');

  if (!medTabsNavContainer.empty() && !medTabDescriptionContent.empty()) {
    meds.forEach((med, index) => {
      medTabsNavContainer.append('button')
        .attr('class', `med-tab-btn ${index === 0 ? 'active' : ''}`)
        .attr('data-med-tab', med.name)
        .text(med.name)
        .on('click', function() {
          const selectedMedName = d3.select(this).attr('data-med-tab');

          medTabsNavContainer.selectAll('.med-tab-btn').classed('active', false);
          d3.select(this).classed('active', true);

          const description = medDescriptions[selectedMedName] || "Description not available.";
          medTabDescriptionContent.html(`<p>${description}</p>`);
        });
    });

    if (meds.length > 0) {
      const firstMedName = meds[0].name;
      const firstDescription = medDescriptions[firstMedName] || "Description not available.";
      medTabDescriptionContent.html(`<p><em>${firstDescription}</em></p>`);
    }
  } else {
    console.warn("Medication info tab containers (.med-tabs-nav or .med-tab-description-content) not found on pulse-viz-page.");
  }
  // --- END: Medication Info Tabs Logic ---

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
    allMedicationData = datasets;

    if (chartLoader) chartLoader.style.display = 'none';
    if (globalLoader) globalLoader.style.display = 'none';

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

    renderMedicationLineChart();

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

    d3.selectAll('#pulse-viz-page .med-btn').on('click', function () {
      stopSignal = true;
      if (animationTimeout) clearTimeout(animationTimeout);
      d3.select(".pulsing-point").remove();

      d3.selectAll('#pulse-viz-page .med-btn').classed('active', false);
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
        d3.select(".pulsing-point").remove();
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

      if (visibleMedications.has(currentPulseMedicationName)) {
         showPulsePointOnChart(i, ev[currentChartMetric], ev.color);
      }

      button
        .style('background-color', '#3e7ac0')
        .transition()
        .duration(holdDur)
        .style('transform', 'scale(0.85)')
        .on('end', () => {
          button
            .style('background-color', '#4A90E2')
            .transition()
            .duration(50)
            .style('transform', 'scale(1)')
            .on('end', () => {
              animationTimeout = setTimeout(() => playEvents(i + 1), gapDur);
            });
        });
    }

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

  let chartSvg, xScale, yScale;

  function renderMedicationLineChart() {
    if (allMedicationData.length === 0) return;

    chartContainer.select("svg").remove();

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
    if (maxYValue === 0 || isNaN(maxYValue)) maxYValue = (currentChartMetric === 'Hold') ? 500 : 1000;

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

  function showPulsePointOnChart(index, value, color) {
    if (!chartSvg || !xScale || !yScale || isNaN(value) || value === null) return;

    d3.select(".pulsing-point").remove();

    const cx = xScale(index);
    const cy = yScale(value);

    if (cx >= 0 && cx <= xScale.range()[1] && cy >= 0 && cy <= yScale.range()[0]) {
        chartSvg.append("circle")
          .attr("class", "pulsing-point")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", 5)
          .attr("fill", color)
          .style("opacity", 1)
          .transition()
            .duration(1000)
            .style("opacity", 0)
            .remove();
    }
  }

  console.log('Visualization: Pulse Visualization and Medication Line Chart setup complete!');
}
// --- END VISUALIZATION 6 ---

window.initializePulseVisualization = initializePulseVisualization;