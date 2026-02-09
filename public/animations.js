export function launchFullscreenConfetti(pieces = 160) {
  const existing = document.querySelector(".confetti-screen");
  if (existing) return; // already running

  const screen = document.createElement("div");
  screen.className = "confetti-screen";

  for (let i = 0; i < pieces; i++) {
    const el = document.createElement("i");

    const left = Math.random() * 100;
    const delay = Math.random() * 0.8; // small stagger
    const duration = 8 + Math.random() * 2; // slow + dramatic
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
