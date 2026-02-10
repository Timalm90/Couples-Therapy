/**
 * Game Configuration
 * Centralized constants and settings
 */

// ═══════════════════════════════════════════════════════════════════════════
// CAMERA CONTROLS
// ═══════════════════════════════════════════════════════════════════════════
export const CAMERA_CONFIG = {
	// Field of View (in degrees) - Higher = wider view, Lower = more zoomed/telephoto
	// Recommended range: 40-60 degrees. Default: 50
	FOV: 40,
	
	// Camera tilt angle (in degrees) - How much the camera looks down at the cards
	// 0° = straight ahead, 90° = directly overhead
	// Recommended range: 20-45 degrees. Default: 30
	TILT_ANGLE: 75,
	
	// Camera distance multiplier when auto-framing cards
	// Higher = camera pulls back further, Lower = camera gets closer
	// Recommended range: 1.0-1.3. Default: 1.15
	PADDING: 1.2,
	
	// Card spacing in 3D units
	// Higher = more space between cards, Lower = cards closer together
	// Recommended range: 2.5-4.0. Default: 3.2
	CARD_SPACING: 1.7,
	
	// Camera position offset (applied after auto-framing)
	OFFSET_X: 0,
	OFFSET_Y: 2,
	OFFSET_Z: 0
};

// ═══════════════════════════════════════════════════════════════════════════
// RENDERING SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
export const RENDER_CONFIG = {
	BACKGROUND_COLOR: 0x202020,
	ANTIALIAS: true,
	ALPHA: true,
	MAX_DPR: 2, // Maximum device pixel ratio
	MIN_WIDTH: 300,
	MIN_HEIGHT: 200
};

// ═══════════════════════════════════════════════════════════════════════════
// CARD SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
export const CARD_CONFIG = {
	TARGET_SIZE: 2.0, // Target card size after auto-scaling
	MATCH_RAISE_HEIGHT: 0.06, // How much matched cards raise
	MATCH_TINT_COLOR: 0x88ff88, // Green tint for matched cards
	MATCH_TINT_AMOUNT: 0.6 // How much to tint matched cards (0-1)
};

// ═══════════════════════════════════════════════════════════════════════════
// ASSET PATHS
// ═══════════════════════════════════════════════════════════════════════════
export const ASSET_PATHS = {
	CARD_MODEL: '/assets/models/card.fbx',
	CARD_BACK_TEXTURE: '/assets/textures/card_back.png',
	CARD_FRONT_TEXTURE_PREFIX: '/assets/textures/card_',
	CARD_FRONT_TEXTURE_SUFFIX: '.png'
};

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
export const ANIMATION_CONFIG = {
	FLIP_DURATION: 500, // milliseconds
	FLIP_TEXTURE_SWAP_POINT: 0.5, // When to swap texture during flip (0.0-1.0)
	                               // 0.5 = halfway, 0.3 = earlier, 0.7 = later
	BACKGROUND_TRANSITION: '0.5s ease',
	CONFETTI_FADE_DURATION: 800, // milliseconds
	RESIZE_DEBOUNCE: 100 // milliseconds
};

// ═══════════════════════════════════════════════════════════════════════════
// INPUT SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
export const INPUT_CONFIG = {
	LOCK_TIMEOUT: 2500 // milliseconds - auto-unlock if server doesn't respond
};

// ═══════════════════════════════════════════════════════════════════════════
// LIGHTING
// ═══════════════════════════════════════════════════════════════════════════
export const LIGHTING_CONFIG = {
	AMBIENT_COLOR: 0xffffff,
	AMBIENT_INTENSITY: 0.6,
	DIRECTIONAL_COLOR: 0xffffff,
	DIRECTIONAL_INTENSITY: 0.8,
	DIRECTIONAL_POSITION: { x: 10, y: 10, z: 10 }
};