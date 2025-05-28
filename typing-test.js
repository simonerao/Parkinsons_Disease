import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

let personid = d3.select('option').node().value;
d3.select('#person-select')
    .on('change', (event) => {
        personid = event.target.value;
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

    // Recreate test with a new sentence
    createTypingTest(words);
}

function calculateDelayArray(chars, personid) {
    const users = {
        '5USOYSDCXB': {'LL': 175.8, 'LR': 125.0, 'LS': 125.0, 'RL': 125.0, 'RR': 187.5, 'RS': 156.3, 'SL': 140.6, 'SR': 156.3, 'SS': 210.95},
        '8TEUUGQBYB': {'LL': 312.5, 'LR': 402.3, 'LS': 382.8, 'RL': 429.7, 'RR': 281.3, 'RS': 390.6, 'SL': 406.3, 'SR': 426.8, 'SS': 217.8},
        'E0TBSMYHQI': {'LL': 312.5, 'LR': 320.3, 'LS': 363.29999999999995, 'RL': 421.9, 'RR': 335.9, 'RS': 382.8, 'SL': 382.8, 'SR': 398.4, 'SS': 179.7},
        'I3U47MF5UF': {'LL': 222.7, 'LR': 148.4, 'LS': 154.3, 'RL': 171.9, 'RR': 187.5, 'RS': 187.5, 'SL': 128.9, 'SR': 148.4, 'SS': 250.0},
        'IDZHIUK2W2': {'LL': 205.05, 'LR': 156.3, 'LS': 191.4, 'RL': 175.8, 'RR': 214.8, 'RS': 289.1, 'SL': 199.2, 'SR': 234.4, 'SS': 589.8},
        'JHBOKKHOQW': {'LL': 285.2, 'LR': 230.5, 'LS': 300.8, 'RL': 269.5, 'RR': 269.5, 'RS': 358.0, 'SL': 246.1, 'SR': 273.4, 'SS': 199.2},
        'LIOUUNGQ8Q': {'LL': 421.9, 'LR': 503.9, 'LS': 416.05, 'RL': 570.3, 'RR': 464.8, 'RS': 429.7, 'SL': 480.5, 'SR': 593.8, 'SS': 359.4},
        'LSQWWDXEYO': {'LL': 328.1, 'LR': 246.1, 'LS': 300.8, 'RL': 250.0, 'RR': 281.3, 'RS': 335.9, 'SL': 250.0, 'SR': 328.1, 'SS': 224.64999999999998},
        'QEYNMBJ8T0': {'LL': 253.9, 'LR': 235.35000000000002, 'LS': 230.5, 'RL': 238.3, 'RR': 269.5, 'RS': 250.95, 'SL': 235.35000000000002, 'SR': 300.8, 'SS': 281.3},
        'SGT8K5GXG0': {'LL': 298.85, 'LR': 335.9, 'LS': 240.2, 'RL': 269.5, 'RR': 359.4, 'RS': 312.5, 'SL': 328.1, 'SR': 429.7, 'SS': 398.45000000000005},
        'TL2XHTLK1T': {'LL': 265.6, 'LR': 418.0, 'LS': 390.6, 'RL': 421.9, 'RR': 310.5, 'RS': 347.7, 'SL': 375.0, 'SR': 359.4, 'SS': 183.6},
        'UDCY90VKYN': {'LL': 203.1, 'LR': 179.7, 'LS': 183.6, 'RL': 152.3, 'RR': 230.5, 'RS': 214.8, 'SL': 257.8, 'SR': 277.3, 'SS': 183.6},
        'V2SZVYXBOD': {'LL': 265.6, 'LR': 265.6, 'LS': 218.8, 'RL': 273.4, 'RR': 328.1, 'RS': 363.3, 'SL': 265.6, 'SR': 375.0, 'SS': 300.8},
        'VCTVD6LMPK': {'LL': 390.6, 'LR': 250.0, 'LS': 375.0, 'RL': 421.9, 'RR': 291.05, 'RS': 484.4, 'SL': 521.45, 'SR': 468.8, 'SS': 203.1},
        'WDNE1Q9EHT': {'LL': 230.5, 'LR': 152.3, 'LS': 203.1, 'RL': 171.9, 'RR': 207.0, 'RS': 246.1, 'SL': 160.2, 'SR': 187.5, 'SS': 169.95},
        'XWAX2IHF3O': {'LL': 132.8, 'LR': 168.0, 'LS': 162.1, 'RL': 136.7, 'RR': 226.6, 'RS': 265.6, 'SL': 162.1, 'SR': 277.3, 'SS': 117.2},
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

let ghostLatencies = [];
let timestamps = [];
let latencies = [];

function moveGhostCaret(spans, delayArray, ghostIndex) {
    if (!d3.select('#latency-line').empty()) { plotLatencyLine() };
    const ghostDelay = delayArray[ghostIndex] * (Math.random() / 2 + 1); // ms between keystrokes
    const ghostCaret = d3.select('.ghost-caret');
    
    if (ghostIndex >= spans.length) {
        ghostLatencies.pop();
        plotLatencyLine();
        return;
    }

    if (ghostIndex < spans.length) {
            spans[ghostIndex].after(ghostCaret.node());
        } else {
            spans[spans.length - 1].after(ghostCaret.node());
        }

    ghostIndex++;
    ghostLatencies.push(ghostDelay);
    setTimeout(moveGhostCaret, ghostDelay, spans, delayArray, ghostIndex);
}

function plotLatencyLine() {
    const data = latencies.map((latency, i) => ({ index: i + 1, latency }));
    const ghostData = ghostLatencies.map((latency, i) => ({ index: i + 1, latency }));

    const margin = { top: 20, right: 20, bottom: 50, left: 60 };
    const width = 700 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

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
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max([...data, ...ghostData], d => d.latency)])
        .nice()
        .range([height, 0]);

    const line = d3.line()
        .x(d => x(d.index))
        .y(d => y(d.latency))
        .curve(d3.curveCatmullRom);

    const colors = ['lightsteelblue', 'moccasin'];

    // Draw X axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(Math.min(10, data.length)))
        .append("text")
        .attr("class", "x label")
        .attr("x", width / 2)
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

    // Draw lines
    [data, ghostData].forEach((points, i) => {
        svg.append("path")
            .datum(points)
            .attr("fill", "none")
            .attr("stroke", colors[i])
            .attr("stroke-width", 2)
            .attr("d", line);
    });
}


function createResults(sentence) {
    const time = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000;
    const wpm = Math.round((sentence.split(" ").length / time) * 60);

    d3.select('#result')
        .text(`Done! Time: ${time.toFixed(2)}s, WPM: ${wpm}`);

    plotLatencyLine();
}

function createTypingTest(words) {
    const sentence = generateRandomSentence(words, 30);
    console.log(sentence);

    let sentenceDiv = d3.select('#sentence');
    const input = d3.select('#input').property("value", "");
    const overlay = d3.select('#blur-overlay');

    overlay.on('click', () => {
        overlay.style('display', 'none');
        input.node().focus(); // Focus the hidden input so typing starts immediately
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
    let keyStart = null;

    input.on("keydown", (event) => {
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
            keyStart = new Date();
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
            createResults(sentence);
        }
    });
}

await fetch('data/words.txt')
    .then(response => response.text())
    .then((text) => {
        const words = getWords(text);
        d3.select('#reset')
            .on('click', () => {
                resetTest(words);
            });
        createTypingTest(words);
    })