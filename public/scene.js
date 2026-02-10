// Lightweight Three.js scene module for the Memory game.
// Exports: initScene(onCardClick) and updateFromGameState(gameState)

import * as THREE from 'https://esm.sh/three@0.152.2';
import { FBXLoader } from 'https://esm.sh/three@0.152.2/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'https://esm.sh/three@0.152.2/examples/jsm/utils/SkeletonUtils.js';

// ═══════════════════════════════════════════════════════════════════════════
// CAMERA CONTROLS - Adjust these values to change camera behavior
// ═══════════════════════════════════════════════════════════════════════════
const CAMERA_CONFIG = {
	// Field of View (in degrees) - Higher = wider view, Lower = more zoomed/telephoto
	// Recommended range: 40-60 degrees. Default: 50
	FOV: 45,
	
	// Camera tilt angle (in degrees) - How much the camera looks down at the cards
	// 0° = straight ahead, 90° = directly overhead
	// Recommended range: 20-45 degrees. Default: 30
	TILT_ANGLE: 75, // More overhead view for flat cards
	
	// Camera distance multiplier when auto-framing cards
	// Higher = camera pulls back further, Lower = camera gets closer
	// Recommended range: 1.0-1.3. Default: 1.15
	PADDING: 1.2,
	
	// Card spacing in 3D units
	// Higher = more space between cards, Lower = cards closer together
	// Recommended range: 2.5-4.0. Default: 3.2
	CARD_SPACING: 1.7,
	
	// Camera position offset (applied after auto-framing)
	// Positive X = move camera right, Negative X = move camera left
	// Positive Y = move camera up, Negative Y = move camera down
	// Positive Z = move camera away from cards, Negative Z = move camera closer
	OFFSET_X: 0,
	OFFSET_Y: 2, // Raise camera a bit higher
	OFFSET_Z: 0
};
// ═══════════════════════════════════════════════════════════════════════════

let renderer, scene, camera, raycaster;
let cards = []; // { id, value, mesh, isFaceUp, isMatched, mixer, flipAction }
let fbxTemplate = null; // Changed from gltfTemplate
let frontTextures = new Map();
let backTexture = null;
let onCardClickCallback = null;
let container = null;
let inputLocked = false;
let inputLockTimer = null;
let clock = new THREE.Clock();

const loader = new FBXLoader(); // Changed from GLTFLoader
const texLoader = new THREE.TextureLoader();

