// Error Handling - MUST BE FIRST
window.onerror = function (msg, url, line, col, error) {
    const errorBox = document.createElement('div');
    errorBox.style.position = 'fixed';
    errorBox.style.top = '0';
    errorBox.style.left = '0';
    errorBox.style.width = '100%';
    errorBox.style.backgroundColor = '#f87171';
    errorBox.style.color = 'white';
    errorBox.style.padding = '10px';
    errorBox.style.zIndex = '9999';
    errorBox.style.textAlign = 'center';
    errorBox.style.borderBottom = '2px solid white';
    errorBox.innerHTML = `<strong>⚠️ Script Error:</strong> ${msg} <br><small>Line: ${line}, Col: ${col}</small>`;
    document.body.prepend(errorBox);
    console.error('Global Error:', msg, error);
    return false;
};

// DOM Elements
const canvas = document.getElementById('maze-canvas');
const ctx = canvas.getContext('2d');
const chartCanvas = document.getElementById('chart-canvas');
const chartCtx = chartCanvas.getContext('2d');

const inputLebar = document.getElementById('input-lebar');
const inputTinggi = document.getElementById('input-tinggi');
const inputKecepatan = document.getElementById('input-kecepatan');
const labelKecepatan = document.getElementById('label-kecepatan');

const btnBuat = document.getElementById('btn-buat');
const btnRekursif = document.getElementById('btn-rekursif');
const btnIteratif = document.getElementById('btn-iteratif');
const btnBersihkan = document.getElementById('btn-bersihkan');
const btnToggleHistory = document.getElementById('btn-toggle-history');
const btnClearHistory = document.getElementById('btn-clear-history');
const btnBenchmark = document.getElementById('btn-benchmark');

const kontenAnalisis = document.getElementById('konten-analisis');
const stepContent = document.getElementById('step-content');
const stepCount = document.getElementById('step-count');
const currentMethod = document.getElementById('current-method');
const stackSize = document.getElementById('stack-size');
const maxDepth = document.getElementById('max-depth');
const algorithmStatus = document.getElementById('algorithm-status');
const stackBar = document.getElementById('stack-bar');
const historyContent = document.getElementById('history-content');
const calculationBox = document.getElementById('calculation-box');
const calculationContent = document.getElementById('calculation-content');

// Global State
let grid = [];
let lebar = 15;
let tinggi = 15;
let cellSize = 0;
let startNode = null;
let endNode = null;
let animationSpeed = 50;
let isRunning = false;
let currentStepCount = 0;
let currentStackSize = 0;
let currentMaxDepth = 0;
let currentAlgorithm = '';
let showDetailedHistory = false;

// History storage
let historyLog = {
    rekursif: [],
    iteratif: []
};

// Results storage
const results = {
    rekursif: null,
    iteratif: null
};

// Cell class
class Cell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.walls = { top: true, right: true, bottom: true, left: true };
        this.visited = false;
        this.inPath = false;
        this.isBacktracking = false;
    }
}

// Initialize
function init() {
    setupCanvas();
    buatLabirin();
}

function setupCanvas() {
    const canvasContainer = canvas.parentElement;
    // Fallback if clientWidth is 0 (e.g. hidden or disconnected)
    const containerWidth = canvasContainer && canvasContainer.clientWidth > 0 ? canvasContainer.clientWidth : 400;

    // Ensure size is at least 100px
    const size = Math.max(100, containerWidth - 20);

    canvas.width = size;
    canvas.height = size;

    chartCanvas.width = chartCanvas.parentElement ? chartCanvas.parentElement.clientWidth : 400;
    chartCanvas.height = 200;
}

// Event Listeners
inputKecepatan.addEventListener('input', (e) => {
    animationSpeed = parseInt(e.target.value);
    labelKecepatan.textContent = animationSpeed;
});

inputLebar.addEventListener('change', (e) => {
    lebar = parseInt(e.target.value);
});

inputTinggi.addEventListener('change', (e) => {
    tinggi = parseInt(e.target.value);
});

btnBuat.addEventListener('click', () => {
    if (!isRunning) {
        // Force update values from inputs
        lebar = parseInt(inputLebar.value) || 15;
        tinggi = parseInt(inputTinggi.value) || 15;

        // Clamp values to min/max if needed (5-50 based on HTML)
        lebar = Math.max(5, Math.min(50, lebar));
        tinggi = Math.max(5, Math.min(50, tinggi));

        // Update inputs in case they were out of bounds
        inputLebar.value = lebar;
        inputTinggi.value = tinggi;

        // DEBUG: Alert user to confirm what the code sees
        // alert(`Debug: Width=${lebar}, Height=${tinggi}`);

        resetResults();
        buatLabirin();
    }
});

btnRekursif.addEventListener('click', () => {
    if (!isRunning) {
        selesaikan('rekursif');
    }
});

btnIteratif.addEventListener('click', () => {
    if (!isRunning) {
        selesaikan('iteratif');
    }
});

btnBersihkan.addEventListener('click', () => {
    if (!isRunning) {
        bersihkanJalur();
    }
});

btnToggleHistory.addEventListener('click', () => {
    showDetailedHistory = !showDetailedHistory;
    btnToggleHistory.textContent = showDetailedHistory ? 'Sembunyikan Detail' : 'Tampilkan Detail';
    displayHistory();
});

btnClearHistory.addEventListener('click', () => {
    historyLog = { rekursif: [], iteratif: [] };
    historyContent.innerHTML = '<p class="history-placeholder">History telah dihapus.</p>';
});

window.addEventListener('resize', () => {
    setupCanvas();
    gambarLabirin();
    if (results.rekursif || results.iteratif) {
        gambarGrafik();
    }
});

