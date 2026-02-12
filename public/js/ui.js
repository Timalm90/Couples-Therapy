/**
 * UI Module
 * Handles all user interface updates and DOM manipulation
 */

import { ANIMATION_CONFIG } from "./config.js";

// Map server color values (names or hex) to user-friendly labels
const COLOR_LABEL = {
  "#ff6b81": "red",
  "#ffd54a": "yellow",
  "#7fb3ff": "blue",
  "#8bd48b": "green",
  red: "red",
  yellow: "yellow",
  blue: "blue",
  green: "green",
};

function normalizeLabel(col) {
  if (!col) return col;
  const key = String(col).toLowerCase();
  return COLOR_LABEL[key] || col;
}

// Helper: darken/lighten hex color
function shadeColor(color, percent) {
  let f = parseInt(color.slice(1), 16),
      t = percent < 0 ? 0 : 255,
      p = Math.abs(percent) / 100,
      R = f >> 16,
      G = (f >> 8) & 0x00ff,
      B = f & 0x0000ff;
  return (
    "#" +
    (
      0x1000000 +
      (Math.round((t - R) * p) + R) * 0x10000 +
      (Math.round((t - G) * p) + G) * 0x100 +
      (Math.round((t - B) * p) + B)
    )
      .toString(16)
      .slice(1)
  );
}

// Generate radial gradient CSS string for a given base color
function createRadialGradient(color) {
  const inner = color;
  const outer = shadeColor(color, -55); // slightly darker at edges
  return `radial-gradient(circle at center, ${inner} 0%, ${outer} 90%)`;
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME INFO DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

export function updateGameInfo(gameState) {
  const info = document.getElementById("gameInfo");
  if (!info) return;

  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const playerScores = gameState.players
    .map((p) => `${normalizeLabel(p.color)}: ${p.score}`)
    .join(" | ");

  const isDebug = false; // Set to true to show game ID

  info.innerHTML = `
    ${isDebug ? `<strong>Game ID:</strong> ${gameState.gameId}<br>` : ""}
    <strong>Players:</strong> ${gameState.players.length}<br>
    <strong>Status:</strong> ${gameState.status}<br>
    <strong>Active Player:</strong>
    <span style="color: ${activePlayer.color}">
      ${normalizeLabel(activePlayer.color)}
    </span><br>
    <strong>Scores:</strong> ${playerScores}
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUND GRADIENT
// ═══════════════════════════════════════════════════════════════════════════

export function updateActivePlayerBackground(gameState) {
  const board = document.querySelector(".board");
  if (!board) return;

  // Add smooth transition on first call
  if (!board.style.transition) {
    board.style.transition = `background 0.5s ease`;
  }

  const activePlayer = gameState.players[gameState.activePlayerIndex];

  // Map logical player color names to the visual board colors (pastel)
  const BOARD_COLOR_MAP = {
    red: "#ff6b81",
    yellow: "#ffd54a",
    blue: "#7fb3ff",
    green: "#8bd48b",
  };

  const baseColor = BOARD_COLOR_MAP[activePlayer.color] || activePlayer.color;

  // Apply radiant gradient
  board.style.background = createRadialGradient(baseColor);

  // Keep possible blurred pseudo-element in sync
  try {
    const blurEl = board.querySelector(".frame-blur");
    if (blurEl) blurEl.style.background = createRadialGradient(baseColor);
  } catch (e) {
    // ignore
  }
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
  if (hasShownWinPopupForGameId === gameState.gameId) return;
  hasShownWinPopupForGameId = gameState.gameId;

  if (onConfettiStart) onConfettiStart();

  const { winners } = getWinners(gameState);
  const isDraw = winners.length > 1;

  const title = isDraw
    ? "It's a draw, you need more therapy!"
    : ` Congratulation ${winners.map((w) => normalizeLabel(w.color)).join(" & ")}! You are the winner of Couples Therapy!`;

  const scoreText = gameState.players
    .map((p) => `${normalizeLabel(p.color)}: ${p.score}`)
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

  const closePopup = () => {
    overlay.remove();
    if (onConfettiStop) onConfettiStop();
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePopup();
  });

  overlay.querySelector("#closeWinModal")?.addEventListener("click", closePopup);
  overlay.querySelector("#playAgainBtn")?.addEventListener("click", () => {
    closePopup();
    if (onPlayAgain) onPlayAgain(gameState.players.length);
  });
}

export function resetWinPopupTracking() {
  hasShownWinPopupForGameId = null;
}
