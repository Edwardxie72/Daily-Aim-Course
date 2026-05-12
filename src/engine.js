import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { scene, camera, renderer, inputState } from './state.js';
import { setupLevel } from './level.js';
import { setupPlayer, updatePlayer } from './player.js';
import { updateTargets } from './targets.js';
import { setupControls, updateCameraRotation } from './controls.js';
import { updateWeapon } from './weapon.js';
import { setupUI, setupHUDLoop } from './ui.js';

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
    setupHUDLoop();
    
    renderer.setAnimationLoop(animate);
}

function animate() {
    const time = performance.now();
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    updatePlayer(delta);
    updateTargets(delta);
    updateWeapon(delta, inputState.shoot);
    updateCameraRotation();

    renderer.render(scene, camera);
}
