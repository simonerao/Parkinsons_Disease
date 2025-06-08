import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

let words;

let personid = "8TEUUGQBYB";
d3.select('#person-select')
    .on('change', (event) => {
        personid = event.target.value;
        resetTest(words);
    });

let wordcount = parseInt("10");
d3.select('#word-count')
    .on('change', (event) => {
        wordcount = parseInt(event.target.value);
        resetTest(words);
    });

function getWords(text) {
    return text.split('\n').map(word => word.trim()).filter(Boolean);
}

function resetTest(words) {
    d3.select("#input").property("value", "");
    d3.select('#blur-overlay').style('display', 'flex')

    // Clear results and latency chart
    d3.select("#result").text("");
    d3.select("#latency-line-chart").html("");

    // Clear sentence and caret
    d3.select("#sentence").html("");
    d3.select(".ghost-caret").remove();

    // Reset state variables (if global)
    ghostLatencies = [];
    latencies = [];
    timestamps = [];

    // stop ghost caret
    clearTimeout(timeout);

    // Recreate test with a new sentence
    createTypingTest(words);
}

function calculateDelayArray(chars, personid) {
    const users = {
        '8TEUUGQBYB': {'LL': 312.5, 'LR': 402.3, 'LS': 382.8, 'RL': 429.7, 'RR': 281.3, 'RS': 390.6, 'SL': 406.3, 'SR': 426.8, 'SS': 217.8}, //
        'JHBOKKHOQW': {'LL': 285.2, 'LR': 230.5, 'LS': 300.8, 'RL': 269.5, 'RR': 269.5, 'RS': 358.0, 'SL': 246.1, 'SR': 273.4, 'SS': 199.2}, //
        'LIOUUNGQ8Q': {'LL': 421.9, 'LR': 503.9, 'LS': 416.05, 'RL': 570.3, 'RR': 464.8, 'RS': 429.7, 'SL': 480.5, 'SR': 593.8, 'SS': 359.4}, //
        'LSQWWDXEYO': {'LL': 328.1, 'LR': 246.1, 'LS': 300.8, 'RL': 250.0, 'RR': 281.3, 'RS': 335.9, 'SL': 250.0, 'SR': 328.1, 'SS': 224.65}, //
        'VCTVD6LMPK': {'LL': 390.6, 'LR': 250.0, 'LS': 375.0, 'RL': 421.9, 'RR': 291.05, 'RS': 484.4, 'SL': 521.45, 'SR': 468.8, 'SS': 203.1}, //
    };

    const userLatency = users[personid];
    const leftLetters = new Set([...'QWERTASDFGZXCVB']);
    let delayArray = [];

    for (let i = 0; i < chars.length - 1; i++) {
        let direction = '';

        [i, i + 1].forEach(j => {
            if (chars[j] === ' ') {
                direction += 'S';
            } else if (leftLetters.has(chars[j])) {
                direction += 'L';
            } else {
                direction += 'R';
            }
        });
        delayArray.push(userLatency[direction]);
    }
    
    return delayArray;
}

function generateRandomSentence(words, n_words) {
    let sentence_words = [];
    for (let i = 0; i < n_words; i++) {
        const word = words[Math.floor(Math.random() * words.length)];
        sentence_words.push(word);
    }
    return sentence_words.join(' ');
}

let ghostLatencies;
let timestamps;
export let latencies;
let timeout;

function moveGhostCaret(spans, delayArray, ghostIndex) {
    const ghostCaret = d3.select('.ghost-caret');

    if (ghostIndex < delayArray.length) {
        if (!d3.select('#latency-line').empty()) { plotLatencyLine() };

        const ghostDelay = delayArray[ghostIndex] * (Math.random() / 2 + 0.75); // add variation to ghost data to simulate real life

        spans[ghostIndex].after(ghostCaret.node());
        ghostIndex++;
        ghostLatencies.push(ghostDelay);
        timeout = setTimeout(moveGhostCaret, ghostDelay, spans, delayArray, ghostIndex);
    } else {
        spans[spans.length - 1].after(ghostCaret.node());
        clearTimeout(timeout);
        plotLatencyLine();
        return;
    }
}