btnBenchmark.addEventListener('click', async () => {
    if (isRunning) return;

    // UI Feedback
    disableButtons();
    btnBenchmark.disabled = true;
    btnBenchmark.textContent = "⏳ Sedang Menguji...";
    kontenAnalisis.innerHTML = '<p class="placeholder">Sedang melakukan stress-test pada ukuran 10x10 s.d. 50x50...</p>';

    // Hapus konten canvas chart
    chartCtx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);

    // Ukuran yang akan diuji
    const sizes = [10, 20, 30, 40, 50];
    const resultsRec = [];
    const resultsIter = [];

    // Loop pengujian
    for (let size of sizes) {
        // Update status UI
        algorithmStatus.textContent = `Benchmarking ${size}x${size}...`;
        await sleep(50); // Jeda sedikit agar UI tidak freeze

        // 1. Generate Maze Khusus Benchmark (Tanpa visualisasi)
        let benchGrid = generateBenchMaze(size);

        // Clone grid untuk tes kedua agar adil (struktur maze sama)
        let benchGrid2 = JSON.parse(JSON.stringify(benchGrid));

        // 2. Tes Rekursif
        let startR = performance.now();
        solvePureRecursive(benchGrid, 0, 0, size);
        let endR = performance.now();
        resultsRec.push(endR - startR);

        // 3. Tes Iteratif
        let startI = performance.now();
        solvePureIterative(benchGrid2, size);
        let endI = performance.now();
        resultsIter.push(endI - startI);
    }

    // Tampilkan Hasil Grafik Garis
    gambarGrafikTren(sizes, resultsRec, resultsIter);

    // Tampilkan Tabel Data
    tampilkanTabelBenchmark(sizes, resultsRec, resultsIter);

    // Reset UI
    algorithmStatus.textContent = "Benchmark Selesai";
    btnBenchmark.textContent = "📈 Benchmark (Tren Data)";
    enableButtons();
    btnBenchmark.disabled = false;
});

// Add to history log
function addToHistory(metode, step, cell, isBacktrack, action) {
    historyLog[metode].push({
        step: step,
        cell: { x: cell.x, y: cell.y },
        isBacktrack: isBacktrack,
        action: action,
        timestamp: Date.now()
    });
}

// Display history
function displayHistory() {
    if (historyLog.rekursif.length === 0 && historyLog.iteratif.length === 0) {
        historyContent.innerHTML = '<p class="history-placeholder">Belum ada history. Jalankan algoritma terlebih dahulu.</p>';
        return;
    }

    let html = '';

    // Rekursif History
    if (historyLog.rekursif.length > 0) {
        html += '<div class="history-section">';
        html += '<h4><span class="history-badge badge-rekursif">REKURSIF</span> Total: ' + historyLog.rekursif.length + ' langkah</h4>';

        if (showDetailedHistory) {
            // Show only last 50 items for performance
            const items = historyLog.rekursif.slice(-50);
            items.forEach(item => {
                const className = item.isBacktrack ? 'backtrack' : 'forward';
                html += `<div class="history-item ${className}">`;
                html += `<div class="history-step">Langkah #${item.step}</div>`;
                html += `<div class="history-cell">Sel (${item.cell.x}, ${item.cell.y})</div>`;
                html += `<div class="history-action">${item.isBacktrack ? '⬅️ Backtracking' : '➡️ Exploring'}</div>`;
                html += '</div>';
            });
            if (historyLog.rekursif.length > 50) {
                html += `<p style="text-align: center; color: #888; font-size: 0.75rem; margin-top: 0.5rem;">... dan ${historyLog.rekursif.length - 50} langkah lainnya</p>`;
            }
        } else {
            const forward = historyLog.rekursif.filter(h => !h.isBacktrack).length;
            const backtrack = historyLog.rekursif.filter(h => h.isBacktrack).length;
            html += `<div style="font-size: 0.8rem; color: #bbb; padding: 0.5rem;">`;
            html += `➡️ Forward: ${forward} | ⬅️ Backtrack: ${backtrack}`;
            html += `</div>`;
        }
        html += '</div>';
    }

    // Iteratif History
    if (historyLog.iteratif.length > 0) {
        html += '<div class="history-section">';
        html += '<h4><span class="history-badge badge-iteratif">ITERATIF</span> Total: ' + historyLog.iteratif.length + ' langkah</h4>';

        if (showDetailedHistory) {
            const items = historyLog.iteratif.slice(-50);
            items.forEach(item => {
                const className = item.isBacktrack ? 'backtrack' : 'forward';
                html += `<div class="history-item ${className}">`;
                html += `<div class="history-step">Langkah #${item.step}</div>`;
                html += `<div class="history-cell">Sel (${item.cell.x}, ${item.cell.y})</div>`;
                html += `<div class="history-action">${item.isBacktrack ? '⬅️ Backtracking' : '➡️ Exploring'}</div>`;
                html += '</div>';
            });
            if (historyLog.iteratif.length > 50) {
                html += `<p style="text-align: center; color: #888; font-size: 0.75rem; margin-top: 0.5rem;">... dan ${historyLog.iteratif.length - 50} langkah lainnya</p>`;
            }
        } else {
            const forward = historyLog.iteratif.filter(h => !h.isBacktrack).length;
            const backtrack = historyLog.iteratif.filter(h => h.isBacktrack).length;
            html += `<div style="font-size: 0.8rem; color: #bbb; padding: 0.5rem;">`;
            html += `➡️ Forward: ${forward} | ⬅️ Backtrack: ${backtrack}`;
            html += `</div>`;
        }
        html += '</div>';
    }

    historyContent.innerHTML = html;
}

