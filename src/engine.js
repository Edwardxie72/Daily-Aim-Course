import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { scene, camera, renderer, inputState } from './state.js';
import { setupLevel } from './level.js';
import { setupPlayer, updatePlayer } from './player.js';
import { setupTargets, texturesReady, robotHeadTexture, robotBodyTexture, easterEggFaces, easterEggRareTexture } from './targets.js';
import { updateTargets } from './targets.js';
import { setupControls, updateCameraRotation } from './controls.js';
import { setupWeapon, updateWeapon } from './weapon.js';
import { setupUI, updateHUD } from './ui.js';
import { initSFX } from './sfx.js';
import { showMainMenu } from './gameLogic.js';

window.addEventListener('resize', onWindowResize);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let lastTime = performance.now();

// Loading screen helpers
function setLoadingProgress(pct, label) {
    const fill = document.getElementById('loading-bar-fill');
    const sub  = document.getElementById('loading-sub');
    if (fill) fill.style.width = pct + '%';
    if (sub && label) sub.textContent = label;
}

function hideLoadingScreen() {
    const el = document.getElementById('loading-screen');
    if (!el) return;
    el.classList.add('hidden');
    // Remove from DOM after transition so it can't block clicks
    setTimeout(() => { el.style.display = 'none'; }, 600);
}

export async function initEngine() {
    const container = document.getElementById('game-container');
    if (container) container.appendChild(renderer.domElement);

    // ── Step 1: Build the scene (level + targets + player + controls) ─────────
    setLoadingProgress(10, 'Building level...');
    setupLevel(scene);
    setupPlayer(scene, camera);
    setupControls();
    setupUI();
    setupWeapon(camera);

    // Put all targets into the scene now so their shaders get compiled below
    setupTargets();

    // ── Step 2: Wait for textures to decode + audio to pre-render ─────────────
    setLoadingProgress(20, 'Loading textures & audio...');
    await Promise.all([
        texturesReady,
        initSFX().catch(e => console.warn('SFX pre-render failed:', e)),
    ]);

    // ── Step 3: Upload every texture to the GPU ───────────────────────────────
    setLoadingProgress(55, 'Uploading to GPU...');
    const allTextures = [
        robotHeadTexture, robotBodyTexture,
        ...easterEggFaces,
        easterEggRareTexture,
    ].filter(Boolean);
    for (const tex of allTextures) {
        try { renderer.initTexture(tex); } catch (_) {}
    }

    // ── Step 4: Compile ALL shaders (level + target materials in one pass) ────
    setLoadingProgress(75, 'Compiling shaders...');
    renderer.compile(scene, camera);

    // ── Step 5: Full warm render — uploads geometry VBOs and any remaining ────
    //           textures, so the first gameplay frame costs nothing
    setLoadingProgress(85, 'Final warmup...');
    renderer.render(scene, camera);

    // ── Step 6: JIT Burn-in ──────────────────────────────────────────────────
    // Run hot loop functions for 60 frames to trigger V8 optimization
    setLoadingProgress(95, 'Optimizing engine...');
    for (let i = 0; i < 60; i++) {
        const dummyDelta = 1/60;
        updatePlayer(dummyDelta);
        updateTargets(dummyDelta);
        updateWeapon(dummyDelta, false);
        updateCameraRotation();
        updateHUD();
        // Skip actual render call inside loop to save time, compile already did the work
    }

    // ── Step 7: Start RAF loop, then reveal main menu ─────────────────────────
    renderer.setAnimationLoop(animate);

    setLoadingProgress(100, 'Ready!');
    // Brief pause so the 100% bar is visible, then transition out
    await new Promise(r => setTimeout(r, 300));
    hideLoadingScreen();
    showMainMenu();
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
