# 🧭 Implementation Plan – Step by Step (Balanced Backend Work)

This guide answers **exactly**:
- who implements what
- in what order
- with an **even backend workload** between **T** and **D**

The plan is incremental: at the end of every step, the project still works.

---

## 👥 Roles (Clear but Balanced)

### **T**
- [ ] Three.js / visuals
- [ ] Client-side logic
- [ ] Shared backend logic (game state creation, data structures)

### **D**
- [ ] Server infrastructure
- [ ] Core game rules
- [ ] Multiplayer turn logic
- [ ] Error handling

Both write Node code. Neither is “just frontend”.

---

## 🪜 STEP 0 – Project Bootstrap (Together)

**Both T & D (pair programming)**

- [ ] Initialize Git repo
- [ ] Create folder structure
- [ ] Add `.gitignore`
- [ ] Install dependencies (`ws`, `nanoid`)
- [ ] Add minimal `index.js`
- [ ] Create empty files according to structure

✅ Outcome:
- Repo builds
- Server starts without crashing

---

## 🪜 STEP 1 – Game State Shape (Backend Logic Split)

### **T implements**

**File:** `/server/game/createGameState.js`

- [ ] Define card structure
- [ ] Define player structure
- [ ] Generate players (1–4)
- [ ] Assign colors (red, yellow, blue, green)
- [ ] Create card pairs
- [ ] Return initial gameState object

Focus: *data modeling*

---

### **D implements**

**File:** `/server/game/gameManager.js`

- [ ] Store active games (`Map`)
- [ ] Create new game via `createGameState`
- [ ] Fetch game by `gameId`
- [ ] Delete game when finished (optional)

Focus: *lifecycle & ownership*

✅ Outcome:
- New games can be created and retrieved

---

## 🪜 STEP 2 – Shuffle & Utilities (Even Split)

### **T implements**

**File:** `/server/game/shuffle.js`

- [ ] Implement pure shuffle function
- [ ] Ensure no side effects

---

### **D implements**

**File:** `/utils/validate.js`

- [ ] Validate `cardId`
- [ ] Validate `gameId`
- [ ] Validate player count
- [ ] Guard against invalid moves

✅ Outcome:
- Board is randomized
- Inputs are validated

---

## 🪜 STEP 3 – Core Move Logic (Backend Heavy, Split)

This is the **heart of the game**.

---

### **T implements (backend!)**

**File:** `/server/game/applyMove.js` (part 1)

- [ ] Handle first card flip
- [ ] Track `flippedCardIds`
- [ ] Prevent duplicate flips
- [ ] Respect `lockBoard`

Focus: *state transitions*

---

### **D implements (backend!)**

**File:** `/server/game/applyMove.js` (part 2)

- [ ] Handle second card flip
- [ ] Compare cards
- [ ] Match logic (update `isMatched`, increment score, keep turn)
- [ ] No-match logic (lock board, advance active player)
- [ ] Detect win condition

Focus: *rules & multiplayer logic*

✅ Outcome:
- Full Memory rules enforced

---

## 🪜 STEP 4 – Server & WebSocket Layer

### **D implements**

**File:** `/server/createServer.js`

- [ ] Create HTTP server
- [ ] Create WebSocket server (`ws`)
- [ ] Handle `NEW_GAME`
- [ ] Handle `FLIP_CARD`
- [ ] Send sanitized `GAME_STATE`

---

### **T assists**

- [ ] Define message schemas
- [ ] Verify no card values are leaked

✅ Outcome:
- Backend fully playable via messages

---

## 🪜 STEP 5 – Client Networking

### **T implements**

**File:** `/public/client.js`

- [ ] Create WebSocket connection
- [ ] Send actions to server
- [ ] Receive `GAME_STATE`
- [ ] Dispatch updates to UI / scene

---

### **D reviews**

- [ ] Verify protocol correctness
- [ ] Check edge cases

✅ Outcome:
- Client talks to server correctly

---

## 🪜 STEP 6 – Three.js Scene & Cards

### **T implements**

- [ ] `scene.js` (scene, camera, lights)
- [ ] `cards.js` (base card mesh, cloning, grid)
- [ ] `animations.js` (flip animations)

---

### **D supports**

- [ ] Test state → visual mapping

✅ Outcome:
- Clickable 3D board

---

## 🪜 STEP 7 – Multiplayer Visual Feedback

### **T implements**

- [ ] Scene background color per active player
- [ ] Player score UI (`ui.js`)

---

### **D verifies**

- [ ] Turn logic correctness

✅ Outcome:
- Clear multiplayer UX

---

## 🪜 STEP 8 – Error Handling & Robustness

### **D implements**

- [ ] Invalid cardId handling
- [ ] Clicking while locked
- [ ] WebSocket disconnect handling

---

### **T implements**

- [ ] Visual error feedback
- [ ] Disable input during locks

✅ Outcome:
- No crashes

---

## 🪜 STEP 9 – Optional VG Work (If Time)

### **T**

- [ ] Difficulty selector
- [ ] Visual polish

### **D**

- [ ] Highscores (`fs`)
- [ ] Timer

---

## ✅ Final Balance Check

- [ ] T implemented backend: `createGameState.js`, `shuffle.js`, part of `applyMove.js`
- [ ] D implemented backend: `gameManager.js`, part of `applyMove.js`, `createServer.js`, `validate.js`

👉 Backend workload is **evenly split**.

---

## 🧠 Golden Rule

> Server decides truth. Client visualizes truth.

