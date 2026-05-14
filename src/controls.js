import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { camera, inputState, gameStatus, keyBinds, settings, cameraAngle, applyCameraRotation } from './state.js';
import { setupWeapon, startReload } from './weapon.js';
import { shootTarget, toggleEasterEgg } from './targets.js';
import { startGame, pauseGame, showReadyScreen, showMainMenu, resetLevel } from './gameLogic.js';

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

export function setKeyBind(action, code) {
    if (keyBinds[action] !== undefined) {
        for (const [key, val] of Object.entries(keyBinds)) {
            if (val === code && key !== action) keyBinds[key] = 'Unset';
        }
        keyBinds[action] = code;
        localStorage.setItem('aimCourse_keyBinds', JSON.stringify(keyBinds));
    }
}

export function getSens() { return settings.sensitivity; }
export function setSens(val) { 
    settings.sensitivity = val; 
    localStorage.setItem('aimCourse_sens', val.toString());
}


export let isListeningForKey = false;
export function setIsListeningForKey(val) { isListeningForKey = val; }

export function resetRotation() {
    cameraAngle.pitch = 0;
    cameraAngle.yaw = 0;
    applyCameraRotation();
}

export function setupControls() {
    const hud = document.getElementById('hud');
    
    setupWeapon(camera);




    document.addEventListener('click', (e) => {
        if (isListeningForKey) return;
        // Only request pointer lock from the ready screen
        const readyScreen = document.getElementById('ready-screen');
        if (readyScreen.style.display === 'none') return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
        
        if (!document.pointerLockElement) {
            document.body.requestPointerLock({ unadjustedMovement: true }).catch(() => {
                document.body.requestPointerLock();
            });
        }
    });

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

            // If the game just finished, results overlay handles the screen — don't show pause
            if (resultsOverlay && resultsOverlay.style.display !== 'none') return;

            if (gameStatus.running) {
                pauseGame();
                // Keep HUD visible so timer is shown; overlay the pause menu on top
                if (pauseMenu) pauseMenu.style.display = 'flex';
                if (leaderboardPanel) leaderboardPanel.style.display = 'block';
            } else {
                // Not running and no results = going to ready screen
                hud.style.display = 'none';
                readyScreen.style.display = 'flex';
            }
        }
    });

    // ESC from ready screen → go to main menu
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' && !document.pointerLockElement) {
            const readyScreen = document.getElementById('ready-screen');
            if (readyScreen && readyScreen.style.display !== 'none') {
                showMainMenu();
            }
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (isListeningForKey) return;
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
        // Reset level visually before exiting pointer lock
        resetLevel();
        // running is now false, so pointerlockchange will route to ready screen
        document.exitPointerLock();
        return;
    }

    if (event.code === 'Escape') {
        if (document.exitPointerLock) document.exitPointerLock();
        return;
    }
    // Easter egg toggle — not in keybinds
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
