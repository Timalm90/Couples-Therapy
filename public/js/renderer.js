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

// Target aspect ratio (width / height) to keep scene almost square
const DESIRED_ASPECT = 1.1;
// Padding inside the `cardGrid` frame so the frame color is visible around canvas
const FRAME_PADDING = 24; // pixels

// External references
let cardsArray = [];
let onCardClickCallback = null;

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

export async function initRenderer(onCardClick) {
  onCardClickCallback = onCardClick;

  // Setup container
  const grid = document.getElementById("cardGrid");

  if (grid) {
    container = grid;
    container.style.position ||= "relative";
    container.style.overflow = "hidden";
    container.style.minWidth = `${RENDER_CONFIG.MIN_WIDTH}px`;
    container.style.minHeight = `${RENDER_CONFIG.MIN_HEIGHT}px`;
    container.style.width ||= "100%";
    container.style.height ||= "100%";
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
    document.body.appendChild(container);
  }

  // Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: RENDER_CONFIG.ANTIALIAS,
    alpha: RENDER_CONFIG.ALPHA,
  });

  // Use physically correct lighting and sensible color/tone settings
  renderer.physicallyCorrectLights = true;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = HDRI_CONFIG.INTENSITY || 1.0;

  // PMREM generator for converting equirectangular HDR to a cube-like env map
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  // Enable shadows
  if (RENDER_CONFIG.SHADOWS_ENABLED) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

  // Make the container act like a framed viewport. Use `width:100%` with a
  // `maxWidth` so it remains responsive, but never grows wider than the
  // calculated outer size. Use `aspectRatio` so the outer frame keeps the
  // desired proportions responsively.
  const outerMaxWidth = Math.min(cw, Math.round(DESIRED_ASPECT * ch));
  const outerMaxHeight = ch;
  try {
    container.style.boxSizing = "border-box";
    container.style.padding = `${FRAME_PADDING}px`;
    container.style.width = "100%";
    container.style.maxWidth = `${outerMaxWidth}px`;
    // Let the aspect-ratio enforce height responsively
    container.style.aspectRatio = String(DESIRED_ASPECT);
    container.style.margin = "0 auto";
  } catch (e) {
    // ignore if container styles are read-only for some reason
  }

  // Now that container sizing is set, measure the actual outer size and size
  // the inner renderer accordingly (outer minus padding).
  const measuredOuterW = Math.max(
    RENDER_CONFIG.MIN_WIDTH,
    container.clientWidth || outerMaxWidth,
  );
  const measuredOuterH = Math.max(
    RENDER_CONFIG.MIN_HEIGHT,
    container.clientHeight || outerMaxHeight,
  );
  const measuredInnerW = Math.max(1, measuredOuterW - FRAME_PADDING * 2);
  const measuredInnerH = Math.max(1, measuredOuterH - FRAME_PADDING * 2);

  renderer.setSize(measuredInnerW, measuredInnerH, false);

  container.querySelector("canvas")?.remove();
  renderer.domElement.style.width = `${measuredInnerW}px`;
  renderer.domElement.style.height = `${measuredInnerH}px`;
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.left = "50%";
  renderer.domElement.style.top = "50%";
  renderer.domElement.style.transform = "translate(-50%, -50%)";
  renderer.domElement.style.display = "block";
  container.appendChild(renderer.domElement);

  // Scene
  scene = new THREE.Scene();

  // Load HDRI if enabled
  if (HDRI_CONFIG.ENABLED) {
    try {
      const equirect = await loadHDRI(HDRI_CONFIG.PATH);
      // Convert to PMREM (suitable for sampling as a cube texture)
      envMap = pmremGenerator.fromEquirectangular(equirect).texture;
      scene.environment = envMap;

      if (HDRI_CONFIG.SHOW_AS_BACKGROUND) {
        // Use the original equirectangular texture as the visible background
        scene.background = equirect;
        scene.backgroundBlurriness = HDRI_CONFIG.BACKGROUND_BLUR;
        // Do not dispose equirect since it's used as background
      } else {
        scene.background = new THREE.Color(RENDER_CONFIG.BACKGROUND_COLOR);
        if (equirect.dispose) equirect.dispose();
      }

      console.log("✅ HDRI loaded and PMREM generated successfully");
    } catch (err) {
      console.warn("⚠️  Failed to load HDRI, using fallback:", err);
      scene.background = new THREE.Color(RENDER_CONFIG.BACKGROUND_COLOR);
      // Create a simple equirectangular fallback and convert to PMREM
      const fallbackEquirect = createFallbackEnvMap();
      envMap = pmremGenerator.fromEquirectangular(fallbackEquirect).texture;
      // fallbackEquirect is not used as visible background here, dispose it
      if (fallbackEquirect.dispose) fallbackEquirect.dispose();
      scene.environment = envMap;
      scene.background = new THREE.Color(RENDER_CONFIG.BACKGROUND_COLOR);
    }
  } else {
    scene.background = new THREE.Color(RENDER_CONFIG.BACKGROUND_COLOR);
    const fallbackEquirect = createFallbackEnvMap();
    envMap = pmremGenerator.fromEquirectangular(fallbackEquirect).texture;
    if (fallbackEquirect.dispose) fallbackEquirect.dispose();
    scene.environment = envMap;
    scene.background = new THREE.Color(RENDER_CONFIG.BACKGROUND_COLOR);
  }

  // Dispose PMREM generator to free resources
  try {
    pmremGenerator.dispose();
  } catch (e) {
    // ignore
  }

  // Initialize camera
  const containerWidth = container.clientWidth || window.innerWidth;
  const containerHeight = container.clientHeight || window.innerHeight;

  // Camera aspect should match the actual inner canvas aspect (after layout)
  const camInnerW = Math.max(1, container.clientWidth - FRAME_PADDING * 2);
  const camInnerH = Math.max(1, container.clientHeight - FRAME_PADDING * 2);
  camera = new THREE.PerspectiveCamera(
    CAMERA_CONFIG.FOV,
    Math.max(0.0001, camInnerW / camInnerH),
    0.1,
    2000,
  );

  const angleRad = THREE.MathUtils.degToRad(CAMERA_CONFIG.TILT_ANGLE);
  const cameraZ = 10;
  const cameraY = Math.tan(angleRad) * cameraZ;

  camera.position.set(0, cameraY, cameraZ);
  camera.lookAt(0, 0, 0);

  // Lights
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
    shadowLight.shadow.mapSize.set(
      RENDER_CONFIG.SHADOW_MAP_SIZE,
      RENDER_CONFIG.SHADOW_MAP_SIZE,
    );

    shadowLight.shadow.bias = RENDER_CONFIG.SHADOW_BIAS;
    shadowLight.shadow.radius = RENDER_CONFIG.SHADOW_RADIUS;

    scene.add(shadowLight);
  }

  if (RENDER_CONFIG.SHADOWS_ENABLED) {
    createShadowCatcher();
  }

  raycaster = new THREE.Raycaster();

  window.addEventListener("resize", handleResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", handleResize);
  }
  window.addEventListener("click", onPointerClick);

  onWindowResize();
  startRenderLoop();

  return { scene, camera, renderer, envMap };
}

