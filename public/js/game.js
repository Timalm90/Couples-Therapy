/**
 * Game Controller Module
 * Main entry point - coordinates all subsystems
 */

import gameClient from "./client.js";
import {
  updateGameInfo,
  updateActivePlayerBackground,
  updateConnectionStatus,
  showError,
  showStartingPlaceholder,
  hideStartingPlaceholder,
  showWinPopup,
} from "./ui.js";
import {
  launchFullscreenConfetti,
  stopFullscreenConfetti,
} from "./animator.js";
import { initRenderer, setCardsArray, triggerResize } from "./renderer.js";
import {
  initCardManager,
  updateFromGameState,
  getCards,
  isInputLocked,
  lockInput,
} from "./cardManager.js";
import { INPUT_CONFIG } from "./config.js";

// ═══════════════════════════════════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════════════════════════════════

let currentGameState = null;

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

async function init() {
  console.log("🎮 Initializing game...");

  // Connect to server
  gameClient.connect();

  // Initialize renderer
  const { scene, camera, renderer } = initRenderer(handleCardClick);

  // Initialize card manager
  await initCardManager(scene, camera);

  // Setup client callbacks
  gameClient.onConnectionChange = handleConnectionChange;
  gameClient.onError = handleError;
  gameClient.onGameStateUpdate = handleGameStateUpdate;

  console.log("✅ Game initialized");
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function handleCardClick(cardId) {
  if (!currentGameState || currentGameState.status !== "playing") {
    return;
  }

  if (isInputLocked()) {
    console.log("⏸️  Input locked, ignoring click");
    return;
  }

  console.log("🃏 Card clicked:", cardId);

  // Lock input to prevent double-clicks
  lockInput(INPUT_CONFIG.LOCK_TIMEOUT);

  // Send flip request to server
  gameClient.flipCard(cardId);
}

function handleConnectionChange(isConnected) {
  updateConnectionStatus(isConnected);
}

function handleError(errorMessage) {
  showError(errorMessage);
}

async function handleGameStateUpdate(gameState) {
  console.log("📥 Game state update:", gameState);
  currentGameState = gameState;

  // Update UI
  updateGameInfo(gameState);
  updateActivePlayerBackground(gameState);

  // Hide starting placeholder if present
  hideStartingPlaceholder();

  // Update 3D scene
  try {
    await updateFromGameState(gameState);

    // Update renderer's card array reference
    setCardsArray(getCards());

    // Trigger resize to ensure proper framing
    triggerResize();
  } catch (err) {
    console.error("❌ Failed to update scene:", err);
    showError("Failed to update game display");
  }

  // Show win popup if game is won
  if (gameState.status === "won") {
    showWinPopup(
      gameState,
      startGame, // onPlayAgain callback
      () => launchFullscreenConfetti(160), // onConfettiStart
      stopFullscreenConfetti, // onConfettiStop
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME CONTROLS
// ═══════════════════════════════════════════════════════════════════════════

function startGame(playerCount) {
  console.log("🎮 Starting new game with", playerCount, "players");

  // Reset game state
  currentGameState = null;

  // Show placeholder
  showStartingPlaceholder();

  // Update game info
  const info = document.getElementById("gameInfo");
  if (info) {
    info.textContent = "Creating new game...";
  }

  // Reset game ID in client
  gameClient.gameId = null;

  // Request new game from server
  gameClient.startNewGame(playerCount);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

// Make startGame available globally for HTML buttons
window.startGame = startGame;

// Start the game on page load
init();

export { startGame, currentGameState };
