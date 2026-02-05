import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { sanitizeGameState, validateNewGame, validateFlipCard } from '../utils/messageFormats.js';
import * as gameManager from './game/gameManager.js';
import applyMove, { unlockBoard } from './game/applyMove.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sendGameState(ws, gameState) {
  const sanitized = sanitizeGameState(gameState);
  ws.send(
    JSON.stringify({
      type: "GAME_STATE",
      ...sanitized
    })
  );
}


export default function createServer(port = 3000) {

  
  const httpServer = http.createServer((req, res) => {

    let filePath = path.join(__dirname, '../public', req.url === '/' ? 'index.html' : req.url);
    

    const extname = path.extname(filePath);
    const contentTypeMap = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json'
    };
    const contentType = contentTypeMap[extname] || 'text/plain';
    
    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('500 Internal Server Error');
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });
  
  // ===== WEBSOCKET SERVER =====
  
  const wss = new WebSocketServer({ server: httpServer });
  
  wss.on('connection', (ws) => {
    console.log('Client connected');
    
    let currentGameId = null;
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log('Received:', message.type);
        
        // ===== HANDLE NEW_GAME =====
        if (message.type === 'NEW_GAME') {
          const validation = validateNewGame(message);
          
          if (!validation.valid) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: validation.error
            }));
            return;
          }
          
          // Create new game
          const gameState = gameManager.createGame(validation.playerCount);
          currentGameId = gameState.gameId;
          
          console.log(`New game created: ${currentGameId} with ${validation.playerCount} player(s)`);
          
          // Send sanitized game state
          sendGameState(ws, gameState);
          
          return;
        }
        
        // ===== HANDLE FLIP_CARD =====
        if (message.type === 'FLIP_CARD') {
          const validation = validateFlipCard(message);
          
          if (!validation.valid) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: validation.error
            }));
            return;
          }
          
          // Get game state
          const gameState = gameManager.getGame(validation.gameId);
          
          if (!gameState) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Game not found'
            }));
            return;
          }
          
          // Apply the move
          const result = applyMove(gameState, validation.cardId);
          
          // Handle error from applyMove
          if (result.error) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: result.error
            }));
            return;
          }
          
          // Update game state in manager
          gameManager.updateGame(validation.gameId, result.gameState);
          
          // Send updated state immediately
          sendGameState(ws, result.gameState);
          
          // If no match, schedule unlock after delay
          if (result.needsDelayAction) {
            setTimeout(() => {
              const currentState = gameManager.getGame(validation.gameId);
              if (currentState) {
                const unlockedState = unlockBoard(currentState);
                gameManager.updateGame(validation.gameId, unlockedState);
                
                // Send updated state with cards flipped back
                sendGameState(ws, unlockedState);
              }
            }, result.delayMs);
          }
          
          return;
        }
        
        // Unknown message type
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: `Unknown message type: ${message.type}`
        }));
        
      } catch (error) {
        console.error('❌ Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: 'Invalid message format'
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected');
      // Optional: Clean up game if needed
      // gameManager.deleteGame(currentGameId);
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  });
  
  // Start server
  httpServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
  
  return { httpServer, wss };
}