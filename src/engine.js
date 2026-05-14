import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { scene, camera, renderer, inputState } from './state.js';
import { setupLevel } from './level.js';
import { setupPlayer, updatePlayer } from './player.js';
import { updateTargets } from './targets.js';
import { setupControls, updateCameraRotation } from './controls.js';
import { setupWeapon, updateWeapon } from './weapon.js';
import { setupUI, updateHUD } from './ui.js';
import { initSFX } from './sfx.js';

window.addEventListener('resize', onWindowResize);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let lastTime = performance.now();

export function initEngine() {
    const container = document.getElementById('game-container');
    if (container) container.appendChild(renderer.domElement);
    
    setupLevel(scene);
    setupPlayer(scene, camera);
    setupControls();
    setupUI();
    
    // Pre-warm renderer (compiles shaders and uploads level textures to GPU)
    renderer.compile(scene, camera);
    renderer.render(scene, camera);

    // Pre-render all sounds to AudioBuffers in the background (eliminates GC spikes on shot)
    initSFX().catch(e => console.warn('SFX pre-render failed:', e));

    renderer.setAnimationLoop(animate);
}

function animate() {
    const time = performance.now();
    // Cap delta to 100 ms to prevent physics explosions after tab switches / stalls
    const delta = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    updatePlayer(delta);
    updateTargets(delta);
    updateWeapon(delta, inputState.shoot);
    updateCameraRotation();
    updateHUD();

    renderer.render(scene, camera);
}