export async function initScene(onCardClick) {
	onCardClickCallback = onCardClick;

	// Render into existing #cardGrid if present, otherwise create a full-page container
	const grid = document.getElementById('cardGrid');
	if (grid) {
		container = grid;
		// ensure grid can contain canvas
		container.style.position = container.style.position || 'relative';
		container.style.overflow = 'hidden';
		// preserve existing children; do not remove them here - caller should avoid clearing the grid
	} else {
		container = document.createElement('div');
		container.id = 'threejs-root';
		container.style.position = 'absolute';
		container.style.left = '0';
		container.style.top = '0';
		container.style.width = '100%';
		container.style.height = '100%';
		container.style.pointerEvents = 'auto';
		document.body.appendChild(container);
	}

	renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	// clamp DPR to avoid huge buffer sizes and inconsistent scaling
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	renderer.setPixelRatio(dpr);
	// Size to container (use false to avoid changing canvas style; we use CSS 100%)
	const cw = Math.max(300, container.clientWidth || window.innerWidth);
	const ch = Math.max(200, container.clientHeight || window.innerHeight);
	renderer.setSize(cw, ch, false);
	// Remove any previous canvas we added earlier to avoid duplicates
	const existingCanvas = container.querySelector('canvas');
	if (existingCanvas) existingCanvas.remove();
	renderer.domElement.style.width = '100%';
	renderer.domElement.style.height = '100%';
	renderer.domElement.style.display = 'block';
	container.appendChild(renderer.domElement);

	// ensure sizes are correct after appending canvas
	onWindowResize();

	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x202020);

	// Initialize camera with FOV from CAMERA_CONFIG
	camera = new THREE.PerspectiveCamera(
		CAMERA_CONFIG.FOV, 
		window.innerWidth / window.innerHeight, 
		0.1, 
		2000
	);
	
	// Position camera using TILT_ANGLE from CAMERA_CONFIG
	// Camera looks down at the cards from an elevated position
	const angleRad = (Math.PI / 180) * CAMERA_CONFIG.TILT_ANGLE;
	const cameraZ = 10;
	const cameraY = Math.tan(angleRad) * cameraZ;
	camera.position.set(0, cameraY, cameraZ);
	camera.lookAt(0, 0, 0);

	const ambient = new THREE.AmbientLight(0xffffff, 0.6);
	scene.add(ambient);
	const dir = new THREE.DirectionalLight(0xffffff, 0.8);
	dir.position.set(10, 10, 10);
	scene.add(dir);

	raycaster = new THREE.Raycaster();

	window.addEventListener('resize', onWindowResize);
	window.addEventListener('click', onPointerClick);

	// Preload the FBX template and back texture
	try {
		fbxTemplate = await loader.loadAsync('/assets/models/card.fbx');
		console.log('FBX loaded:', fbxTemplate);
		console.log('FBX animations:', fbxTemplate.animations?.length || 0);
		
		// Log FBX structure
		console.log('FBX children:', fbxTemplate.children.map(c => `${c.name} (${c.type})`));
	} catch (err) {
		console.warn('Failed to load card.fbx:', err);
	}

	// Back texture: try to load card_back.png, but fall back to a simple generated texture
	backTexture = await new Promise((resolve) => {
		texLoader.load(
			'/assets/textures/card_back.png',
			(tex) => resolve(tex),
			undefined,
			() => {
				// Fallback: create a simple canvas texture (neutral back)
				const canvas = document.createElement('canvas');
				canvas.width = 256;
				canvas.height = 256;
				const ctx = canvas.getContext('2d');
				ctx.fillStyle = '#444';
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.fillStyle = '#666';
				ctx.fillRect(12, 12, canvas.width - 24, canvas.height - 24);
				ctx.fillStyle = '#bbb';
				ctx.font = 'bold 64px sans-serif';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText('?', canvas.width / 2, canvas.height / 2 + 6);
				const tex = new THREE.CanvasTexture(canvas);
				resolve(tex);
			}
		);
	});

	animate();
}

function onWindowResize() {
	if (!camera || !renderer || !container) return;
	const w = container.clientWidth || window.innerWidth;
	const h = container.clientHeight || window.innerHeight;
	camera.aspect = w / h;
	camera.updateProjectionMatrix();
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	renderer.setPixelRatio(dpr);
	renderer.setSize(w, h, false);
}

function animate() {
	requestAnimationFrame(animate);
	
	// Update all animation mixers
	const delta = clock.getDelta();
	cards.forEach(cardObj => {
		if (cardObj.mixer) {
			cardObj.mixer.update(delta);
		}
	});
	
	renderer.render(scene, camera);
}

function onPointerClick(event) {
	if (!camera || !raycaster || cards.length === 0) return;
	if (inputLocked) return; // ignore clicks while locked

	const rect = renderer.domElement.getBoundingClientRect();
	const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
	const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

	raycaster.setFromCamera({ x, y }, camera);
	const intersects = raycaster.intersectObjects(cards.map(c => c.mesh), true);
	if (intersects.length === 0) return;

	// Find top-level card mesh by walking up until we find an object with userData.cardId
	let obj = intersects[0].object;
	while (obj && !obj.userData?.cardId) obj = obj.parent;
	if (!obj) return;

	const cardId = obj.userData.cardId;
	if (onCardClickCallback) {
		// lock input to prevent double-clicks while we wait for server
		inputLocked = true;
		// safety: release input after 2500ms if no server response
		if (inputLockTimer) clearTimeout(inputLockTimer);
		inputLockTimer = setTimeout(() => {
			inputLocked = false;
			inputLockTimer = null;
		}, 2500);
		onCardClickCallback(cardId);
	}
}

