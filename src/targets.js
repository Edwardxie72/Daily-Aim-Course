import { THREE, scene, camera } from './state.js';
import { decrementTargets } from './gameLogic.js';
import { levelMeshes } from './level.js';
import { playHeadshot, playBodyHit, playWallHit, playTargetFall, resumeAudio } from './sfx.js';

export let targets = [];
const raycaster = new THREE.Raycaster();
const _raycastOrigin = new THREE.Vector2(); // Reused per shot — no per-shot object literal
const textureLoader = new THREE.TextureLoader();

// Wrap each texture load in a Promise so engine.js can await full decode
function loadTexture(url) {
    return new Promise((resolve, reject) => {
        textureLoader.load(url, resolve, undefined, reject);
    });
}

// Default robot textures
export let robotHeadTexture, robotBodyTexture;
// Easter egg face textures (toggled by '0' key)
export let easterEggFaces = [];
export let easterEggRareTexture;

// All textures loaded and decoded — engine.js awaits this before compile+render
export const texturesReady = Promise.all([
    loadTexture('./target_head.png'),
    loadTexture('./target_body.png'),
    loadTexture('./face.png'),
    loadTexture('./face2.png'),
    loadTexture('./face3.png'),
    loadTexture('./easter_egg.png'),
]).then(([head, body, face1, face2, face3, egg]) => {
    robotHeadTexture        = head;
    robotBodyTexture        = body;
    easterEggFaces          = [face1, face2, face3];
    easterEggRareTexture    = egg;
    // Set color spaces
    [head, body, face1, face2, face3, egg].forEach(t => { t.colorSpace = THREE.SRGBColorSpace; });
});


export let easterEggMode = false;
export function toggleEasterEgg() {
    easterEggMode = !easterEggMode;
    applyTextureMode();
}

// Pooled objects — allocated once, reused for every bullet hole
const _bulletHoleGeo = new THREE.CircleGeometry(0.04, 8);
const _bulletHoleMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
const _dummy = new THREE.Object3D();

// Reuse Geometries and Materials for performance
const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
const bodyGeometry = new THREE.BoxGeometry(0.8, 1.17, 0.05);
const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.05);
const hpBgGeometry = new THREE.PlaneGeometry(0.1, 1.17);
const hpBgMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
const hpFgMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });


const initialPositions = [
    // Room 1 (6 targets) - Face forward (z axis)
    { x: -5, y: 0, z: -7 },
    { x: 5, y: 0, z: -10 },
    { x: -1, y: 1.5, z: -10 },
    { x: 1, y: 1.5, z: -10 },
    { x: -6, y: 3.5, z: -14 },
    { x: 7, y: 0, z: -15 },

    // Room 2 (7 targets) - Face Left (towards door at x=-8)
    { x: 0, y: 0.5, z: -25, rotY: -Math.PI / 2 },
    { x: 2, y: 0.5, z: -25, rotY: -Math.PI / 2 },
    { x: 7, y: 5.5, z: -30, rotY: -Math.PI / 2 },
    { x: 0, y: 0, z: -32, rotY: -Math.PI / 2 },
    { x: -2, y: 2.5, z: -35, rotY: -Math.PI / 2 },
    { x: 2, y: 0, z: -35, rotY: -Math.PI / 2 },
    { x: 5, y: 0, z: -37, rotY: -Math.PI / 2 },

    // Room 3 (8 targets) - Face Right (towards door at x=8)
    { x: 2, y: 0, z: -42, rotY: Math.PI / 2 },
    { x: -4, y: 1.5, z: -45, rotY: Math.PI / 2 },
    { x: -2, y: 1.5, z: -45, rotY: Math.PI / 2 },
    { x: 0, y: 1.5, z: -45, rotY: Math.PI / 2 },
    { x: 2, y: 1.5, z: -45, rotY: Math.PI / 2 },
    { x: -7, y: 7.5, z: -50, rotY: Math.PI / 2 },
    { x: 0, y: 0, z: -50, rotY: Math.PI / 2 },
    { x: -5, y: 0, z: -55, rotY: Math.PI / 2 }
];

function getHeadTexture() {
    if (easterEggMode) {
        return Math.random() < 0.01
            ? easterEggRareTexture
            : easterEggFaces[Math.floor(Math.random() * easterEggFaces.length)];
    }
    return robotHeadTexture;
}

function getBodyTexture() {
    return easterEggMode ? null : robotBodyTexture;
}

// Update all targets with current textures (Robot vs Easter Egg)
export function applyTextureMode() {
    const headTex = getHeadTexture();
    const bodyTex = getBodyTexture();

    targets.forEach(wrapper => {
        wrapper.children.forEach(child => {
            if (child.userData.isHead) {
                const newTex = (easterEggMode && headTex === null) 
                    ? (Math.random() < 0.01 ? easterEggRareTexture : easterEggFaces[Math.floor(Math.random() * easterEggFaces.length)])
                    : headTex;
                if (Array.isArray(child.material)) {
                    child.material[4].map = newTex;
                    child.material[4].needsUpdate = true;
                }
            } else if (child.userData.isBody) {
                if (Array.isArray(child.material)) {
                    child.material[4].map = bodyTex;
                    child.material[4].needsUpdate = true;
                }
            }
        });
    });
}

/**
 * Resets existing targets in-place instead of recreating them.
 * This prevents massive GC spikes when restarting the game.
 */
