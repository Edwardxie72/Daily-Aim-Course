import * as THREE from 'three';
import { camera } from './engine.js';
import { shootTarget } from './targets.js';
import { startGame, isGameRunning, pauseGame } from './ui.js';

export const inputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    crouch: false,
    walk: false
};

export const keyBinds = {
    forward: 'KeyW',
    backward: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    jump: 'Space',
    crouch: 'ControlLeft',
    walk: 'ShiftLeft',
    shoot: 'Mouse0'
};

let csgoSens = 1.0;
const CSGO_YAW = 0.022;

export function loadSettings() {
    const savedSens = localStorage.getItem('aimCourse_sens');
    if (savedSens) csgoSens = parseFloat(savedSens);

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
        // Clear any other actions already using this key
        for (const [key, val] of Object.entries(keyBinds)) {
            if (val === code && key !== action) {
                keyBinds[key] = 'Unset';
            }
        }
        keyBinds[action] = code;
        localStorage.setItem('aimCourse_keyBinds', JSON.stringify(keyBinds));
    }
}

export function getSens() { return csgoSens; }
export function setSens(val) { 
    csgoSens = val; 
    localStorage.setItem('aimCourse_sens', val.toString());
}

const euler = new THREE.Euler(0, 0, 0, 'YXZ');
let pitch = 0;
let yaw = 0;

export let isListeningForKey = false;

export function setIsListeningForKey(val) {
    isListeningForKey = val;
}

export function setupControls() {
    const startScreen = document.getElementById('start-screen');
    const hud = document.getElementById('hud');
    const keybindsScreen = document.getElementById('keybinds-screen');
    
    document.body.addEventListener('click', (e) => {
        if (isListeningForKey) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('#keybinds-screen')) return;
        if (e.target.id === 'edit-keybinds-btn') return;
        
        if (!document.pointerLockElement) {
            document.body.requestPointerLock();
            // Fullscreen is required by browsers to intercept protected shortcuts like Ctrl+W
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        }
    });

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === document.body) {
            // Attempt to lock protected browser shortcuts (like Ctrl+W)
            if (navigator.keyboard && navigator.keyboard.lock) {
                navigator.keyboard.lock().catch(e => console.warn("Keyboard lock failed", e));
            }

            startScreen.style.display = 'none';
            keybindsScreen.style.display = 'none';
            hud.style.display = 'flex';
            document.addEventListener('mousemove', onMouseMove);
            
            // Sync internal pitch/yaw with camera on pointer lock
            euler.setFromQuaternion(camera.quaternion);
            pitch = euler.x;
            yaw = euler.y;

            if (!isGameRunning()) startGame();
        } else {
            // Unlock keyboard shortcuts
            if (navigator.keyboard && navigator.keyboard.unlock) {
                navigator.keyboard.unlock();
            }
            if (!isGameRunning()) {
                startScreen.style.display = 'block';
            } else {
                pauseGame(); // Pause the timer
                startScreen.style.display = 'block';
                document.getElementById('start-btn').innerText = "Click anywhere to resume";
            }
            hud.style.display = 'none';
            document.removeEventListener('mousemove', onMouseMove);
            
            // Reset input states when unlocking
            for (const key in inputState) inputState[key] = false;
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (isListeningForKey) return;
        if (document.pointerLockElement === document.body) {
            if (e.button === 0 && keyBinds.shoot === 'Mouse0') {
                shootTarget();
            }
        }
    });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
}

function onMouseMove(event) {
    if (document.pointerLockElement !== document.body) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    // Spike filter: Ignore abnormally large movements (often caused by browser/OS cursor wrapping)
    if (Math.abs(movementX) > 500 || Math.abs(movementY) > 500) return;

    const yawAngle = movementX * (csgoSens * CSGO_YAW) * (Math.PI / 180);
    const pitchAngle = movementY * (csgoSens * CSGO_YAW) * (Math.PI / 180);

    yaw -= yawAngle;
    pitch -= pitchAngle;
    
    // Clamp pitch to prevent flipping
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

    euler.set(pitch, yaw, 0);
    camera.quaternion.setFromEuler(euler);
}

function onKeyDown(event) {
    if (document.pointerLockElement !== document.body) return;
    
    // Explicitly handle Escape to restore menu functionality when Keyboard Lock / Fullscreen is active
    if (event.code === 'Escape') {
        if (document.exitPointerLock) document.exitPointerLock();
        if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen();
        return;
    }

    // Prevent default browser shortcuts (like spacebar scrolling or find) while playing
    event.preventDefault();

    for (const [action, key] of Object.entries(keyBinds)) {
        if (event.code === key) {
            inputState[action] = true;
        }
    }
}

function onKeyUp(event) {
    for (const [action, key] of Object.entries(keyBinds)) {
        if (event.code === key) {
            inputState[action] = false;
        }
    }
}
