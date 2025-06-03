// Ensure d3 is available (it's loaded via script tag in HTML)

// REMOVE: document.addEventListener('DOMContentLoaded', () => {
//   initializeTypingTest(); // This function seems unused based on current index.html structure
//   initializePulseVisualization();
// });

// --- VISUALIZATION 1: TYPING TEST (Seems unused or for a different HTML structure) ---
// function initializeTypingTest() { ... existing logic ... }


// --- VISUALIZATION 6: PULSE VISUALIZATION ---
function initializePulseVisualization() {
  const vizContainer = document.getElementById('pulse-viz-page');
  if (!vizContainer) {
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
      return [];
    })
  );

  const globalLoader = document.getElementById('loader'); // Reference to the global loader

  Promise.all(dataPromises).then(datasets => {
    const data = datasets.flat();
    if (data.length === 0) {
      console.error("No data loaded for pulse visualization. Check CSV paths and files.");
      const pulseInfoBox = document.getElementById('pulse-info-box');
      if (pulseInfoBox) {
        pulseInfoBox.innerHTML = "<p>Error: Could not load pulse data.</p>";
        pulseInfoBox.style.visibility = 'visible';
      }
      if (globalLoader) globalLoader.style.display = 'none'; // Hide loader even on error
      return;
    }

    const button = d3.select('#big-button');
    const pulseHoldTimeEl = document.getElementById('pulse-hold-time');
    const pulseFlightTimeEl = document.getElementById('pulse-flight-time');
    const pulseInfoBoxEl = document.getElementById('pulse-info-box');

    let tempo = +d3.select('#tempo-slider').property('value');
    let currentEvents = [];
    let stopSignal = false;
    let animationTimeout = null;

    d3.select('#tempo-slider').on('input', function () {
      tempo = +this.value;
      d3.select('#tempo-value').text(tempo + 'x');
    });

    d3.selectAll('.med-btn').on('click', function () {
      stopSignal = true;
      if (animationTimeout) clearTimeout(animationTimeout);

      d3.selectAll('.med-btn').classed('active', false);
      d3.select(this).classed('active', true);

      const medName = d3.select(this).attr('data-med');
      currentEvents = data.filter(d => d.medication === medName);

      if (currentEvents.length === 0) {
        console.warn(`No events found for medication: ${medName}`);
        if (pulseInfoBoxEl) pulseInfoBoxEl.style.visibility = 'hidden';
        return;
      }

      stopSignal = false;
      animationTimeout = setTimeout(() => playEvents(0), 100);
    });

    function playEvents(i) {
      if (stopSignal || i >= currentEvents.length) {
        return;
      }
      const ev = currentEvents[i];
      if (!ev || typeof ev.Hold !== 'number' || typeof ev.Flight !== 'number' || isNaN(ev.Hold) || isNaN(ev.Flight)) {
        console.warn("Skipping invalid event:", ev);
        animationTimeout = setTimeout(() => playEvents(i + 1), 50);
        return;
      }

      const holdDur = Math.max(10, ev.Hold / tempo); // Ensure minimum duration
      const gapDur = Math.max(10, ev.Flight / tempo); // Ensure minimum duration


      if (pulseHoldTimeEl) pulseHoldTimeEl.textContent = ev.Hold.toFixed(1);
      if (pulseFlightTimeEl) pulseFlightTimeEl.textContent = ev.Flight.toFixed(1);
      if (pulseInfoBoxEl) pulseInfoBoxEl.style.visibility = 'visible';

      button
        .style('background-color', '#3e7ac0') // Active color
        .transition()
        .duration(holdDur)
        .style('transform', 'scale(0.85)')
        .on('end', () => {
          button
            .style('background-color', '#4A90E2') // Back to default color
            .transition()
            .duration(50)
            .style('transform', 'scale(1)')
            .on('end', () => {
              animationTimeout = setTimeout(() => playEvents(i + 1), gapDur);
            });
        });
    }
    console.log('Visualization: Pulse Visualization initialized!');

    if (globalLoader) {
      globalLoader.style.display = 'none'; // Hide loader after data processing for pulse viz
    }

  }).catch(err => {
    console.error("Error processing pulse visualization data:", err);
    const pulseInfoBox = document.getElementById('pulse-info-box');
    if (pulseInfoBox) {
      pulseInfoBox.innerHTML = "<p>Error: Could not load pulse data.</p>";
      pulseInfoBox.style.visibility = 'visible';
    }
    if (globalLoader) globalLoader.style.display = 'none'; // Hide loader even on error
  });
}
// --- END VISUALIZATION 6 ---

// Make function globally available
window.initializePulseVisualization = initializePulseVisualization;
// If initializeTypingTest was used, it would also be exported:
// window.initializeTypingTestForViz1 = initializeTypingTest;