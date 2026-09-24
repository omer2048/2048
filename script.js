let board = Array(16).fill(0);
let score = 0;
let bestScore = 0;
let startX = 0;
let startY = 0;
let aiEnabled = false; // BAŞLANGIÇTA KAPALI YAPTIK, "Y"ye basınca açılacak

function loadGameState() {
    const savedBest = localStorage.getItem("2048_bestScore");
    if (savedBest) {
        bestScore = parseInt(savedBest);
        document.getElementById("best-score").innerText = bestScore;
    }

    const savedBoard = localStorage.getItem("2048_board");
    const savedScore = localStorage.getItem("2048_score");

    if (savedBoard && savedScore) {
        board = JSON.parse(savedBoard);
        score = parseInt(savedScore);
        updateScore();
        renderBoard();
        if (isGameOverState()) {
            document.getElementById("game-over").classList.remove("hidden");
        } else {
            triggerAI();
        }
    } else {
        startGame();
    }
}

function saveGameState() {
    localStorage.setItem("2048_board", JSON.stringify(board));
    localStorage.setItem("2048_score", score.toString());
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("2048_bestScore", bestScore.toString());
        document.getElementById("best-score").innerText = bestScore;
    }
}

function startGame() {
    board = Array(16).fill(0);
    score = 0;
    updateScore();
    document.getElementById("game-over").classList.add("hidden"); 
    addTile();
    addTile();
    renderBoard();
    saveGameState();
    triggerAI();
}

function addTile() {
    let emptyCells = board.map((val, idx) => val === 0 ? idx : null).filter(val => val !== null);
    if (emptyCells.length > 0) {
        let randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        board[randomCell] = Math.random() < 0.9 ? 2 : 4;
    }
}

function renderBoard() {
    const container = document.getElementById("grid-container");
    container.innerHTML = "";
    board.forEach(val => {
        const tile = document.createElement("div");
        tile.classList.add("tile");
        if (val > 0) {
            tile.classList.add(`tile-${val}`);
            tile.innerText = val;
        }
        container.appendChild(tile);
    });
}

function updateScore() {
    document.getElementById("score").innerText = score;
    const currentBest = localStorage.getItem("2048_bestScore") || 0;
    document.getElementById("best-score").innerText = Math.max(score, currentBest);
}

function slide(row) {
    let arr = row.filter(val => val);
    let missing = 4 - arr.length;
    return arr.concat(Array(missing).fill(0));
}

function combine(row) {
    let scoreGain = 0;
    for (let i = 0; i < 3; i++) {
        if (row[i] === row[i + 1] && row[i] !== 0) {
            row[i] = row[i] * 2;
            scoreGain += row[i];
            row[i + 1] = 0;
        }
    }
    return { row, scoreGain };
}

function simulateLeft(tempBoard) {
    let changed = false;
    let scoreGain = 0;
    for (let i = 0; i < 4; i++) {
        let start = i * 4;
        let row = tempBoard.slice(start, start + 4);
        let slid1 = slide(row);
        let combinedResult = combine(slid1);
        let nextRow = slide(combinedResult.row);
        scoreGain += combinedResult.scoreGain;
        if (JSON.stringify(row) !== JSON.stringify(nextRow)) changed = true;
        tempBoard.splice(start, 4, ...nextRow);
    }
    return { board: tempBoard, changed, scoreGain };
}

function simulateRotate(tempBoard) {
    let newBoard = Array(16).fill(0);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            newBoard[j * 4 + (3 - i)] = tempBoard[i * 4 + j];
        }
    }
    return newBoard;
}

function simulateMove(tempBoard, direction) {
    let b = [...tempBoard];
    let rotations = { "Left": 0, "Up": 3, "Right": 2, "Down": 1 }[direction];
    for (let i = 0; i < rotations; i++) b = simulateRotate(b);
    let res = simulateLeft(b);
    for (let i = 0; i < (4 - rotations) % 4; i++) res.board = simulateRotate(res.board);
    return { board: res.board, changed: res.changed, scoreGain: res.scoreGain };
}

function handleMove(direction) {
    if (!document.getElementById("game-over").classList.contains("hidden")) return;
    let result = simulateMove(board, direction);
    if (result.changed) {
        board = result.board;
        score += result.scoreGain;
        addTile();
        updateScore();
        renderBoard();
        saveGameState();
        checkGameOver();
        if (document.getElementById("game-over").classList.contains("hidden")) {
            triggerAI();
        }
    }
}

const WEIGHT_MATRIX = [
    2048, 1024, 512, 256,
    16,   32,   64,  128,
    8,    4,    2,   1,
    0.5,  0.2,  0.1, 0.05
];

