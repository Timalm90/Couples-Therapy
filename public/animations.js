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
  }, 800);
}