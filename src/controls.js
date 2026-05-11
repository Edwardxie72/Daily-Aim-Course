import * as THREE from 'three';
import { camera } from './engine.js';
import { shootTarget } from './targets.js';
import { startGame, isGameRunning } from './ui.js';

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
        }
    });

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === document.body) {
            startScreen.style.display = 'none';
            keybindsScreen.style.display = 'none';
            hud.style.display = 'flex';
            document.addEventListener('mousemove', onMouseMove);
            if (!isGameRunning()) startGame();
        } else {
            if (!isGameRunning()) {
                startScreen.style.display = 'block';
            } else {
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

    const yawAngle = movementX * (csgoSens * CSGO_YAW) * (Math.PI / 180);
    const pitchAngle = movementY * (csgoSens * CSGO_YAW) * (Math.PI / 180);

    euler.setFromQuaternion(camera.quaternion);
    euler.y -= yawAngle;
    euler.x -= pitchAngle;
    euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
    camera.quaternion.setFromEuler(euler);
}

function onKeyDown(event) {
    if (document.pointerLockElement !== document.body) return;
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
