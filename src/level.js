import * as THREE from 'three';

export const collidableBoxes = [];

export function setupLevel(scene) {
    collidableBoxes.length = 0; // Reset for re-setup
    
    function addStaticObject(mesh) {
        scene.add(mesh);
        // Force world matrix update so Box3 calculates correctly
        mesh.updateMatrixWorld(true);
        const box3 = new THREE.Box3().setFromObject(mesh);
        collidableBoxes.push(box3);
    }

    // Floor (Using a BoxGeometry instead of Plane for Y-axis thickness)
    const floorGeometry = new THREE.BoxGeometry(40, 1, 40);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = -0.5; // Top surface exactly at Y=0
    floor.receiveShadow = true;
    addStaticObject(floor);

    // Walls
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x555555,
        roughness: 0.9
    });
    const wallGeometry = new THREE.BoxGeometry(40, 4, 1);
    
    // North wall
    const wallN = new THREE.Mesh(wallGeometry, wallMaterial);
    wallN.position.set(0, 2, -20);
    wallN.receiveShadow = true;
    addStaticObject(wallN);

    // South wall
    const wallS = new THREE.Mesh(wallGeometry, wallMaterial);
    wallS.position.set(0, 2, 20);
    wallS.receiveShadow = true;
    addStaticObject(wallS);

    // East wall
    const wallE = new THREE.Mesh(wallGeometry, wallMaterial);
    wallE.position.set(20, 2, 0);
    wallE.rotation.y = Math.PI / 2;
    wallE.receiveShadow = true;
    addStaticObject(wallE);

    // West wall
    const wallW = new THREE.Mesh(wallGeometry, wallMaterial);
    wallW.position.set(-20, 2, 0);
    wallW.rotation.y = Math.PI / 2;
    wallW.receiveShadow = true;
    addStaticObject(wallW);

    // --- Add Jumping Obstacles/Platforms ---
    const boxGeo = new THREE.BoxGeometry(2, 1, 2);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x654321 }); // Brown wooden boxes

    const box1 = new THREE.Mesh(boxGeo, boxMat);
    box1.position.set(5, 0.5, -5); // Top surface is at Y=1
    box1.castShadow = true;
    box1.receiveShadow = true;
    addStaticObject(box1);

    const box2 = new THREE.Mesh(boxGeo, boxMat);
    box2.position.set(7, 1.5, -5); // Top surface is at Y=2
    box2.castShadow = true;
    box2.receiveShadow = true;
    addStaticObject(box2);
    
    // A wider platform box
    const platformGeo = new THREE.BoxGeometry(4, 2, 4);
    const box3 = new THREE.Mesh(platformGeo, boxMat);
    box3.position.set(10, 1, -10); // Top surface is at Y=2
    box3.castShadow = true;
    box3.receiveShadow = true;
    addStaticObject(box3);

    // A high platform that requires a crouch-jump (Surface at Y=1.4)
    const highBoxGeo = new THREE.BoxGeometry(2, 1.4, 2);
    const highBox = new THREE.Mesh(highBoxGeo, boxMat);
    highBox.position.set(-5, 0.7, -10); 
    highBox.castShadow = true;
    highBox.receiveShadow = true;
    addStaticObject(highBox);
}
