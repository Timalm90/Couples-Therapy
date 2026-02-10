/**
 * Animator Module
 * Handles all animations including card flips and confetti
 */

import * as THREE from 'https://esm.sh/three@0.152.2';
import { ANIMATION_CONFIG } from './config.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONFETTI ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════════

export function launchFullscreenConfetti(pieces = 320) {
  const existing = document.querySelector(".confetti-screen");
  if (existing) return; // already running

  const screen = document.createElement("div");
  screen.className = "confetti-screen";

  // Split confetti into two groups:
  // 1. Initial burst (starts immediately, synced)
  // 2. Continuous loop (starts after burst completes)
  const burstPieces = Math.floor(pieces * 0.4); // 40% for initial burst
  const loopPieces = pieces - burstPieces; // 60% for continuous loop

  // Calculate average duration for timing the transition
  const avgDuration = 4; // middle of 3-5 range

  // Initial burst - all start together for dramatic effect
  for (let i = 0; i < burstPieces; i++) {
    const el = document.createElement("i");
    const left = Math.random() * 100;
    const duration = 2 + Math.random() * 2;
    
    el.style.left = `${left}%`;
    el.style.animationDelay = `0.5s`; // All start immediately for burst
    el.style.animationDuration = `${duration}s`;
    
    screen.appendChild(el);
  }

  // Continuous loop - starts after burst, then loops seamlessly
  for (let i = 0; i < loopPieces; i++) {
    const el = document.createElement("i");
    const left = Math.random() * 50;
    const duration = 3 + Math.random() * 2;
    
    // Start after the burst completes, staggered for seamless loop
    const delay = avgDuration + (Math.random() * duration);
    
    el.style.left = `${left}%`;
    el.style.animationDelay = `${delay}s`;
    el.style.animationDuration = `${duration}s`;
    
    screen.appendChild(el);
  }

  document.body.appendChild(screen);
}

export function stopFullscreenConfetti() {
  const screen = document.querySelector(".confetti-screen");
  if (!screen) return;

  screen.classList.add("confetti-fade");
  setTimeout(() => {
    screen.remove();
  }, ANIMATION_CONFIG.CONFETTI_FADE_DURATION);
}

// ═══════════════════════════════════════════════════════════════════════════
// CARD FLIP ANIMATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Play card flip animation using skeletal animation from FBX
 * @param {object} cardObj - Card object with mixer and flipAction
 * @param {boolean} toFaceUp - True to flip face up, false to flip face down
 * @param {function} onTextureUpdate - Callback to update texture during flip
 * @returns {Promise} Resolves when animation completes
 */
export function animateCardFlip(cardObj, toFaceUp, onTextureUpdate) {
  if (!cardObj.flipAction || !cardObj.mixer) {
    console.warn('⚠️  No animation available for card', cardObj.id);
    return Promise.resolve();
  }

  console.log(`🎬 Playing flip animation for card ${cardObj.id}: ${toFaceUp ? 'FACE UP' : 'FACE DOWN'}`);

  return new Promise((resolve) => {
    // Reset the animation to start
    cardObj.mixer.stopAllAction();
    cardObj.flipAction.reset();
    
    // Calculate timeScale to match desired duration
    const clipDuration = cardObj.flipAction.getClip().duration;
    const desiredDuration = ANIMATION_CONFIG.FLIP_DURATION / 1000; // Convert ms to seconds
    const baseTimeScale = clipDuration / desiredDuration;
    
    // Set direction based on whether we're flipping up or down
    cardObj.flipAction.timeScale = toFaceUp ? baseTimeScale : -baseTimeScale;
    
    // If flipping down (reversed), start from the end
    if (!toFaceUp) {
      cardObj.flipAction.time = clipDuration;
    }
    
    // Play the animation
    cardObj.flipAction.play();
    
    console.log(`   ▶️  Animation started: timeScale=${cardObj.flipAction.timeScale.toFixed(2)}, duration=${desiredDuration.toFixed(2)}s (FBX: ${clipDuration.toFixed(2)}s)`);
    
    // Schedule texture swap at configured point during animation
    const swapDelay = ANIMATION_CONFIG.FLIP_DURATION * ANIMATION_CONFIG.FLIP_TEXTURE_SWAP_POINT;
    setTimeout(() => {
      if (onTextureUpdate) {
        onTextureUpdate(cardObj, toFaceUp);
        console.log(`   🖼️  Texture swapped at ${(ANIMATION_CONFIG.FLIP_TEXTURE_SWAP_POINT * 100).toFixed(0)}% of animation`);
      }
    }, swapDelay);
    
    // Listen for animation completion
    const onFinished = (event) => {
      if (event.action === cardObj.flipAction) {
        cardObj.mixer.removeEventListener('finished', onFinished);
        console.log(`   ✅ Animation finished for card ${cardObj.id}`);
        resolve();
      }
    };
    cardObj.mixer.addEventListener('finished', onFinished);
    
    // Safety timeout - use ACTUAL desired duration
    setTimeout(() => {
      cardObj.mixer.removeEventListener('finished', onFinished);
      console.log(`   ⏱️  Animation timeout (${desiredDuration.toFixed(2)}s) for card ${cardObj.id}`);
      resolve();
    }, ANIMATION_CONFIG.FLIP_DURATION + 100); // Use config value + small buffer
  });
}

/**
 * Update all animation mixers (call this every frame)
 * @param {array} cards - Array of card objects with mixers
 * @param {number} delta - Time since last frame in seconds
 */
export function updateAnimations(cards, delta) {
  cards.forEach(cardObj => {
    if (cardObj.mixer) {
      cardObj.mixer.update(delta);
    }
  });
}