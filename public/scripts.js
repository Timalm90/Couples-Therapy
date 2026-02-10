import gameClient from "../client.js";
import {
  launchFullscreenConfetti,
  stopFullscreenConfetti,
} from "../animations.js";
import { initScene, updateFromGameState } from "../scene.js";

// ===== GAME STATE =====
let currentGameState = null;

// ===== CONNECT TO SERVER =====
gameClient.connect();

// Initialize Three.js scene and wire clicks -> flip messages
initScene((cardId) => {
  if (
    !currentGameState ||
    currentGameState.status !== "playing"
  ) return;

  gameClient.flipCard(cardId);
});

// ===== CONNECTION STATUS =====
gameClient.onConnectionChange = (isConnected) => {
  const statusEl = document.getElementById("connectionStatus");
  if (statusEl) {
    if (isConnected) {
      statusEl.className = "status connected";
      statusEl.textContent = "✅ Connected to server";
    } else {
      statusEl.className = "status disconnected";
      statusEl.textContent = "❌ Disconnected from server";
    }
  }
};

// (handler consolidated later)

// ===== ERROR HANDLING =====
gameClient.onError = (errorMessage) => {
  const errorBox = document.getElementById("errorBox");
  if (errorBox) {
    errorBox.innerHTML = `<div class="error">❌ ${errorMessage}</div>`;
    setTimeout(() => {
      errorBox.innerHTML = "";
    }, 3000);
  }
};

// ===== UPDATE GAME INFO =====
function updateGameInfo(gameState) {
  const info = document.getElementById("gameInfo");
  if (!info) return;

  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const playerScores = gameState.players
    .map((p) => `${p.color}: ${p.score}`)
    .join(" | ");

  const isDebug = false; // ändra till true vid behov


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

// ===== RENDER CARDS =====
function renderCards(gameState) {
  const grid = document.getElementById("cardGrid");
  if (!grid) return;

  grid.innerHTML = "";

  gameState.cards.forEach((card) => {
    const cardEl = document.createElement("div");
    cardEl.className = "card";

    // Show value if face up
    if (card.isFaceUp && card.value) {
      cardEl.textContent = card.value;
      cardEl.classList.add("faceup");
    } else {
      cardEl.textContent = "?";
    }

    // Mark matched cards
    if (card.isMatched) {
      cardEl.classList.add("matched");
    }

    // Click handler
    cardEl.addEventListener("click", () => {
      if (
        !card.isMatched &&
        currentGameState &&
        currentGameState.status === "playing"
      ) {
        console.log(
          "🃏 Clicking card:",
          card.id,
          "in game:",
          gameClient.gameId,
        );
        gameClient.flipCard(card.id);
      }
    });

    grid.appendChild(cardEl);
  });
}

// ===== START GAME FUNCTION =====
window.startGame = (playerCount) => {
  console.log("Starting new game with", playerCount, "players");

  // Reset current game state
  currentGameState = null;

  // Clear the card grid while waiting for new game
  const grid = document.getElementById("cardGrid");
  if (grid) {
    // Add a lightweight placeholder so we don't remove the Three.js canvas
    let ph = document.getElementById('startingPlaceholder');
    if (!ph) {
      ph = document.createElement('div');
      ph.id = 'startingPlaceholder';
      ph.style.textAlign = 'center';
      ph.style.color = '#888';
      ph.textContent = 'Starting new game...';
      grid.appendChild(ph);
    } else {
      ph.textContent = 'Starting new game...';
      ph.style.display = 'block';
    }
  }

  // Clear game info
  const info = document.getElementById("gameInfo");
  if (info) {
    info.textContent = "Creating new game...";
  }

  // IMPORTANT: Reset gameId in client so it gets the new one
  gameClient.gameId = null;

  // Start new game
  gameClient.startNewGame(playerCount);
};

// Update Color Background depending on active Player

function updateActivePlayerBackground(gameState) {
  const grid = document.getElementById("cardGrid");
  if (!grid) return;

  const activePlayer = gameState.players[gameState.activePlayerIndex];
  grid.style.backgroundColor = activePlayer.color;
}

gameClient.onGameStateUpdate = (gameState) => {
  console.log("Game state:", gameState);
  currentGameState = gameState;

  updateGameInfo(gameState);
  updateActivePlayerBackground(gameState);
  // Try to update 3D scene; fall back to DOM grid rendering if it fails
  try {
    updateFromGameState(gameState);
  } catch (err) {
    console.warn('3D update failed, falling back to DOM rendering:', err);
    renderCards(gameState);
  }

  if (gameState.status === "won") {
    showWinPopup(gameState);
  }
};

let hasShownWinPopupForGameId = null;

function getWinners(gameState) {
  const maxScore = Math.max(...gameState.players.map((p) => p.score));
  const winners = gameState.players.filter((p) => p.score === maxScore);
  return { winners, maxScore };
}

// Template loading and safe insertion helpers
let winTemplatePromise = null;
function getWinTemplate() {
  if (!winTemplatePromise) {
    winTemplatePromise = fetch("/win-modal.html").then((r) => {
      if (!r.ok) throw new Error("Failed to load win modal template");
      return r.text();
    });
  }
  return winTemplatePromise;
}

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

// POPUP window after a game
function showWinPopup(gameState) {
  if (hasShownWinPopupForGameId === gameState.gameId) return;
  hasShownWinPopupForGameId = gameState.gameId;

  // Start fullscreen confetti (looping)
  try {
    if (typeof launchFullscreenConfetti === "function") {
      launchFullscreenConfetti(160);
    }
  } catch (err) {
    console.warn("Confetti failed:", err);
  }

  const { winners, maxScore } = getWinners(gameState);
  const isDraw = winners.length > 1;

  const title = isDraw
    ? "It's a draw, you need more therapy!"
    : ` Congratulation ${winners.map((w) => w.color)}! You are the winner of Couples Therapy!`;
  const winnerText = isDraw
    ? ``
    : ``;

  const scoreText = gameState.players
    .map((p) => `${p.color}: ${p.score}`)
    .join(" • ");

  const overlay = document.createElement("div");
  overlay.className = "win-overlay";
  overlay.innerHTML = `
    <div class="win-modal">
      <div class="win-title">${escapeHTML(title)}</div>
      <div class="win-text">${escapeHTML(winnerText)}</div>
      <div class="win-scores">${escapeHTML(scoreText)}</div>

      <div class="win-buttons">
        <button class="win-btn secondary" id="closeWinModal">Close</button>
        <button class="win-btn primary" id="playAgainBtn">Play again</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // One place to close popup + stop confetti
  const closePopup = () => {
    overlay.remove();

    try {
      // Stop confetti if function exists
      if (typeof stopFullscreenConfetti === "function") {
        stopFullscreenConfetti();
      } else {
        // Fallback: remove screen if stop function is not available
        document.querySelector(".confetti-screen")?.remove();
      }
    } catch (err) {
      console.warn("Stopping confetti failed:", err);
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

  // Play again (defaults to same player count)
  overlay.querySelector("#playAgainBtn")?.addEventListener("click", () => {
    closePopup();
    window.startGame(gameState.players.length);
  });
}
