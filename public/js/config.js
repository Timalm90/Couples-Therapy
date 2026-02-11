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
	TILT_ANGLE: 25,
	
	// Camera distance multiplier when auto-framing cards
	// Higher = camera pulls back further, Lower = camera gets closer
	// Recommended range: 1.0-1.3. Default: 1.15
	PADDING: 1.5,
	
	// Card spacing in 3D units
	// Higher = more space between cards, Lower = cards closer together
	// Recommended range: 2.5-4.0. Default: 3.2
	CARD_SPACING: 1.7,
	
	// Camera position offset (applied after auto-framing)
	OFFSET_X: 0,
	OFFSET_Y: 1,
	OFFSET_Z: 0
};

// ═══════════════════════════════════════════════════════════════════════════
// RENDERING SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
export const RENDER_CONFIG = {
  BACKGROUND_COLOR: 0x202020, // Used only if HDRI background is disabled
  ANTIALIAS: true,
  ALPHA: true,
  MAX_DPR: 2, // Maximum device pixel ratio
  MIN_WIDTH: 300,
  MIN_HEIGHT: 200,

  // Shadow settings
  SHADOWS_ENABLED: true,
  SHADOW_MAP_SIZE: 2048, // Higher = better quality, lower performance (512, 1024, 2048, 4096)
  SHADOW_BIAS: -0.0001,
  SHADOW_RADIUS: 2.0, // Soft shadow blur
};

// ═══════════════════════════════════════════════════════════════════════════
// HDRI / ENVIRONMENT SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
export const HDRI_CONFIG = {
  // Enable/disable HDRI environment lighting
  ENABLED: true,

  // Path to the HDRI file (.hdr format)
  PATH: "./assets/textures/01.hdr",

  // Show HDRI as background (true) or use solid color background (false)
  // Note: HDRI will still provide lighting/reflections even when not visible
  SHOW_AS_BACKGROUND: true,

  // HDRI intensity/brightness multiplier
  INTENSITY: 2.0,

  // Background blur amount (0.0 = sharp, 1.0 = very blurred)
  // Only applies when SHOW_AS_BACKGROUND is true
  BACKGROUND_BLUR: 0.5,
};

// ═══════════════════════════════════════════════════════════════════════════
// CARD SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
export const CARD_CONFIG = {
  TARGET_SIZE: 2.0, // Target card size after auto-scaling
  MATCH_RAISE_HEIGHT: 0.06, // How much matched cards raise
  MATCH_TINT_COLOR: 0x857f74, // Green tint for matched cards
  MATCH_TINT_AMOUNT: 0.6, // How much to tint matched cards (0-1)
};

// ═══════════════════════════════════════════════════════════════════════════
// LIQUID GLASS SHADER SETTINGS (for card backs)
// ═══════════════════════════════════════════════════════════════════════════
export const LIQUID_GLASS_CONFIG = {
	// Enable/disable the liquid glass shader (true = shader, false = regular texture)
	ENABLED: true,
	
	// Index of Refraction (IOR)
	// 1.0 = air, 1.33 = water, 1.5 = glass, 2.4 = diamond
	// Recommended range: 1.2-2.0
	IOR: 1.0,
	
	// Thickness/depth of the glass
	// Higher = thicker glass appearance
	// Recommended range: 0.5-3.0
	THICKNESS: 0.5,
	
	// Reflectivity strength
	// Higher = more mirror-like, Lower = more transparent
	// Recommended range: 0.3-1.0
	REFLECTIVITY: 1.0,
	
	// Fresnel power (edge glow effect)
	// Higher = sharper edge highlight, Lower = softer
	// Recommended range: 2.0-8.0
	FRESNEL_POWER: 3.0,
	
	// Glass color tint (RGB, 0-1 range)
	COLOR_R: 0.9,
	COLOR_G: 0.95,
	COLOR_B: 1.0,
	
	// Overall opacity
	// Recommended range: 0.7-1.0
	OPACITY: 0.65,
	
	// Chromatic aberration (rainbow edge effect)
	// Higher = more color separation, 0 = no aberration
	// Recommended range: 0.0-2.0
	CHROMATIC_ABERRATION: 2.0,
	
	// Liquid distortion amount
	// Higher = more wavy/liquid effect
	// Recommended range: 0.0-0.3
	DISTORTION: 0.8,
	
	// Distortion pattern scale
	// Higher = smaller waves, Lower = larger waves
	// Recommended range: 2.0-20.0
	DISTORTION_SCALE: 20.0,
	
	// Animate the liquid movement (true/false)
	ANIMATE: true,
	
	// Animation speed multiplier (only used if ANIMATE is true)
	ANIMATION_SPEED: 2.0,
};

// ═══════════════════════════════════════════════════════════════════════════
// ASSET PATHS
// ═══════════════════════════════════════════════════════════════════════════
export const ASSET_PATHS = {
  CARD_MODEL: "/assets/models/card.fbx",
  CARD_BACK_TEXTURE: "/assets/textures/card_back.png",
  CARD_FRONT_TEXTURE_PREFIX: "/assets/textures/card_",
  CARD_FRONT_TEXTURE_SUFFIX: ".png",
};

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
export const ANIMATION_CONFIG = {
  FLIP_DURATION: 500, // milliseconds
  FLIP_TEXTURE_SWAP_POINT: 0.5, // When to swap texture during flip (0.0-1.0)
  // 0.5 = halfway, 0.3 = earlier, 0.7 = later
  BACKGROUND_TRANSITION: "0.5s ease",
  CONFETTI_FADE_DURATION: 800, // milliseconds
  RESIZE_DEBOUNCE: 100, // milliseconds
};

// ═══════════════════════════════════════════════════════════════════════════
// INPUT SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
export const INPUT_CONFIG = {
  LOCK_TIMEOUT: 2500, // milliseconds - auto-unlock if server doesn't respond
};

// ═══════════════════════════════════════════════════════════════════════════
// LIGHTING
// ═══════════════════════════════════════════════════════════════════════════
export const LIGHTING_CONFIG = {
	AMBIENT_COLOR: 0xffffff,
	AMBIENT_INTENSITY: 0.4, // Reduced since HDRI provides lighting
	DIRECTIONAL_COLOR: 0xffffff,
	DIRECTIONAL_INTENSITY: 0.1,
	DIRECTIONAL_POSITION: { x: 10, y: 10, z: 10 },
	
	// Shadow-casting directional light (for card shadows)
	SHADOW_LIGHT_ENABLED: true,
	SHADOW_LIGHT_INTENSITY: 0.8,
	SHADOW_LIGHT_POSITION: { x: 5, y: 8, z: 5 }
};