// ═══════════════════════════════════════════════════════════════════════════
// HDRI LOADER
// ═══════════════════════════════════════════════════════════════════════════

function loadHDRI(path) {
  return new Promise((resolve, reject) => {
    new RGBELoader().load(
      path,
      (texture) => {
        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();

        const env = pmrem.fromEquirectangular(texture).texture;

        texture.dispose();
        pmrem.dispose();

        resolve(env);
      },
      undefined,
      (error) => {
        reject(error);
      },
    );
  });
}

function createFallbackEnvMap() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Create a simple gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, "#87CEEB"); // Sky blue
  gradient.addColorStop(1, "#E0F6FF"); // Light blue
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;

  return texture;
}

// ═══════════════════════════════════════════════════════════════════════════
// SHADOW CATCHER
// ═══════════════════════════════════════════════════════════════════════════

function createShadowCatcher() {
  const geometry = new THREE.PlaneGeometry(100, 100);

  // Create custom shadow catcher material
  const material = new THREE.ShadowMaterial();
  material.opacity = 0.3; // Shadow darkness (0 = invisible, 1 = black)

  shadowCatcher = new THREE.Mesh(geometry, material);
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = -0.01;
  shadowCatcher.receiveShadow = true;
  shadowCatcher.name = "shadowCatcher";

  scene.add(shadowCatcher);
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER LOOP
// ═══════════════════════════════════════════════════════════════════════════

function animate() {
  animationFrameId = requestAnimationFrame(animate);

  const delta = clock.getDelta();
  updateAnimations(cardsArray, delta);

  if (LIQUID_GLASS_CONFIG.ENABLED && envMap) {
    cardsArray.forEach((card) => {
      if (
        card.backMesh &&
        card.backMesh.material &&
        card.backMesh.material.uniforms
      ) {
        updateLiquidGlassShader(card.backMesh.material, delta, camera);
      }
    });
  }

  renderer.render(scene, camera);
}

function startRenderLoop() {
  if (!animationFrameId) animate();
}

export function stopRenderLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESIZE
// ═══════════════════════════════════════════════════════════════════════════

function onWindowResize() {
  if (!camera || !renderer || !container) return;

  let w = container.clientWidth || window.innerWidth;
  let h = container.clientHeight || window.innerHeight;

  w = Math.max(w, RENDER_CONFIG.MIN_WIDTH);
  h = Math.max(h, RENDER_CONFIG.MIN_HEIGHT);

  // Keep canvas from becoming too wide; clamp to DESIRED_ASPECT when needed.
  // Use responsive container sizing: `width:100%` with a `maxWidth` so the
  // framed container can shrink below the max size but won't grow beyond it.
  const outerLimitW = Math.round(DESIRED_ASPECT * h);
  try {
    container.style.boxSizing = "border-box";
    container.style.padding = `${FRAME_PADDING}px`;
    container.style.width = "100%";
    container.style.maxWidth = `${outerLimitW}px`;
    container.style.aspectRatio = String(DESIRED_ASPECT);
    container.style.margin = "0 auto";
  } catch (e) {
    // ignore
  }

  // Measure actual outer dimensions after applying responsive constraints
  const actualOuterW = Math.max(
    RENDER_CONFIG.MIN_WIDTH,
    container.clientWidth || w,
  );
  const actualOuterH = Math.max(
    RENDER_CONFIG.MIN_HEIGHT,
    container.clientHeight || h,
  );
  const actualInnerW = Math.max(1, actualOuterW - FRAME_PADDING * 2);
  const actualInnerH = Math.max(1, actualOuterH - FRAME_PADDING * 2);

  camera.aspect = actualInnerW / actualInnerH;
  camera.updateProjectionMatrix();

  const dpr = Math.min(window.devicePixelRatio || 1, RENDER_CONFIG.MAX_DPR);
  renderer.setPixelRatio(dpr);
  renderer.setSize(actualInnerW, actualInnerH, false);
  renderer.domElement.style.width = `${actualInnerW}px`;
  renderer.domElement.style.height = `${actualInnerH}px`;
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.left = "50%";
  renderer.domElement.style.top = "50%";
  renderer.domElement.style.transform = "translate(-50%, -50%)";
}

function handleResize() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(onWindowResize, ANIMATION_CONFIG.RESIZE_DEBOUNCE);
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

  let obj = intersects[0].object;
  while (obj && !obj.userData?.cardId) obj = obj.parent;
  if (!obj) return;

  if (onCardClickCallback) {
    onCardClickCallback(obj.userData.cardId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API (ALL ORIGINAL)
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

export function setHDRIBackgroundVisible(visible) {
  if (!scene || !envMap) return;

  if (visible) {
    scene.background = envMap;
  } else {
    scene.background = new THREE.Color(RENDER_CONFIG.BACKGROUND_COLOR);
  }

  console.log(`🌅 HDRI background ${visible ? "shown" : "hidden"}`);

  console.log(`🌅 HDRI background ${visible ? "shown" : "hidden"}`);
}
