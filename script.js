import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ======== SETUP GAME ROOM ========
const params = new URLSearchParams(window.location.search);
const room = params.get("room") || "default-room";
const boardRef = ref(db, `games/${room}/board`);
const turnRef = ref(db, `games/${room}/turn`);

let board = Array(9).fill("");
let currentTurn = "X";

// ======== HTML ELEMENTS ========
const boardEl = document.getElementById("board");
const resetBtn = document.getElementById("resetBtn");
const turnInfo = document.getElementById("turnInfo");
const playerSymbolEl = document.getElementById("playerSymbol");

// ======== DETERMINE PLAYER SYMBOL ========
const mySymbol = Math.random() > 0.5 ? "X" : "O";
playerSymbolEl.textContent = mySymbol === "X" ? "❌" : "🔵";

// ======== RENDER BOARD ========
function renderBoard() {
  boardEl.innerHTML = "";
  board.forEach((cellVal, i) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.textContent = cellVal;
    cell.onclick = () => handleMove(i);
    boardEl.appendChild(cell);
  });

  turnInfo.textContent = `Sekarang giliran: ${currentTurn}`;
}

// ======== HANDLE MOVE ========
function handleMove(index) {
  if (board[index] !== "" || currentTurn !== mySymbol) return;
  board[index] = mySymbol;
  set(boardRef, board);
  set(turnRef, mySymbol === "X" ? "O" : "X");
}

// ======== RESET GAME ========
resetBtn.onclick = () => {
  set(boardRef, Array(9).fill(""));
  set(turnRef, "X");
};

// ======== FIREBASE SYNC ========
onValue(boardRef, (snapshot) => {
  const data = snapshot.val();
  if (data) board = data;
  renderBoard();
});

onValue(turnRef, (snapshot) => {
  currentTurn = snapshot.val() || "X";
  turnInfo.textContent = `Sekarang giliran: ${currentTurn}`;
});

// ======== INITIALIZE ========
renderBoard();
set(turnRef, "X");
