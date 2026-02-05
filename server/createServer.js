

import sanitizeGameState from "./game/sanitizeGameState.js";

function sendGameState(ws, gameState) {
  ws.send(
    JSON.stringify({
      type: "GAME_STATE",
      payload: sanitizeGameState(gameState),
    }),
  );
}
