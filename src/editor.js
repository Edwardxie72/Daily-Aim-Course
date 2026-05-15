import { THREE, scene, camera, gameStatus } from './state.js';
import { setupLevel } from './level.js';
import { setupTargets } from './targets.js';
import { setEditorControlsActive } from './editorControls.js';
import { setWeaponVisible } from './weapon.js';

let editorActive = false;
let currentTool = 'box'; 
let ghostObject = null;

const editorGroup = new THREE.Group();
scene.add(editorGroup);

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

export function setEditorActive(active, isBlank = false) {
    editorActive = active;
    setEditorControlsActive(active);
    setWeaponVisible(!active); 
    
    editorGroup.visible = active;
    
    if (active) {
        document.exitPointerLock();
        if (isBlank) clearLevel();
        
        createGhost();
        camera.position.set(0, 10, 10);
        camera.lookAt(0, 0, 0);
    } else {
        if (ghostObject) { editorGroup.remove(ghostObject); ghostObject = null; }
    }
}

function clearLevel() {
    editorObjects.forEach(obj => editorGroup.remove(obj));
    editorObjects.length = 0;
    playerSpawn = { x: 0, y: 0, z: 0, yaw: 0 };
    
    // Perimeter Walls for 60x60 Arena (3x3 grid)
    const walls = [
        { size: [1, 10, 60], pos: [-30, 5, 0], color: 0x333333 }, // Left
        { size: [1, 10, 60], pos: [30, 5, 0], color: 0x333333 },  // Right
        { size: [60, 10, 1], pos: [0, 5, 30], color: 0x333333 },  // Back
        { size: [60, 10, 1], pos: [0, 5, -30], color: 0x333333 }  // Front
    ];
    
    walls.forEach(w => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...w.size), new THREE.MeshStandardMaterial({ color: w.color }));
        mesh.position.set(...w.pos);
        mesh.userData.type = 'wall';
        editorGroup.add(mesh);
        editorObjects.push(mesh);
    });

    setupLevel(scene, null, true); 
    setupTargets([]);
}

function createGhost() {
    if (ghostObject) editorGroup.remove(ghostObject);
    
    let geo;
    if (currentTool === 'box') geo = new THREE.BoxGeometry(2, 2, 2);
    else if (currentTool === 'wall') geo = new THREE.BoxGeometry(1, 10, 10);
    else if (currentTool === 'target') geo = new THREE.BoxGeometry(0.8, 1.17, 0.05);
    else if (currentTool === 'spawn') geo = new THREE.BoxGeometry(0.6, 2, 0.6);
    
    ghostObject = new THREE.Mesh(geo, ghostMat);
    ghostObject.userData.isGhost = true;
    editorGroup.add(ghostObject);
}

export function updateEditor() {
    if (!editorActive || !ghostObject) return;
    
    raycaster.setFromCamera(mouse, camera);
    const floor = scene.children.find(c => c.userData.isFloor);
    const snappableObjects = editorObjects.filter(obj => obj.userData.type !== 'wall');
    const intersects = raycaster.intersectObjects([floor, ...snappableObjects].filter(Boolean), true);
    
    if (intersects.length > 0) {
        const hit = intersects[0];
        let pos = hit.point.clone();
        
        const w = ghostObject.geometry.parameters.width || 1;
        const h = ghostObject.geometry.parameters.height || 1;
        const d = ghostObject.geometry.parameters.depth || 1;

        // Clamp to arena bounds (accounting for wall thickness of 1)
        const limitX = 29.5 - (w / 2);
        const limitZ = 29.5 - (d / 2);
        
        pos.x = Math.max(-limitX, Math.min(limitX, pos.x));
        pos.z = Math.max(-limitZ, Math.min(limitZ, pos.z));

        // Snap to 0.5m grid
        pos.x = Math.round(pos.x * 2) / 2;
        pos.z = Math.round(pos.z * 2) / 2;
        
        pos.y = Math.round((hit.point.y + h / 2) * 2) / 2;
        
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
            editorGroup.remove(oldSpawn);
            editorObjects.splice(editorObjects.indexOf(oldSpawn), 1);
        }
        playerSpawn = { x: newObj.position.x, y: newObj.position.y - 1, z: newObj.position.z, yaw: newObj.rotation.y };
    }
    
    editorGroup.add(newObj);
    editorObjects.push(newObj);
}

export function getSerializedData() {
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
    return data;
}

export function exportLevel() {
    return btoa(JSON.stringify(getSerializedData()));
}

export function stopTesting() {
    gameStatus.isTesting = false;
    const hud = document.getElementById('editor-hud');
    if (hud) hud.style.display = 'block';
    setEditorActive(true);
}

function selectTool(tool) {
    currentTool = tool;
    const tools = document.querySelectorAll('.editor-tool');
    tools.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    createGhost();
}

window.addEventListener('keydown', (e) => {
    if (!editorActive) return;
    
    if (e.code === 'Digit1') selectTool('box');
    if (e.code === 'Digit2') selectTool('wall');
    if (e.code === 'Digit3') selectTool('target');
    if (e.code === 'Digit4') selectTool('spawn');
    
    if (e.code === 'KeyR' && ghostObject) {
        ghostObject.rotation.y += Math.PI / 4; 
    }
});

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
        t.addEventListener('click', () => selectTool(t.dataset.tool));
    });
    
    const exportBtn = document.getElementById('editor-export');
    if (exportBtn) {
        exportBtn.onclick = () => {
            const code = exportLevel();
            const input = document.createElement('textarea');
            input.value = code;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            alert("Level code copied to clipboard!");
        };
    }
    
    const exitBtn = document.getElementById('editor-exit');
    if (exitBtn) {
        exitBtn.onclick = () => {
            location.reload(); 
        };
    }
});