function createCardInstance(cardId, value, index, total) {
	if (!fbxTemplate) return null;

	// FBX with skinned meshes must use SkeletonUtils.clone to properly copy skeleton
	const clone = SkeletonUtils.clone(fbxTemplate);
	clone.name = `card_${cardId}`;
	clone.userData.cardId = cardId;

	// Find front and back meshes by traversing children
	let frontMesh = null;
	let backMesh = null;
	const allMeshes = [];
	
	clone.traverse((node) => {
		if (!node.isMesh && !node.isSkinnedMesh) return;
		allMeshes.push(node);
		const lname = (node.name || '').toLowerCase();
		// Look for 'front' before 'back' in the name
		if (!frontMesh && /front/.test(lname)) frontMesh = node;
		else if (!backMesh && /back/.test(lname)) backMesh = node;
	});
	
	// Fallback: if both have similar names, just use first two meshes
	if (!frontMesh && !backMesh && allMeshes.length >= 2) {
		frontMesh = allMeshes[0];
		backMesh = allMeshes[1];
	} else if (!frontMesh && allMeshes.length >= 1) {
		frontMesh = allMeshes[0];
	} else if (!backMesh && allMeshes.length >= 2) {
		backMesh = allMeshes[1];
	}

	// Debug: Calculate bounding box to detect scale issues
	const bbox = new THREE.Box3().setFromObject(clone);
	const bboxSize = new THREE.Vector3();
	bbox.getSize(bboxSize);
	
	// Only log for first card to avoid spam
	if (index === 0) {
		console.log(`📦 Card model size: ${bboxSize.x.toFixed(2)} x ${bboxSize.y.toFixed(2)} x ${bboxSize.z.toFixed(2)}`);
		console.log(`   Found ${allMeshes.length} meshes:`, allMeshes.map(m => m.name || 'unnamed'));
		console.log(`   Front mesh: ${frontMesh?.name || 'none'}, Back mesh: ${backMesh?.name || 'none'}`);
	}

	// Auto-scale if model is too small or too large
	// Target size: approximately 2 units (good for our spacing of 2.5)
	const maxDim = Math.max(bboxSize.x, bboxSize.y, bboxSize.z);
	let autoScale = 1.0;
	
	if (maxDim > 0.001) { // Avoid division by zero
		const targetSize = 2.0;
		autoScale = targetSize / maxDim;
		
		if (index === 0) {
			console.log(`🔍 Auto-scale factor: ${autoScale.toFixed(3)} (target size: ${targetSize})`);
		}
	}

	// Apply materials to meshes
	// Back mesh gets the back texture, front mesh gets white/neutral
	allMeshes.forEach((mesh, idx) => {
		if (mesh.material) {
			mesh.material = mesh.material.clone();
			mesh.material.side = THREE.DoubleSide; // Render both sides
			
			// Apply appropriate material based on mesh
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
				// Default: white neutral color for any other meshes
				mesh.material.color = new THREE.Color(0xffffff);
			}
			
			mesh.material.needsUpdate = true;
		}
	});

	// Apply auto-scale
	clone.scale.set(autoScale, autoScale, autoScale);
	
	// DON'T rotate the base card - the skeletal animation will handle the flip
	// If cards appear vertical, adjust in your 3D software instead
	
	if (index === 0) {
		console.log('💀 Using skeletal animation for flip (no base rotation applied)');
	}

	// Position: arrange in grid by index using CARD_SPACING from CAMERA_CONFIG
	const cols = Math.ceil(Math.sqrt(total));
	const spacing = CAMERA_CONFIG.CARD_SPACING;
	const row = Math.floor(index / cols);
	const col = index % cols;
	const offsetX = -(cols - 1) * spacing * 0.5;
	const offsetZ = -(Math.ceil(total / cols) - 1) * spacing * 0.5;
	clone.position.set(offsetX + col * spacing, 0, offsetZ + row * spacing);

	if (index === 0) {
		console.log(`📍 Created card 1/${total}: ${cardId} at (${clone.position.x.toFixed(1)}, ${clone.position.z.toFixed(1)})`);
	} else if (index === 1) {
		console.log(`📍 Created card 2/${total}: ${cardId} at (${clone.position.x.toFixed(1)}, ${clone.position.z.toFixed(1)})`);
	} else if (index === 2) {
		console.log(`📍 Created card 3/${total}: ${cardId} at (${clone.position.x.toFixed(1)}, ${clone.position.z.toFixed(1)})`);
	} else if (index === 15) {
		console.log(`📍 Created card 16/${total}: ${cardId} at (${clone.position.x.toFixed(1)}, ${clone.position.z.toFixed(1)})`);
	}

	// Setup animation mixer if animations exist
	let mixer = null;
	let flipAction = null;
	
	// FBX animations are stored directly on the object
	if (fbxTemplate.animations && fbxTemplate.animations.length > 0) {
		mixer = new THREE.AnimationMixer(clone);
		
		// Use the first animation (flip animation)
		const clip = fbxTemplate.animations[0];
		flipAction = mixer.clipAction(clip);
		
		// Configure animation settings
		flipAction.setLoop(THREE.LoopOnce);
		flipAction.clampWhenFinished = true;
		flipAction.timeScale = 1; // Normal speed
		
		if (index === 0) {
			console.log(`🎬 Animation setup:`);
			console.log(`   - Clip name: "${clip.name}"`);
			console.log(`   - Duration: ${clip.duration.toFixed(2)}s`);
			console.log(`   - Tracks: ${clip.tracks.length}`);
			clip.tracks.forEach((track, i) => {
				console.log(`     Track ${i}: ${track.name} (${track.times.length} keyframes)`);
			});
		}
	} else {
		if (index === 0) {
			console.warn('⚠️  No animations found in FBX model');
		}
	}

	scene.add(clone);
	
	// Verify card was added and is visible
	if (index === 0) {
		console.log(`✅ Card added to scene at position (${clone.position.x.toFixed(1)}, ${clone.position.y.toFixed(1)}, ${clone.position.z.toFixed(1)})`);
		console.log(`   Rotation: (${(clone.rotation.x * 180 / Math.PI).toFixed(1)}°, ${(clone.rotation.y * 180 / Math.PI).toFixed(1)}°, ${(clone.rotation.z * 180 / Math.PI).toFixed(1)}°)`);
		console.log(`   Scale: ${clone.scale.x.toFixed(2)}`);
		console.log(`   Visible: ${clone.visible}, Meshes: ${allMeshes.map(m => `${m.name}(visible=${m.visible})`).join(', ')}`);
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
		flipAction
	};
}

