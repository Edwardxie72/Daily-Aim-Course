import { camera } from './state.js';

let active = false;
const speed = 10;
const keys = {};

export function setEditorControlsActive(isActive) {
    active = isActive;
}

window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

export function updateEditorControls(delta) {
    if (!active) return;

    const moveSpeed = speed * delta;
    
    // Simple flying controls
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; // Keep movement horizontal for WASD
    forward.normalize();
    
    const right = new THREE.Vector3().crossVectors(camera.up, forward).negate();

    if (keys['KeyW']) camera.position.addScaledVector(forward, moveSpeed);
    if (keys['KeyS']) camera.position.addScaledVector(forward, -moveSpeed);
    if (keys['KeyA']) camera.position.addScaledVector(right, -moveSpeed);
    if (keys['KeyD']) camera.position.addScaledVector(right, moveSpeed);
    
    if (keys['Space']) camera.position.y += moveSpeed;
    if (keys['ShiftLeft']) camera.position.y -= moveSpeed;
}

// Mouse rotation (standard orbit/pan or simple FPS-style look)
// For simplicity, we'll use the existing pointer lock look if engaged, 
// or implement a simple right-click drag to look.
let isDragging = false;
let previousMouse = { x: 0, y: 0 };

window.addEventListener('mousedown', (e) => {
    if (e.button === 2) isDragging = true;
});

window.addEventListener('mouseup', (e) => {
    if (e.button === 2) isDragging = false;
});

window.addEventListener('mousemove', (e) => {
    if (!active || !isDragging) return;
    
    const dx = e.clientX - previousMouse.x;
    const dy = e.clientY - previousMouse.y;
    
    // Update camera rotation based on dx, dy
    // ... logic for camera rotation (euler angles)
    
    previousMouse.x = e.clientX;
    previousMouse.y = e.clientY;
});
