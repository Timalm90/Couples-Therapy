// Lightweight Three.js scene module for the Memory game.
// Exports: initScene(onCardClick) and updateFromGameState(gameState)

import * as THREE from 'https://esm.sh/three@0.152.2';
import { GLTFLoader } from 'https://esm.sh/three@0.152.2/examples/jsm/loaders/GLTFLoader.js';

let renderer, scene, camera, raycaster;
let cards = []; // { id, value, mesh, isFaceUp, isMatched }
let gltfTemplate = null;
let frontTextures = new Map();
let backTexture = null;
let onCardClickCallback = null;
let container = null;
let inputLocked = false;
let inputLockTimer = null;

const loader = new GLTFLoader();
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
		renderer.setPixelRatio(window.devicePixelRatio || 1);
		// Size to container
		const cw = Math.max(300, container.clientWidth || window.innerWidth);
		const ch = Math.max(200, container.clientHeight || window.innerHeight);
				renderer.setSize(cw, ch);
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

		camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
			// move camera up and back and angle down for a top-down view
			camera.position.set(0, 12, 12);
			camera.lookAt(0, 0, 0);
	camera.lookAt(0, 0, 0);

	const ambient = new THREE.AmbientLight(0xffffff, 0.6);
	scene.add(ambient);
	const dir = new THREE.DirectionalLight(0xffffff, 0.8);
	dir.position.set(10, 10, 10);
	scene.add(dir);

	raycaster = new THREE.Raycaster();

	window.addEventListener('resize', onWindowResize);
	window.addEventListener('click', onPointerClick);

	// Preload the GLTF template and back texture
	try {
		gltfTemplate = await loader.loadAsync('/assets/models/card.glb');
	} catch (err) {
		console.warn('Failed to load card.glb:', err);
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
	renderer.setSize(w, h);
}

function animate() {
	requestAnimationFrame(animate);
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
	if (!gltfTemplate) return null;

	// Clone the scene (simple deep clone by scene.clone(true))
	const clone = gltfTemplate.scene.clone(true);
	clone.name = `card_${cardId}`;
	clone.userData.cardId = cardId;

		// Find front and back meshes by traversing children (robust against arbitrary GLB naming)
		let frontMesh = null;
		let backMesh = null;
		clone.traverse((node) => {
			if (!node.isMesh) return;
			const lname = (node.name || '').toLowerCase();
			if (!frontMesh && /front|face|front_face/.test(lname)) frontMesh = node;
			if (!backMesh && /back|rear|back_face/.test(lname)) backMesh = node;
		});

		// Fallbacks: pick first/second mesh if names not present
		if (!frontMesh) {
			// prefer a mesh whose material index is 0
			frontMesh = clone.getObjectByProperty('isMesh', true) || null;
		}
		if (!backMesh) {
			// try to find any other mesh distinct from frontMesh
			clone.traverse((node) => {
				if (!node.isMesh) return;
				if (node === frontMesh) return;
				if (!backMesh) backMesh = node;
			});
		}

		// Apply back texture
		if (backMesh && backMesh.material) {
			backMesh.material = backMesh.material.clone();
			backMesh.material.map = backTexture;
			backMesh.material.needsUpdate = true;
		}

		// Apply front texture (placeholder if texture not yet loaded)
		if (frontMesh && frontMesh.material) {
			frontMesh.material = frontMesh.material.clone();
			const tex = frontTextures.get(value) || backTexture;
			frontMesh.material.map = tex;
			frontMesh.material.needsUpdate = true;
		}

		// Scale down the imported model so cards don't overlap
			// adjust model scale to make cards more visible
			clone.scale.set(1.0, 1.0, 1.0);

			// Position: arrange in grid by index
			const cols = Math.ceil(Math.sqrt(total));
			const spacing = 3.0; // reduced spacing so gaps are smaller
	const row = Math.floor(index / cols);
	const col = index % cols;
	const offsetX = -(cols - 1) * spacing * 0.5;
	const offsetZ = -(Math.ceil(total / cols) - 1) * spacing * 0.5;
	clone.position.set(offsetX + col * spacing, 0, offsetZ + row * spacing);

	// Ensure pivot for rotation is around center
	clone.rotation.set(0, 0, 0);

	scene.add(clone);

		return { id: cardId, value, mesh: clone, frontMesh, backMesh, isFaceUp: false, isMatched: false };
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

// Simple flip animation using requestAnimationFrame
function animateFlip(cardObj, toFaceUp = true, durationMs = 400) {
	const mesh = cardObj.mesh;
	const start = performance.now();
	const startRot = mesh.rotation.x;
	const endRot = startRot + Math.PI * (toFaceUp ? 1 : -1); // flip around X axis
	let swapped = false;

	return new Promise((resolve) => {
		function step(now) {
			const t = Math.min(1, (now - start) / durationMs);
			const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOut
			mesh.rotation.x = startRot + (endRot - startRot) * eased;

			// Swap texture at halfway (around PI/2)
					if (!swapped && Math.abs(mesh.rotation.x - startRot) >= Math.PI / 2) {
						setFrontTextureForMesh(cardObj, toFaceUp ? cardObj.value : null);
				swapped = true;
			}

			if (t < 1) requestAnimationFrame(step);
			else {
				// normalize rotation to 0..2PI
				mesh.rotation.x = ((mesh.rotation.x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
				resolve();
			}
		}
		requestAnimationFrame(step);
	});
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

	// Create missing cards
	gameState.cards.forEach((c, idx) => {
		let existing = cards.find((x) => x.id === c.id);
		if (!existing) {
			const inst = createCardInstance(c.id, c.value, idx, total);
			if (inst) cards.push(inst);
		}
	});

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
			await animateFlip(local, g.isFaceUp, 380);
			local.isFaceUp = g.isFaceUp;
		}
	}

		// finished processing; release input lock
		inputLocked = false;
		if (inputLockTimer) {
			clearTimeout(inputLockTimer);
			inputLockTimer = null;
		}
}

