/**
 * UI Module
 * Handles all user interface updates and DOM manipulation
 */

import { ANIMATION_CONFIG } from "./config.js";

// ═══════════════════════════════════════════════════════════════════════════
// GAME INFO DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

export function updateGameInfo(gameState) {
  const info = document.getElementById("gameInfo");
  if (!info) return;

  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const playerScores = gameState.players
    .map((p) => `${p.color}: ${p.score}`)
    .join(" | ");

  const isDebug = false; // Set to true to show game ID

  info.innerHTML = `
    ${isDebug ? `<strong>Game ID:</strong> ${gameState.gameId}<br>` : ""}
    <strong>Players:</strong> ${gameState.players.length}<br>
    <strong>Status:</strong> ${gameState.status}<br>
    <strong>Active Player:</strong>
    <span style="color: ${activePlayer.color}">
      ${activePlayer.color}
    </span><br>
    <strong>Scores:</strong> ${playerScores}
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUND COLOR
// ═══════════════════════════════════════════════════════════════════════════

export function updateActivePlayerBackground(gameState) {
  const grid = document.getElementById("cardGrid");
  if (!grid) return;

  // Add smooth transition on first call
  if (!grid.style.transition) {
    grid.style.transition = `background-color ${ANIMATION_CONFIG.BACKGROUND_TRANSITION}`;
  }

  const activePlayer = gameState.players[gameState.activePlayerIndex];
  grid.style.backgroundColor = activePlayer.color;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTION STATUS
// ═══════════════════════════════════════════════════════════════════════════

export function updateConnectionStatus(isConnected) {
  const statusEl = document.getElementById("connectionStatus");
  if (!statusEl) return;

  if (isConnected) {
    statusEl.className = "status connected";
    statusEl.textContent = "✅ Connected to server";
  } else {
    statusEl.className = "status disconnected";
    statusEl.textContent = "❌ Disconnected from server";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR MESSAGES
// ═══════════════════════════════════════════════════════════════════════════

export function showError(errorMessage) {
  const errorBox = document.getElementById("errorBox");
  if (!errorBox) return;

  errorBox.innerHTML = `<div class="error">❌ ${errorMessage}</div>`;

  setTimeout(() => {
    errorBox.innerHTML = "";
  }, 3000);
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME START PLACEHOLDER
// ═══════════════════════════════════════════════════════════════════════════

export function showStartingPlaceholder() {
  const grid = document.getElementById("cardGrid");
  if (!grid) return;

  let ph = document.getElementById("startingPlaceholder");
  if (!ph) {
    ph = document.createElement("div");
    ph.id = "startingPlaceholder";
    ph.style.textAlign = "center";
    ph.style.color = "#888";
    ph.textContent = "Starting new game...";
    grid.appendChild(ph);
  } else {
    ph.textContent = "Starting new game...";
    ph.style.display = "block";
  }
}

export function hideStartingPlaceholder() {
  const ph = document.getElementById("startingPlaceholder");
  if (ph && ph.parentNode) {
    ph.parentNode.removeChild(ph);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WIN POPUP
// ═══════════════════════════════════════════════════════════════════════════

let hasShownWinPopupForGameId = null;

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c];
  });
}

function getWinners(gameState) {
  const maxScore = Math.max(...gameState.players.map((p) => p.score));
  const winners = gameState.players.filter((p) => p.score === maxScore);
  return { winners, maxScore };
}

export function showWinPopup(
  gameState,
  onPlayAgain,
  onConfettiStart,
  onConfettiStop,
) {
  // Prevent showing popup multiple times for same game
  if (hasShownWinPopupForGameId === gameState.gameId) return;
  hasShownWinPopupForGameId = gameState.gameId;

  // Start confetti
  if (onConfettiStart) {
    onConfettiStart();
  }

  const { winners, maxScore } = getWinners(gameState);
  const isDraw = winners.length > 1;

  const title = isDraw
    ? "It's a draw, you need more therapy!"
    : ` Congratulation ${winners.map((w) => w.color).join(" & ")}! You are the winner of Couples Therapy!`;

  const scoreText = gameState.players
    .map((p) => `${p.color}: ${p.score}`)
    .join(" • ");

  const overlay = document.createElement("div");
  overlay.className = "win-overlay";
  overlay.innerHTML = `
    <div class="win-modal">
      <div class="win-title">${escapeHTML(title)}</div>
      <div class="win-scores">${escapeHTML(scoreText)}</div>

      <div class="win-buttons">
        <button class="win-btn secondary" id="closeWinModal">Close</button>
        <button class="win-btn primary" id="playAgainBtn">Play again</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close popup handler
  const closePopup = () => {
    overlay.remove();
    if (onConfettiStop) {
      onConfettiStop();
    }
  };

  // Close on click outside
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePopup();
  });

  // Close button
  overlay
    .querySelector("#closeWinModal")
    ?.addEventListener("click", closePopup);

  // Play again button
  overlay.querySelector("#playAgainBtn")?.addEventListener("click", () => {
    closePopup();
    if (onPlayAgain) {
      onPlayAgain(gameState.players.length);
    }
  });
}

// Reset win popup tracking (useful when starting a new game)
export function resetWinPopupTracking() {
  hasShownWinPopupForGameId = null;
}