function ensureFrontTexture(value) {
	if (!value) return Promise.resolve(backTexture);
	if (frontTextures.has(value)) return Promise.resolve(frontTextures.get(value));

	// Map server card values (A-H) to numeric texture names 01..08
	let indexStr;
	if (typeof value === 'number') {
		indexStr = String(value).padStart(2, '0');
	} else if (typeof value === 'string') {
		// If value is a single uppercase letter (A..Z)
		const m = value.match(/^[A-Za-z]$/);
		if (m) {
			const upper = value.toUpperCase();
			const idx = upper.charCodeAt(0) - 'A'.charCodeAt(0) + 1; // A -> 1
			indexStr = String(idx).padStart(2, '0');
		} else {
			// Fallback: try to parse as number
			const parsed = parseInt(value, 10);
			if (!isNaN(parsed)) indexStr = String(parsed).padStart(2, '0');
			else indexStr = String(value).padStart(2, '0');
		}
	} else {
		indexStr = String(value).padStart(2, '0');
	}

	return new Promise((resolve) => {
		const path = `/assets/textures/card_${indexStr}.png`;
		texLoader.load(
			path,
			(tex) => {
				frontTextures.set(value, tex);
				resolve(tex);
			},
			undefined,
			(err) => {
				console.warn('Failed to load texture', path, err);
				resolve(backTexture);
			}
		);
	});
}