function plotLatencyLine() {
    const data = latencies.map((latency, i) => ({ 
        index: i + 1, 
        latency 
    }));
    const ghostData = ghostLatencies.map((latency, i) => ({ 
        index: i + 1, 
        latency 
    }));

    const margin = { top: 10, right: 20, bottom: 60, left: 60 };
    const width = 700 - margin.left - margin.right;
    const height = 250;

    const svg = d3.select("#result")
        .html("") // Clear previous chart
        .append("svg")
        .attr("id", "latency-line")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([1, d3.max([data.length, ghostData.length])])
        .range([0, width - 55]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(ghostData, d => d.latency)])
        .nice()
        .range([height, 0]);

    const line = d3.line()
        .x(d => x(d.index))
        .y(d => y(d.latency))
        .curve(d3.curveCatmullRom);

    const colors = ['#FFC857', '#384E77'];

    // Draw X axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(Math.min(10, data.length)))
        .append("text")
        .attr("class", "x label")
        .attr("x", (width - 55) / 2)
        .attr("y", 40)
        .attr("fill", "#000")
        .attr("text-anchor", "middle")
        .text("Character Index");

    // Draw Y axis
    svg.append("g")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("class", "y label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("dy", "0.71em")
        .attr("fill", "#000")
        .attr("text-anchor", "middle")
        .text("Latency (ms)");

    svg.append("g")
        .attr("class", "grid")
        .call(
            d3.axisLeft(y)
                .ticks(5)  // adjust as needed
                .tickSize(-width + 55)  // full-width lines
                .tickFormat("")    // no text
        );

    // Draw lines
    [ghostData, data].forEach((points, i) => {
        svg.append("path")
            .datum(points)
            .attr("fill", "none")
            .attr("stroke", colors[i])
            .attr("stroke-width", 2.5)
            .attr("d", line);
    });

    const legendData = [
        { label: "Persona", color: colors[0] },
        { label: "You", color: colors[1] }
    ];

    const legend = svg.append("g")
        .attr("transform", `translate(${width - 40}, 0)`);  // Adjust position as needed

    legendData.forEach((entry, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        legendRow.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", entry.color);

        legendRow.append("text")
            .attr("x", 18)
            .attr("y", 10)
            .attr("fill", "#000")
            .style("font-size", "10px")
            .text(entry.label);
    });
}

function createTypingTest(words) {
    const sentence = generateRandomSentence(words, wordcount);

    let sentenceDiv = d3.select('#sentence');
    const input = d3.select('#input').property("value", "");
    const overlay = d3.select('#blur-overlay');

    overlay.on('click', () => {
        overlay.style('display', 'none');
        input.node().focus(); // Focus the hidden input so typing starts immediately
        ghostLatencies = [];
        latencies = [];
        timestamps = [];
    });

    sentenceDiv.selectAll('span')
        .data(sentence.split(''))
        .join('span')
        .text(d => d);

    const spans = sentenceDiv.selectAll('span').nodes();

    const caretSpan = d3.select('#test-container')
        .append('span')
        .attr('class', 'caret')
        .attr('id', 'start');
    spans[0].before(caretSpan.node())

    let startTime = null;
    let ended = false;

    input.on("keydown", (event) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

        if (ctrlKey && event.key === "Backspace") {
            event.preventDefault(); // block Ctrl+Backspace
        }

        const now = performance.now();

        if (event.key === "Backspace") {
            if (timestamps.length > 1) {
                // Remove last timestamp and latency
                timestamps.pop();
                latencies.pop();
            } else if (timestamps.length === 1) {
                timestamps.pop();
            }
        } else {
            // Only record if it's a character key (optional filter)
            timestamps.push(now);
            if (timestamps.length > 1) {
                const diff = timestamps[timestamps.length - 1] - timestamps[timestamps.length - 2];
                latencies.push(diff);
            }
        }
    });

    input.on("input", () => {
        const typed = input.property("value");

        if (!startTime) {
            startTime = new Date();
            d3.select('#test-container')
                .append('span')
                .attr('class', 'ghost-caret');
            let ghostIndex = 0;
            const delayArray = calculateDelayArray(sentence.split(''), personid);
            moveGhostCaret(spans, delayArray, ghostIndex);
        }

        // Reset all spans
        spans.forEach(span => span.className = '');
        d3.selectAll('.caret').remove();

        // Mark correctness
        spans.forEach((span, i) => {
            const expected = span.textContent === '_' ? ' ' : span.dataset.char || span.textContent;
            const actual = typed[i];

            if (actual == null) {
                span.className = '';
                span.textContent = expected; // restore space if it was replaced with _
                return;
            }

            if (actual === expected) {
                span.className = 'correct';
                span.textContent = expected;
            } else {
                span.className = 'incorrect';
                if (expected === ' ') {
                    span.textContent = '_'; // show red underscore
                } else {
                    span.textContent = expected;
                }
            }
        });

        // Add caret
        const caretIndex = typed.length;
        caretSpan.attr('id', 'typing...');

        if (caretIndex < spans.length) {
            spans[caretIndex - 1].after(caretSpan.node());
        } else {
            spans[spans.length - 1].after(caretSpan.node());
        }

        if (!d3.select('#latency-line').empty()) { plotLatencyLine() };

        // End condition
        if (typed.length === sentence.length && !ended) {
            ended = true;
            input.node().blur();
            plotLatencyLine();
        }
    });
}

await fetch('data/words.txt')
    .then(response => response.text())
    .then((text) => {
        words = getWords(text);
        d3.select('#reset')
            .on('click', () => {
                resetTest(words);
            });
        createTypingTest(words);
    })