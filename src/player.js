import * as THREE from 'three';
import { inputState } from './controls.js';

let _camera;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

const baseSpeed = 40.0;
const walkSpeed = 20.0;
const crouchSpeed = 12.0;

const baseHeight = 1.6;
const crouchHeight = 1.0;

export function setupPlayer(scene, camera) {
    _camera = camera;
    _camera.position.set(0, baseHeight, 0);
}

export function updatePlayer(delta) {
    if (!document.pointerLockElement) return;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(inputState.forward) - Number(inputState.backward);
    direction.x = Number(inputState.right) - Number(inputState.left);
    direction.normalize();

    let currentSpeed = baseSpeed;
    if (inputState.crouch) currentSpeed = crouchSpeed;
    else if (inputState.walk) currentSpeed = walkSpeed;

    if (inputState.forward || inputState.backward) velocity.z -= direction.z * currentSpeed * delta;
    if (inputState.left || inputState.right) velocity.x -= direction.x * currentSpeed * delta;

    // Move purely in the XZ plane aligned with camera yaw
    const euler = new THREE.Euler(0, _camera.rotation.y, 0, 'YXZ');
    const moveVec = new THREE.Vector3(velocity.x * delta, 0, velocity.z * delta);
    moveVec.applyEuler(euler);

    _camera.position.x += moveVec.x;
    _camera.position.z += moveVec.z;

    // Handle smooth crouching
    const targetHeight = inputState.crouch ? crouchHeight : baseHeight;
    _camera.position.y += (targetHeight - _camera.position.y) * 15.0 * delta;

    // Arena bounds checking
    if (_camera.position.x < -19) _camera.position.x = -19;
    if (_camera.position.x > 19) _camera.position.x = 19;
    if (_camera.position.z < -19) _camera.position.z = -19;
    if (_camera.position.z > 19) _camera.position.z = 19;
}
