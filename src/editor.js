import { THREE, scene, camera, gameStatus, cameraAngle, applyCameraRotation } from './state.js';
import { setupLevel } from './level.js';
import { setupTargets, robotBodyTexture, robotHeadTexture } from './targets.js';
import { setEditorControlsActive } from './editorControls.js';
import { setWeaponVisible } from './weapon.js';

let editorActive = false;
let currentTool = 'box'; 
let ghostObject = null;

const editorGroup = new THREE.Group();
scene.add(editorGroup);

const editorObjects = [];
let playerSpawn = { x: 0, y: 0, z: 0, yaw: 0 };
let ghostRotation = 0;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Materials
const ghostMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, transparent: true, opacity: 0.5 });
const boxMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
const wallMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
const spawnMat = new THREE.MeshStandardMaterial({ color: 0x4444ff });

export function setEditorActive(active, isBlank = false) {
    editorActive = active;
    setEditorControlsActive(active);
    setWeaponVisible(!active); 
    
    editorGroup.visible = active;
    const hud = document.getElementById('editor-hud');
    if (hud) hud.style.display = active ? 'block' : 'none';
    if (active) validateLevel();
    
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
    
    const walls = [
        { size: [1, 10, 60], pos: [-30, 5, 0], color: 0x333333 }, 
        { size: [1, 10, 60], pos: [30, 5, 0], color: 0x333333 },  
        { size: [60, 10, 1], pos: [0, 5, 30], color: 0x333333 },  
        { size: [60, 10, 1], pos: [0, 5, -30], color: 0x333333 }  
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
    validateLevel();
}


function createGhost() {
    if (ghostObject) editorGroup.remove(ghostObject);
    
    if (currentTool === 'target') {
        // Use a composite object for target ghost
        ghostObject = new THREE.Group();
        
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 1.17, 0.05),
            new THREE.MeshStandardMaterial({ map: robotBodyTexture, transparent: true, opacity: 0.7 })
        );
        body.position.y = 0.585; // Bottom at 0
        const head = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.35, 0.05),
            new THREE.MeshStandardMaterial({ map: robotHeadTexture, transparent: true, opacity: 0.7 })
        );
        head.position.y = 1.37; // Bottom at 0
        ghostObject.add(body);
        ghostObject.add(head);

        // Add direction arrow
        const arrow = new THREE.Mesh(
            new THREE.ConeGeometry(0.2, 0.5, 8),
            new THREE.MeshStandardMaterial({ color: 0xffff00 })
        );
        arrow.rotation.x = Math.PI / 2;
        arrow.position.z = 0.1;
        arrow.position.y = 0.5; // Visible above ground
        ghostObject.add(arrow);
    } else {
        let geo;
        if (currentTool === 'box') geo = new THREE.BoxGeometry(2, 2, 2);
        else if (currentTool === 'wall') geo = new THREE.BoxGeometry(1, 10, 10);
        else if (currentTool === 'spawn') {
            geo = new THREE.BoxGeometry(0.6, 2, 0.6);
            ghostObject = new THREE.Group();
            const body = new THREE.Mesh(geo, ghostMat);
            body.position.y = 1.0; // Bottom at 0
            ghostObject.add(body);
            
            // Add direction arrow for spawn
            const arrow = new THREE.Mesh(
                new THREE.ConeGeometry(0.2, 0.5, 8),
                new THREE.MeshStandardMaterial({ color: 0xffff00 })
            );
            arrow.rotation.x = -Math.PI / 2;
            arrow.position.z = -0.5;
            arrow.position.y = 0.5;
            ghostObject.add(arrow);
        } else if (currentTool === 'door') {
            ghostObject = createDoorMesh(ghostMat);
        }
        
        if (!ghostObject || (currentTool !== 'spawn' && currentTool !== 'door')) {
            ghostObject = new THREE.Mesh(geo, ghostMat);
        }
    }
    
    ghostObject.userData.isGhost = true;
    ghostObject.rotation.y = ghostRotation;
    editorGroup.add(ghostObject);
}

