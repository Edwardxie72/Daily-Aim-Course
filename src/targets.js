import * as THREE from 'three';
import { scene, camera } from './engine.js';
import { targetHit } from './ui.js';

export let targets = [];
const raycaster = new THREE.Raycaster();

const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5a2b }); // Edge cardboard
const frontMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 }); // Dark silhouette for the front image
const backMaterial = new THREE.MeshStandardMaterial({ color: 0xdeb887 }); // Light cardboard for the back

const hpBgMaterial = new THREE.MeshBasicMaterial({ color: 0x330000 });
const hpFgMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

// Geometries for Cutout (Thin boxes)
const bodyGeom = new THREE.BoxGeometry(0.8, 1.2, 0.05);
const headGeom = new THREE.BoxGeometry(0.4, 0.4, 0.05);
const hpBarGeom = new THREE.PlaneGeometry(0.1, 1.2);

export function setupTargets() {
    targets.forEach(t => scene.remove(t));
    targets = [];

    for (let i = 0; i < 20; i++) {
        // Wrapper controls global position and Y-facing
        const wrapper = new THREE.Group();
        wrapper.userData = { hp: 100, dead: false, fallAngle: 0 };
        
        // Inner controls the local falling animation
        const inner = new THREE.Group();
        
        // Clone the materials so each target flashes independently
        const myCutoutMaterials = [
            edgeMaterial, edgeMaterial,
            edgeMaterial, edgeMaterial,
            frontMaterial.clone(),
            backMaterial
        ];

        // Body
        const body = new THREE.Mesh(bodyGeom, myCutoutMaterials);
        body.position.y = 0.6; // Center is at 0.6 to sit on floor
        body.userData.isHead = false;
        body.castShadow = true;
        
        // Head
        const head = new THREE.Mesh(headGeom, myCutoutMaterials);
        head.position.y = 1.4; // Sits exactly on top of the 1.2h body
        head.userData.isHead = true;
        head.castShadow = true;

        // HP Bar Background
        const hpBg = new THREE.Mesh(hpBarGeom, hpBgMaterial);
        hpBg.position.set(0.6, 0.6, 0.01);

        // HP Bar Foreground
        const hpFg = new THREE.Mesh(hpBarGeom, hpFgMaterial.clone());
        hpFg.position.set(0.6, 0.6, 0.02); // Slightly in front to prevent Z-fighting
        
        // Store references for dynamic scaling
        wrapper.userData.hpBar = hpFg;
        wrapper.userData.hpBg = hpBg;

        inner.add(body);
        inner.add(head);
        inner.add(hpBg);
        inner.add(hpFg);
        wrapper.add(inner);

        // Random positions strictly in front of the player, inside the arena
        wrapper.position.x = (Math.random() - 0.5) * 36; // -18 to 18 (padding from walls)
        wrapper.position.z = -3 - Math.random() * 15; // -3 to -18 (arena ends at -20)

        // Calculate facing. LookAt points -Z at the target. We want +Z facing the player.
        // If player is at 0,0,0, lookAt(0,0,0) makes -Z face the player.
        wrapper.lookAt(0, 0, 0);
        // Rotate 180 degrees so +Z (the image front) faces the player
        wrapper.rotateY(Math.PI);
        
        // Lock X and Z so they stand perfectly upright on the floor
        wrapper.rotation.x = 0; 
        wrapper.rotation.z = 0;

        scene.add(wrapper);
        targets.push(wrapper);
    }
}

export function shootTarget() {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    const meshesToTest = [];
    targets.forEach(wrapper => {
        if (!wrapper.userData.dead) {
            const inner = wrapper.children[0];
            inner.children.forEach(c => {
                // Only raycast against Head and Body, ignore the HP bars
                if (c.userData.isHead !== undefined) {
                    meshesToTest.push(c);
                }
            });
        }
    });

    const intersects = raycaster.intersectObjects(meshesToTest);

    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const inner = hitMesh.parent;
        const wrapper = inner.parent;
        
        // Visual flash feedback on the front face material (index 4)
        const frontMat = hitMesh.material[4];
        const originalColor = frontMat.color.getHex();
        frontMat.color.setHex(0xff0000);
        setTimeout(() => {
            if (hitMesh.material[4]) hitMesh.material[4].color.setHex(originalColor);
        }, 50);
        
        // Damage scaling: 100 for Head, 25 for Body
        const damage = hitMesh.userData.isHead ? 100 : 25;
        wrapper.userData.hp -= damage;
        
        // Update HP Bar Scale & Position
        const hpRatio = Math.max(0, wrapper.userData.hp / 100);
        const hpBar = wrapper.userData.hpBar;
        
        if (hpRatio > 0) {
            hpBar.scale.y = hpRatio;
            // Shift position down so the bar shrinks towards the bottom anchor instead of the center
            hpBar.position.y = 0.6 - (1.2 * (1 - hpRatio)) / 2;
            // Shift color from Green to Red
            hpBar.material.color.setRGB(1 - hpRatio, hpRatio, 0);
        } else {
            hpBar.visible = false;
            wrapper.userData.hpBg.visible = false; // Hide background when dead
        }

        // Check Death
        if (wrapper.userData.hp <= 0 && !wrapper.userData.dead) {
            wrapper.userData.dead = true;
            targetHit(); // Notify UI we got a kill
        }
    }
}

export function updateTargets(delta) {
    targets.forEach(wrapper => {
        // Fall backwards animation for dead targets
        if (wrapper.userData.dead && wrapper.userData.fallAngle < Math.PI / 2) {
            wrapper.userData.fallAngle += Math.PI * delta * 2; // Fall speed
            
            if (wrapper.userData.fallAngle >= Math.PI / 2) {
                wrapper.userData.fallAngle = Math.PI / 2; // Lock exactly to 90 degrees
            }
            
            const inner = wrapper.children[0];
            // Rotate the inner group locally around its X axis
            // Since +Z is the front, rotating negatively around X tilts the top backward (towards -Z)
            inner.rotation.x = -wrapper.userData.fallAngle;
            
            // To prevent the BoxGeometry from clipping halfway into the floor due to its 0.05 depth,
            // we lift the inner group smoothly by half its depth (0.025) as it falls flat.
            inner.position.y = 0.025 * Math.sin(wrapper.userData.fallAngle);
        }
    });
}

export function getTotalTargets() {
    return targets.length;
}