function setFrontTextureForMesh(cardObj, value) {
	const front = cardObj.frontMesh;
	if (!front) return;
	ensureFrontTexture(value).then((tex) => {
		front.material = front.material ? front.material.clone() : new THREE.MeshBasicMaterial();
		front.material.map = tex;
		front.material.needsUpdate = true;
	});
}

// Animation using the built-in joint animation from FBX
function animateFlip(cardObj, toFaceUp = true) {
	if (!cardObj.flipAction || !cardObj.mixer) {
		console.warn('⚠️  No animation available for card', cardObj.id);
		return Promise.resolve();
	}

	console.log(`🎬 Playing flip animation for card ${cardObj.id}: ${toFaceUp ? 'FACE UP' : 'FACE DOWN'}`);

	return new Promise((resolve) => {
		// Update texture immediately before starting animation
		setFrontTextureForMesh(cardObj, toFaceUp ? cardObj.value : null);
		
		// Reset the animation to start
		cardObj.mixer.stopAllAction();
		cardObj.flipAction.reset();
		
		// Set direction based on whether we're flipping up or down
		cardObj.flipAction.timeScale = toFaceUp ? 1 : -1;
		
		// If flipping down (reversed), start from the end
		if (!toFaceUp) {
			cardObj.flipAction.time = cardObj.flipAction.getClip().duration;
		}
		
		// Play the animation
		cardObj.flipAction.play();
		
		console.log(`   ▶️  Animation started: timeScale=${cardObj.flipAction.timeScale}, time=${cardObj.flipAction.time.toFixed(2)}s`);
		
		// Listen for animation completion
		const onFinished = (event) => {
			if (event.action === cardObj.flipAction) {
				cardObj.mixer.removeEventListener('finished', onFinished);
				console.log(`   ✅ Animation finished for card ${cardObj.id}`);
				resolve();
			}
		};
		cardObj.mixer.addEventListener('finished', onFinished);
		
		// Safety timeout in case the event doesn't fire
		const duration = cardObj.flipAction.getClip().duration;
		setTimeout(() => {
			cardObj.mixer.removeEventListener('finished', onFinished);
			console.log(`   ⏱️  Animation timeout (${duration}s) for card ${cardObj.id}`);
			resolve();
		}, (duration * 1000) + 100);
	});
}

// Compute bounding box of all cards and position camera to frame them
// Uses PADDING and TILT_ANGLE from CAMERA_CONFIG
function fitCameraToCards() {
	if (!camera || cards.length === 0) return;

	const box = new THREE.Box3();
	cards.forEach(c => box.expandByObject(c.mesh));
	const size = new THREE.Vector3();
	box.getSize(size);
	const center = new THREE.Vector3();
	box.getCenter(center);

	console.log(`📷 fitCameraToCards: box size=${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)}, center=${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}`);

	// Use width (x) and depth (z) to decide scale
	const maxDim = Math.max(size.x, size.z, 1);

	// Distance calculation from vertical FOV
	const fov = camera.fov * (Math.PI / 180);
	const halfFov = fov / 2;
	// distance required so that maxDim fits vertically at the given fov
	let distance = (maxDim / 2) / Math.tan(halfFov) * CAMERA_CONFIG.PADDING;
	
	// Ensure minimum distance to avoid clipping
	distance = Math.max(distance, 5);

	// Calculate camera position using TILT_ANGLE
	const tiltRad = (Math.PI / 180) * CAMERA_CONFIG.TILT_ANGLE;
	const verticalOffset = distance * Math.sin(tiltRad);
	const horizontalOffset = distance * Math.cos(tiltRad);

	// Apply position with offsets from CAMERA_CONFIG
	camera.position.set(
		center.x + CAMERA_CONFIG.OFFSET_X, 
		verticalOffset + center.y + CAMERA_CONFIG.OFFSET_Y, 
		center.z + horizontalOffset + CAMERA_CONFIG.OFFSET_Z
	);
	camera.lookAt(center);
	camera.updateProjectionMatrix();
	
	console.log(`   Camera position: ${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}, looking at ${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}`);
}

