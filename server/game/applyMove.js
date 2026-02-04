const DEFAULT_REVEAL_DELAY_MS = 800;

export default function applyMove(
  gameState,
  cardId,
  revealDelayMs = DEFAULT_REVEAL_DELAY_MS,
) {
  // ===== VALIDATION (silent ignores) =====

  if (gameState.status !== "playing") {
    return { ignored: true, gameState };
  }

  // If board is locked (waiting to flip back), ignore clicks
  if (gameState.lockBoard) {
    return { ignored: true, gameState };
  }

  const clickedCard = gameState.cards.find((card) => card.id === cardId);
  if (!clickedCard) {
    return { ignored: true, gameState };
  }

  if (clickedCard.isMatched) {
    return { ignored: true, gameState };
  }

  if (gameState.flippedCardIds.includes(cardId)) {
    return { ignored: true, gameState };
  }

  if (gameState.flippedCardIds.length >= 2) {
    return { ignored: true, gameState };
  }

  // ===== FLIP THE CARD (IMMUTABLY) =====

  const updatedFlippedCardIds = [...gameState.flippedCardIds, cardId];

  // If only 1 card is flipped, nothing more to do
  if (updatedFlippedCardIds.length === 1) {
    return {
      gameState: {
        ...gameState,
        flippedCardIds: updatedFlippedCardIds,
      },
      needsDelayAction: false,
    };
  }

  // ===== TWO CARDS FLIPPED: CHECK MATCH =====

  const [firstId, secondId] = updatedFlippedCardIds;
  const firstCard = gameState.cards.find((card) => card.id === firstId);
  const secondCard = gameState.cards.find((card) => card.id === secondId);

  // Safety check (should never happen)
  if (!firstCard || !secondCard) {
    return {
      gameState: {
        ...gameState,
        flippedCardIds: [],
        lockBoard: false,
      },
      needsDelayAction: false,
    };
  }

  const isMatch = firstCard.value === secondCard.value;

  if (isMatch) {
    // ===== MATCH! =====

    const updatedCards = gameState.cards.map((card) => {
      if (card.id === firstId || card.id === secondId) {
        return { ...card, isMatched: true };
      }
      return card;
    });

    const updatedPlayers = gameState.players.map((player, index) => {
      if (index === gameState.activePlayerIndex) {
        return { ...player, score: player.score + 1 };
      }
      return player;
    });

    const allMatched = updatedCards.every((card) => card.isMatched);
    const newStatus = allMatched ? "won" : "playing";

    return {
      gameState: {
        ...gameState,
        cards: updatedCards,
        players: updatedPlayers,
        flippedCardIds: [],
        lockBoard: false,
        status: newStatus,
        // activePlayerIndex stays the same (player keeps the turn)
      },
      needsDelayAction: false,
    };
  }

  // ===== NO MATCH =====
  // Keep active player the same while the two cards are visible.
  // Lock the board and let caller schedule unlockBoard() after delay.

  return {
    gameState: {
      ...gameState,
      flippedCardIds: updatedFlippedCardIds,
      lockBoard: true,
    },
    needsDelayAction: true,
    delayMs: revealDelayMs,
  };
}

/**
 * Unlocks the board and clears flipped cards after a mismatch delay
 * Advances to the next player
 * @param {object} gameState - Current game state
 * @returns {object} Updated game state with board unlocked
 */
export function unlockBoard(gameState) {
  const nextPlayerIndex =
    (gameState.activePlayerIndex + 1) % gameState.players.length;

  return {
    ...gameState,
    flippedCardIds: [],
    lockBoard: false,
    activePlayerIndex: nextPlayerIndex,
  };
}