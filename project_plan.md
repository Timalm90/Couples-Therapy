# Memory / Concentration Game – Node Project Plan

This document describes a **small, well-scoped web-based Memory (Concentration) game** built with **Node.js** and a **visual frontend**. It is written to match the course requirements and can be shown directly to your teacher for approval.

---

## 1. Project Overview

**Project name:** MemoryForge (working title)

**Concept:**
A classic *Memory / Concentration* game played in the browser. Cards are laid out face-down. The player flips two cards at a time, trying to find matching pairs.

**Key idea for this assignment:**
- The **game logic and state live on the Node server**
- The **browser is only responsible for visuals and interaction**
- Visual feedback (flip animations, matched states) makes the game engaging

---

## 2. Why This Project Fits the Assignment

✔ Small and clearly scoped
✔ Visual and interactive
✔ Node.js is central (not just serving files)
✔ Uses external packages meaningfully
✔ Easy to demonstrate and explain
✔ Natural error handling and edge cases

This is not just a frontend game — it is a **Node-driven game service**.

---

## 3. High-Level Architecture

```
Browser (Canvas / DOM)
  ↓ user actions
Node Server (Game Logic)
  ↓ game state updates
Browser (Visual Updates)
```

### Responsibility split

**Node.js**
- Generates the game board
- Shuffles cards
- Validates moves
- Tracks flipped cards
- Detects matches and win condition
- Resets / restarts games

**Browser**
- Renders cards visually
- Animates card flips
- Sends user clicks to server
- Displays game state

---

## 4. Technology Choices

### Required
- **Node.js**
- **Express** (minimal routing only)

### Visuals
Choose ONE:
- **Canvas API** (recommended for polish)
- OR plain HTML/CSS if needed

### Optional but strong additions
- `ws` (WebSockets) – real-time updates
- `uuid` – unique game/session IDs

### Core Node modules used
- `fs` – optional persistence
- `path` – safe file handling

---

## 5. Game Rules (MVP)

- Grid size: 4×4 (16 cards)
- 8 unique symbols/images
- Each symbol appears exactly twice
- Player can flip **max two cards at a time**
- If cards match → stay face-up
- If not → flip back after delay
- Game ends when all pairs are matched

---

## 6. Step-by-Step Implementation Plan

### Step 1 – Project Setup

- Initialize Node project
- Create GitHub repo
- Set up basic Express server
- Create clean folder structure

```
root
├─ server
│  ├─ index.js
│  ├─ game
│  │  ├─ gameState.js
│  │  ├─ boardGenerator.js
│  │  └─ rules.js
│  └─ routes
│     └─ gameRoutes.js
├─ client
│  ├─ index.html
│  ├─ canvas.js
│  ├─ animations.js
│  └─ api.js
└─ README.md
```

---

### Step 2 – Game Board Generation (Node)

Create logic that:
- Defines card symbols
- Duplicates them into pairs
- Shuffles the array
- Assigns each card an ID

Output example:
```json
[
  { "id": 1, "symbol": "🍎", "revealed": false, "matched": false },
  { "id": 2, "symbol": "🍌", "revealed": false, "matched": false }
]
```

---

### Step 3 – Game State Management (Node)

Implement a game state object that tracks:
- Cards
- Currently flipped cards
- Number of attempts
- Match count

Important rules:
- Ignore clicks if two cards are already flipped
- Prevent flipping already matched cards

---

### Step 4 – API Design

Minimal API endpoints:

- `GET /api/game/start`
  - Creates a new game
  - Returns initial board (symbols hidden)

- `POST /api/game/flip`
  - Input: card ID
  - Node validates move
  - Updates game state
  - Returns updated board state

- `POST /api/game/reset`
  - Resets game state

---

### Step 5 – Frontend Rendering (Canvas)

Canvas responsibilities:
- Draw card grid
- Draw face-down cards
- Draw face-up cards
- Visually mark matched cards

Each card is drawn based on state received from Node.

---

### Step 6 – Animations

Simple animations only:
- Flip animation (scale X → 0 → 1)
- Match highlight (color / glow)
- Shake animation on mismatch

Animations are **feedback**, not game logic.

---

### Step 7 – User Interaction Flow

1. User clicks a card
2. Frontend sends card ID to Node
3. Node validates and updates game state
4. Frontend re-renders board
5. If two cards flipped:
   - Wait briefly
   - Node resolves match or mismatch

---

### Step 8 – Win Condition

- When all cards are matched:
  - Node sends `gameComplete: true`
  - Frontend shows win message

---

## 7. Error Handling (VG-level)

Node must handle:
- Invalid card ID
- Clicking too fast
- Double-clicking same card
- Reset during active turn

Frontend must handle:
- Network errors
- Server unavailable

---

## 8. Stretch Goals (Optional)

Only if MVP is finished:
- Difficulty levels (4×4, 6×6)
- Timer or move counter
- Procedural card faces (Canvas-generated)
- Simple score storage in file

---

## 9. How to Pitch This Project

> "We are building a small web-based Memory game where Node.js controls all game logic and state, and the browser visualizes the game using Canvas. The focus is on clean architecture, modular code, and clear separation between logic and presentation."

---

## 10. Success Criteria Checklist

- [ ] Game fully playable
- [ ] Node handles all rules
- [ ] Clean file structure
- [ ] No duplicated logic
- [ ] Visual feedback implemented
- [ ] Errors handled gracefully

---

**This scope is intentionally small, polished, and achievable within the course timeframe.**