// Update UI elements
function updateStepUI(step, action, cell, isBacktrack = false) {
    currentStepCount = step;
    stepCount.textContent = step;

    let message = '';
    if (action === 'start') {
        message = `<span class="step-action"><span class="step-highlight">Memulai</span> pencarian dari sel <span class="step-highlight">(${cell.x}, ${cell.y})</span></span>`;
    } else if (action === 'visit') {
        if (isBacktrack) {
            message = `<span class="step-action"><span class="step-backtrack">⬅️ BACKTRACKING</span> kembali ke sel <span class="step-highlight">(${cell.x}, ${cell.y})</span></span>`;
            message += `<p style="margin-top: 0.5rem; font-size: 0.8rem; color: #f87171;">Algoritma mundur karena tidak ada jalur valid dari sel sebelumnya.</p>`;
        } else {
            message = `<span class="step-action"><span class="step-forward">➡️ EXPLORING</span> mengunjungi sel <span class="step-highlight">(${cell.x}, ${cell.y})</span></span>`;
            message += `<p style="margin-top: 0.5rem; font-size: 0.8rem; color: #4ade80;">Algoritma sedang menjelajah sel baru untuk mencari jalur menuju finish.</p>`;
        }
    } else if (action === 'found') {
        message = `<span class="step-action"><span class="step-forward">✅ SELESAI!</span> Jalur ditemukan di sel <span class="step-highlight">(${cell.x}, ${cell.y})</span></span>`;
        message += `<p style="margin-top: 0.5rem; font-size: 0.8rem; color: #4ade80;">Algoritma berhasil menemukan jalur dari start ke finish!</p>`;
    }

    stepContent.innerHTML = message;
}

function updateStackUI(size, maxD) {
    currentStackSize = size;
    currentMaxDepth = Math.max(currentMaxDepth, maxD);

    stackSize.textContent = size;
    maxDepth.textContent = currentMaxDepth;

    const percentage = Math.min((size / 100) * 100, 100);
    stackBar.style.width = percentage + '%';
}

function updateAlgorithmStatus(status) {
    algorithmStatus.textContent = status;

    if (status === 'Exploring') {
        algorithmStatus.style.color = '#4ade80';
    } else if (status === 'Backtracking') {
        algorithmStatus.style.color = '#f87171';
    } else if (status === 'Selesai') {
        algorithmStatus.style.color = '#00a8ff';
    } else {
        algorithmStatus.style.color = '#888';
    }
}

// Display calculation explanation
function displayCalculation() {
    if (!results.rekursif || !results.iteratif) return;

    calculationBox.style.display = 'block';

    const r = results.rekursif;
    const i = results.iteratif;

    let html = '';

    // Time Difference
    html += '<div class="calc-section">';
    html += '<div class="calc-title">⏱️ Perbedaan Waktu Eksekusi</div>';
    html += `<div class="calc-formula">Rekursif: ${r.time} ms<br>Iteratif: ${i.time} ms</div>`;
    html += `<div class="calc-result">Selisih: ${Math.abs(r.time - i.time).toFixed(2)} ms</div>`;
    if (r.time < i.time) {
        html += '<div class="calc-explanation">✅ Rekursif lebih cepat karena call stack sistem lebih efisien untuk maze ini.</div>';
    } else {
        html += '<div class="calc-explanation">✅ Iteratif lebih cepat karena menghindari overhead pemanggilan fungsi rekursif.</div>';
    }
    html += '</div>';

    // Steps Difference
    html += '<div class="calc-section">';
    html += '<div class="calc-title">👣 Perbedaan Jumlah Langkah</div>';
    html += `<div class="calc-formula">Rekursif: ${r.steps} langkah<br>Iteratif: ${i.steps} langkah</div>`;
    html += `<div class="calc-result">Selisih: ${Math.abs(r.steps - i.steps)} langkah</div>`;
    html += '<div class="calc-explanation">💡 Kedua metode mengunjungi sel yang sama, tetapi urutan dan cara backtracking berbeda.</div>';
    html += '</div>';

    // Visited Cells
    html += '<div class="calc-section">';
    html += '<div class="calc-title">🔍 Sel yang Dikunjungi</div>';
    html += `<div class="calc-formula">Rekursif: ${r.visited} sel<br>Iteratif: ${i.visited} sel</div>`;
    html += `<div class="calc-result">Selisih: ${Math.abs(r.visited - i.visited)} sel</div>`;
    if (r.visited === i.visited) {
        html += '<div class="calc-explanation">✅ Kedua metode mengunjungi jumlah sel yang sama.</div>';
    } else {
        html += '<div class="calc-explanation">⚠️ Perbedaan ini terjadi karena strategi traversal yang berbeda.</div>';
    }
    html += '</div>';

    // Stack Depth
    html += '<div class="calc-section">';
    html += '<div class="calc-title">📊 Kedalaman Stack Maksimal</div>';
    html += `<div class="calc-formula">Rekursif: ${r.maxDepth}<br>Iteratif: ${i.maxDepth}</div>`;
    html += `<div class="calc-result">Selisih: ${Math.abs(r.maxDepth - i.maxDepth)}</div>`;
    html += '<div class="calc-explanation">🧠 Rekursif menggunakan call stack sistem, sedangkan iteratif menggunakan array manual.</div>';
    html += '</div>';

    // Why Different Results
    html += '<div class="calc-section" style="border-left-color: #fbbf24;">';
    html += '<div class="calc-title" style="color: #fbbf24;">🤔 Kenapa Hasilnya Berbeda?</div>';
    html += '<div class="calc-explanation" style="margin-top: 0; line-height: 1.8;">';
    html += '<strong>1. Urutan Eksplorasi:</strong><br>';
    html += '• Rekursif: Mengikuti urutan natural dari pemanggilan fungsi (top → right → bottom → left)<br>';
    html += '• Iteratif: Bergantung pada urutan push/pop dari stack manual<br><br>';
    html += '<strong>2. Mekanisme Backtracking:</strong><br>';
    html += '• Rekursif: Backtracking terjadi otomatis saat return dari fungsi<br>';
    html += '• Iteratif: Backtracking eksplisit dengan pop() dari stack<br><br>';
    html += '<strong>3. Jalur Solusi:</strong><br>';
    html += `• Kedua metode menemukan jalur dengan panjang: Rekursif=${r.pathLength} vs Iteratif=${i.pathLength}<br>`;
    if (r.pathLength === i.pathLength) {
        html += '• ✅ Panjang jalur sama, tetapi sel yang dikunjungi bisa berbeda<br>';
    } else {
        html += '• ⚠️ Panjang jalur berbeda karena strategi pencarian yang berbeda<br>';
    }
    html += '</div>';
    html += '</div>';

    calculationContent.innerHTML = html;
}