export function updateEditor() {
    if (!editorActive || !ghostObject) return;
    
    raycaster.setFromCamera(mouse, camera);
    const floor = scene.children.find(c => c && c.userData && c.userData.isFloor);
    // Allow snapping to all static objects except targets and spawn points themselves
    const snappableObjects = editorObjects.filter(obj => obj && obj.userData && !obj.userData.isTarget && !obj.userData.isSpawn);
    const intersects = raycaster.intersectObjects([floor, ...snappableObjects].filter(Boolean), true);
    
    if (intersects.length > 0) {
        const hit = intersects[0];
        let pos = hit.point.clone();
        
        // Use AABB for accurate clamping (especially for walls/rotated objects)
        const ghostAABB = new THREE.Box3().setFromObject(ghostObject);
        const size = new THREE.Vector3();
        ghostAABB.getSize(size);
        
        const limitX = 29.5 - (size.x / 2);
        const limitZ = 29.5 - (size.z / 2);
        
        pos.x = Math.max(-limitX, Math.min(limitX, pos.x));
        pos.z = Math.max(-limitZ, Math.min(limitZ, pos.z));

        // Snap to 0.5m grid
        pos.x = Math.round(pos.x * 2) / 2;
        pos.z = Math.round(pos.z * 2) / 2;
        
        // Calculate Y based on object type (pivot at center vs bottom)
        const h = size.y;
        const isGroup = ghostObject.type === 'Group';
        pos.y = isGroup ? hit.point.y : Math.round((hit.point.y + h / 2) * 2) / 2;
        
        ghostObject.position.copy(pos);

        // Check for collisions with other objects
        const ghostAABB_check = new THREE.Box3().setFromObject(ghostObject);
        // Shrink slightly to allow surface touching
        ghostAABB_check.expandByScalar(-0.05); 
        
        let isColliding = false;
        for (const obj of editorObjects) {
            if (obj.userData.isGhost) continue;
            const objAABB = new THREE.Box3().setFromObject(obj);
            if (ghostAABB_check.intersectsBox(objAABB)) {
                isColliding = true;
                break;
            }
        }

        // Tint ghost red if colliding
        if (isColliding) {
            ghostObject.traverse(child => {
                if (child.material) {
                    child.material.color.setHex(0xff3333);
                    child.material.opacity = 0.6;
                }
            });
            ghostObject.userData.isColliding = true;
        } else {
            ghostObject.traverse(child => {
                if (child.material) {
                    child.material.color.setHex(0x4ade80);
                    child.material.opacity = 0.4;
                }
            });
            ghostObject.userData.isColliding = false;
        }
    }
}

export function placeObject() {
    if (!editorActive || !ghostObject) return;
    
    let newObj;
    if (currentTool === 'target') {
        newObj = new THREE.Group();
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 1.17, 0.05),
            new THREE.MeshStandardMaterial({ map: robotBodyTexture })
        );
        body.position.y = 0.585;
        const head = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.35, 0.05),
            new THREE.MeshStandardMaterial({ map: robotHeadTexture })
        );
        head.position.y = 1.37;
        newObj.add(body);
        newObj.add(head);

        // Add direction arrow helper
        const arrow = new THREE.Mesh(
            new THREE.ConeGeometry(0.2, 0.5, 8),
            new THREE.MeshStandardMaterial({ color: 0xffff00 })
        );
        arrow.rotation.x = Math.PI / 2;
        arrow.position.z = 0.1;
        arrow.position.y = 0.5;
        arrow.userData.isHelper = true;
        newObj.add(arrow);

        newObj.userData.isTarget = true;
    } else if (currentTool === 'spawn') {
        newObj = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2, 0.6), spawnMat.clone());
        body.position.y = 1.0;
        newObj.add(body);

        // Add direction arrow helper
        const arrow = new THREE.Mesh(
            new THREE.ConeGeometry(0.2, 0.5, 8),
            new THREE.MeshStandardMaterial({ color: 0xffff00 })
        );
        arrow.rotation.x = -Math.PI / 2;
        arrow.position.z = -0.5;
        arrow.position.y = 0.5;
        arrow.userData.isHelper = true;
        newObj.add(arrow);

        // Remove old spawn if exists
        const oldSpawn = editorObjects.find(o => o && o.userData && o.userData.isSpawn);
        if (oldSpawn) {
            editorGroup.remove(oldSpawn);
            editorObjects.splice(editorObjects.indexOf(oldSpawn), 1);
        }
        newObj.userData.isSpawn = true;
    } else if (currentTool === 'door') {
        newObj = createDoorMesh(wallMat.clone());
        newObj.userData.type = 'door';
    } else {
        const mat = currentTool === 'wall' ? wallMat.clone() : boxMat.clone();
        newObj = new THREE.Mesh(ghostObject.geometry.clone(), mat);
        newObj.userData.type = currentTool;
    }
    
    if (newObj) {
        if (ghostObject.userData.isColliding) {
            // Optional: could play a "no" sound here
            return;
        }
        newObj.position.copy(ghostObject.position);
        newObj.rotation.copy(ghostObject.rotation);
        
        editorGroup.add(newObj);
        editorObjects.push(newObj);
        validateLevel();
    }
}

