import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Elemen HTML
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

let playerName, room, mySymbol;
let board = Array(9).fill("");
let currentTurn = "X";
let gameOver = false;
let scores = { X: 0, O: 0 };

// Gabung Game
joinBtn.onclick = async () => {
  playerName = document.getElementById("playerName").value.trim();
  room = document.getElementById("roomName").value.trim();
  if (!playerName || !room) return alert("Isi nama dan room dulu!");

  lobby.style.display = "none";
  suitSection.style.display = "block";
};

// SUIT: batu gunting kertas
suitButtons.forEach(btn => {
  btn.onclick = () => {
    const choice = btn.dataset.choice;
    set(ref(db, `games/${room}/suit/${playerName}`), choice);
    suitStatus.textContent = "Menunggu lawan memilih...";
  };
});

// Pantau apakah lawan sudah bergabung
onValue(ref(db, `games/${room}/suit`), (snapshot) => {
  const data = snapshot.val();
  if (!data || Object.keys(data).length === 0) {
    suitStatus.textContent = "Menunggu lawan bergabung ke room...";
  }
});

// Cek hasil suit
onValue(ref(db, `games/${room}/suit`), (snapshot) => {
  const data = snapshot.val();
  if (data && Object.keys(data).length === 2) {
    const [p1, p2] = Object.keys(data);
    const c1 = data[p1], c2 = data[p2];
    let winner = null;

    if (c1 === c2) {
      suitStatus.textContent = "Seri, suit ulang!";
      set(ref(db, `games/${room}/suit`), {}); // reset
      return;
    }

    if (
      (c1 === "batu" && c2 === "gunting") ||
      (c1 === "gunting" && c2 === "kertas") ||
      (c1 === "kertas" && c2 === "batu")
    ) winner = p1;
    else winner = p2;

    set(ref(db, `games/${room}/turn`), winner === p1 ? "X" : "O");
    suitSection.style.display = "none";
    game.style.display = "block";
  }
});

// Game Logic
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

function makeMove(i) {
  if (gameOver || board[i] !== "" || currentTurn !== mySymbol) return;
  board[i] = mySymbol;
  set(ref(db, `games/${room}/board`), board);
  checkWinner();
  set(ref(db, `games/${room}/turn`), mySymbol === "X" ? "O" : "X");
}

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

function updateScore() {
  scoreInfo.textContent = `Skor ❌: ${scores["X"] || 0} | 🔵: ${scores["O"] || 0}`;
}

resetBtn.onclick = () => {
  set(ref(db, `games/${room}/board`), Array(9).fill(""));
  gameOver = false;
};
