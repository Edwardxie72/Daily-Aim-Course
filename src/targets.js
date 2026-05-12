import { THREE, scene, camera } from './state.js';
import { decrementTargets } from './gameLogic.js';
import { levelMeshes } from './level.js';
import { playHeadshot, playBodyHit, playWallHit, resumeAudio } from './sfx.js';

export let targets = [];
const raycaster = new THREE.Raycaster();
const textureLoader = new THREE.TextureLoader();
const faceTextures = [
    textureLoader.load('./face.png'),
    textureLoader.load('./face2.png'),
    textureLoader.load('./face3.png')
];
const easterEggTexture = textureLoader.load('./easter_egg.png');

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

export function setupTargets() {
    targets.forEach(t => scene.remove(t));
    targets = [];

    initialPositions.forEach(pos => {
        const wrapper = new THREE.Group();
        wrapper.position.set(pos.x, pos.y, pos.z);
        
        // Apply orientation based on room layout
        wrapper.rotation.order = 'YXZ'; // Important: apply Yaw before Pitch so it falls backward correctly
        wrapper.rotation.y = pos.rotY || 0; 

        // Body
        const body = new THREE.Mesh(bodyGeometry, woodMat);
        body.position.y = 0.585;
        wrapper.add(body);

        // Head
        let selectedFace;
        if (Math.random() < 0.01) {
            selectedFace = easterEggTexture;
        } else {
            selectedFace = faceTextures[Math.floor(Math.random() * faceTextures.length)];
        }

        const faceMat = new THREE.MeshStandardMaterial({ 
            map: selectedFace, 
            color: 0xffffff
        });
        
        const headMaterials = [
            woodMat, // right
            woodMat, // left
            woodMat, // top
            woodMat, // bottom
            faceMat, // front (+z)
            woodMat  // back
        ];
        
        const head = new THREE.Mesh(headGeometry, headMaterials);
        head.position.y = 1.37;
        head.userData.isHead = true;
        wrapper.add(head);

        // HP Bar (Double sided for visibility)
        const hpBg = new THREE.Mesh(hpBgGeometry, hpBgMaterial);
        hpBg.position.set(0.6, 0.585, 0.03);
        wrapper.add(hpBg);

        const hpFg = new THREE.Mesh(hpBgGeometry, hpFgMaterial);
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

export function shootTarget(spread = 0) {
    const randomX = (Math.random() - 0.5) * spread;
    const randomY = (Math.random() - 0.5) * spread;
    raycaster.setFromCamera({ x: randomX, y: randomY }, camera);
    const activeTargets = targets.filter(t => !t.userData.isFalling);
    const intersects = raycaster.intersectObjects([...activeTargets, ...levelMeshes], true);

    if (intersects.length > 0) {
        const hit = intersects[0];

        // Check if we hit a wall/floor instead of a target
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
            wrapper.userData.hpBar.scale.y = 0.0001; // Effectively empty
            decrementTargets();
            setTimeout(() => {
                scene.remove(wrapper);
                targets = targets.filter(t => t !== wrapper);
            }, 2000);
        } else {
            const ratio = wrapper.userData.hp / 100;
            wrapper.userData.hpBar.scale.y = ratio;
            wrapper.userData.hpBar.position.y = 0.585 - (1.17 * (1 - ratio)) / 2;
            wrapper.userData.hpBar.material.color.setRGB(1 - ratio, ratio, 0);
        }
    }
}

export function updateTargets(delta) {
    targets.forEach(t => {
        if (t.userData.isFalling) {
            t.userData.fallAngle += delta * 5;
            // Negative X rotation tilts top towards -Z (away from player)
            t.rotation.x = -Math.min(Math.PI / 2, t.userData.fallAngle);
        }
    });
}

export function getTotalTargets() { return initialPositions.length; }

function createBulletHole(hit) {
    playWallHit();
    const hole = new THREE.Mesh(
        new THREE.CircleGeometry(0.04, 16),
        new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    
    // Place at hit point, offset slightly along normal
    hole.position.copy(hit.point).add(hit.normal.clone().multiplyScalar(0.01));
    
    // Align with surface normal
    const dummy = new THREE.Object3D();
    dummy.position.copy(hole.position);
    dummy.lookAt(hole.position.clone().add(hit.normal));
    hole.quaternion.copy(dummy.quaternion);
    
    scene.add(hole);
    
    // Fade out and remove
    setTimeout(() => {
        scene.remove(hole);
    }, 4000);
}
