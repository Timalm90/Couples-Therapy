/**
 * Liquid Glass — replaced shader with Three's MeshPhysicalMaterial for
 * a high-quality, faster-to-author glass look that supports HDR
 * reflections, transmission and IOR.
 */

import * as THREE from "https://esm.sh/three@0.152.2";
import { LIQUID_GLASS_CONFIG } from "./config.js";

/**
 * Create a MeshPhysicalMaterial configured for glass.
 * @param {THREE.Texture} envMap - PMREM-processed environment map
 * @param {boolean} isSkinnedMesh - whether the material will be used on a skinned mesh
 */
export function createLiquidGlassMaterial(envMap, isSkinnedMesh = false) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(
      LIQUID_GLASS_CONFIG.COLOR_R,
      LIQUID_GLASS_CONFIG.COLOR_G,
      LIQUID_GLASS_CONFIG.COLOR_B,
    ),
    // Glass preset: non-metal, smooth, transmissive
    metalness: 0.0,
    roughness: 0.03,
    transmission: 1.0,
    thickness: LIQUID_GLASS_CONFIG.THICKNESS,
    ior: LIQUID_GLASS_CONFIG.IOR,
    envMap: envMap,
    envMapIntensity: Math.max(0.8, LIQUID_GLASS_CONFIG.REFLECTIVITY),
    reflectivity: Math.min(1.0, LIQUID_GLASS_CONFIG.REFLECTIVITY),
    clearcoat: 0.2,
    clearcoatRoughness: 0.03,
    transparent: true,
    side: THREE.FrontSide,
  });

  // Allow skinned meshes to use this material
  mat.skinning = !!isSkinnedMesh;

  mat.needsUpdate = true;
  return mat;
}

/**
 * Update material properties from live config (called each frame)
 * @param {THREE.Material} material
 * @param {number} deltaTime
 * @param {THREE.Camera} camera
 */
export function updateLiquidGlassShader(material, deltaTime, camera) {
  if (!material) return;

  // Keep optional animation hook for future usage
  if (LIQUID_GLASS_CONFIG.ANIMATE && material.userData) {
    material.userData._time =
      (material.userData._time || 0) +
      deltaTime * LIQUID_GLASS_CONFIG.ANIMATION_SPEED;
  }

  material.thickness = LIQUID_GLASS_CONFIG.THICKNESS;
  material.ior = LIQUID_GLASS_CONFIG.IOR;
  // Apply glass presets from config
  material.metalness = 0.0;
  material.roughness = Math.max(0.0, 0.03);
  material.transmission = 1.0;
  material.envMapIntensity = Math.max(0.8, LIQUID_GLASS_CONFIG.REFLECTIVITY);
  material.reflectivity = Math.min(1.0, LIQUID_GLASS_CONFIG.REFLECTIVITY);
  material.color.set(
    LIQUID_GLASS_CONFIG.COLOR_R,
    LIQUID_GLASS_CONFIG.COLOR_G,
    LIQUID_GLASS_CONFIG.COLOR_B,
  );
  material.opacity = Math.min(1, Math.max(0, LIQUID_GLASS_CONFIG.OPACITY));
  material.needsUpdate = true;
}
