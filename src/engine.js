import * as THREE from 'three';
import { setupLevel } from './level.js';
import { setupPlayer, updatePlayer } from './player.js';
import { updateTargets } from './targets.js';
import { setupControls } from './controls.js';
import { setupUI } from './ui.js';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a24); // Dark theme
scene.fog = new THREE.Fog(0x1a1a24, 10, 50);

const light = new THREE.HemisphereLight(0xffffff, 0x444455, 0.6);
light.position.set(0.5, 1, 0.75);
scene.add(light);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(20, 20, 20);
dirLight.castShadow = true;
scene.add(dirLight);

// Camera
export const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 0); // Player eye height

// Renderer
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game-container').appendChild(renderer.domElement);

window.addEventListener('resize', onWindowResize);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let lastTime = performance.now();

export function initEngine() {
    setupLevel(scene);
    setupPlayer(scene, camera);
    setupControls();
    setupUI();
    
    renderer.setAnimationLoop(animate);
}

function animate() {
    const time = performance.now();
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    updatePlayer(delta);
    updateTargets(delta);

    renderer.render(scene, camera);
}
