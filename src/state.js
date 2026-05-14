import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export { THREE };

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222233);

export const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.37, 0);
scene.add(camera);

// Camera rotation state — stored here so any module can reset without circular deps
export const cameraAngle = { pitch: 0, yaw: 0 };
// Reusable Euler — allocated once so applyCameraRotation() never triggers GC
const _cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
export function applyCameraRotation() {
    _cameraEuler.x = cameraAngle.pitch;
    _cameraEuler.y = cameraAngle.yaw;
    camera.quaternion.setFromEuler(_cameraEuler);
}

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

// Robust lighting
const ambient = new THREE.AmbientLight(0xffffff, 1.0); // Full ambient to debug
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(10, 10, 10);
scene.add(sun);

export const inputState = {
    forward: false, backward: false, left: false, right: false,
    jump: false, crouch: false, walk: false, shoot: false
};

export const gameStatus = {
    running: false,
    startTime: 0,
    elapsedTime: 0,
    totalTargets: 5,
    targetsLeft: 5
};

export const settings = {
    sensitivity: 1.0,
    volume: 0.8
};

export const keyBinds = {
    forward: 'KeyW',
    backward: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    jump: 'Space',
    crouch: 'KeyC',
    walk: 'ShiftLeft',
    shoot: 'Mouse0',
    reload: 'KeyR',
    reset: 'KeyY'
};


