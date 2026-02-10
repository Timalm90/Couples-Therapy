/**
 * Renderer Module
 * Handles Three.js scene initialization, camera, lights, and render loop
 */

import * as THREE from "https://esm.sh/three@0.152.2";
import {
  CAMERA_CONFIG,
  RENDER_CONFIG,
  LIGHTING_CONFIG,
  ANIMATION_CONFIG,
} from "./config.js";
import { updateAnimations } from "./animator.js";

// ═══════════════════════════════════════════════════════════════════════════
// MODULE STATE
// ═══════════════════════════════════════════════════════════════════════════

let renderer = null;
let scene = null;
let camera = null;
let raycaster = null;
let container = null;
let clock = new THREE.Clock();
let animationFrameId = null;
let resizeTimeout = null;

// External references (set by other modules)
let cardsArray = [];
let onCardClickCallback = null;

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize the Three.js renderer and scene
 * @param {function} onCardClick - Callback when a card is clicked
 * @returns {object} Scene, camera, and renderer references
 */
export function initRenderer(onCardClick) {
  onCardClickCallback = onCardClick;

  // Setup container
  const grid = document.getElementById("cardGrid");
  if (grid) {
    container = grid;
    // Ensure grid can contain canvas and won't collapse
    container.style.position = container.style.position || "relative";
    container.style.overflow = "hidden";
    container.style.minWidth = `${RENDER_CONFIG.MIN_WIDTH}px`;
    container.style.minHeight = `${RENDER_CONFIG.MIN_HEIGHT}px`;
    container.style.width = container.style.width || "100%";
    container.style.height = container.style.height || "100%";
  } else {
    container = document.createElement("div");
    container.id = "threejs-root";
    container.style.position = "absolute";
    container.style.left = "0";
    container.style.top = "0";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.minWidth = `${RENDER_CONFIG.MIN_WIDTH}px`;
    container.style.minHeight = `${RENDER_CONFIG.MIN_HEIGHT}px`;
    container.style.pointerEvents = "auto";
    document.body.appendChild(container);
  }

  // Initialize WebGL renderer
  renderer = new THREE.WebGLRenderer({
    antialias: RENDER_CONFIG.ANTIALIAS,
    alpha: RENDER_CONFIG.ALPHA,
  });

  const dpr = Math.min(window.devicePixelRatio || 1, RENDER_CONFIG.MAX_DPR);
  renderer.setPixelRatio(dpr);

  const cw = Math.max(
    RENDER_CONFIG.MIN_WIDTH,
    container.clientWidth || window.innerWidth,
  );
  const ch = Math.max(
    RENDER_CONFIG.MIN_HEIGHT,
    container.clientHeight || window.innerHeight,
  );
  renderer.setSize(cw, ch, false);

  // Remove any previous canvas
  const existingCanvas = container.querySelector("canvas");
  if (existingCanvas) existingCanvas.remove();

  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  container.appendChild(renderer.domElement);

  // Initialize scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(RENDER_CONFIG.BACKGROUND_COLOR);

  // Initialize camera
  const containerWidth = container.clientWidth || window.innerWidth;
  const containerHeight = container.clientHeight || window.innerHeight;

  camera = new THREE.PerspectiveCamera(
    CAMERA_CONFIG.FOV,
    containerWidth / containerHeight,
    0.1,
    2000,
  );

  // Position camera using TILT_ANGLE
  const angleRad = (Math.PI / 180) * CAMERA_CONFIG.TILT_ANGLE;
  const cameraZ = 10;
  const cameraY = Math.tan(angleRad) * cameraZ;
  camera.position.set(0, cameraY, cameraZ);
  camera.lookAt(0, 0, 0);

  // Add lights
  const ambient = new THREE.AmbientLight(
    LIGHTING_CONFIG.AMBIENT_COLOR,
    LIGHTING_CONFIG.AMBIENT_INTENSITY,
  );
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(
    LIGHTING_CONFIG.DIRECTIONAL_COLOR,
    LIGHTING_CONFIG.DIRECTIONAL_INTENSITY,
  );
  dir.position.set(
    LIGHTING_CONFIG.DIRECTIONAL_POSITION.x,
    LIGHTING_CONFIG.DIRECTIONAL_POSITION.y,
    LIGHTING_CONFIG.DIRECTIONAL_POSITION.z,
  );
  scene.add(dir);

  // Initialize raycaster for click detection
  raycaster = new THREE.Raycaster();

  // Event listeners
  window.addEventListener("resize", handleResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", handleResize);
  }
  window.addEventListener("click", onPointerClick);

  // Initial resize
  onWindowResize();

  // Start render loop
  startRenderLoop();

  return { scene, camera, renderer };
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER LOOP
// ═══════════════════════════════════════════════════════════════════════════

function animate() {
  animationFrameId = requestAnimationFrame(animate);

  // Update all animation mixers
  const delta = clock.getDelta();
  updateAnimations(cardsArray, delta);

  // Render the scene
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function startRenderLoop() {
  if (!animationFrameId) {
    animate();
  }
}

export function stopRenderLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WINDOW RESIZE
// ═══════════════════════════════════════════════════════════════════════════

function onWindowResize() {
  if (!camera || !renderer || !container) return;

  // Get container dimensions with multiple fallbacks
  let w = container.clientWidth || container.offsetWidth || window.innerWidth;
  let h =
    container.clientHeight || container.offsetHeight || window.innerHeight;

  // Enforce minimum dimensions to prevent collapse
  if (w < RENDER_CONFIG.MIN_WIDTH || h < RENDER_CONFIG.MIN_HEIGHT) {
    console.warn(`⚠️  Container too small (${w}x${h}), enforcing minimums`);
    w = Math.max(w, RENDER_CONFIG.MIN_WIDTH);
    h = Math.max(h, RENDER_CONFIG.MIN_HEIGHT);

    // Force container to maintain minimum size
    container.style.minWidth = `${RENDER_CONFIG.MIN_WIDTH}px`;
    container.style.minHeight = `${RENDER_CONFIG.MIN_HEIGHT}px`;
  }

  // Update camera aspect ratio
  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  // Update renderer size
  const dpr = Math.min(window.devicePixelRatio || 1, RENDER_CONFIG.MAX_DPR);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);

  // Ensure canvas fills container
  if (renderer.domElement) {
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
  }

  console.log(`📐 Resize: ${w}x${h}, aspect: ${camera.aspect.toFixed(2)}`);
}

function handleResize() {
  // Debounce resize events
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    onWindowResize();
    // Refit camera if cards exist (handled by cardManager)
  }, ANIMATION_CONFIG.RESIZE_DEBOUNCE);
}

// ═══════════════════════════════════════════════════════════════════════════
// CLICK HANDLING
// ═══════════════════════════════════════════════════════════════════════════

function onPointerClick(event) {
  if (!camera || !raycaster || cardsArray.length === 0) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera({ x, y }, camera);
  const intersects = raycaster.intersectObjects(
    cardsArray.map((c) => c.mesh),
    true,
  );
  if (intersects.length === 0) return;

  // Find top-level card mesh
  let obj = intersects[0].object;
  while (obj && !obj.userData?.cardId) obj = obj.parent;
  if (!obj) return;

  const cardId = obj.userData.cardId;
  if (onCardClickCallback) {
    onCardClickCallback(cardId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

export function setCardsArray(cards) {
  cardsArray = cards;
}

export function getScene() {
  return scene;
}

export function getCamera() {
  return camera;
}

export function getRenderer() {
  return renderer;
}

export function triggerResize() {
  onWindowResize();
}
