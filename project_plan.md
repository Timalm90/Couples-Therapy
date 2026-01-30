# 🧠 Memory Game – Project Plan (Node.js)

## 🎯 Project Goal

Build a web-based Memory game where **Node.js acts as the game engine**.
The server is responsible for game logic, state handling, and match validation.
The frontend renders the UI and sends player actions in real time.

---

## 📦 Tech Stack

### Node.js Core Modules

- [ ] http (create server)
- [ ] fs (read/write data, optional highscores)
- [ ] path (file handling)
- [ ] process (environment & state)

### External npm Packages

- [ ] ws (WebSocket – real-time game events)
- [ ] nanoid (generate unique game IDs)

---

## 🗂 Project Structure

### Root

- [ ] package.json
- [ ] package-lock.json
- [ ] index.js
- [ ] .gitignore

### Folders

- [ ] /server
  - [ ] createServer.js
  - [ ] /game
    - [ ] gameManager.js
    - [ ] createGameState.js
    - [ ] applyMove.js
    - [ ] shuffle.js
- [ ] /public
  - [ ] index.html
  - [ ] style.css
  - [ ] client.js
- [ ] /utils
  - [ ] validate.js
- [ ] /data (optional, VG)
  - [ ] highscores.json

---

## 🧠 Game State Design

Each game should store:

- [ ] gameId
- [ ] cards (id, value, isMatched)
- [ ] flippedCardIds (max 2)
- [ ] attempts counter
- [ ] lockBoard flag
- [ ] game status (playing / won)
- [ ] start time (VG)
- [ ] end time (VG)

⚠️ Server must never expose hidden card values to the client.

---

## 🔁 Client ↔ Server Communication (WebSocket)

### Client → Server Messages

- [ ] NEW_GAME
- [ ] FLIP_CARD
- [ ] GET_HIGHSCORES (VG)

### Server → Client Messages

- [ ] GAME_STATE
- [ ] ERROR
- [ ] HIGHSCORES (VG)

---

## 🎮 Game Flow (MVP)

- [ ] User opens the web page
- [ ] User starts a new game
- [ ] Server generates and shuffles cards
- [ ] Cards are rendered face-down
- [ ] User flips a card
- [ ] Server updates game state
- [ ] Match → cards stay open
- [ ] No match → cards flip back after delay
- [ ] Attempts counter increases
- [ ] Game ends when all pairs are matched

---

## 🖥 Frontend Requirements

- [ ] Render card grid (4x4)
- [ ] Clickable cards
- [ ] Attempts counter
- [ ] Game status message
- [ ] New Game button
- [ ] Responsive layout (basic)

### VG (Optional)

- [ ] Timer
- [ ] Difficulty selector
- [ ] Highscore list

---

## 🧩 Backend Responsibilities

- [ ] Generate game state
- [ ] Shuffle cards
- [ ] Validate moves
- [ ] Prevent invalid clicks
- [ ] Handle match / no match logic
- [ ] Detect win condition
- [ ] Send updated state via WebSocket
- [ ] Handle client disconnects gracefully

---

## ⚠️ Error Handling

- [ ] Invalid gameId
- [ ] Invalid cardId
- [ ] Duplicate card click
- [ ] Actions while board is locked
- [ ] Missing or corrupt data file
- [ ] WebSocket disconnect

---

## 🧪 Testing Checklist

- [ ] Game can be completed
- [ ] Cards never reveal values incorrectly
- [ ] Board locks correctly on no-match
- [ ] Attempts count correctly
- [ ] Game resets correctly
- [ ] No server crashes on bad input

---

## 🧑‍🤝‍🧑 Collaboration (GitHub Flow)

- [ ] Create issues for each feature
- [ ] Use feature branches
- [ ] Meaningful commit messages
- [ ] Pair programming sessions
- [ ] Code reviews before merge

---

## 🏁 Definition of Done

### For Pass (G)

- [ ] Working memory game
- [ ] Node handles game logic
- [ ] Uses at least one external package
- [ ] Clean structure and readable code

### For Pass with Distinction (VG)

- [ ] Robust error handling
- [ ] Modular code structure
- [ ] Optional persistent data (highscores)
- [ ] Clear separation of concerns

---

## 📌 Project Pitch (Summary)

A web-based memory game where Node.js functions as the game engine, handling state, logic, and validation, while the client renders the UI and communicates via WebSockets in real time.
