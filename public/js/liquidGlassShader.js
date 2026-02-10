/**
 * Liquid Glass Shader
 * Realistic glass material with refraction, reflections, and fresnel
 */

import * as THREE from "https://esm.sh/three@0.152.2";
import { LIQUID_GLASS_CONFIG } from "./config.js";

// Vertex Shader - with skinning support
const vertexShader = `
#include <common>
#include <skinning_pars_vertex>

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
    vUv = uv;
    
    #include <beginnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    
    #include <begin_vertex>
    #include <skinning_vertex>
    
    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    vec3 transformedNormal = normalMatrix * objectNormal;
    vWorldNormal = normalize(transformedNormal);
    
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    vViewPosition = -mvPosition.xyz;
    
    gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment Shader - liquid glass effect
const fragmentShader = `
uniform samplerCube envMap;
uniform float time;
uniform float thickness;
uniform float ior;
uniform float reflectivity;
uniform float fresnelPower;
uniform vec3 glassColor;
uniform float opacity;
uniform float chromaticAberration;
uniform float distortion;
uniform float distortionScale;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

// Fresnel effect (Schlick's approximation)
float fresnel(vec3 viewDir, vec3 normal, float power) {
    float cosTheta = dot(viewDir, normal);
    float f0 = pow((1.0 - ior) / (1.0 + ior), 2.0);
    return f0 + (1.0 - f0) * pow(1.0 - cosTheta, power);
}

// Animated liquid distortion
vec3 getDistortedNormal(vec3 normal, vec2 uv, float time) {
    // Create flowing liquid effect
    float wave1 = sin(uv.x * distortionScale + time * 0.5) * 0.5;
    float wave2 = cos(uv.y * distortionScale + time * 0.3) * 0.5;
    float wave3 = sin((uv.x + uv.y) * distortionScale * 0.5 + time * 0.7) * 0.3;
    
    vec3 distortionVec = vec3(wave1, wave2, wave3) * distortion;
    return normalize(normal + distortionVec);
}

void main() {
    // Get view direction
    vec3 viewDir = normalize(vViewPosition);
    
    // Apply liquid distortion to normal
    vec3 normal = normalize(vWorldNormal);
    vec3 distortedNormal = getDistortedNormal(normal, vUv, time);
    
    // Calculate reflection direction
    vec3 reflectDir = reflect(-viewDir, distortedNormal);
    
    // Calculate refraction direction with chromatic aberration
    vec3 refractDirR = refract(-viewDir, distortedNormal, 1.0 / (ior + chromaticAberration * 0.01));
    vec3 refractDirG = refract(-viewDir, distortedNormal, 1.0 / ior);
    vec3 refractDirB = refract(-viewDir, distortedNormal, 1.0 / (ior - chromaticAberration * 0.01));
    
    // Sample environment map with chromatic aberration
    vec3 reflectColor = textureCube(envMap, reflectDir).rgb;
    
    float refractR = textureCube(envMap, refractDirR).r;
    float refractG = textureCube(envMap, refractDirG).g;
    float refractB = textureCube(envMap, refractDirB).b;
    vec3 refractColor = vec3(refractR, refractG, refractB);
    
    // Calculate fresnel
    float fresnelFactor = fresnel(viewDir, distortedNormal, fresnelPower);
    
    // Mix reflection and refraction based on fresnel
    vec3 finalColor = mix(refractColor, reflectColor, fresnelFactor * reflectivity);
    
    // Apply glass color tint
    finalColor *= glassColor;
    
    // Add thickness/depth effect
    float depthFactor = 1.0 - pow(fresnelFactor, thickness);
    finalColor = mix(finalColor, glassColor * 0.5, depthFactor * 0.3);
    
    // Output with opacity
    gl_FragColor = vec4(finalColor, opacity);
}
`;

/**
 * Create a liquid glass shader material
 * @param {THREE.CubeTexture} envMap - The environment map
 * @param {boolean} isSkinnedMesh - Whether this material is for a skinned mesh
 * @returns {THREE.ShaderMaterial} The shader material
 */
export function createLiquidGlassMaterial(envMap, isSkinnedMesh = true) {
    const material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib.common,
            THREE.UniformsLib.skinning,
            {
                envMap: { value: envMap },
                time: { value: 0.0 },
                thickness: { value: LIQUID_GLASS_CONFIG.THICKNESS },
                ior: { value: LIQUID_GLASS_CONFIG.IOR },
                reflectivity: { value: LIQUID_GLASS_CONFIG.REFLECTIVITY },
                fresnelPower: { value: LIQUID_GLASS_CONFIG.FRESNEL_POWER },
                glassColor: { value: new THREE.Color(
                    LIQUID_GLASS_CONFIG.COLOR_R,
                    LIQUID_GLASS_CONFIG.COLOR_G,
                    LIQUID_GLASS_CONFIG.COLOR_B
                )},
                opacity: { value: LIQUID_GLASS_CONFIG.OPACITY },
                chromaticAberration: { value: LIQUID_GLASS_CONFIG.CHROMATIC_ABERRATION },
                distortion: { value: LIQUID_GLASS_CONFIG.DISTORTION },
                distortionScale: { value: LIQUID_GLASS_CONFIG.DISTORTION_SCALE }
            }
        ]),
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.DoubleSide,
        transparent: true,
        skinning: isSkinnedMesh,
        lights: false,
        depthWrite: false // Important for proper transparency sorting
    });
    
    return material;
}

/**
 * Update shader uniforms (call this in your animation loop if ANIMATE is enabled)
 * @param {THREE.ShaderMaterial} material - The shader material to update
 * @param {number} deltaTime - Time elapsed since last frame
 */
export function updateLiquidGlassShader(material, deltaTime) {
    if (!material || !material.uniforms) return;
    
    if (LIQUID_GLASS_CONFIG.ANIMATE) {
        material.uniforms.time.value += deltaTime * LIQUID_GLASS_CONFIG.ANIMATION_SPEED;
    }
    
    // Update uniforms from config (allows live tweaking)
    material.uniforms.thickness.value = LIQUID_GLASS_CONFIG.THICKNESS;
    material.uniforms.ior.value = LIQUID_GLASS_CONFIG.IOR;
    material.uniforms.reflectivity.value = LIQUID_GLASS_CONFIG.REFLECTIVITY;
    material.uniforms.fresnelPower.value = LIQUID_GLASS_CONFIG.FRESNEL_POWER;
    material.uniforms.glassColor.value.set(
        LIQUID_GLASS_CONFIG.COLOR_R,
        LIQUID_GLASS_CONFIG.COLOR_G,
        LIQUID_GLASS_CONFIG.COLOR_B
    );
    material.uniforms.opacity.value = LIQUID_GLASS_CONFIG.OPACITY;
    material.uniforms.chromaticAberration.value = LIQUID_GLASS_CONFIG.CHROMATIC_ABERRATION;
    material.uniforms.distortion.value = LIQUID_GLASS_CONFIG.DISTORTION;
    material.uniforms.distortionScale.value = LIQUID_GLASS_CONFIG.DISTORTION_SCALE;
}