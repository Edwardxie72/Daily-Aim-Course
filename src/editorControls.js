import { THREE, camera } from './state.js';

let active = false;
const speed = 15;
const keys = {};
const mouseSpeed = 0.003;

let rotation = { x: 0, y: 0 };

export function setEditorControlsActive(isActive) {
    active = isActive;
    if (isActive) {
        rotation.x = camera.rotation.x;
        rotation.y = camera.rotation.y;
    }
}

window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

export function updateEditorControls(delta) {
    if (!active) return;

    const moveSpeed = speed * delta;
    
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; 
    forward.normalize();
    
    const right = new THREE.Vector3().crossVectors(camera.up, forward).negate();

    if (keys['KeyW']) camera.position.addScaledVector(forward, moveSpeed);
    if (keys['KeyS']) camera.position.addScaledVector(forward, -moveSpeed);
    if (keys['KeyA']) camera.position.addScaledVector(right, -moveSpeed);
    if (keys['KeyD']) camera.position.addScaledVector(right, moveSpeed);
    
    if (keys['Space']) camera.position.y += moveSpeed;
    if (keys['ShiftLeft']) camera.position.y -= moveSpeed;
}

let isDragging = false;
window.addEventListener('mousedown', (e) => {
    if (active && e.button === 2) isDragging = true;
});

window.addEventListener('mouseup', (e) => {
    if (e.button === 2) isDragging = false;
});

window.addEventListener('mousemove', (e) => {
    if (!active || !isDragging) return;
    
    rotation.y -= e.movementX * mouseSpeed;
    rotation.x -= e.movementY * mouseSpeed;
    rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, rotation.x));
    
    camera.rotation.order = 'YXZ';
    camera.rotation.set(rotation.x, rotation.y, 0);
});

// Prevent context menu on right click in editor
window.addEventListener('contextmenu', (e) => {
    if (active) e.preventDefault();
});
