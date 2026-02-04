import createGameState from "./createGameState.js";

// Stores all active games: gameId -> gameState
const games = new Map();

// Create and store a new game
export function createGame(playerCount = 1) {
  const gameState = createGameState(playerCount);
  games.set(gameState.gameId, gameState);
  return gameState;
}

// Get an existing game by id
export function getGame(gameId) {
  return games.get(gameId) ?? null;
}

// Update an existing game's state
export function updateGame(gameId, newState) {
  games.set(gameId, newState);
}

// Remove a game (e.g. when finished or reset)
export function deleteGame(gameId) {
  return games.delete(gameId);
}

// Debug helper
export function getGameCount() {
  return games.size;
}