// Maze Generation using Randomized DFS
function buatLabirin() {
    console.log(`Generating Maze: ${lebar}x${tinggi}`); // DEBUG LOG
    currentStepCount = 0;
    currentStackSize = 0;
    currentMaxDepth = 0;
    stepCount.textContent = '0';
    currentMethod.textContent = '-';
    stackSize.textContent = '0';
    maxDepth.textContent = '0';
    algorithmStatus.textContent = 'Idle';
    stackBar.style.width = '0%';
    stepContent.innerHTML = '<p class="step-placeholder">Jalankan algoritma untuk melihat langkah-langkahnya...</p>';

    grid = [];
    for (let y = 0; y < tinggi; y++) {
        grid[y] = [];
        for (let x = 0; x < lebar; x++) {
            grid[y][x] = new Cell(x, y);
        }
    }

    const startX = Math.floor(Math.random() * lebar);
    const startY = Math.floor(Math.random() * tinggi);
    const stack = [];
    let current = grid[startY][startX];
    current.visited = true;
    stack.push(current);

    while (stack.length > 0) {
        current = stack[stack.length - 1];
        const neighbors = getUnvisitedNeighbors(current);

        if (neighbors.length > 0) {
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
            removeWall(current, next);
            next.visited = true;
            stack.push(next);
        } else {
            stack.pop();
        }
    }

    for (let y = 0; y < tinggi; y++) {
        for (let x = 0; x < lebar; x++) {
            grid[y][x].visited = false;
            grid[y][x].inPath = false;
            grid[y][x].isBacktracking = false;
        }
    }

    startNode = grid[0][0];
    endNode = grid[tinggi - 1][lebar - 1];

    gambarLabirin();
}

function getUnvisitedNeighbors(cell) {
    const neighbors = [];
    const { x, y } = cell;

    if (y > 0 && !grid[y - 1][x].visited) neighbors.push(grid[y - 1][x]);
    if (x < lebar - 1 && !grid[y][x + 1].visited) neighbors.push(grid[y][x + 1]);
    if (y < tinggi - 1 && !grid[y + 1][x].visited) neighbors.push(grid[y + 1][x]);
    if (x > 0 && !grid[y][x - 1].visited) neighbors.push(grid[y][x - 1]);

    return neighbors;
}

function removeWall(current, next) {
    const dx = next.x - current.x;
    const dy = next.y - current.y;

    if (dx === 1) {
        current.walls.right = false;
        next.walls.left = false;
    } else if (dx === -1) {
        current.walls.left = false;
        next.walls.right = false;
    } else if (dy === 1) {
        current.walls.bottom = false;
        next.walls.top = false;
    } else if (dy === -1) {
        current.walls.top = false;
        next.walls.bottom = false;
    }
}

function gambarLabirin() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    cellSize = canvas.width / Math.max(lebar, tinggi);

    for (let y = 0; y < tinggi; y++) {
        for (let x = 0; x < lebar; x++) {
            const cell = grid[y][x];
            const px = x * cellSize;
            const py = y * cellSize;

            ctx.strokeStyle = '#4a5568';
            ctx.lineWidth = 2;
            ctx.beginPath();

            if (cell.walls.top) {
                ctx.moveTo(px, py);
                ctx.lineTo(px + cellSize, py);
            }
            if (cell.walls.right) {
                ctx.moveTo(px + cellSize, py);
                ctx.lineTo(px + cellSize, py + cellSize);
            }
            if (cell.walls.bottom) {
                ctx.moveTo(px, py + cellSize);
                ctx.lineTo(px + cellSize, py + cellSize);
            }
            if (cell.walls.left) {
                ctx.moveTo(px, py);
                ctx.lineTo(px, py + cellSize);
            }

            ctx.stroke();
        }
    }

    if (startNode) {
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(startNode.x * cellSize + 2, startNode.y * cellSize + 2, cellSize - 4, cellSize - 4);
        ctx.fillStyle = '#1a1a2e';
        ctx.font = `bold ${cellSize * 0.4}px Poppins`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('S', startNode.x * cellSize + cellSize / 2, startNode.y * cellSize + cellSize / 2);
    }

    if (endNode) {
        ctx.fillStyle = '#f87171';
        ctx.fillRect(endNode.x * cellSize + 2, endNode.y * cellSize + 2, cellSize - 4, cellSize - 4);
        ctx.fillStyle = '#1a1a2e';
        ctx.font = `bold ${cellSize * 0.4}px Poppins`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('F', endNode.x * cellSize + cellSize / 2, endNode.y * cellSize + cellSize / 2);
    }
}

