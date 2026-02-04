
import { nanoid } from 'nanoid';
import shuffle from './shuffle.js';

export default function createGameState(playerCount = 1) {

    if (playerCount < 1 || playerCount > 4) {
    throw new Error('Player count must be between 1 and 4');
  }

  // Player colors
  const colors = ['red', 'yellow', 'blue', 'green'];

  // Create players
  const players = [];
  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: nanoid(8),
      color: colors[i],
      score: 0
    });
  }

  // Card values (A-H = 8 pairs = 16 cards for 4x4 grid)
  const cardValues = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  
  // Create card pairs
  const cards = [];
  cardValues.forEach(value => {
    // First card of the pair
    cards.push({
      id: nanoid(8),
      value: value,
      isMatched: false
    });
    // Second card of the pair
    cards.push({
      id: nanoid(8),
      value: value,
      isMatched: false
    });
  });

  // Shuffle the cards
  const shuffledCards = shuffle(cards);

  // Return complete game state
  return {
    gameId: nanoid(10),
    cards: shuffledCards,
    players: players,
    activePlayerIndex: 0, // First player starts
    flippedCardIds: [],
    lockBoard: false,
    status: 'playing' // 'playing' or 'won'
  };
}