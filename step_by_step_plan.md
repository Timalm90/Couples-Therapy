# 🎮 3D Memory Game – Step-by-Step Guide & Balanced Task Division (Node.js)

This document is an **updated version** of the project plan with:

- a **3D Memory game using Three.js**
- a **more even backend workload split** between two developers
- a clear explanation of **how and why each package is used**

**Developers:**
- **T** – 3D, client logic, *and* selected backend modules
- **D** – backend architecture, game rules, and server stability

The project remains **backend-driven**, but responsibility is shared fairly.

---

## 🧱 High-Level Architecture

```
Client (Browser)
 ├─ Three.js (3D scene, cards, animations)
 ├─ Input handling (raycasting)
 └─ WebSocket client
        ↓
Node.js Server (Game Engine)
 ├─ Game state & rules
 ├─ Validation & timing
 ├─ WebSocket server
 └─ Optional persistence
```

⚠️ **Single source of truth:** Node.js server

---

## 🧑‍🤝‍🧑 Balanced Responsibility Split

### 🎨 T — 3D + Client Logic + Shared Backend

**Frontend / 3D**
- Three.js scene setup
- Card geometry & materials
- Procedural grid generation
- Texture assignment per pair
- Raycasting & click detection
- Flip / feedback animations
- Client-side state mapping

**Backend (Shared)**
- Card data structure design
- Board generation logic
- Shuffle algorithm
- Message schema definitions
- Client-side validation helpers

---

### 🧠 D — Backend Core & Infrastructure

**Backend (Core)**
- Server creation (`http`, `ws`)
- Game manager & lifecycle
- Move validation rules
- Match / no-match resolution
- Attempt counter
- Board locking & timing
- Win condition detection

**Infrastructure**
- Error handling strategy
- WebSocket disconnect handling
- Optional persistence (VG)

---

## 🪜 Step-by-Step Implementation Plan

---

## STEP 1 – Project Setup (Together)

- Initialize Git repository
- Create folder structure
- Install dependencies (`ws`, `nanoid`)
- Add `.gitignore`
- Agree on WebSocket message formats

✅ Outcome: Empty server starts, static page loads

---

## STEP 2 – Card & Board Generation (T)

### Files
- `/server/game/createGameState.js`
- `/server/game/shuffle.js`

### Tasks
- Define card structure `{ id, value, isMatched }`
- Generate card pairs
- Implement shuffle logic
- Create initial game state

⚠️ No networking here — pure logic

✅ Outcome: Deterministic game board creation

---

## STEP 3 – Game State Rules & Moves (D)

### Files
- `/server/game/applyMove.js`

### Tasks
- Validate card flips
- Prevent invalid actions
- Track flipped cards
- Apply match / no-match rules
- Lock board during resolution

✅ Outcome: Core Memory rules enforced on server

---

## STEP 4 – WebSocket Server & Game Manager (D)

### Files
- `/server/createServer.js`
- `/server/game/gameManager.js`

### Tasks
- Create HTTP + WebSocket server
- Handle `NEW_GAME` and `FLIP_CARD`
- Manage multiple games (by ID)
- Broadcast `GAME_STATE` updates

⚠️ Hidden card values never sent

✅ Outcome: Backend game engine running

---

## STEP 5 – Three.js Scene Setup (T)

### Files
- `/public/client.js`

### Tasks
- Create Three.js scene
- Camera (angled top-down)
- Lighting setup
- Renderer & resize handling

✅ Outcome: Empty 3D scene visible

---

## STEP 6 – 3D Card Grid Generation (T)

### Tasks
- Create base card mesh
- Clone mesh per card
- Generate grid positions in code
- Map server card IDs to meshes

⚠️ No card values decided here

✅ Outcome: 3D grid of face-down cards

---

## STEP 7 – Client ↔ Server Integration (Both)

### Tasks
- T: Send cardId on click (raycasting)
- D: Process move & update state
- T: Update card visuals based on state

### Message Example
```json
{ "type": "FLIP_CARD", "cardId": "xyz123" }
```

✅ Outcome: Clicking flips cards correctly

---

## STEP 8 – Flip Animations & Sync (T)

### Tasks
- Animate Y-axis rotation
- Swap textures at mid-flip
- Disable input during server lock

⚠️ Animation timing must respect server delays

✅ Outcome: Smooth, synchronized flipping

---

## STEP 9 – Match Resolution & Win State (D)

### Tasks
- Detect matches
- Increment attempts
- Detect game completion
- Send game status updates

✅ Outcome: Full game loop complete

---

## STEP 10 – Error Handling & Stability (Both)

### T
- Client-side input validation
- Visual error feedback

### D
- Invalid cardId handling
- Locked-board actions
- WebSocket disconnects

✅ Outcome: No crashes, graceful recovery

---

## STEP 11 – Optional VG Features (Split)

- **T:** Difficulty selector, visual polish
- **D:** Highscores, timers, persistence

---

## 📦 Package Usage Summary

### Node.js Core Modules

- **http** – Create the base server
- **fs** – Optional highscore persistence
- **path** – Safe file handling
- **process** – Environment & runtime control

### External Packages

- **ws** – Real-time client ↔ server communication
- **nanoid** – Generate unique game and card IDs

### Frontend Libraries

- **three.js** – 3D rendering, scene graph, animations

---

## ✅ Definition of Done (Reconfirmed)

- Backend-driven game logic
- Evenly distributed responsibilities
- 3D visuals enhance (not replace) logic
- Clean, modular, readable code
- Meets G and VG requirements

---

## 🧠 Final Note

This setup ensures:
- both developers work meaningfully with **Node.js**
- 3D is impressive but controlled
- the project is easy to explain, defend, and demo

If you want next, I can:
- audit this against grading criteria
- help you write a **teacher-facing pitch**
- or break this into **GitHub issues**

