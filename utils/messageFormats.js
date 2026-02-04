
// ===== SANITIZATION FUNCTIONS =====

/**
 * Sanitizes game state for client
 * CRITICAL: Removes card values to prevent cheating
 * 
 * @param {object} gameState - Full server game state
 * @returns {object} Sanitized state safe for client
 */
export function sanitizeGameState(gameState) {
  // Sanitize cards - include value ONLY when face up
  const sanitizedCards = gameState.cards.map((card) => {
    // Check if card is face up (either flipped or matched)
    const isFaceUp = gameState.flippedCardIds.includes(card.id) || card.isMatched;
    
    const sanitizedCard = {
      id: card.id,
      isFaceUp: isFaceUp,
      isMatched: card.isMatched
    };
    
    // Only reveal value when card is face up
    if (isFaceUp) {
      sanitizedCard.value = card.value;
    }
    
    return sanitizedCard;
  });

  // Players are already safe to send (no secret data)
  return {
    gameId: gameState.gameId,
    cards: sanitizedCards,
    players: gameState.players,
    activePlayerIndex: gameState.activePlayerIndex,
    status: gameState.status
    // lockBoard is intentionally excluded - server handles this
    // flippedCardIds is intentionally excluded - derived from isFaceUp
  };
}

/**
 * Validates incoming NEW_GAME message
 * @param {object} message - Raw message from client
 * @returns {object} { valid: boolean, error?: string, playerCount?: number }
 */
export function validateNewGame(message) {
  if (!message.playerCount) {
    return { valid: false, error: "Missing playerCount" };
  }

  const count = parseInt(message.playerCount);
  
  if (isNaN(count) || count < 1 || count > 4) {
    return { valid: false, error: "playerCount must be between 1 and 4" };
  }

  return { valid: true, playerCount: count };
}

/**
 * Validates incoming FLIP_CARD message
 * @param {object} message - Raw message from client
 * @returns {object} { valid: boolean, error?: string, gameId?: string, cardId?: string }
 */
export function validateFlipCard(message) {
  if (!message.gameId) {
    return { valid: false, error: "Missing gameId" };
  }

  if (!message.cardId) {
    return { valid: false, error: "Missing cardId" };
  }

  return { 
    valid: true, 
    gameId: message.gameId,
    cardId: message.cardId
  };
}