async function selesaikan(metode) {
    isRunning = true;
    currentAlgorithm = metode;
    currentMethod.textContent = metode === 'rekursif' ? 'Rekursif' : 'Iteratif';
    currentStepCount = 0;
    currentStackSize = 0;
    currentMaxDepth = 0;
    historyLog[metode] = [];

    disableButtons();

    for (let y = 0; y < tinggi; y++) {
        for (let x = 0; x < lebar; x++) {
            grid[y][x].visited = false;
            grid[y][x].inPath = false;
            grid[y][x].isBacktracking = false;
        }
    }

    gambarLabirin();
    updateAlgorithmStatus('Memulai...');

    const startTime = performance.now();
    let path = [];
    let cellsVisited = 0;

    if (metode === 'rekursif') {
        updateStepUI(0, 'start', startNode);
        addToHistory(metode, 0, startNode, false, 'start');
        const result = await dfsRekursif(startNode, [], 1);
        path = result ? result.path : [];
        cellsVisited = result ? result.visited : 0;
    } else {
        updateStepUI(0, 'start', startNode);
        addToHistory(metode, 0, startNode, false, 'start');
        const result = await dfsIteratif();
        path = result.path;
        cellsVisited = result.visited;
    }

    const endTime = performance.now();
    const executionTime = (endTime - startTime).toFixed(2);

    updateAlgorithmStatus('Selesai');

    if (path.length > 0) {
        updateStepUI(currentStepCount + 1, 'found', endNode);
        gambarJalur(path);
    }

    results[metode] = {
        time: parseFloat(executionTime),
        visited: cellsVisited,
        pathLength: path.length,
        steps: currentStepCount,
        maxDepth: currentMaxDepth
    };

    displayHistory();
    tampilkanAnalisis();

    if (results.rekursif && results.iteratif) {
        displayCalculation();
    }

    isRunning = false;
    enableButtons();
}

async function dfsRekursif(cell, path, depth) {
    cell.visited = true;
    path.push(cell);

    currentStepCount++;
    updateStackUI(path.length, depth);
    updateStepUI(currentStepCount, 'visit', cell, false);
    updateAlgorithmStatus('Exploring');
    addToHistory('rekursif', currentStepCount, cell, false, 'visit');

    const delay = Math.max(1, 100 - animationSpeed);
    await sleep(delay);

    ctx.fillStyle = 'rgba(96, 165, 250, 0.6)';
    ctx.fillRect(cell.x * cellSize + 2, cell.y * cellSize + 2, cellSize - 4, cellSize - 4);
    drawArrow(cell, '#60a5fa');
    redrawStartEnd();

    if (cell === endNode) {
        return { path: [...path], visited: countVisited() };
    }

    const neighbors = getValidNeighbors(cell);

    for (const neighbor of neighbors) {
        if (!neighbor.visited) {
            const result = await dfsRekursif(neighbor, path, depth + 1);
            if (result) return result;
        }
    }

    if (cell !== startNode) {
        currentStepCount++;
        cell.isBacktracking = true;
        updateStepUI(currentStepCount, 'visit', cell, true);
        updateAlgorithmStatus('Backtracking');
        addToHistory('rekursif', currentStepCount, cell, true, 'backtrack');

        await sleep(delay);

        ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
        ctx.fillRect(cell.x * cellSize + 2, cell.y * cellSize + 2, cellSize - 4, cellSize - 4);
        redrawStartEnd();
    }

    path.pop();
    updateStackUI(path.length, depth - 1);

    return null;
}

async function dfsIteratif() {
    const stack = [{ cell: startNode, path: [startNode] }];
    startNode.visited = true;
    let previousCell = null;

    while (stack.length > 0) {
        const { cell, path } = stack.pop();

        currentStepCount++;
        updateStackUI(stack.length + 1, stack.length + 1);

        const isBacktrack = previousCell && !isNeighbor(previousCell, cell);

        updateStepUI(currentStepCount, 'visit', cell, isBacktrack);
        updateAlgorithmStatus(isBacktrack ? 'Backtracking' : 'Exploring');
        addToHistory('iteratif', currentStepCount, cell, isBacktrack, isBacktrack ? 'backtrack' : 'visit');

        const delay = Math.max(1, 100 - animationSpeed);
        await sleep(delay);

        if (isBacktrack) {
            ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
        } else {
            ctx.fillStyle = 'rgba(192, 132, 252, 0.6)';
        }
        ctx.fillRect(cell.x * cellSize + 2, cell.y * cellSize + 2, cellSize - 4, cellSize - 4);

        drawArrow(cell, isBacktrack ? '#64748b' : '#c084fc');
        redrawStartEnd();

        if (cell === endNode) {
            return { path: path, visited: countVisited() };
        }

        const neighbors = getValidNeighbors(cell);

        for (const neighbor of neighbors) {
            if (!neighbor.visited) {
                neighbor.visited = true;
                stack.push({ cell: neighbor, path: [...path, neighbor] });
            }
        }

        previousCell = cell;
        updateStackUI(stack.length, stack.length);
    }

    return { path: [], visited: countVisited() };
}

function isNeighbor(cell1, cell2) {
    if (!cell1 || !cell2) return false;
    const dx = Math.abs(cell1.x - cell2.x);
    const dy = Math.abs(cell1.y - cell2.y);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

function drawArrow(cell, color) {
    const centerX = cell.x * cellSize + cellSize / 2;
    const centerY = cell.y * cellSize + cellSize / 2;
    const arrowSize = cellSize * 0.15;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, arrowSize, 0, Math.PI * 2);
    ctx.fill();
}

