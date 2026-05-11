import * as THREE from 'three';
import { inputState } from './controls.js';
import { collidableBoxes } from './level.js';

let _camera;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// Physics & Movement Constants
export const baseSpeed = 6.5;
export const walkSpeed = 3.4;
export const crouchSpeed = 2.2;
const gravity = 38.0; // Even higher for maximum snap
const jumpForce = 10.0; // Scaled to maintain jump height

// Hull Dimensions
const baseHeight = 1.6;
const crouchHeight = 1.0;
const playerRadius = 0.3; // Half-width of the collision hull
const playerPosition = new THREE.Vector3(); // Tracks feet position strictly
let isGrounded = false;
let canJump = true;

export function setupPlayer(scene, camera) {
    _camera = camera;
    playerPosition.set(0, 0, 0); // Start grounded at origin
    _camera.position.copy(playerPosition);
    _camera.position.y += baseHeight;
}

// Generate an AABB representing the player
function getHull(posX, posY, posZ, currentHeight, axis, tuck = 0) {
    // Elevate the bottom of the hull during horizontal checks or when "tucking" feet in mid-air
    const yMin = (axis === 'x' || axis === 'z') ? (posY + tuck + 0.1) : (posY + tuck);
    
    // Narrow the hull significantly during Y checks to prevent snagging 
    // on walls or boxes we are rubbing against.
    const hRadius = (axis === 'y') ? 0.1 : playerRadius;
    
    return new THREE.Box3(
        new THREE.Vector3(posX - hRadius, yMin, posZ - hRadius),
        new THREE.Vector3(posX + hRadius, posY + tuck + currentHeight, posZ + hRadius)
    );
}

export function updatePlayer(delta) {
    if (!document.pointerLockElement) return;

    direction.z = Number(inputState.forward) - Number(inputState.backward);
    direction.x = Number(inputState.right) - Number(inputState.left);
    direction.normalize();

    let currentSpeed = baseSpeed;
    if (inputState.crouch) currentSpeed = crouchSpeed;
    else if (inputState.walk) currentSpeed = walkSpeed;

    const isCrouching = inputState.crouch;
    const currentHeight = isCrouching ? crouchHeight : baseHeight;
    
    // Crouch jump "tuck": when crouching, we pull up our legs by 0.6 units.
    // This happens both in air and on ground (on ground it just makes us 0.6 units 'shorter' from the bottom).
    const tuckAmount = isCrouching ? (baseHeight - crouchHeight) : 0;

    // --- Jumping & Gravity ---
    // Edge trigger to prevent holding space from continuous jumping
    if (!inputState.jump) {
        canJump = true;
    }

    if (isGrounded && inputState.jump && canJump && !isCrouching) {
        velocity.y = jumpForce;
        isGrounded = false;
        canJump = false;
    }
    velocity.y -= gravity * delta;

    // --- Y-Axis Collision (Floor & Ceiling) ---
    let expectedY = playerPosition.y + velocity.y * delta;
    let hullY = getHull(playerPosition.x, expectedY, playerPosition.z, currentHeight, 'y', tuckAmount);
    
    let yCollided = false;
    for (const box of collidableBoxes) {
        if (hullY.intersectsBox(box)) {
            // Landing check: if falling/grounded and our tucked feet are above the surface, we land.
            // Using 0.6 (baseHeight - crouchHeight) as a persistent threshold for 'could clear' check.
            if (velocity.y <= 0 && (playerPosition.y + 0.6) >= box.max.y - 0.25) {
                expectedY = box.max.y - tuckAmount;
                isGrounded = true;
                velocity.y = 0;
                yCollided = true;
                break;
            } else if (velocity.y > 0 && (playerPosition.y + tuckAmount + currentHeight) <= box.min.y + 0.25) {
                // Head bump: hit something above us.
                expectedY = box.min.y - (tuckAmount + currentHeight);
                velocity.y = 0;
                yCollided = true;
                break;
            }
        }
    }
    if (!yCollided) {
        isGrounded = false;
    }
    playerPosition.y = expectedY;

    // --- Horizontal Movement Calculation ---
    // Get exact absolute forward and right vectors from camera
    const forward = new THREE.Vector3();
    _camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, _camera.up).normalize();

    const moveDir = new THREE.Vector3();
    moveDir.copy(forward).multiplyScalar(direction.z);
    moveDir.add(right.clone().multiplyScalar(direction.x));
    if (moveDir.lengthSq() > 0) moveDir.normalize();

    velocity.x = moveDir.x * currentSpeed;
    velocity.z = moveDir.z * currentSpeed;

    // --- X-Axis Collision ---
    let expectedX = playerPosition.x + velocity.x * delta;
    let hullX = getHull(expectedX, playerPosition.y, playerPosition.z, currentHeight, 'x');
    for (const box of collidableBoxes) {
        if (hullX.intersectsBox(box)) {
            expectedX = playerPosition.x; // Block movement
            velocity.x = 0;
            break;
        }
    }
    playerPosition.x = expectedX;

    // --- Z-Axis Collision ---
    let expectedZ = playerPosition.z + velocity.z * delta;
    let hullZ = getHull(playerPosition.x, playerPosition.y, expectedZ, currentHeight, 'z');
    for (const box of collidableBoxes) {
        if (hullZ.intersectsBox(box)) {
            expectedZ = playerPosition.z; // Block movement
            velocity.z = 0;
            break;
        }
    }
    playerPosition.z = expectedZ;

    // --- Update Camera ---
    _camera.position.x = playerPosition.x;
    _camera.position.z = playerPosition.z;
    // Smooth transition: camera target is current feet position + current height offset + any air tucking
    const targetCamHeight = playerPosition.y + tuckAmount + currentHeight;
    _camera.position.y += (targetCamHeight - _camera.position.y) * 15.0 * delta;
}
