import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { camera, inputState, gameStatus, keyBinds, settings, cameraAngle, applyCameraRotation } from './state.js';
import { setupWeapon, startReload } from './weapon.js';
import { shootTarget, toggleEasterEgg } from './targets.js';
import { startGame, pauseGame, showReadyScreen, showMainMenu, resetLevel } from './gameLogic.js';
import { stopTesting } from './editor.js';

export function loadSettings() {
    const savedSens = localStorage.getItem('aimCourse_sens');
    if (savedSens) settings.sensitivity = parseFloat(savedSens);

    const savedVol = localStorage.getItem('aimCourse_volume');
    if (savedVol) settings.volume = parseFloat(savedVol);

    const savedBinds = localStorage.getItem('aimCourse_keyBinds');
    if (savedBinds) {
        try {
            const parsed = JSON.parse(savedBinds);
            Object.assign(keyBinds, parsed);
        } catch (e) {}
    }
}

export function saveSettings() {
    localStorage.setItem('aimCourse_sens', settings.sensitivity);
    localStorage.setItem('aimCourse_volume', settings.volume);
    localStorage.setItem('aimCourse_keyBinds', JSON.stringify(keyBinds));
}

export function setupControls() {
    const hud = document.getElementById('hud');

    document.addEventListener('pointerlockchange', () => {
        const leaderboardPanel = document.getElementById('leaderboard-panel');
        const readyScreen = document.getElementById('ready-screen');
        const pauseMenu = document.getElementById('pause-menu');
        const resultsOverlay = document.getElementById('results-overlay');

        if (document.pointerLockElement === document.body) {
            // Entering game — hide all menus
            readyScreen.style.display = 'none';
            if (pauseMenu) pauseMenu.style.display = 'none';
            if (leaderboardPanel) leaderboardPanel.style.display = 'none';
            hud.style.display = 'flex';
            document.addEventListener('mousemove', onMouseMove);

            if (!gameStatus.running) {
                startGame();
            }
        } else {
            document.removeEventListener('mousemove', onMouseMove);
            for (const key in inputState) inputState[key] = false;

            if (resultsOverlay && resultsOverlay.style.display !== 'none') return;

            if (gameStatus.running) {
                pauseGame();
                if (pauseMenu) pauseMenu.style.display = 'flex';
                if (leaderboardPanel) leaderboardPanel.style.display = 'block';
            } else {
                hud.style.display = 'none';
                if (gameStatus.isTesting) {
                    stopTesting();
                } else {
                    readyScreen.style.display = 'flex';
                }
            }
        }
    });

    // ESC from ready screen → go to main menu (or editor if testing)
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' && !document.pointerLockElement) {
            const readyScreen = document.getElementById('ready-screen');
            if (readyScreen && readyScreen.style.display !== 'none') {
                if (gameStatus.isTesting) {
                    stopTesting();
                } else {
                    showMainMenu();
                }
            }
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (document.pointerLockElement === document.body) {
            if (e.button === 0 && keyBinds.shoot === 'Mouse0') inputState.shoot = true;
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 0 && keyBinds.shoot === 'Mouse0') inputState.shoot = false;
    });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
}

export function applyRecoil(x, y) {
    cameraAngle.yaw -= x;
    cameraAngle.pitch += y;
    cameraAngle.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraAngle.pitch));
}

export function updateCameraRotation() {
    applyCameraRotation();
}

function onMouseMove(event) {
    if (document.pointerLockElement !== document.body) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    if (Math.abs(movementX) > 2000 || Math.abs(movementY) > 2000) return;

    const CSGO_YAW = 0.022;
    cameraAngle.yaw -= movementX * (settings.sensitivity * CSGO_YAW) * (Math.PI / 180);
    cameraAngle.pitch -= movementY * (settings.sensitivity * CSGO_YAW) * (Math.PI / 180);
    cameraAngle.yaw = ((cameraAngle.yaw + Math.PI) % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2) - Math.PI;
    cameraAngle.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraAngle.pitch));
    applyCameraRotation();
}

function onKeyDown(event) {
    if (document.pointerLockElement !== document.body) return;
    
    if (event.code === keyBinds.reset) {
        event.preventDefault();
        resetLevel();
        document.exitPointerLock();
        return;
    }

    if (event.code === 'Escape') {
        if (document.exitPointerLock) document.exitPointerLock();
        return;
    }
    
    if (event.code === 'Digit0') {
        toggleEasterEgg();
        return;
    }

    if (event.code === keyBinds.reload) startReload();
    event.preventDefault();

    for (const [action, key] of Object.entries(keyBinds)) {
        if (event.code === key) inputState[action] = true;
    }
}

function onKeyUp(event) {
    for (const [action, key] of Object.entries(keyBinds)) {
        if (event.code === key) inputState[action] = false;
    }
}