function redrawStartEnd() {
    if (startNode) {
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(startNode.x * cellSize + 2, startNode.y * cellSize + 2, cellSize - 4, cellSize - 4);
        ctx.fillStyle = '#1a1a2e';
        ctx.font = `bold ${cellSize * 0.4}px Poppins`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('S', startNode.x * cellSize + cellSize / 2, startNode.y * cellSize + cellSize / 2);
    }

    if (endNode) {
        ctx.fillStyle = '#f87171';
        ctx.fillRect(endNode.x * cellSize + 2, endNode.y * cellSize + 2, cellSize - 4, cellSize - 4);
        ctx.fillStyle = '#1a1a2e';
        ctx.font = `bold ${cellSize * 0.4}px Poppins`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('F', endNode.x * cellSize + cellSize / 2, endNode.y * cellSize + cellSize / 2);
    }
}

function getValidNeighbors(cell) {
    const neighbors = [];
    const { x, y } = cell;

    if (!cell.walls.top && y > 0) neighbors.push(grid[y - 1][x]);
    if (!cell.walls.right && x < lebar - 1) neighbors.push(grid[y][x + 1]);
    if (!cell.walls.bottom && y < tinggi - 1) neighbors.push(grid[y + 1][x]);
    if (!cell.walls.left && x > 0) neighbors.push(grid[y][x - 1]);

    return neighbors;
}

function countVisited() {
    let count = 0;
    for (let y = 0; y < tinggi; y++) {
        for (let x = 0; x < lebar; x++) {
            if (grid[y][x].visited) count++;
        }
    }
    return count;
}

function gambarJalur(path) {
    ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';

    for (let i = 0; i < path.length; i++) {
        const cell = path[i];
        if (cell !== startNode && cell !== endNode) {
            ctx.fillRect(cell.x * cellSize + 4, cell.y * cellSize + 4, cellSize - 8, cellSize - 8);
        }

        if (i < path.length - 1) {
            const nextCell = path[i + 1];
            drawPathArrow(cell, nextCell);
        }
    }

    redrawStartEnd();
}

function drawPathArrow(from, to) {
    const fromX = from.x * cellSize + cellSize / 2;
    const fromY = from.y * cellSize + cellSize / 2;
    const toX = to.x * cellSize + cellSize / 2;
    const toY = to.y * cellSize + cellSize / 2;

    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    const arrowLength = cellSize * 0.3;

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX - Math.cos(angle) * arrowLength / 2, toY - Math.sin(angle) * arrowLength / 2);
    ctx.stroke();
}

function tampilkanAnalisis() {
    if (!results.rekursif && !results.iteratif) {
        kontenAnalisis.innerHTML = '<p class="placeholder">Jalankan algoritma untuk melihat hasil analisis...</p>';
        return;
    }

    let html = '<div class="metrics">';

    if (results.rekursif || results.iteratif) {
        html += '<div class="metric-card">';
        html += '<h3>⏱️ Waktu Eksekusi</h3>';
        html += '<div class="metric-values">';

        if (results.rekursif) {
            html += '<div class="metric-value rekursif">';
            html += '<span class="label">Rekursif</span>';
            html += `<span class="value">${results.rekursif.time} ms</span>`;
            html += '</div>';
        }

        if (results.iteratif) {
            html += '<div class="metric-value iteratif">';
            html += '<span class="label">Iteratif</span>';
            html += `<span class="value">${results.iteratif.time} ms</span>`;
            html += '</div>';
        }

        html += '</div></div>';
    }

    if (results.rekursif || results.iteratif) {
        html += '<div class="metric-card">';
        html += '<h3>👣 Jumlah Langkah</h3>';
        html += '<div class="metric-values">';

        if (results.rekursif) {
            html += '<div class="metric-value rekursif">';
            html += '<span class="label">Rekursif</span>';
            html += `<span class="value">${results.rekursif.steps}</span>`;
            html += '</div>';
        }

        if (results.iteratif) {
            html += '<div class="metric-value iteratif">';
            html += '<span class="label">Iteratif</span>';
            html += `<span class="value">${results.iteratif.steps}</span>`;
            html += '</div>';
        }

        html += '</div></div>';
    }

    if (results.rekursif || results.iteratif) {
        html += '<div class="metric-card">';
        html += '<h3>🔍 Sel Terkunjungi</h3>';
        html += '<div class="metric-values">';

        if (results.rekursif) {
            html += '<div class="metric-value rekursif">';
            html += '<span class="label">Rekursif</span>';
            html += `<span class="value">${results.rekursif.visited} sel</span>`;
            html += '</div>';
        }

        if (results.iteratif) {
            html += '<div class="metric-value iteratif">';
            html += '<span class="label">Iteratif</span>';
            html += `<span class="value">${results.iteratif.visited} sel</span>`;
            html += '</div>';
        }

        html += '</div></div>';
    }

    if (results.rekursif || results.iteratif) {
        html += '<div class="metric-card">';
        html += '<h3>📏 Panjang Jalur Solusi</h3>';
        html += '<div class="metric-values">';

        if (results.rekursif) {
            html += '<div class="metric-value rekursif">';
            html += '<span class="label">Rekursif</span>';
            html += `<span class="value">${results.rekursif.pathLength} sel</span>`;
            html += '</div>';
        }

        if (results.iteratif) {
            html += '<div class="metric-value iteratif">';
            html += '<span class="label">Iteratif</span>';
            html += `<span class="value">${results.iteratif.pathLength} sel</span>`;
            html += '</div>';
        }

        html += '</div></div>';
    }

    if (results.rekursif || results.iteratif) {
        html += '<div class="metric-card">';
        html += '<h3>📊 Kedalaman Stack Maksimal</h3>';
        html += '<div class="metric-values">';

        if (results.rekursif) {
            html += '<div class="metric-value rekursif">';
            html += '<span class="label">Rekursif</span>';
            html += `<span class="value">${results.rekursif.maxDepth}</span>`;
            html += '</div>';
        }

        if (results.iteratif) {
            html += '<div class="metric-value iteratif">';
            html += '<span class="label">Iteratif</span>';
            html += `<span class="value">${results.iteratif.maxDepth}</span>`;
            html += '</div>';
        }

        html += '</div></div>';
    }

    html += '</div>';

    kontenAnalisis.innerHTML = html;

    if (results.rekursif && results.iteratif) {
        gambarGrafik();
    }
}

