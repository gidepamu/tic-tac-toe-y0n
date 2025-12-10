// === Firebase Imports ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

// === Firebase Init ===
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// === HTML Elements ===
const lobby = document.getElementById("lobby");
const suitSection = document.getElementById("suitSection");
const game = document.getElementById("game");
const boardEl = document.getElementById("board");
const turnInfo = document.getElementById("turnInfo");
const scoreInfo = document.getElementById("scoreInfo");
const resetBtn = document.getElementById("resetBtn");
const joinBtn = document.getElementById("joinBtn");
const suitButtons = document.querySelectorAll(".suit");
const suitStatus = document.getElementById("suitStatus");

// === Variables ===
let playerName, room, mySymbol;
let board = Array(9).fill("");
let currentTurn = "X";
let gameOver = false;
let scores = { X: 0, O: 0 };

// === Gabung ke Game ===
joinBtn.onclick = async () => {
  playerName = document.getElementById("playerName").value.trim();
  room = document.getElementById("roomName").value.trim();

  if (!playerName || !room) return alert("Isi nama dan room dulu!");

  // Reset data room di Firebase biar gak bentrok dari game lama
  set(ref(db, `games/${room}/suit`), {});
  set(ref(db, `games/${room}/board`), Array(9).fill(""));
  set(ref(db, `games/${room}/turn`), "X");

  // Update URL biar bisa dibagikan
  const newUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(room)}&name=${encodeURIComponent(playerName)}`;
  window.history.pushState({}, "", newUrl);

  // Tampilkan halaman suit
  lobby.style.display = "none";
  suitSection.style.display = "block";
};

// === SUIT Logic ===
suitButtons.forEach(btn => {
  btn.onclick = () => {
    const choice = btn.dataset.choice;
    set(ref(db, `games/${room}/suit/${playerName}`), choice);
    suitStatus.textContent = `${playerName} sudah memilih, menunggu lawan...`;
  };
});

// === Pantau dan Proses Hasil SUIT ===
onValue(ref(db, `games/${room}/suit`), (snapshot) => {
  const data = snapshot.val();

  // Belum ada siapa pun
  if (!data || Object.keys(data).length === 0) {
    suitStatus.textContent = "Menunggu lawan bergabung ke room...";
    return;
  }

  // Hanya 1 pemain yang sudah memilih
  if (Object.keys(data).length === 1) {
    const [p] = Object.keys(data);
    if (p === playerName)
      suitStatus.textContent = "Menunggu lawan memilih...";
    else
      suitStatus.textContent = "Lawan sudah memilih, giliran kamu!";
    return;
  }

  // Dua pemain sudah memilih — tentukan pemenang suit
  if (Object.keys(data).length === 2) {
    const [p1, p2] = Object.keys(data);
    const c1 = data[p1], c2 = data[p2];
    let winner = null;

    if (c1 === c2) {
      suitStatus.textContent = "Seri! Suit ulang...";
      set(ref(db, `games/${room}/suit`), {}); // reset
      return;
    }

    // Tentukan pemenang suit
    if (
      (c1 === "batu" && c2 === "gunting") ||
      (c1 === "gunting" && c2 === "kertas") ||
      (c1 === "kertas" && c2 === "batu")
    ) winner = p1;
    else winner = p2;

    // Tentukan simbol pemain
    mySymbol = (playerName === winner) ? "X" : "O";

    // Set giliran pertama di Firebase
    set(ref(db, `games/${room}/turn`), "X");

    suitStatus.textContent = `${winner} menang suit dan main duluan!`;

    // Tampilkan papan game setelah 1.5 detik
    setTimeout(() => {
      suitSection.style.display = "none";
      game.style.display = "block";
    }, 1500);
  }
});

// === Game Logic ===
onValue(ref(db, `games/${room}/board`), (snapshot) => {
  const data = snapshot.val();
  if (data) board = data;
  renderBoard();
});

onValue(ref(db, `games/${room}/turn`), (snapshot) => {
  currentTurn = snapshot.val() || "X";
  turnInfo.textContent = `Giliran: ${currentTurn}`;
});

onValue(ref(db, `games/${room}/scores`), (snapshot) => {
  const data = snapshot.val();
  if (data) scores = data;
  updateScore();
});

// === Render Board ===
function renderBoard() {
  boardEl.innerHTML = "";
  board.forEach((val, i) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.textContent = val;
    cell.onclick = () => makeMove(i);
    boardEl.appendChild(cell);
  });
}

// === Player Move ===
function makeMove(i) {
  if (gameOver || board[i] !== "" || currentTurn !== mySymbol) return;
  board[i] = mySymbol;
  set(ref(db, `games/${room}/board`), board);
  checkWinner();
  set(ref(db, `games/${room}/turn`), mySymbol === "X" ? "O" : "X");
}

// === Check Winner ===
function checkWinner() {
  const winCombos = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b,c] of winCombos) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      gameOver = true;
      alert(`Pemain ${board[a]} menang!`);
      scores[board[a]] += 1;
      set(ref(db, `games/${room}/scores`), scores);
      return;
    }
  }
  if (!board.includes("")) {
    gameOver = true;
    alert("Seri!");
  }
}

// === Update Score Display ===
function updateScore() {
  scoreInfo.textContent = `Skor ❌: ${scores["X"] || 0} | 🔵: ${scores["O"] || 0}`;
}

// === Reset Game ===
resetBtn.onclick = () => {
  set(ref(db, `games/${room}/board`), Array(9).fill(""));
  gameOver = false;
};
