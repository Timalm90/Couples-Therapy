
/*
🪜 STEP 1 – Create Initial Game State (Backend)

### **What to implement**
* Decide the **shape of a card**

  * `id`
  * `value`
  * `isMatched`

* Decide the **shape of a player**

  * `id`
  * `color`
  * `score`

* Create players based on `playerCount` (1–4)
* Assign colors in order:

  * red → yellow → blue → green

* Create card pairs (e.g. A–H duplicated)
* Call `shuffle()` on the cards
* Return a full `gameState` object

### **Mental model**

“If someone says NEW\_GAME, this file builds the entire game world.”

✅ Goal: calling this function returns a valid game state object
*/