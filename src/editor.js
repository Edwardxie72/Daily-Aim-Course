import { THREE, scene, camera } from './state.js';
import { setupLevel } from './level.js';
import { setupTargets } from './targets.js';
import { setEditorControlsActive } from './editorControls.js';
import { setWeaponVisible } from './weapon.js';

let editorActive = false;
let currentTool = 'box'; 
let ghostObject = null;

const editorObjects = [];
let playerSpawn = { x: 0, y: 0, z: 0, yaw: 0 };

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Materials
const ghostMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, transparent: true, opacity: 0.5 });
const targetMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
const boxMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
const wallMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
const spawnMat = new THREE.MeshStandardMaterial({ color: 0x4444ff });

export function setEditorActive(active) {
    editorActive = active;
    setEditorControlsActive(active);
    setWeaponVisible(!active); // Hide weapon in editor
    
    if (active) {
        document.exitPointerLock();
        createGhost();
        // Move camera up a bit to see the scene better
        camera.position.set(0, 10, 10);
        camera.lookAt(0, 0, 0);
    } else {
        if (ghostObject) { scene.remove(ghostObject); ghostObject = null; }
    }
}

function createGhost() {
    if (ghostObject) scene.remove(ghostObject);
    
    let geo;
    if (currentTool === 'box') geo = new THREE.BoxGeometry(2, 2, 2);
    else if (currentTool === 'wall') geo = new THREE.BoxGeometry(1, 10, 10);
    else if (currentTool === 'target') geo = new THREE.BoxGeometry(0.8, 1.17, 0.05);
    else if (currentTool === 'spawn') geo = new THREE.BoxGeometry(0.6, 2, 0.6);
    
    ghostObject = new THREE.Mesh(geo, ghostMat);
    ghostObject.userData.isGhost = true;
    scene.add(ghostObject);
}

export function updateEditor() {
    if (!editorActive || !ghostObject) return;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Intersect with anything collidable + the floor
    const floor = scene.children.find(c => c.geometry instanceof THREE.BoxGeometry && c.position.y === -0.5);
    const intersects = raycaster.intersectObjects([floor, ...editorObjects].filter(Boolean), true);
    
    if (intersects.length > 0) {
        const hit = intersects[0];
        let pos = hit.point.clone();
        
        // Snap to 0.5m grid
        pos.x = Math.round(pos.x * 2) / 2;
        pos.z = Math.round(pos.z * 2) / 2;
        
        // Calculate Y based on the surface we hit
        const halfHeight = ghostObject.geometry.parameters.height / 2;
        pos.y = hit.point.y + halfHeight;
        pos.y = Math.round(pos.y * 2) / 2;
        
        ghostObject.position.copy(pos);
    }
}

export function placeObject() {
    if (!editorActive || !ghostObject) return;
    
    let mat;
    if (currentTool === 'box') mat = boxMat.clone();
    else if (currentTool === 'wall') mat = wallMat.clone();
    else if (currentTool === 'target') mat = targetMat.clone();
    else if (currentTool === 'spawn') mat = spawnMat.clone();
    
    const newObj = new THREE.Mesh(ghostObject.geometry.clone(), mat);
    newObj.position.copy(ghostObject.position);
    newObj.rotation.copy(ghostObject.rotation);
    
    newObj.userData.type = currentTool;
    newObj.userData.isTarget = (currentTool === 'target');
    newObj.userData.isSpawn = (currentTool === 'spawn');
    
    if (newObj.userData.isSpawn) {
        const oldSpawn = editorObjects.find(o => o.userData.isSpawn);
        if (oldSpawn) {
            scene.remove(oldSpawn);
            editorObjects.splice(editorObjects.indexOf(oldSpawn), 1);
        }
        playerSpawn = { x: newObj.position.x, y: newObj.position.y - 1, z: newObj.position.z, yaw: 0 };
    }
    
    scene.add(newObj);
    editorObjects.push(newObj);
}

export function exportLevel() {
    const data = {
        spawn: playerSpawn,
        blocks: [],
        targets: []
    };
    
    editorObjects.forEach(obj => {
        if (obj.userData.isTarget) {
            data.targets.push({
                x: obj.position.x, y: obj.position.y - 0.585, z: obj.position.z,
                rotY: obj.rotation.y
            });
        } else if (!obj.userData.isSpawn) {
            data.blocks.push({
                size: [obj.geometry.parameters.width, obj.geometry.parameters.height, obj.geometry.parameters.depth],
                pos: [obj.position.x, obj.position.y, obj.position.z],
                rot: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
                color: obj.material.color.getHex()
            });
        }
    });
    
    const code = btoa(JSON.stringify(data));
    return code;
}

window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('mousedown', (e) => {
    if (editorActive && e.button === 0 && !isOverUI(e)) {
        placeObject();
    }
});

function isOverUI(e) {
    return e.target.closest('#editor-toolbar') || e.target.closest('#editor-selection-panel');
}

document.addEventListener('DOMContentLoaded', () => {
    const tools = document.querySelectorAll('.editor-tool');
    tools.forEach(t => {
        t.addEventListener('click', () => {
            tools.forEach(btn => btn.classList.remove('active'));
            t.classList.add('active');
            currentTool = t.dataset.tool;
            createGhost();
        });
    });
    
    document.getElementById('editor-export').addEventListener('click', () => {
        const code = exportLevel();
        const input = document.createElement('textarea');
        input.value = code;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        alert("Level code copied to clipboard!");
    });
    
    document.getElementById('editor-exit').addEventListener('click', () => {
        location.reload(); 
    });
});