function gambarGrafik() {
    if (!results.rekursif || !results.iteratif) return;

    chartCtx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);

    const padding = 40;
    const chartWidth = chartCanvas.width - padding * 2;
    const chartHeight = chartCanvas.height - padding * 2;

    const maxTime = Math.max(results.rekursif.time, results.iteratif.time);
    const barWidth = chartWidth / 3;
    const spacing = barWidth / 2;

    chartCtx.fillStyle = '#f0f0f0';
    chartCtx.font = 'bold 14px Poppins';
    chartCtx.textAlign = 'center';
    chartCtx.fillText('Perbandingan Waktu Eksekusi (ms)', chartCanvas.width / 2, 20);

    const rekursifHeight = (results.rekursif.time / maxTime) * chartHeight;
    chartCtx.fillStyle = '#60a5fa';
    chartCtx.fillRect(padding + spacing, padding + chartHeight - rekursifHeight, barWidth, rekursifHeight);

    chartCtx.fillStyle = '#f0f0f0';
    chartCtx.font = '12px Poppins';
    chartCtx.fillText('Rekursif', padding + spacing + barWidth / 2, chartCanvas.height - 10);
    chartCtx.fillText(results.rekursif.time.toFixed(2), padding + spacing + barWidth / 2, padding + chartHeight - rekursifHeight - 5);

    const iteratifHeight = (results.iteratif.time / maxTime) * chartHeight;
    chartCtx.fillStyle = '#c084fc';
    chartCtx.fillRect(padding + spacing * 2 + barWidth, padding + chartHeight - iteratifHeight, barWidth, iteratifHeight);

    chartCtx.fillStyle = '#f0f0f0';
    chartCtx.fillText('Iteratif', padding + spacing * 2 + barWidth + barWidth / 2, chartCanvas.height - 10);
    chartCtx.fillText(results.iteratif.time.toFixed(2), padding + spacing * 2 + barWidth + barWidth / 2, padding + chartHeight - iteratifHeight - 5);
}

function bersihkanJalur() {
    for (let y = 0; y < tinggi; y++) {
        for (let x = 0; x < lebar; x++) {
            grid[y][x].visited = false;
            grid[y][x].inPath = false;
            grid[y][x].isBacktracking = false;
        }
    }
    gambarLabirin();

    stepCount.textContent = '0';
    currentMethod.textContent = '-';
    stackSize.textContent = '0';
    maxDepth.textContent = '0';
    algorithmStatus.textContent = 'Idle';
    algorithmStatus.style.color = '#888';
    stackBar.style.width = '0%';
    stepContent.innerHTML = '<p class="step-placeholder">Jalankan algoritma untuk melihat langkah-langkahnya...</p>';
}

