/**
 * Card Manager Module
 * Handles card instance creation, positioning, textures, and state management
 */

import * as THREE from "https://esm.sh/three@0.152.2";
import { FBXLoader } from "https://esm.sh/three@0.152.2/examples/jsm/loaders/FBXLoader.js";
import * as SkeletonUtils from "https://esm.sh/three@0.152.2/examples/jsm/utils/SkeletonUtils.js";
import { CAMERA_CONFIG, CARD_CONFIG, ASSET_PATHS } from "./config.js";
import { animateCardFlip } from "./animator.js";

// ═══════════════════════════════════════════════════════════════════════════
// MODULE STATE
// ═══════════════════════════════════════════════════════════════════════════

let fbxTemplate = null;
let frontTextures = new Map();
let backTexture = null;
let cards = [];
let inputLocked = false;
let inputLockTimer = null;

const loader = new FBXLoader();
const texLoader = new THREE.TextureLoader();

// References to other modules (set during init)
let scene = null;
let camera = null;

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize card manager and load assets
 * @param {THREE.Scene} sceneRef - Three.js scene reference
 * @param {THREE.Camera} cameraRef - Three.js camera reference
 */
export async function initCardManager(sceneRef, cameraRef) {
  scene = sceneRef;
  camera = cameraRef;

  // Load FBX model
  try {
    fbxTemplate = await loader.loadAsync(ASSET_PATHS.CARD_MODEL);
    console.log("FBX loaded:", fbxTemplate);
    console.log("FBX animations:", fbxTemplate.animations?.length || 0);
    console.log(
      "FBX children:",
      fbxTemplate.children.map((c) => `${c.name} (${c.type})`),
    );
  } catch (err) {
    console.warn("Failed to load card.fbx:", err);
  }

  // Load back texture
  backTexture = await new Promise((resolve) => {
    texLoader.load(
      ASSET_PATHS.CARD_BACK_TEXTURE,
      (tex) => resolve(tex),
      undefined,
      () => {
        // Fallback: create a simple canvas texture
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#444";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#666";
        ctx.fillRect(12, 12, canvas.width - 24, canvas.height - 24);
        // Draw a subtle radial gradient as a neutral fallback (no question mark)
        const grad = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          10,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width / 2,
        );
        grad.addColorStop(0, "#e6eefb");
        grad.addColorStop(0.5, "#c7d6e8");
        grad.addColorStop(1, "#6f7b86");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const tex = new THREE.CanvasTexture(canvas);
        resolve(tex);
      },
    );
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEXTURE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function ensureFrontTexture(value) {
  if (!value) return Promise.resolve(backTexture);
  if (frontTextures.has(value))
    return Promise.resolve(frontTextures.get(value));

  // Map server card values (A-H) to numeric texture names 01..08
  let indexStr;
  if (typeof value === "number") {
    indexStr = String(value).padStart(2, "0");
  } else if (typeof value === "string") {
    const m = value.match(/^[A-Za-z]$/);
    if (m) {
      const upper = value.toUpperCase();
      const idx = upper.charCodeAt(0) - "A".charCodeAt(0) + 1; // A -> 1
      indexStr = String(idx).padStart(2, "0");
    } else {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) indexStr = String(parsed).padStart(2, "0");
      else indexStr = String(value).padStart(2, "0");
    }
  } else {
    indexStr = String(value).padStart(2, "0");
  }

  return new Promise((resolve) => {
    const path = `${ASSET_PATHS.CARD_FRONT_TEXTURE_PREFIX}${indexStr}${ASSET_PATHS.CARD_FRONT_TEXTURE_SUFFIX}`;
    texLoader.load(
      path,
      (tex) => {
        frontTextures.set(value, tex);
        resolve(tex);
      },
      undefined,
      (err) => {
        console.warn("Failed to load texture", path, err);
        resolve(backTexture);
      },
    );
  });
}

function setFrontTextureForMesh(cardObj, arg) {
  // `arg` may be either a boolean `toFaceUp` (from animator) or
  // a texture value/index. If boolean and true, use the card's value;
  // if boolean and false, assign the back texture.
  const front = cardObj.frontMesh;
  if (!front) return;

  const isBool = typeof arg === "boolean";
  if (isBool) {
    const toFaceUp = arg;
    if (!toFaceUp) {
      // Face-down: show back texture on front mesh to match visual
      front.material = front.material
        ? front.material.clone()
        : new THREE.MeshBasicMaterial();
      front.material.map = backTexture;
      front.material.needsUpdate = true;
      return;
    }
    // Face-up: use the card object's current value
    const value = cardObj.value;
    ensureFrontTexture(value).then((tex) => {
      front.material = front.material
        ? front.material.clone()
        : new THREE.MeshBasicMaterial();
      front.material.map = tex;
      front.material.needsUpdate = true;
    });
    return;
  }

  // Non-boolean: treat arg as the value/index to load
  const value = arg;
  ensureFrontTexture(value).then((tex) => {
    front.material = front.material
      ? front.material.clone()
      : new THREE.MeshBasicMaterial();
    front.material.map = tex;
    front.material.needsUpdate = true;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CARD CREATION
// ═══════════════════════════════════════════════════════════════════════════

function createCardInstance(cardId, value, index, total) {
  if (!fbxTemplate) return null;

  // Clone with skeleton
  const clone = SkeletonUtils.clone(fbxTemplate);
  clone.name = `card_${cardId}`;
  clone.userData.cardId = cardId;

  // Find front and back meshes
  let frontMesh = null;
  let backMesh = null;
  const allMeshes = [];

  clone.traverse((node) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    allMeshes.push(node);
    const lname = (node.name || "").toLowerCase();
    if (!frontMesh && /front/.test(lname)) frontMesh = node;
    else if (!backMesh && /back/.test(lname)) backMesh = node;
  });

  // Fallback mesh detection
  if (!frontMesh && !backMesh && allMeshes.length >= 2) {
    frontMesh = allMeshes[0];
    backMesh = allMeshes[1];
  } else if (!frontMesh && allMeshes.length >= 1) {
    frontMesh = allMeshes[0];
  } else if (!backMesh && allMeshes.length >= 2) {
    backMesh = allMeshes[1];
  }

  // Calculate bounding box for auto-scaling
  const bbox = new THREE.Box3().setFromObject(clone);
  const bboxSize = new THREE.Vector3();
  bbox.getSize(bboxSize);

  if (index === 0) {
    console.log(
      `📦 Card model size: ${bboxSize.x.toFixed(2)} x ${bboxSize.y.toFixed(2)} x ${bboxSize.z.toFixed(2)}`,
    );
    console.log(
      `   Found ${allMeshes.length} meshes:`,
      allMeshes.map((m) => m.name || "unnamed"),
    );
    console.log(
      `   Front mesh: ${frontMesh?.name || "none"}, Back mesh: ${backMesh?.name || "none"}`,
    );
  }

  // Auto-scale
  const maxDim = Math.max(bboxSize.x, bboxSize.y, bboxSize.z);
  let autoScale = 1.0;

  if (maxDim > 0.001) {
    autoScale = CARD_CONFIG.TARGET_SIZE / maxDim;
    if (index === 0) {
      console.log(
        `🔍 Auto-scale factor: ${autoScale.toFixed(3)} (target size: ${CARD_CONFIG.TARGET_SIZE})`,
      );
    }
  }

  // Apply materials
  allMeshes.forEach((mesh, idx) => {
    if (mesh.material) {
      mesh.material = mesh.material.clone();
      mesh.material.side = THREE.DoubleSide;

      if (mesh === backMesh) {
        mesh.material.map = backTexture;
        mesh.material.color = new THREE.Color(0xffffff);
        if (index === 0) {
          console.log(`  ✓ Applied back texture to: ${mesh.name}`);
        }
      } else if (mesh === frontMesh) {
        const tex = frontTextures.get(value) || backTexture;
        mesh.material.map = tex;
        mesh.material.color = new THREE.Color(0xffffff);
        if (index === 0) {
          console.log(`  ✓ Applied front texture to: ${mesh.name}`);
        }
      } else {
        mesh.material.color = new THREE.Color(0xffffff);
      }

      mesh.material.needsUpdate = true;
    }
  });

  // Apply scale
  clone.scale.set(autoScale, autoScale, autoScale);

  if (index === 0) {
    console.log(
      "💀 Using skeletal animation for flip (no base rotation applied)",
    );
  }

  // Position in grid
  const cols = Math.ceil(Math.sqrt(total));
  const spacing = CAMERA_CONFIG.CARD_SPACING;
  const row = Math.floor(index / cols);
  const col = index % cols;
  const offsetX = -(cols - 1) * spacing * 0.5;
  const offsetZ = -(Math.ceil(total / cols) - 1) * spacing * 0.5;
  clone.position.set(offsetX + col * spacing, 0, offsetZ + row * spacing);

  if (index === 0) {
    console.log(
      `📍 Created card 1/${total}: ${cardId} at (${clone.position.x.toFixed(1)}, ${clone.position.z.toFixed(1)})`,
    );
  } else if (index === 1) {
    console.log(
      `📍 Created card 2/${total}: ${cardId} at (${clone.position.x.toFixed(1)}, ${clone.position.z.toFixed(1)})`,
    );
  } else if (index === 2) {
    console.log(
      `📍 Created card 3/${total}: ${cardId} at (${clone.position.x.toFixed(1)}, ${clone.position.z.toFixed(1)})`,
    );
  } else if (index === 15) {
    console.log(
      `📍 Created card 16/${total}: ${cardId} at (${clone.position.x.toFixed(1)}, ${clone.position.z.toFixed(1)})`,
    );
  }

  // Setup animation
  let mixer = null;
  let flipAction = null;

  if (fbxTemplate.animations && fbxTemplate.animations.length > 0) {
    mixer = new THREE.AnimationMixer(clone);
    const clip = fbxTemplate.animations[0];
    flipAction = mixer.clipAction(clip);
    flipAction.setLoop(THREE.LoopOnce);
    flipAction.clampWhenFinished = true;
    flipAction.timeScale = 1;

    if (index === 0) {
      console.log(`🎬 Animation setup:`);
      console.log(`   - Clip name: "${clip.name}"`);
      console.log(`   - Duration: ${clip.duration.toFixed(2)}s`);
      console.log(`   - Tracks: ${clip.tracks.length}`);
    }
  }

  scene.add(clone);

  if (index === 0) {
    console.log(
      `✅ Card added to scene at position (${clone.position.x.toFixed(1)}, ${clone.position.y.toFixed(1)}, ${clone.position.z.toFixed(1)})`,
    );
    console.log(`   Scale: ${clone.scale.x.toFixed(2)}`);
  }

  return {
    id: cardId,
    value,
    mesh: clone,
    frontMesh,
    backMesh,
    isFaceUp: false,
    isMatched: false,
    mixer,
    flipAction,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMERA FITTING
// ═══════════════════════════════════════════════════════════════════════════

function fitCameraToCards() {
  if (!camera || cards.length === 0) return;

  const box = new THREE.Box3();
  cards.forEach((c) => box.expandByObject(c.mesh));
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  console.log(
    `📷 fitCameraToCards: box size=${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)}, center=${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}`,
  );

  const maxDim = Math.max(size.x, size.z, 1);
  const fov = camera.fov * (Math.PI / 180);
  const halfFov = fov / 2;
  let distance = (maxDim / 2 / Math.tan(halfFov)) * CAMERA_CONFIG.PADDING;
  distance = Math.max(distance, 5);

  const tiltRad = (Math.PI / 180) * CAMERA_CONFIG.TILT_ANGLE;
  const verticalOffset = distance * Math.sin(tiltRad);
  const horizontalOffset = distance * Math.cos(tiltRad);

  camera.position.set(
    center.x + CAMERA_CONFIG.OFFSET_X,
    verticalOffset + center.y + CAMERA_CONFIG.OFFSET_Y,
    center.z + horizontalOffset + CAMERA_CONFIG.OFFSET_Z,
  );
  camera.lookAt(center);
  camera.updateProjectionMatrix();

  console.log(
    `   Camera position: ${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}, looking at ${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}`,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME STATE UPDATE
// ═══════════════════════════════════════════════════════════════════════════

export async function updateFromGameState(gameState) {
  if (!gameState || !gameState.cards) return;

  // Lock input while processing
  inputLocked = true;
  if (inputLockTimer) clearTimeout(inputLockTimer);

  const total = gameState.cards.length;

  // Preload textures
  const loadPromises = gameState.cards.map((c) => ensureFrontTexture(c.value));
  await Promise.all(loadPromises);

  // Remove old cards
  const newGameCardIds = new Set(gameState.cards.map((c) => c.id));
  const cardsToRemove = cards.filter((c) => !newGameCardIds.has(c.id));

  if (cardsToRemove.length > 0) {
    console.log(
      `🗑️  Removing ${cardsToRemove.length} old cards from previous game`,
    );
    cardsToRemove.forEach((c) => {
      scene.remove(c.mesh);
      c.mesh.traverse((node) => {
        if (node.isMesh) {
          node.geometry?.dispose();
          node.material?.dispose();
        }
      });
    });
    cards = cards.filter((c) => newGameCardIds.has(c.id));
  }

  // Create new cards
  let newCardsCreated = false;
  gameState.cards.forEach((c, idx) => {
    let existing = cards.find((x) => x.id === c.id);
    if (!existing) {
      const inst = createCardInstance(c.id, c.value, idx, total);
      if (inst) {
        cards.push(inst);
        newCardsCreated = true;
      }
    }
  });

  console.log(`🃏 Total cards in scene: ${cards.length}/${total}`);

  // Update card states and animate
  for (const g of gameState.cards) {
    const local = cards.find((c) => c.id === g.id);
    if (!local) continue;

    // Handle matched cards
    if (g.isMatched && !local.isMatched) {
      local.isMatched = true;
      local.mesh.position.y = CARD_CONFIG.MATCH_RAISE_HEIGHT;
      local.mesh.traverse((node) => {
        if (node.isMesh) {
          if (!node.material.origColor && node.material.color) {
            node.material.origColor = node.material.color.clone();
          }
          if (node.material.color) {
            node.material.color.lerp(
              new THREE.Color(CARD_CONFIG.MATCH_TINT_COLOR),
              CARD_CONFIG.MATCH_TINT_AMOUNT,
            );
          }
        }
      });
    }

    // Handle flips
    if (g.isFaceUp !== local.isFaceUp) {
      local.value = g.value;
      await animateCardFlip(local, g.isFaceUp, setFrontTextureForMesh);
      local.isFaceUp = g.isFaceUp;
    }
  }

  // Release input lock
  inputLocked = false;
  if (inputLockTimer) {
    clearTimeout(inputLockTimer);
    inputLockTimer = null;
  }

  // Fit camera only when new cards created
  if (newCardsCreated) {
    try {
      fitCameraToCards();
    } catch (err) {
      console.warn("fitCameraToCards failed:", err);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

export function getCards() {
  return cards;
}

export function isInputLocked() {
  return inputLocked;
}

export function lockInput(duration) {
  inputLocked = true;
  if (inputLockTimer) clearTimeout(inputLockTimer);
  inputLockTimer = setTimeout(() => {
    inputLocked = false;
    inputLockTimer = null;
  }, duration);
}