function evaluateBoard(grid) {
    let score = 0;
    for (let i = 0; i < 16; i++) score += grid[i] * WEIGHT_MATRIX[i];
    let emptyCells = grid.filter(v => v === 0).length;
    score += emptyCells * 5000; 
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 3; j++) {
            if (grid[i*4+j] === grid[i*4+j+1] && grid[i*4+j] !== 0) score += grid[i*4+j] * 50;
            if (grid[j*4+i] === grid[(j+1)*4+i] && grid[j*4+i] !== 0) score += grid[j*4+i] * 50;
        }
    }
    return score;
}

function expectimax(grid, depth, isPlayerTurn) {
    if (depth === 0) return evaluateBoard(grid);
    if (isPlayerTurn) {
        let maxVal = -Infinity;
        ["Left", "Up", "Right", "Down"].forEach(dir => {
            let sim = simulateMove(grid, dir);
            if (sim.changed) {
                let val = expectimax(sim.board, depth - 1, false);
                if (val > maxVal) maxVal = val;
            }
        });
        return maxVal === -Infinity ? evaluateBoard(grid) : maxVal;
    } else {
        let totalVal = 0;
        let emptyCells = [];
        for (let i = 0; i < 16; i++) if (grid[i] === 0) emptyCells.push(i);
        if (emptyCells.length === 0) return evaluateBoard(grid);
        emptyCells.forEach(idx => {
            let grid2 = [...grid]; grid2[idx] = 2;
            totalVal += expectimax(grid2, depth - 1, true) * (0.9 / emptyCells.length);
            let grid4 = [...grid]; grid4[idx] = 4;
            totalVal += expectimax(grid4, depth - 1, true) * (0.1 / emptyCells.length);
        });
        return totalVal;
    }
}

function triggerAI() {
    if (!aiEnabled) {
        document.getElementById("ai-arrow-icon").innerText = "";
        return;
    }
    
    let directions = ["Left", "Up", "Right", "Down"];
    let bestDirection = "Yok";
    let bestScore = -Infinity;

    directions.forEach(dir => {
        let sim = simulateMove(board, dir);
        if (!sim.changed) return;
        let score = expectimax(sim.board, 3, false);
        if (score > bestScore) { bestScore = score; bestDirection = dir; }
    });

    let arrowIcon = { "Left": "◀", "Right": "▶", "Up": "▲", "Down": "▼", "Yok": "" }[bestDirection];
    document.getElementById("ai-arrow-icon").innerText = arrowIcon;
}

function isGameOverState() {
    if (board.includes(0)) return false;
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            let current = board[i * 4 + j];
            if (j < 3 && current === board[i * 4 + (j + 1)]) return false;
            if (i < 3 && current === board[(i + 1) * 4 + j]) return false;
        }
    }
    return true;
}

function checkGameOver() {
    if (isGameOverState()) {
        document.getElementById("game-over").classList.remove("hidden");
        document.getElementById("ai-arrow-icon").innerText = "";
    }
}

// KONTROLLER VE GİZLİ "Y" TUŞU DİNLEYİCİSİ
document.addEventListener("keydown", event => {
    // Gizli Hile Tuşu: Y veya y'ye basınca modu değiştirir
    if (event.key === "y" || event.key === "Y") {
        aiEnabled = !aiEnabled;
        triggerAI();
        return;
    }

    if (event.key === "ArrowLeft") handleMove("Left");
    if (event.key === "ArrowRight") handleMove("Right");
    if (event.key === "ArrowUp") handleMove("Up");
    if (event.key === "ArrowDown") handleMove("Down");
});

document.getElementById("btn-up").addEventListener("click", () => handleMove("Up"));
document.getElementById("btn-down").addEventListener("click", () => handleMove("Down"));
document.getElementById("btn-left").addEventListener("click", () => handleMove("Left"));
document.getElementById("btn-right").addEventListener("click", () => handleMove("Right"));
document.getElementById("new-game-btn").addEventListener("click", startGame);

const targetZone = document.getElementById("grid-container");
targetZone.addEventListener('pointerdown', (e) => { startX = e.clientX; startY = e.clientY; });
targetZone.addEventListener('pointerup', (e) => {
    let diffX = e.clientX - startX; let diffY = e.clientY - startY;
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > 30) { if (diffX > 0) handleMove("Right"); else handleMove("Left"); }
    } else {
        if (Math.abs(diffY) > 30) { if (diffY > 0) handleMove("Down"); else handleMove("Up"); }
    }
});

window.onload = loadGameState;
