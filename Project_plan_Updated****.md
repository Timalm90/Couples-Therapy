## 🎯 Project Goal

Build a web-based **3D Memory game** where **Node.js acts as the game engine**.

The server is responsible for:
- game logic
- state handling
- match validation
- multiplayer turn logic

The frontend:
- renders the 3D scene
- sends player actions
- reflects server state visually

---

## 📦 Tech Stack

### Node.js Core Modules

- [ ] http (create server)
- [ ] fs (read/write data, optional highscores)
- [ ] path (file handling)
- [ ] process (environment & state)

### External npm Packages

- [ ] ws (WebSocket – real-time game events)
- [ ] nanoid (generate unique game & card IDs)

### Frontend Library

- [ ] three.js (3D rendering & animations)

---

Couples-Therapy/
│
├── index.js
├── package.json
├── package-lock.json
├── .gitignore
├── README.md
├── project_plan.md
│
├── server/
│   ├── createServer.js
│   └── game/
│       ├── gameManager.js
│       ├── createGameState.js
│       ├── applyMove.js
│       └── shuffle.js
│
├── public/
│   ├── index.html
│   ├── style.css
│   ├── client.js
│   ├── scene.js
│   ├── cards.js
│   ├── animations.js
│   └── ui.js
│
├── utils/
│   └── validate.js
│
└── data/
    └── highscores.json   (optional, VG)

---

## 🧠 Game State Design (Server)

Each game should store:

- [ ] gameId
- [ ] cards (id, value, isMatched)
- [ ] flippedCardIds (max 2)
- [ ] lockBoard flag
- [ ] status (playing / won)

### Multiplayer Additions

- [ ] players (array)
  - [ ] id
  - [ ] color (red, yellow, blue, green)
  - [ ] score
- [ ] activePlayerIndex

⚠️ **Server must never expose hidden card values or pair identities to the client.**

---

## 👥 Multiplayer Rules (Local, 1–4 Players)

* Player count chosen at game start (1–4)
* One shared board
* One active player at a time

### Turn Logic

* Player flips two cards
* If cards match:
    cards stay open
    active player score increases
    active player keeps the turn

* If cards do NOT match:
    cards flip back after delay
    turn passes to next player

* Game ends when all pairs are matched
* Winner = highest score (or tie)

---

## 🔁 Client ↔ Server Communication (WebSocket)

### Client → Server Messages

- [ ] NEW_GAME (includes playerCount)
- [ ] FLIP_CARD (cardId only)
- [ ] GET_HIGHSCORES (VG)

### Server → Client Messages

- [ ] GAME_STATE (sanitized)
- [ ] ERROR
- [ ] HIGHSCORES (VG)

⚠️ GAME_STATE must never include card values.

---

## 🎮 Game Flow (MVP)

- [ ] User opens web page
- [ ] User selects number of players (1–4)
- [ ] Server generates game + players
- [ ] Cards rendered face-down in 3D grid
- [ ] Active player indicated by scene color
- [ ] Player flips cards
- [ ] Server validates move
- [ ] Match → player continues
- [ ] No match → turn advances
- [ ] Game ends → winner displayed

---

## 🎨 Visual Multiplayer Concept (Client)

- [ ] Scene background color reflects active player
- [ ] Player score UI per color
- [ ] Optional color-tinted match effects

⚠️ Visuals must always reflect **server state**, never client guesses.

---

## 🖥 Frontend Requirements

- [ ] 3D card grid (4×4)
- [ ] Clickable cards (raycasting)
- [ ] Flip animations
- [ ] Player indicator (color-based)
- [ ] Score display per player
- [ ] New Game button
- [ ] Responsive layout (basic)

### VG (Optional)

- [ ] Timer
- [ ] Difficulty selector (grid size)
- [ ] Highscore list

---

## 🧩 Backend Responsibilities

- [ ] Generate game & player state
- [ ] Shuffle cards
- [ ] Validate moves
- [ ] Enforce turn logic
- [ ] Handle match / no-match
- [ ] Update player scores
- [ ] Detect win condition
- [ ] Send sanitized updates via WebSocket
- [ ] Handle client disconnects gracefully

---

## ⚠️ Error Handling

- [ ] Invalid gameId
- [ ] Invalid cardId
- [ ] Duplicate card click
- [ ] Actions while board is locked
- [ ] Invalid player count
- [ ] Missing or corrupt data file
- [ ] WebSocket disconnect

---

## 🧪 Testing Checklist

- [ ] Game can be completed
- [ ] Multiplayer turn order works
- [ ] Player continues after successful match
- [ ] Cards never reveal values incorrectly
- [ ] Board locks correctly on no-match
- [ ] Scores update correctly
- [ ] Game resets correctly
- [ ] No server crashes on bad input

---

## 🧑‍🤝‍🧑 Collaboration (GitHub Flow)

- [ ] Create issues per feature
- [ ] Use feature branches
- [ ] Meaningful commit messages
- [ ] Pair programming sessions
- [ ] Code reviews before merge

---

## 🏁 Definition of Done

### For Pass (G)

- [ ] Working 3D Memory game
- [ ] Node.js controls all game logic
- [ ] Uses at least one external package
- [ ] Clean structure & readable code

### For Pass with Distinction (VG)

- [ ] Robust error handling
- [ ] Modular backend structure
- [ ] Local multiplayer (1–4 players)
- [ ] Optional persistent data (highscores)
- [ ] Clear separation of concerns

---

