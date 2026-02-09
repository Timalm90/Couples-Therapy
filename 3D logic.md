# 3D Memory Game – Three.js Implementation Guide

This document outlines the **3D structure**, **card logic**, **textures**, and **Three.js integration** for the web-based Memory game.  
It uses a **single `card.glb` model** with dynamically updated front textures for each card.

---

## 🎬 Scene Setup

### Three.js Scene

```js
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020); // neutral background

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);



============================================================


Card Model (card.glb)
Mesh Structure

card_root → top-level object of the GLB
card_mesh → visible card geometry, rotates when flipped
front_face → plane/surface for card front texture
back_face → plane/surface for card back texture

Notes:

Only card_mesh rotates during flip animation.
front_face texture is swapped per card value.
back_face remains constant for all cards.

============================================================



Texture Naming Convention

Back of card: card_back.png
Front faces: card_01.png, card_02.png, ..., card_08.png (for 8 pairs)
Optional effects: card_match_effect.png

Folder structure suggestion:

public/
└─ assets/
   ├─ textures/
   │  ├─ card_back.png
   │  ├─ card_01.png
   │  └─ card_08.png
   └─ models/
      └─ card.glb

============================================================


      Card Flip Logic

Rotate card_mesh on Y-axis:

gsap.to(card.mesh.rotation, {
    y: card.mesh.rotation.y + Math.PI,
    duration: 0.5,
    onUpdate: () => {
        if (card.mesh.rotation.y >= Math.PI / 2 && !card.textureSwapped) {
            swapFrontTexture(card);
            card.textureSwapped = true;
        }
    },
    onComplete: () => {
        card.textureSwapped = false;
    }
});


Texture swap function:

function swapFrontTexture(card) {
    const loader = new THREE.TextureLoader();
    const texture = loader.load(`assets/textures/card_${card.value}.png`);
    card.mesh.getObjectByName('front_face').material.map = texture;
    card.mesh.getObjectByName('front_face').material.needsUpdate = true;
}

🖱 Click Handling (Raycasting)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cards.map(c => c.mesh), true);

    if (intersects.length > 0) {
        const cardMesh = intersects[0].object.parent; // top-level card
        flipCard(cardMesh); // Sends FLIP_CARD to server
    }
});


Important: Client only renders flips. Server validates moves and controls game state.

🎮 Integration with Server

Load cards and store references in cards[].
On GAME_STATE update from server:

Flip/unflip cards visually.

Mark matched cards.

Update scores.

Never reveal card values directly; always rely on server confirmation.

Optional visual cue: change scene.background to active player color.

🔧 Rendering Loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
