import * as THREE from 'three';

export function setupLevel(scene) {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(40, 40);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

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
    scene.add(wallN);

    // South wall
    const wallS = new THREE.Mesh(wallGeometry, wallMaterial);
    wallS.position.set(0, 2, 20);
    wallS.receiveShadow = true;
    scene.add(wallS);

    // East wall
    const wallE = new THREE.Mesh(wallGeometry, wallMaterial);
    wallE.position.set(20, 2, 0);
    wallE.rotation.y = Math.PI / 2;
    wallE.receiveShadow = true;
    scene.add(wallE);

    // West wall
    const wallW = new THREE.Mesh(wallGeometry, wallMaterial);
    wallW.position.set(-20, 2, 0);
    wallW.rotation.y = Math.PI / 2;
    wallW.receiveShadow = true;
    scene.add(wallW);
}
