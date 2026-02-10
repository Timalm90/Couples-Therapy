/**
 * Renderer Module
 * Handles Three.js scene initialization, camera, lights, HDRI, shadows, and render loop
 */

import * as THREE from "https://esm.sh/three@0.152.2";
import { RGBELoader } from "https://esm.sh/three@0.152.2/examples/jsm/loaders/RGBELoader.js";
import {
  CAMERA_CONFIG,
  RENDER_CONFIG,
  LIGHTING_CONFIG,
  ANIMATION_CONFIG,
  HDRI_CONFIG,
  LIQUID_GLASS_CONFIG,
} from "./config.js";
import { updateAnimations } from "./animator.js";
import { updateLiquidGlassShader } from "./liquidglassshader.js";

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
let envMap = null;
let shadowCatcher = null;

// External references (set by other modules)
let cardsArray = [];
let onCardClickCallback = null;

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize the Three.js renderer and scene
 * @param {function} onCardClick - Callback when a card is clicked
 * @returns {object} Scene, camera, renderer, and envMap references
 */
export async function initRenderer(onCardClick) {
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

  // Enable shadows
  if (RENDER_CONFIG.SHADOWS_ENABLED) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
  }

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
  
  // Load HDRI if enabled
  if (HDRI_CONFIG.ENABLED) {
    console.log("🌅 Loading HDRI environment...");
    try {
      envMap = await loadHDRI(HDRI_CONFIG.PATH);
      scene.environment = envMap;
      
      if (HDRI_CONFIG.SHOW_AS_BACKGROUND) {
        scene.background = envMap;
        scene.backgroundBlurriness = HDRI_CONFIG.BACKGROUND_BLUR;
      } else {
        scene.background = new THREE.Color(RENDER_CONFIG.BACKGROUND_COLOR);
      }
      
      console.log("✅ HDRI loaded successfully");
    } catch (err) {
      console.warn("⚠️  Failed to load HDRI, using fallback:", err);
      scene.background = new THREE.Color(RENDER_CONFIG.BACKGROUND_COLOR);
      envMap = createFallbackEnvMap();
      scene.environment = envMap;
    }
  } else {
    scene.background = new THREE.Color(RENDER_CONFIG.BACKGROUND_COLOR);
    envMap = createFallbackEnvMap();
    scene.environment = envMap;
  }

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

  // Add shadow-casting light if enabled
  if (LIGHTING_CONFIG.SHADOW_LIGHT_ENABLED && RENDER_CONFIG.SHADOWS_ENABLED) {
    const shadowLight = new THREE.DirectionalLight(
      0xffffff,
      LIGHTING_CONFIG.SHADOW_LIGHT_INTENSITY,
    );
    shadowLight.position.set(
      LIGHTING_CONFIG.SHADOW_LIGHT_POSITION.x,
      LIGHTING_CONFIG.SHADOW_LIGHT_POSITION.y,
      LIGHTING_CONFIG.SHADOW_LIGHT_POSITION.z,
    );
    
    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.width = RENDER_CONFIG.SHADOW_MAP_SIZE;
    shadowLight.shadow.mapSize.height = RENDER_CONFIG.SHADOW_MAP_SIZE;
    shadowLight.shadow.camera.near = 0.5;
    shadowLight.shadow.camera.far = 50;
    shadowLight.shadow.camera.left = -15;
    shadowLight.shadow.camera.right = 15;
    shadowLight.shadow.camera.top = 15;
    shadowLight.shadow.camera.bottom = -15;
    shadowLight.shadow.bias = RENDER_CONFIG.SHADOW_BIAS;
    shadowLight.shadow.radius = RENDER_CONFIG.SHADOW_RADIUS;
    
    scene.add(shadowLight);
    console.log("💡 Shadow-casting light added");
  }

  // Create shadow catcher (invisible plane that receives shadows)
  if (RENDER_CONFIG.SHADOWS_ENABLED) {
    createShadowCatcher();
  }

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

  return { scene, camera, renderer, envMap };
}

// ═══════════════════════════════════════════════════════════════════════════
// HDRI LOADING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load an HDRI environment map
 * @param {string} path - Path to the .hdr file
 * @returns {Promise<THREE.Texture>} The loaded environment map
 */
function loadHDRI(path) {
  return new Promise((resolve, reject) => {
    const loader = new RGBELoader();
    loader.load(
      path,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        resolve(texture);
      },
      undefined,
      (error) => {
        reject(error);
      }
    );
  });
}

/**
 * Create a fallback environment map if HDRI fails to load
 * @returns {THREE.CubeTexture} A simple gradient cube map
 */
function createFallbackEnvMap() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Create a simple gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, '#87CEEB'); // Sky blue
  gradient.addColorStop(1, '#E0F6FF'); // Light blue
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  
  return texture;
}

// ═══════════════════════════════════════════════════════════════════════════
// SHADOW CATCHER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create an invisible plane that receives shadows (shadow catcher)
 */
function createShadowCatcher() {
  const geometry = new THREE.PlaneGeometry(100, 100);
  
  // Create custom shadow catcher material
  const material = new THREE.ShadowMaterial();
  material.opacity = 0.3; // Shadow darkness (0 = invisible, 1 = black)
  
  shadowCatcher = new THREE.Mesh(geometry, material);
  shadowCatcher.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  shadowCatcher.position.y = -0.01; // Slightly below cards to avoid z-fighting
  shadowCatcher.receiveShadow = true;
  shadowCatcher.name = "shadowCatcher";
  
  scene.add(shadowCatcher);
  console.log("🎭 Shadow catcher plane added");
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER LOOP
// ═══════════════════════════════════════════════════════════════════════════

function animate() {
  animationFrameId = requestAnimationFrame(animate);

  // Update all animation mixers
  const delta = clock.getDelta();
  updateAnimations(cardsArray, delta);

  // Update liquid glass shaders if enabled
  if (LIQUID_GLASS_CONFIG.ENABLED && envMap) {
    cardsArray.forEach((card) => {
      if (card.backMesh && card.backMesh.material && card.backMesh.material.uniforms) {
        updateLiquidGlassShader(card.backMesh.material, delta);
      }
    });
  }

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

export function getEnvMap() {
  return envMap;
}

export function triggerResize() {
  onWindowResize();
}

/**
 * Update HDRI visibility in background
 * @param {boolean} visible - Whether to show HDRI as background
 */
export function setHDRIBackgroundVisible(visible) {
  if (!scene || !envMap) return;
  
  if (visible) {
    scene.background = envMap;
    scene.backgroundBlurriness = HDRI_CONFIG.BACKGROUND_BLUR;
  } else {
    scene.background = new THREE.Color(RENDER_CONFIG.BACKGROUND_COLOR);
  }
  
  console.log(`🌅 HDRI background ${visible ? 'shown' : 'hidden'}`);
}