export function resetTargets() {
    // If targets haven't been created yet, do full setup
    if (targets.length === 0) {
        setupTargets();
        return;
    }

    targets.forEach((wrapper, i) => {
        const pos = initialPositions[i];
        if (!pos) return;

        // Reset transform
        wrapper.position.set(pos.x, pos.y, pos.z);
        wrapper.rotation.set(0, pos.rotY || 0, 0, 'YXZ');
        wrapper.scale.set(1, 1, 1);
        wrapper.visible = true;

        // Reset state
        wrapper.userData.hp = 100;
        wrapper.userData.isFalling = false;
        wrapper.userData.fallAngle = 0;

        // Reset HP bar
        if (wrapper.userData.hpBar) {
            wrapper.userData.hpBar.scale.y = 1;
            wrapper.userData.hpBar.position.y = 0.585;
            wrapper.userData.hpBar.material.color.setHex(0x00ff00);
            wrapper.userData.hpBar.visible = true;
        }
        if (wrapper.userData.hpBarBg) {
            wrapper.userData.hpBarBg.visible = true;
        }
    });

    // Ensure textures are correct for the current mode
    applyTextureMode();
}

export function setupTargets() {
    targets.forEach(t => scene.remove(t));
    targets = [];

    initialPositions.forEach(pos => {
        const wrapper = new THREE.Group();
        wrapper.position.set(pos.x, pos.y, pos.z);
        
        wrapper.rotation.order = 'YXZ';
        wrapper.rotation.y = pos.rotY || 0;

        // Body — use robot texture on front face
        const bodyFaceMat = new THREE.MeshStandardMaterial({ 
            map: getBodyTexture(), 
            color: 0xffffff 
        });
        const bodyMaterials = [woodMat, woodMat, woodMat, woodMat, bodyFaceMat, woodMat];
        const body = new THREE.Mesh(bodyGeometry, bodyMaterials);
        body.position.y = 0.585;
        body.userData.isBody = true;
        wrapper.add(body);

        // Head — use robot texture on front face
        const faceMat = new THREE.MeshStandardMaterial({ 
            map: getHeadTexture(), 
            color: 0xffffff
        });
        const headMaterials = [woodMat, woodMat, woodMat, woodMat, faceMat, woodMat];
        const head = new THREE.Mesh(headGeometry, headMaterials);
        head.position.y = 1.37;
        head.userData.isHead = true;
        wrapper.add(head);

        // HP Bar
        const hpBg = new THREE.Mesh(hpBgGeometry, hpBgMaterial);
        hpBg.position.set(0.6, 0.585, 0.03);
        wrapper.add(hpBg);

        const hpFg = new THREE.Mesh(hpBgGeometry, hpFgMaterial.clone());
        hpFg.position.set(0.6, 0.585, 0.04);
        wrapper.add(hpFg);

        wrapper.userData.hp = 100;
        wrapper.userData.hpBar = hpFg;
        wrapper.userData.hpBarBg = hpBg;
        wrapper.userData.isFalling = false;
        wrapper.userData.fallAngle = 0;
        
        scene.add(wrapper);
        targets.push(wrapper);
    });
}

// Reusable array for raycaster — avoids new allocations on every shot
const _raycastTargets = [];

export function shootTarget(spread = 0) {
    _raycastOrigin.set((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread);
    raycaster.setFromCamera(_raycastOrigin, camera);

    // Fill reusable array instead of spreading two arrays into a new one
    _raycastTargets.length = 0;
    for (let i = 0; i < targets.length; i++) {
        if (!targets[i].userData.isFalling) _raycastTargets.push(targets[i]);
    }
    for (let i = 0; i < levelMeshes.length; i++) _raycastTargets.push(levelMeshes[i]);

    const intersects = raycaster.intersectObjects(_raycastTargets, true);

    if (intersects.length > 0) {
        const hit = intersects[0];

        if (levelMeshes.includes(hit.object)) {
            createBulletHole(hit);
            return;
        }

        let wrapper = hit.object;
        while (wrapper.parent && !targets.includes(wrapper)) {
            wrapper = wrapper.parent;
        }

        if (!wrapper || wrapper.userData.isFalling) return;

        resumeAudio();
        const isHead = hit.object.userData.isHead;
        const damage = isHead ? 100 : 34;
        
        if (isHead) playHeadshot();
        else playBodyHit();

        wrapper.userData.hp -= damage;

        if (wrapper.userData.hp <= 0) {
            wrapper.userData.isFalling = true;
            wrapper.userData.hpBar.scale.y = 0.0001;
            playTargetFall();
            decrementTargets();
            setTimeout(() => {
            scene.remove(wrapper);
            targets = targets.filter(t => t !== wrapper);
        }, 2000);
        } else {
            const ratio = wrapper.userData.hp / 100;
            wrapper.userData.hpBar.scale.y = ratio;
            wrapper.userData.hpBar.position.y = 0.585 - (1.17 * (1 - ratio)) / 2;
            wrapper.userData.hpBar.material.color.set(0xffa500);
        }
    }
}

export function updateTargets(delta) {
    targets.forEach(t => {
        if (t.userData.isFalling) {
            t.userData.fallAngle += delta * 5;
            t.rotation.x = -Math.min(Math.PI / 2, t.userData.fallAngle);
        }
    });
}

export function getTotalTargets() { return initialPositions.length; }

function createBulletHole(hit) {
    playWallHit();
    // Reuse pooled geometry & material — no per-shot allocation
    const hole = new THREE.Mesh(_bulletHoleGeo, _bulletHoleMat);
    
    hole.position.copy(hit.point).add(hit.normal.clone().multiplyScalar(0.01));
    
    // Reuse _dummy to get the correct quaternion
    _dummy.position.copy(hole.position);
    _dummy.lookAt(hole.position.clone().add(hit.normal));
    hole.quaternion.copy(_dummy.quaternion);
    
    scene.add(hole);
    
    setTimeout(() => {
        scene.remove(hole);
    }, 4000);
}
