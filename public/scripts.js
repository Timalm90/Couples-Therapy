import gameClient from './client.js';

// ===== GAME STATE =====
let currentGameState = null;

// ===== CONNECT TO SERVER =====
gameClient.connect();

// ===== CONNECTION STATUS =====
gameClient.onConnectionChange = (isConnected) => {
  const statusEl = document.getElementById('connectionStatus');
  if (statusEl) {
    if (isConnected) {
      statusEl.className = 'status connected';
      statusEl.textContent = '✅ Connected to server';
    } else {
      statusEl.className = 'status disconnected';
      statusEl.textContent = '❌ Disconnected from server';
    }
  }
};

// ===== GAME STATE UPDATE =====
gameClient.onGameStateUpdate = (gameState) => {
  console.log('📦 Game state:', gameState);
  currentGameState = gameState;
  
  // Update game info
  updateGameInfo(gameState);
  
  // Render cards
  renderCards(gameState);
};

// ===== ERROR HANDLING =====
gameClient.onError = (errorMessage) => {
  const errorBox = document.getElementById('errorBox');
  if (errorBox) {
    errorBox.innerHTML = `<div class="error">❌ ${errorMessage}</div>`;
    setTimeout(() => {
      errorBox.innerHTML = '';
    }, 3000);
  }
};

// ===== UPDATE GAME INFO =====
function updateGameInfo(gameState) {
  const info = document.getElementById('gameInfo');
  if (!info) return;
  
  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const playerScores = gameState.players
    .map(p => `${p.color}: ${p.score}`)
    .join(' | ');
  
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
  const grid = document.getElementById('cardGrid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  gameState.cards.forEach(card => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    
    // Show value if face up
    if (card.isFaceUp && card.value) {
      cardEl.textContent = card.value;
      cardEl.classList.add('faceup');
    } else {
      cardEl.textContent = '?';
    }
    
    // Mark matched cards
    if (card.isMatched) {
      cardEl.classList.add('matched');
    }
    
    // Click handler
    cardEl.addEventListener('click', () => {
      if (!card.isMatched && currentGameState && currentGameState.status === 'playing') {
        console.log('🃏 Clicking card:', card.id, 'in game:', gameClient.gameId);
        gameClient.flipCard(card.id);
      }
    });
    
    grid.appendChild(cardEl);
  });
}

// ===== START GAME FUNCTION =====
window.startGame = (playerCount) => {
  console.log('🎮 Starting new game with', playerCount, 'players');
  
  // Reset current game state
  currentGameState = null;
  
  // Clear the card grid while waiting for new game
  const grid = document.getElementById('cardGrid');
  if (grid) {
    grid.innerHTML = '<p style="text-align: center; color: #888;">Starting new game...</p>';
  }
  
  // Clear game info
  const info = document.getElementById('gameInfo');
  if (info) {
    info.textContent = 'Creating new game...';
  }
  
  // IMPORTANT: Reset gameId in client so it gets the new one
  gameClient.gameId = null;
  
  // Start new game
  gameClient.startNewGame(playerCount);
};