function validateLevel() {
    const testBtn = document.getElementById('editor-test');
    if (!testBtn) return;

    let hasSpawn = false;
    let hasTarget = false;

    editorGroup.children.forEach(obj => {
        if (!obj || obj.userData.isGhost || obj.userData.isHelper) return;
        if (obj.userData.isSpawn) hasSpawn = true;
        if (obj.userData.isTarget) hasTarget = true;
    });

    testBtn.disabled = !(hasSpawn && hasTarget);
    testBtn.title = testBtn.disabled ? "Add a spawn point and at least one target to test" : "Test your level";
}

window.addEventListener('keydown', (e) => {
    if (!editorActive) return;
    if (e.code === 'KeyR') {
        ghostRotation += Math.PI / 4; // 45 degree increments
        if (ghostObject) ghostObject.rotation.y = ghostRotation;
    }
});

export function getSerializedData() {
    const round = (n) => Math.round(n * 1000) / 1000;
    const data = {
        spawn: { x: 0, y: 0, z: 0, yaw: 0 },
        blocks: [],
        targets: []
    };
    
    // Scan all objects in the editor group
    editorGroup.children.forEach(obj => {
        if (!obj || obj.userData.isGhost || obj.userData.isHelper) return;

        if (obj.userData.isTarget) {
            data.targets.push({
                x: round(obj.position.x), 
                y: round(obj.position.y), 
                z: round(obj.position.z),
                rotY: round(obj.rotation.y)
            });
        } else if (obj.userData.isSpawn) {
            data.spawn = {
                x: round(obj.position.x),
                y: round(obj.position.y),
                z: round(obj.position.z),
                yaw: round(obj.rotation.y)
            };
        } else if (obj.userData.type) {
            // It's a block or wall
            const size = new THREE.Vector3();
            if (obj.geometry) {
                size.set(obj.geometry.parameters.width, obj.geometry.parameters.height, obj.geometry.parameters.depth);
            } else {
                new THREE.Box3().setFromObject(obj).getSize(size);
            }
            
            data.blocks.push({
                type: obj.userData.type,
                size: [round(size.x), round(size.y), round(size.z)],
                pos: [round(obj.position.x), round(obj.position.y), round(obj.position.z)],
                rot: [round(obj.rotation.x), round(obj.rotation.y), round(obj.rotation.z)],
                color: obj.material ? obj.material.color.getHex() : 0x666666
            });
        }
    });

    return data;
}

export async function exportLevel() {
    const jsonStr = JSON.stringify(getSerializedData());
    const blob = new Blob([jsonStr]);
    const compressedStream = blob.stream().pipeThrough(new CompressionStream('deflate'));
    const buffer = await new Response(compressedStream).arrayBuffer();
    
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return 'C_' + btoa(binary);
}

export async function decompressLevelCode(code) {
    if (code.startsWith('C_')) {
        const binaryStr = atob(code.substring(2));
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        const decompressedStream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
        return await new Response(decompressedStream).text();
    } else {
        return atob(code);
    }
}

export function loadLevelIntoEditor(data) {
    editorObjects.forEach(obj => editorGroup.remove(obj));
    editorObjects.length = 0;
    playerSpawn = { x: 0, y: 0, z: 0, yaw: 0 };
    
    if (data.blocks) {
        data.blocks.forEach(b => {
            let mesh;
            if (b.type === 'door') {
                const mat = new THREE.MeshStandardMaterial({ color: b.color || 0x333333 });
                mesh = createDoorMesh(mat);
            } else {
                const mat = new THREE.MeshStandardMaterial({ color: b.color });
                const geo = new THREE.BoxGeometry(b.size[0], b.size[1], b.size[2]);
                mesh = new THREE.Mesh(geo, mat);
            }
            mesh.position.set(b.pos[0], b.pos[1], b.pos[2]);
            if (b.rot) {
                mesh.rotation.set(b.rot[0], b.rot[1], b.rot[2]);
            }
            mesh.userData.type = b.type;
            editorGroup.add(mesh);
            editorObjects.push(mesh);
        });
    }
    
    if (data.targets) {
        data.targets.forEach(t => {
            const newObj = new THREE.Group();
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 1.17, 0.05),
                new THREE.MeshStandardMaterial({ map: robotBodyTexture })
            );
            body.position.y = 0.585;
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.35, 0.05),
                new THREE.MeshStandardMaterial({ map: robotHeadTexture })
            );
            head.position.y = 1.37;
            newObj.add(body);
            newObj.add(head);

            const arrow = new THREE.Mesh(
                new THREE.ConeGeometry(0.2, 0.5, 8),
                new THREE.MeshStandardMaterial({ color: 0xffff00 })
            );
            arrow.rotation.x = Math.PI / 2;
            arrow.position.z = 0.1;
            arrow.position.y = 0.5;
            arrow.userData.isHelper = true;
            newObj.add(arrow);

            newObj.position.set(t.x, t.y, t.z);
            newObj.rotation.y = t.rotY || 0;
            newObj.userData.isTarget = true;
            
            editorGroup.add(newObj);
            editorObjects.push(newObj);
        });
    }
    
    if (data.spawn) {
        const newObj = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2, 0.6), spawnMat.clone());
        body.position.y = 1.0;
        newObj.add(body);

        const arrow = new THREE.Mesh(
            new THREE.ConeGeometry(0.2, 0.5, 8),
            new THREE.MeshStandardMaterial({ color: 0xffff00 })
        );
        arrow.rotation.x = -Math.PI / 2;
        arrow.position.z = -0.5;
        arrow.position.y = 0.5;
        arrow.userData.isHelper = true;
        newObj.add(arrow);

        newObj.position.set(data.spawn.x, data.spawn.y, data.spawn.z);
        newObj.rotation.y = data.spawn.yaw || 0;
        newObj.userData.isSpawn = true;
        
        editorGroup.add(newObj);
        editorObjects.push(newObj);
        
        playerSpawn = data.spawn;
    }
    
    validateLevel();
}

