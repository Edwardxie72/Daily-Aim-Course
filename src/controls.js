import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { camera, inputState, gameStatus, keyBinds, settings } from './state.js';
import { updateVolume } from './sfx.js';
import { setupWeapon, startReload } from './weapon.js';
import { shootTarget } from './targets.js';
import { startGame, pauseGame } from './gameLogic.js';

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

const euler = new THREE.Euler(0, 0, 0, 'YXZ');
let pitch = 0;
let yaw = 0;

export let isListeningForKey = false;
export function setIsListeningForKey(val) { isListeningForKey = val; }

export function resetRotation() {
    pitch = 0;
    yaw = 0;
    updateCameraRotation();
}

export function setupControls() {
    const startScreen = document.getElementById('start-screen');
    const hud = document.getElementById('hud');
    const keybindsScreen = document.getElementById('keybinds-screen');
    
    setupWeapon(camera);

    // Settings UI Sync
    const sensSlider = document.getElementById('sens-slider');
    const sensInput = document.getElementById('sens-input');
    const volSlider = document.getElementById('volume-slider');
    const volInput = document.getElementById('volume-input');

    const updateSensUI = (val) => {
        const num = Math.max(0.01, Math.min(10, parseFloat(val)));
        if (isNaN(num)) return;
        settings.sensitivity = num;
        sensSlider.value = num;
        sensInput.value = num.toFixed(2);
        localStorage.setItem('aimCourse_sens', num.toString());
    };

    const updateVolUI = (val, isPercent = false) => {
        let num = parseFloat(val);
        if (isNaN(num)) return;
        if (isPercent) num = num / 100;
        settings.volume = Math.max(0, Math.min(1, num));
        volSlider.value = settings.volume;
        volInput.value = Math.round(settings.volume * 100);
        updateVolume();
        localStorage.setItem('aimCourse_volume', settings.volume.toString());
    };

    // Initial sync from loaded state
    sensSlider.value = settings.sensitivity;
    sensInput.value = settings.sensitivity.toFixed(2);
    volSlider.value = settings.volume;
    volInput.value = Math.round(settings.volume * 100);
    updateVolume();

    sensSlider.addEventListener('input', (e) => updateSensUI(e.target.value));
    sensInput.addEventListener('change', (e) => updateSensUI(e.target.value));
    volSlider.addEventListener('input', (e) => updateVolUI(e.target.value));
    volInput.addEventListener('change', (e) => updateVolUI(e.target.value, true));

    document.addEventListener('click', (e) => {
        if (isListeningForKey) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('#keybinds-screen') || e.target.closest('#start-screen')) return;
        
        if (!document.pointerLockElement) {
            document.body.requestPointerLock({ unadjustedMovement: true }).catch(() => {
                document.body.requestPointerLock();
            });

            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        }
    });

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === document.body) {
            startScreen.style.display = 'none';
            keybindsScreen.style.display = 'none';
            hud.style.display = 'flex';
            document.addEventListener('mousemove', onMouseMove);

            if (!gameStatus.running) {
                startGame();
            }
        } else {
            if (gameStatus.running) pauseGame();
            startScreen.style.display = 'block';
            document.getElementById('start-btn').innerText = "Click anywhere to resume";
            document.removeEventListener('mousemove', onMouseMove);
            for (const key in inputState) inputState[key] = false;
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
    yaw -= x;
    pitch += y;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
}

export function updateCameraRotation() {
    euler.set(pitch, yaw, 0);
    camera.quaternion.setFromEuler(euler);
}

function onMouseMove(event) {
    if (document.pointerLockElement !== document.body) return;
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    if (Math.abs(movementX) > 2000 || Math.abs(movementY) > 2000) return;

    const CSGO_YAW = 0.022;
    yaw -= movementX * (settings.sensitivity * CSGO_YAW) * (Math.PI / 180);
    pitch -= movementY * (settings.sensitivity * CSGO_YAW) * (Math.PI / 180);
    yaw = ((yaw + Math.PI) % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2) - Math.PI;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
}

function onKeyDown(event) {
    if (document.pointerLockElement !== document.body) return;
    if (event.code === 'Escape') {
        if (document.exitPointerLock) document.exitPointerLock();
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
