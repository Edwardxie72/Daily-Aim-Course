import { THREE } from './state.js';

export const collidableBoxes = [];
export const levelMeshes = [];

export function setupLevel(scene) {
    collidableBoxes.length = 0; 
    levelMeshes.length = 0; 
    
    function addStaticObject(mesh) {
        scene.add(mesh);
        mesh.updateMatrixWorld();
        const box = new THREE.Box3().setFromObject(mesh);
        collidableBoxes.push(box);
        levelMeshes.push(mesh);
    }

const DEFAULT_LAYOUT = [
    // Enclosing Outer Walls
    { size: [1, 10, 70], pos: [-10, 5, -25], color: 0x333333 }, // Left Wall
    { size: [1, 10, 70], pos: [10, 5, -25], color: 0x333333 },  // Right Wall
    { size: [20, 10, 1], pos: [0, 5, 10], color: 0x333333 },    // Start Wall

    // Wall 1 (between Room 1 and 2, z = -20) - Door on the Left
    { size: [16, 10, 1], pos: [2, 5, -20], color: 0x333333 },
    
    // Wall 2 (between Room 2 and 3, z = -40) - Door on the Right
    { size: [16, 10, 1], pos: [-2, 5, -40], color: 0x333333 },

    // Back Wall (end of Room 3, z = -60)
    { size: [20, 10, 1], pos: [0, 5, -60], color: 0x333333 },

    // Room 1 Platforms
    { size: [3, 2, 2], pos: [0, 0.5, -10], color: 0x666666 },
    { size: [2, 4, 2], pos: [-6, 1.5, -14], color: 0x666666 },

    // Room 2 Platforms
    { size: [5, 1, 3], pos: [0, 0, -25], color: 0x666666 },
    { size: [2, 6, 2], pos: [7, 2.5, -30], color: 0x666666 },
    { size: [4, 3, 4], pos: [-2, 1, -35], color: 0x666666 },

    // Room 3 Platforms
    { size: [10, 2, 2], pos: [0, 0.5, -45], color: 0x666666 },
    { size: [3, 8, 3], pos: [-7, 3.5, -50], color: 0x666666 },
    { size: [3, 8, 3], pos: [7, 3.5, -50], color: 0x666666 }
];

export function setupLevel(scene, customData = null) {
    collidableBoxes.length = 0; 
    levelMeshes.length = 0; 
    
    function addStaticObject(mesh) {
        scene.add(mesh);
        mesh.updateMatrixWorld();
        const box = new THREE.Box3().setFromObject(mesh);
        collidableBoxes.push(box);
        levelMeshes.push(mesh);
    }

    // Floor (20x70, from z=10 to z=-60)
    const floor = new THREE.Mesh(
        new THREE.BoxGeometry(20, 1, 70),
        new THREE.MeshStandardMaterial({ color: 0x444444 })
    );
    floor.position.set(0, -0.5, -25);
    scene.add(floor); 
    levelMeshes.push(floor);

    const layout = customData || DEFAULT_LAYOUT;
    
    layout.forEach(b => {
        const mat = new THREE.MeshStandardMaterial({ color: b.color || 0x666666 });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...b.size), mat);
        mesh.position.set(...b.pos);
        if (b.rot) mesh.rotation.set(...b.rot);
        addStaticObject(mesh);
    });
}
