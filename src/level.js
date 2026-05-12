import { THREE } from './state.js';

export const collidableBoxes = [];

export function setupLevel(scene) {
    collidableBoxes.length = 0; 
    
    function addStaticObject(mesh) {
        scene.add(mesh);
        mesh.updateMatrixWorld();
        const box = new THREE.Box3().setFromObject(mesh);
        collidableBoxes.push(box);
    }

    // Floor
    const floor = new THREE.Mesh(
        new THREE.BoxGeometry(40, 1, 40),
        new THREE.MeshStandardMaterial({ color: 0x444444 })
    );
    floor.position.y = -0.5;
    scene.add(floor); // Not collidable

    // Simple platforming sequence
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    
    const boxes = [
        { size: [4, 1, 4], pos: [0, 0.5, -5] },
        { size: [4, 2, 4], pos: [-5, 1, -10] },
        { size: [4, 3, 4], pos: [0, 1.5, -15] },
        { size: [10, 1, 10], pos: [0, 0.5, -25] }
    ];

    boxes.forEach(b => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...b.size), boxMat);
        mesh.position.set(...b.pos);
        addStaticObject(mesh);
    });
}