export async function updateFromGameState(gameState) {
	if (!gameState || !gameState.cards) return;

	// Remove temporary placeholder inserted by startGame (if present)
	const ph = document.getElementById('startingPlaceholder');
	if (ph && ph.parentNode) ph.parentNode.removeChild(ph);

	// Lock input while we process and animate flips from this state
	inputLocked = true;
	if (inputLockTimer) clearTimeout(inputLockTimer);

	const total = gameState.cards.length;

	// Ensure front textures are queued
	const loadPromises = gameState.cards.map((c) => ensureFrontTexture(c.value));
	await Promise.all(loadPromises);

	// IMPORTANT: Remove ALL old cards that are not in the new game state
	// This prevents cards from stacking up across multiple games
	const newGameCardIds = new Set(gameState.cards.map(c => c.id));
	const cardsToRemove = cards.filter(c => !newGameCardIds.has(c.id));
	
	if (cardsToRemove.length > 0) {
		console.log(`🗑️  Removing ${cardsToRemove.length} old cards from previous game`);
		cardsToRemove.forEach(c => {
			scene.remove(c.mesh);
			// Dispose of geometries and materials to free memory
			c.mesh.traverse((node) => {
				if (node.isMesh) {
					node.geometry?.dispose();
					node.material?.dispose();
				}
			});
		});
		cards = cards.filter(c => newGameCardIds.has(c.id));
	}

	// Create missing cards
	gameState.cards.forEach((c, idx) => {
		let existing = cards.find((x) => x.id === c.id);
		if (!existing) {
			const inst = createCardInstance(c.id, c.value, idx, total);
			if (inst) cards.push(inst);
		}
	});
	
	console.log(`🃏 Total cards in scene: ${cards.length}/${total}`);

	// Remove extra cards if any (rare)
	cards.slice().forEach((c) => {
		if (!gameState.cards.find((g) => g.id === c.id)) {
			scene.remove(c.mesh);
			cards = cards.filter(x => x.id !== c.id);
		}
	});

	// Update states and animate flips
	for (const g of gameState.cards) {
		const local = cards.find((c) => c.id === g.id);
		if (!local) continue;

		// Match status
		if (g.isMatched && !local.isMatched) {
			local.isMatched = true;
			// simple visual: raise slightly and tint
			local.mesh.position.y = 0.06;
			local.mesh.traverse((node) => {
				if (node.isMesh) {
					if (!node.material.origColor && node.material.color) node.material.origColor = node.material.color.clone();
					if (node.material.color) node.material.color.lerp(new THREE.Color(0x88ff88), 0.6);
				}
			});
		}

		// Face up/down changes
		if (g.isFaceUp !== local.isFaceUp) {
			// update value so swap uses correct texture
			local.value = g.value;
			await animateFlip(local, g.isFaceUp);
			local.isFaceUp = g.isFaceUp;
		}
	}

	// finished processing; release input lock
	inputLocked = false;
	if (inputLockTimer) {
		clearTimeout(inputLockTimer);
		inputLockTimer = null;
	}

	// Re-frame camera to fit all cards using settings from CAMERA_CONFIG
	try {
		fitCameraToCards();
	} catch (err) {
		console.warn('fitCameraToCards failed:', err);
	}
}