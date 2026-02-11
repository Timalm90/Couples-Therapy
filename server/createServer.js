import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import {
  sanitizeGameState,
  validateNewGame,
  validateFlipCard,
} from "../utils/messageFormats.js";
import * as gameManager from "./game/gameManager.js";
import applyMove, { unlockBoard } from "./game/applyMove.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global process-level error handlers to catch unhandled rejections
// and uncaught exceptions. These log the error and exit the process
// to avoid running in an inconsistent state. If you prefer a graceful
// shutdown, we can wire these to close the HTTP server and WebSocket
// server before exiting.
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  // It's safest to exit and let a supervisor restart the process.
  // Delay exit slightly to allow logs to flush.
  setTimeout(() => process.exit(1), 100);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  // As above, exit to avoid undefined behaviour.
  setTimeout(() => process.exit(1), 100);
});

function sendGameState(ws, gameState) {
  const sanitized = sanitizeGameState(gameState);
  safeSend(ws, {
    type: "GAME_STATE",
    ...sanitized,
  });
}

// Safely send a payload to a WebSocket client. Guards against sending
// on closed sockets and catches any synchronous send errors.
function safeSend(ws, payload) {
  if (!ws) return false;
  try {
    // `readyState === 1` means OPEN for ws library
    if (ws.readyState !== 1) {
      console.warn("Attempted to send on non-open WebSocket");
      return false;
    }

    const data =
      typeof payload === "string" ? payload : JSON.stringify(payload);
    ws.send(data);
    return true;
  } catch (err) {
    console.error("❌ Failed to send message to client:", err);
    return false;
  }
}

export default function createServer(port = 8000) {
  // ===== HTTP SERVER (serves frontend) =====
  const httpServer = http.createServer((req, res) => {
    // Remove query strings (?v=123 etc)
    const urlPath = req.url.split("?")[0];

    const filePath = path.join(
      __dirname,
      "../public",
      urlPath === "/" ? "index.html" : urlPath,
    );

    const extname = path.extname(filePath);
    const contentTypeMap = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/javascript",
      ".json": "application/json",
    };
    const contentType = contentTypeMap[extname] || "text/plain";

    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === "ENOENT") {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("404 Not Found");
        } else {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("500 Internal Server Error");
        }
      } else {
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content, "utf-8");
      }
    });
  });

  // ===== WEBSOCKET SERVER =====
  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (ws) => {
    console.log("Client connected");

    let currentGameId = null;

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        console.log("Received:", message.type);

        // ===== NEW GAME =====
        if (message.type === "NEW_GAME") {
          const validation = validateNewGame(message);

          if (!validation.valid) {
            safeSend(ws, {
              type: "ERROR",
              message: validation.error,
            });
            return;
          }

          const gameState = gameManager.createGame(validation.playerCount);
          currentGameId = gameState.gameId;

          console.log(
            `New game created: ${currentGameId} with ${validation.playerCount} player(s)`,
          );

          sendGameState(ws, gameState);
          return;
        }

        // ===== FLIP CARD =====
        if (message.type === "FLIP_CARD") {
          const validation = validateFlipCard(message);

          if (!validation.valid) {
            safeSend(ws, {
              type: "ERROR",
              message: validation.error,
            });
            return;
          }

          const gameState = gameManager.getGame(validation.gameId);

          if (!gameState) {
            safeSend(ws, {
              type: "ERROR",
              message: "Game not found",
            });
            return;
          }

          const result = applyMove(gameState, validation.cardId);

          if (result.error) {
            safeSend(ws, {
              type: "ERROR",
              message: result.error,
            });
            return;
          }

          gameManager.updateGame(validation.gameId, result.gameState);

          sendGameState(ws, result.gameState);

          // Delay unlock if needed
          if (result.needsDelayAction) {
            setTimeout(() => {
              const currentState = gameManager.getGame(validation.gameId);

              if (currentState) {
                const unlockedState = unlockBoard(currentState);
                gameManager.updateGame(validation.gameId, unlockedState);
                sendGameState(ws, unlockedState);
              }
            }, result.delayMs);
          }

          return;
        }

        // ===== UNKNOWN MESSAGE =====
        safeSend(ws, {
          type: "ERROR",
          message: `Unknown message type: ${message.type}`,
        });
      } catch (error) {
        console.error("❌ Error processing message:", error);
        safeSend(ws, {
          type: "ERROR",
          message: "Invalid message format",
        });
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });

    ws.on("error", (error) => {
      console.error("❌ WebSocket error:", error);
    });
  });

  // ===== START SERVER =====
  httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  return { httpServer, wss };
}
