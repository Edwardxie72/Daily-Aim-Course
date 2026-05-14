import { THREE, inputState } from './state.js';
import { collidableBoxes } from './level.js';

let _camera;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

export const baseSpeed = 6.5;
export const jumpVelocity = 4.5;
export const gravity = 15.0;

const playerPosition = new THREE.Vector3(0, 0, 0);
const playerHullSize = new THREE.Vector3(0.6, 1.37, 0.6); 

let isGrounded = false;
let currentHeight = 1.37;
let tuckAmount = 0;

// Reusable objects to avoid per-frame allocations (GC pressure)
const _euler = new THREE.Euler();
const _up = new THREE.Vector3(0, 1, 0);
const _moveDir = new THREE.Vector3();

export function setupPlayer(scene, camera) {
    if (camera) _camera = camera;
    playerPosition.set(0, 0, 0);
    velocity.set(0, 0, 0);
}

function getHull(pos, currentTuck) {
    const height = 1.37 - currentTuck;
    return new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(pos.x, pos.y + height / 2, pos.z),
        new THREE.Vector3(0.6, height, 0.6)
    );
}

function checkCollision(pos, currentTuck) {
    const hull = getHull(pos, currentTuck);
    for (const box of collidableBoxes) {
        if (hull.intersectsBox(box)) return true;
    }
    return false;
}

export function updatePlayer(delta) {
    if (!document.pointerLockElement) return;

    const moveSpeed = (inputState.walk ? baseSpeed * 0.5 : (inputState.crouch ? baseSpeed * 0.35 : baseSpeed)) * delta;
    
    direction.z = Number(inputState.backward) - Number(inputState.forward);
    direction.x = Number(inputState.right) - Number(inputState.left);
    direction.normalize();

    const camYaw = _euler.setFromQuaternion(_camera.quaternion, 'YXZ').y;
    _moveDir.set(direction.x, 0, direction.z).applyAxisAngle(_up, camYaw);
    const moveDir = _moveDir;

    const nextX = playerPosition.x + moveDir.x * moveSpeed;
    const nextZ = playerPosition.z + moveDir.z * moveSpeed;

    if (!checkCollision(new THREE.Vector3(nextX, playerPosition.y + 0.01, playerPosition.z), tuckAmount)) playerPosition.x = nextX;
    if (!checkCollision(new THREE.Vector3(playerPosition.x, playerPosition.y + 0.01, nextZ), tuckAmount)) playerPosition.z = nextZ;

    if (inputState.jump && isGrounded) {
        velocity.y = jumpVelocity;
        isGrounded = false;
    }

    velocity.y -= gravity * delta;
    let nextY = playerPosition.y + velocity.y * delta;

    if (nextY < 0) {
        nextY = 0;
        velocity.y = 0;
        isGrounded = true;
    } else {
        const hull = getHull(new THREE.Vector3(playerPosition.x, nextY, playerPosition.z), tuckAmount);
        let collided = false;
        for (const box of collidableBoxes) {
            if (hull.intersectsBox(box)) {
                if (velocity.y < 0) {
                    nextY = box.max.y;
                    velocity.y = 0;
                    isGrounded = true;
                } else {
                    nextY = playerPosition.y;
                    velocity.y = 0;
                }
                collided = true;
                break;
            }
        }
        if (!collided) isGrounded = false;
    }
    playerPosition.y = nextY;

    const targetHeight = inputState.crouch ? 1.0275 : 1.37;
    currentHeight += (targetHeight - currentHeight) * Math.min(1.0, 15.0 * delta);
    tuckAmount = (inputState.crouch && !isGrounded) ? 0.35 : 0;

    _camera.position.x = playerPosition.x;
    _camera.position.z = playerPosition.z;
    const targetCamHeight = playerPosition.y + tuckAmount + currentHeight;
    _camera.position.y += (targetCamHeight - _camera.position.y) * Math.min(1.0, 15.0 * delta);
}