function resetResults() {
    results.rekursif = null;
    results.iteratif = null;
    kontenAnalisis.innerHTML = '<p class="placeholder">Jalankan algoritma untuk melihat hasil analisis...</p>';
    chartCtx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
    calculationBox.style.display = 'none';
    // bersihkanJalur(); // REMOVED: Causes crash if dimensions changed before grid generation
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function disableButtons() {
    btnBuat.disabled = true;
    btnRekursif.disabled = true;
    btnIteratif.disabled = true;
    btnBersihkan.disabled = true;
}

function enableButtons() {
    btnBuat.disabled = false;
    btnRekursif.disabled = false;
    btnIteratif.disabled = false;
    btnBersihkan.disabled = false;
}

// --- Logic Murni (Tanpa DOM/Canvas Manipulation) ---

function generateBenchMaze(size) {
    // Versi sederhana dari buatLabirin() tanpa drawing
    let g = [];
    for (let y = 0; y < size; y++) {
        let row = [];
        for (let x = 0; x < size; x++) {
            row.push({ x, y, visited: false, walls: { top: true, right: true, bottom: true, left: true } });
        }
        g.push(row);
    }

    let stack = [g[0][0]];
    g[0][0].visited = true;

    while (stack.length > 0) {
        let curr = stack[stack.length - 1];
        let neighbors = [];
        const { x, y } = curr;

        if (y > 0 && !g[y - 1][x].visited) neighbors.push({ c: g[y - 1][x], dir: 'top' });
        if (x < size - 1 && !g[y][x + 1].visited) neighbors.push({ c: g[y][x + 1], dir: 'right' });
        if (y < size - 1 && !g[y + 1][x].visited) neighbors.push({ c: g[y + 1][x], dir: 'bottom' });
        if (x > 0 && !g[y][x - 1].visited) neighbors.push({ c: g[y][x - 1], dir: 'left' });

        if (neighbors.length > 0) {
            let chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
            // Remove wall
            if (chosen.dir === 'top') { curr.walls.top = false; chosen.c.walls.bottom = false; }
            else if (chosen.dir === 'right') { curr.walls.right = false; chosen.c.walls.left = false; }
            else if (chosen.dir === 'bottom') { curr.walls.bottom = false; chosen.c.walls.top = false; }
            else if (chosen.dir === 'left') { curr.walls.left = false; chosen.c.walls.right = false; }

            chosen.c.visited = true;
            stack.push(chosen.c);
        } else {
            stack.pop();
        }
    }
    // Reset visited
    for (let r of g) for (let c of r) c.visited = false;
    return g;
}

function solvePureRecursive(g, x, y, size) {
    if (x === size - 1 && y === size - 1) return true;
    g[y][x].visited = true;

    // Urutan: Top, Right, Bottom, Left
    if (!g[y][x].walls.top && !g[y - 1][x].visited && solvePureRecursive(g, x, y - 1, size)) return true;
    if (!g[y][x].walls.right && !g[y][x + 1].visited && solvePureRecursive(g, x + 1, y, size)) return true;
    if (!g[y][x].walls.bottom && !g[y + 1][x].visited && solvePureRecursive(g, x, y + 1, size)) return true;
    if (!g[y][x].walls.left && !g[y][x - 1].visited && solvePureRecursive(g, x - 1, y, size)) return true;

    return false;
}

function solvePureIterative(g, size) {
    let stack = [{ x: 0, y: 0 }];
    g[0][0].visited = true;
    while (stack.length > 0) {
        let curr = stack[stack.length - 1];
        if (curr.x === size - 1 && curr.y === size - 1) return true;

        let pushed = false;
        // Cek tetangga
        if (!g[curr.y][curr.x].walls.top && !g[curr.y - 1][curr.x].visited) {
            g[curr.y - 1][curr.x].visited = true;
            stack.push({ x: curr.x, y: curr.y - 1 }); pushed = true;
        } else if (!g[curr.y][curr.x].walls.right && !g[curr.y][curr.x + 1].visited) {
            g[curr.y][curr.x + 1].visited = true;
            stack.push({ x: curr.x + 1, y: curr.y }); pushed = true;
        } else if (!g[curr.y][curr.x].walls.bottom && !g[curr.y + 1][curr.x].visited) {
            g[curr.y + 1][curr.x].visited = true;
            stack.push({ x: curr.x, y: curr.y + 1 }); pushed = true;
        } else if (!g[curr.y][curr.x].walls.left && !g[curr.y][curr.x - 1].visited) {
            g[curr.y][curr.x - 1].visited = true;
            stack.push({ x: curr.x - 1, y: curr.y }); pushed = true;
        }

        if (!pushed) stack.pop();
    }
    return false;
}

function gambarGrafikTren(sizes, dataRec, dataIter) {
    const pad = 30;
    const w = chartCanvas.width - pad * 2;
    const h = chartCanvas.height - pad * 2;

    const maxVal = Math.max(...dataRec, ...dataIter) * 1.2;

    const getX = (i) => pad + (i / (sizes.length - 1)) * w;
    const getY = (val) => chartCanvas.height - pad - (val / maxVal) * h;

    chartCtx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);

    chartCtx.strokeStyle = '#444';
    chartCtx.lineWidth = 1;
    chartCtx.beginPath();
    chartCtx.moveTo(pad, pad);
    chartCtx.lineTo(pad, chartCanvas.height - pad);
    chartCtx.lineTo(chartCanvas.width - pad, chartCanvas.height - pad);
    chartCtx.stroke();

    drawDataLine(sizes, dataRec, '#60a5fa', getX, getY);
    drawDataLine(sizes, dataIter, '#c084fc', getX, getY);

    chartCtx.fillStyle = '#bbb';
    chartCtx.font = '10px Poppins';
    chartCtx.textAlign = 'center';

    sizes.forEach((s, i) => {
        chartCtx.fillText(s, getX(i), chartCanvas.height - pad + 15);
    });

    chartCtx.fillStyle = '#f0f0f0';
    chartCtx.font = 'bold 12px Poppins';
    chartCtx.fillText("Tren Waktu (Input Size vs Time)", chartCanvas.width / 2, 15);
}

function drawDataLine(sizes, data, color, getX, getY) {
    chartCtx.strokeStyle = color;
    chartCtx.lineWidth = 2;
    chartCtx.beginPath();

    data.forEach((val, i) => {
        const x = getX(i);
        const y = getY(val);
        if (i === 0) chartCtx.moveTo(x, y);
        else chartCtx.lineTo(x, y);

        chartCtx.save();
        chartCtx.fillStyle = color;
        chartCtx.fillRect(x - 3, y - 3, 6, 6);
        chartCtx.restore();
    });
    chartCtx.stroke();
}

function tampilkanTabelBenchmark(sizes, rec, iter) {
    let html = '<div class="metric-card" style="border-left-color: #8b5cf6;">';
    html += '<h3>📈 Hasil Benchmark</h3>';
    html += '<table style="width:100%; font-size: 0.8rem; color: #ccc; text-align: left;">';
    html += '<tr style="border-bottom: 1px solid #444;"><th style="padding:5px;">Size</th><th>Rekursif (ms)</th><th>Iteratif (ms)</th></tr>';

    for (let i = 0; i < sizes.length; i++) {
        html += `<tr>
            <td style="padding:5px;">${sizes[i]}x${sizes[i]}</td>
            <td style="color:#60a5fa;">${rec[i].toFixed(2)}</td>
            <td style="color:#c084fc;">${iter[i].toFixed(2)}</td>
        </tr>`;
    }
    html += '</table>';
    html += '<p style="font-size: 0.75rem; margin-top: 10px; color: #888;">*Sumbu X: Ukuran Sisi Labirin, Sumbu Y: Waktu Eksekusi</p></div>';

    kontenAnalisis.innerHTML = html;
}

init();
