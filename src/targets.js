import { THREE, scene, camera } from './state.js';
import { decrementTargets } from './gameLogic.js';

export let targets = [];
const raycaster = new THREE.Raycaster();

export function setupTargets() {
    targets.forEach(t => scene.remove(t));
    targets = [];

    const positions = [
        { x: -5, y: 0, z: -15 },
        { x: 5, y: 0, z: -15 },
        { x: 0, y: 0, z: -25 },
        { x: -8, y: 1.4, z: -20 }, 
        { x: 8, y: 0, z: -18 }
    ];

    positions.forEach(pos => {
        const wrapper = new THREE.Group();
        wrapper.position.set(pos.x, pos.y, pos.z);
        
        // Face the player (default orientation)
        wrapper.rotation.y = 0; 
        
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });

        // Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.17, 0.05), woodMat);
        body.position.y = 0.585;
        wrapper.add(body);

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.05), woodMat);
        head.position.y = 1.37;
        head.userData.isHead = true;
        wrapper.add(head);

        // HP Bar (Double sided for visibility)
        const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 1.17), new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide }));
        hpBg.position.set(0.6, 0.585, 0.03);
        wrapper.add(hpBg);

        const hpFg = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 1.17), new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide }));
        hpFg.position.set(0.6, 0.585, 0.04);
        wrapper.add(hpFg);

        wrapper.userData.hp = 100;
        wrapper.userData.hpBar = hpFg;
        wrapper.userData.isFalling = false;
        wrapper.userData.fallAngle = 0;
        
        scene.add(wrapper);
        targets.push(wrapper);
    });
}

export function shootTarget() {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const activeTargets = targets.filter(t => !t.userData.isFalling);
    const intersects = raycaster.intersectObjects(activeTargets, true);

    if (intersects.length > 0) {
        let wrapper = intersects[0].object;
        while (wrapper.parent && !targets.includes(wrapper)) {
            wrapper = wrapper.parent;
        }

        if (!wrapper || wrapper.userData.isFalling) return;

        const damage = intersects[0].object.userData.isHead ? 100 : 34;
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

export function getTotalTargets() { return 5; }
