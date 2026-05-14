import { THREE, scene, camera } from './state.js';
import { decrementTargets } from './gameLogic.js';
import { levelMeshes } from './level.js';
import { playHeadshot, playBodyHit, playWallHit, playTargetFall, resumeAudio } from './sfx.js';

export let targets = [];
const raycaster = new THREE.Raycaster();
const _raycastOrigin = new THREE.Vector2(); // Reused per shot — no per-shot object literal
const textureLoader = new THREE.TextureLoader();


// Pooled objects — allocated once, reused for every bullet hole
const _bulletHoleGeo = new THREE.CircleGeometry(0.04, 8);
const _bulletHoleMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
const _dummy = new THREE.Object3D();

// Default robot textures
const robotHeadTexture = textureLoader.load('./target_head.png');
robotHeadTexture.colorSpace = THREE.SRGBColorSpace;
const robotBodyTexture = textureLoader.load('./target_body.png');
robotBodyTexture.colorSpace = THREE.SRGBColorSpace;

// Easter egg face textures (toggled by '0' key)
const easterEggFaces = [
    textureLoader.load('./face.png'),
    textureLoader.load('./face2.png'),
    textureLoader.load('./face3.png')
];
easterEggFaces.forEach(t => { t.colorSpace = THREE.SRGBColorSpace; });
const easterEggRareTexture = textureLoader.load('./easter_egg.png');
easterEggRareTexture.colorSpace = THREE.SRGBColorSpace;

export let easterEggMode = false;
export function toggleEasterEgg() {
    easterEggMode = !easterEggMode;
    applyTextureMode();
}

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

// Live-swap textures on all existing targets without rebuilding
function applyTextureMode() {
    targets.forEach(wrapper => {
        if (wrapper.userData.isFalling) return;

        wrapper.children.forEach(child => {
            if (child.userData.isHead) {
                const newTex = easterEggMode
                    ? (Math.random() < 0.01 ? easterEggRareTexture : easterEggFaces[Math.floor(Math.random() * easterEggFaces.length)])
                    : robotHeadTexture;
                // The front face material is index 4
                if (Array.isArray(child.material)) {
                    child.material[4].map = newTex;
                    child.material[4].needsUpdate = true;
                }
            } else if (child.userData.isBody) {
                if (Array.isArray(child.material)) {
                    const bodyTex = easterEggMode ? null : robotBodyTexture;
                    child.material[4].map = bodyTex;
                    child.material[4].needsUpdate = true;
                }
            }
        });
    });
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
