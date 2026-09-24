let board = Array(16).fill(0);
let score = 0;

function startGame() {
    board = Array(16).fill(0);
    score = 0;
    updateScore();
    document.getElementById("game-over").classList.add("hidden"); 
    addTile();
    addTile();
    renderBoard();
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
}

function slide(row) {
    let arr = row.filter(val => val);
    let missing = 4 - arr.length;
    let zeros = Array(missing).fill(0);
    return arr.concat(zeros);
}

function combine(row) {
    for (let i = 0; i < 3; i++) {
        if (row[i] === row[i + 1] && row[i] !== 0) {
            row[i] = row[i] * 2;
            score += row[i];
            row[i + 1] = 0;
        }
    }
    return row;
}

function moveLeft() {
    let changed = false;
    for (let i = 0; i < 4; i++) {
        let start = i * 4;
        let row = board.slice(start, start + 4);
        let nextRow = slide(combine(slide(row)));
        if (JSON.stringify(row) !== JSON.stringify(nextRow)) changed = true;
        board.splice(start, 4, ...nextRow);
    }
    return changed;
}

function rotate() {
    let newBoard = Array(16).fill(0);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            newBoard[j * 4 + (3 - i)] = board[i * 4 + j];
        }
    }
    board = newBoard;
}

function handleMove(direction) {
    // Eğer oyun zaten bittiyse hareket etmeyi engelle
    if (!document.getElementById("game-over").classList.contains("hidden")) return;

    let moved = false;
    let rotations = { "Left": 0, "Up": 3, "Right": 2, "Down": 1 }[direction];
    
    for (let i = 0; i < rotations; i++) rotate();
    moved = moveLeft();
    for (let i = 0; i < (4 - rotations) % 4; i++) rotate();

    if (moved) {
        addTile();
        updateScore();
        renderBoard();
        checkGameOver();
    }
}

// DOĞRU OYUN BİTİŞ KONTROLÜ
function checkGameOver() {
    // 1. Eğer hala boş kutu varsa oyun bitmemiştir
    if (board.includes(0)) return;

    // 2. Yan yana veya alt alta aynı sayılar var mı kontrol et
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            let current = board[i * 4 + j];
            
            // Sağındakiyle aynı mı?
            if (j < 3 && current === board[i * 4 + (j + 1)]) return;
            // Altındakiyle aynı mı?
            if (i < 3 && current === board[(i + 1) * 4 + j]) return;
        }
    }

    // Hem boş yer yok hem birleşecek sayı yoksa oyun biter
    document.getElementById("game-over").classList.remove("hidden");
}

// KLAVYE KONTROLLERİ
document.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") handleMove("Left");
    if (event.key === "ArrowRight") handleMove("Right");
    if (event.key === "ArrowUp") handleMove("Up");
    if (event.key === "ArrowDown") handleMove("Down");
});

// EKRANDAKİ BUTON KONTROLLERİ
document.getElementById("btn-up").addEventListener("click", () => handleMove("Up"));
document.getElementById("btn-down").addEventListener("click", () => handleMove("Down"));
document.getElementById("btn-left").addEventListener("click", () => handleMove("Left"));
document.getElementById("btn-right").addEventListener("click", () => handleMove("Right"));

// YENİ OYUN BUTON KONTROLÜ
document.getElementById("new-game-btn").addEventListener("click", startGame);

window.onload = startGame;