export function stopTesting() {
    console.log("Aim Course - stopTesting() called. Re-activating editor.");
    gameStatus.isTesting = false;
    gameStatus.running = false;
    
    // Clear any focus on buttons/menus to ensure keys work
    if (document.activeElement) document.activeElement.blur();
    window.focus();

    const hud = document.getElementById('editor-hud');
    if (hud) hud.style.display = 'block';
    setEditorActive(true);
}

// Global helper for the pause menu button
window.stopTestingFromMenu = function() {
    console.log("Aim Course - Global stopTestingFromMenu called");
    try {
        if (typeof window.hideAllMenus === 'function') window.hideAllMenus();
        stopTesting();
    } catch (e) {
        console.error("Failed to stop testing:", e);
        alert("Error returning to editor. Check console.");
    }
};

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
    console.log("Aim Course - Editor KeyDown:", e.code);
    
    if (e.code === 'Digit1') selectTool('box');
    if (e.code === 'Digit2') selectTool('wall');
    if (e.code === 'Digit3') selectTool('target');
    if (e.code === 'Digit4') selectTool('spawn');
    if (e.code === 'Digit5') selectTool('door');
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
        exportBtn.onclick = async () => {
            exportBtn.disabled = true;
            exportBtn.innerText = "Exporting...";
            const code = await exportLevel();
            const input = document.createElement('textarea');
            input.value = code;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            alert("Level code copied to clipboard!");
            exportBtn.innerText = "💾 Export";
            exportBtn.disabled = false;
        };
    }
    
    const importBtn = document.getElementById('editor-import');
    if (importBtn) {
        importBtn.onclick = async () => {
            const code = prompt("Paste level code:");
            if (code) {
                try {
                    const jsonStr = await decompressLevelCode(code);
                    const data = JSON.parse(jsonStr);
                    loadLevelIntoEditor(data);
                } catch (e) {
                    console.error("Failed to import:", e);
                    alert("Invalid or corrupt level code!");
                }
            }
        };
    }

    const exitBtn = document.getElementById('editor-exit');
    if (exitBtn) {
        exitBtn.onclick = () => {
            location.reload(); 
        };
    }
});

export function createDoorMesh(material) {
    const group = new THREE.Group();
    
    // Total Wall: 1 x 10 x 10
    // Door cutout: 1 x 2.8 x 1.8 (bottom middle)
    const wallDepth = 10;
    const wallHeight = 10;
    const doorWidth = 1.8;
    const doorHeight = 2.8;
    
    const sideDepth = (wallDepth - doorWidth) / 2;
    
    // Left side
    const leftSide = new THREE.Mesh(new THREE.BoxGeometry(1, wallHeight, sideDepth), material);
    leftSide.position.z = (doorWidth + sideDepth) / 2;
    leftSide.position.y = wallHeight / 2;
    group.add(leftSide);
    
    // Right side
    const rightSide = new THREE.Mesh(new THREE.BoxGeometry(1, wallHeight, sideDepth), material);
    rightSide.position.z = -(doorWidth + sideDepth) / 2;
    rightSide.position.y = wallHeight / 2;
    group.add(rightSide);
    
    // Top piece
    const topHeight = wallHeight - doorHeight;
    const topPiece = new THREE.Mesh(new THREE.BoxGeometry(1, topHeight, doorWidth), material);
    topPiece.position.y = doorHeight + topHeight / 2;
    group.add(topPiece);
    
    return group;
}
