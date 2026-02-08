import gameClient from "./client.js";

// ===== GAME STATE =====
let currentGameState = null;

// ===== CONNECT TO SERVER =====
gameClient.connect();

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

// ===== GAME STATE UPDATE =====
gameClient.onGameStateUpdate = (gameState) => {
  console.log("Game state:", gameState);
  currentGameState = gameState;

  // Update game info
  updateGameInfo(gameState);

  // Render cards
  renderCards(gameState);
};

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

  info.innerHTML = `
    <strong>Game ID:</strong> ${gameState.gameId}<br>
    <strong>Players:</strong> ${gameState.players.length}<br>
    <strong>Status:</strong> ${gameState.status}<br>
    <strong>Active Player:</strong> <span style="color: ${activePlayer.color}">${activePlayer.color}</span><br>
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
    grid.innerHTML =
      '<p style="text-align: center; color: #888;">Starting new game...</p>';
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
  renderCards(gameState);

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
async function showWinPopup(gameState) {
  if (hasShownWinPopupForGameId === gameState.gameId) return;
  hasShownWinPopupForGameId = gameState.gameId;

  const { winners, maxScore } = getWinners(gameState);
  const isDraw = winners.length > 1;

  const title = isDraw ? "🤝 It's a draw!" : "🏆 We have a winner!";
  const winnerText = isDraw
    ? `Winners: ${winners.map((w) => w.color).join(", ")} (all with ${maxScore} points)`
    : `Winner: ${winners[0].color} with ${maxScore} points!`;

  const scoreText = gameState.players
    .map((p) => `${p.color}: ${p.score}`)
    .join(" • ");

  const overlay = document.createElement("div");
  overlay.className = "win-overlay";

  try {
    const template = await getWinTemplate();
    const html = template
      .replace(/{{\s*title\s*}}/g, escapeHTML(title))
      .replace(/{{\s*winnerText\s*}}/g, escapeHTML(winnerText))
      .replace(/{{\s*scoreText\s*}}/g, escapeHTML(scoreText));
    overlay.innerHTML = html;
  } catch (err) {
    overlay.innerHTML = `<div class="win-modal"><div class="win-title">${escapeHTML(title)}</div><div class="win-text">${escapeHTML(winnerText)}</div><div class="win-scores">${escapeHTML(scoreText)}</div></div>`;
  }

  document.body.appendChild(overlay);

  // Close on click outside
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // Close button
  const closeBtn = overlay.querySelector("#closeWinModal");
  if (closeBtn) closeBtn.addEventListener("click", () => overlay.remove());

  // Play again (defaults to same player count)
  const playBtn = overlay.querySelector("#playAgainBtn");
  if (playBtn)
    playBtn.addEventListener("click", () => {
      overlay.remove();
      window.startGame(gameState.players.length);
    });
}
