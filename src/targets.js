import * as THREE from 'three';
import { scene, camera } from './engine.js';
import { targetHit } from './ui.js';

let targets = [];
const raycaster = new THREE.Raycaster();

export function setupTargets() {
    targets.forEach(t => scene.remove(t));
    targets = [];

    const targetMaterialBody = new THREE.MeshStandardMaterial({ color: 0x8b5a2b }); // Wooden
    const targetMaterialHead = new THREE.MeshStandardMaterial({ color: 0x8b5a2b }); // Wooden
    
    const bodyGeom = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 16);
    const headGeom = new THREE.SphereGeometry(0.25, 16, 16);

    for (let i = 0; i < 20; i++) {
        const group = new THREE.Group();
        
        const body = new THREE.Mesh(bodyGeom, targetMaterialBody.clone());
        body.position.y = 0.6;
        body.castShadow = true;
        
        const head = new THREE.Mesh(headGeom, targetMaterialHead.clone());
        head.position.y = 1.45;
        head.castShadow = true;

        group.add(body);
        group.add(head);

        // Random positions for testing
        group.position.x = (Math.random() - 0.5) * 35;
        group.position.z = (Math.random() - 0.5) * 35;
        
        // Don't spawn too close to 0,0 (player spawn)
        if (Math.abs(group.position.x) < 3 && Math.abs(group.position.z) < 3) {
            group.position.x += 5;
        }

        scene.add(group);
        targets.push(group);
    }
}

export function shootTarget() {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    const meshesToTest = [];
    targets.forEach(g => {
        g.children.forEach(c => meshesToTest.push(c));
    });

    const intersects = raycaster.intersectObjects(meshesToTest);

    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const hitGroup = hitMesh.parent;
        
        // Visual feedback
        hitMesh.material.color.setHex(0xff0000);
        
        // Remove target after a tiny delay
        setTimeout(() => {
            scene.remove(hitGroup);
            targets = targets.filter(t => t !== hitGroup);
            targetHit();
        }, 50);
    }
}

export function updateTargets(delta) {
    // We can add optional animations (bobbing etc) here
}

export function getTotalTargets() {
    return targets.length;
}
