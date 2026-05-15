import { setupTargets, resetTargets, getTotalTargets } from './targets.js';
import { gameStatus, camera, cameraAngle, applyCameraRotation, scene } from './state.js';
import { resetAmmo } from './weapon.js';
import { fetchLeaderboard, updateLeaderboardUI } from './leaderboard.js';
import { setupPlayer } from './player.js';
import { setupLevel } from './level.js';
import { setEditorActive } from './editor.js';

function setLeaderboard(visible) {
    const el = document.getElementById('leaderboard-panel');
    if (el) el.style.display = visible ? 'block' : 'none';
}

export function showMainMenu() {
    hideAllMenus();
    document.getElementById('main-menu').style.display = 'flex';
    setLeaderboard(true);
    fetchLeaderboard().then(data => updateLeaderboardUI(data));
}

export function showCustomMenu() {
    hideAllMenus();
    document.getElementById('custom-menu').style.display = 'flex';
}

export function showReadyScreen() {
    resetLevel(); 
    hideAllMenus();
    document.getElementById('ready-screen').style.display = 'flex';
    setLeaderboard(false);
}

function hideAllMenus() {
    const menus = ['main-menu', 'custom-menu', 'ready-screen', 'pause-menu', 'results-overlay', 'keybinds-screen', 'hud', 'editor-hud'];
    menus.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

export function resetLevel() {
    // Rebuild level if custom data exists
    const blocks = gameStatus.customLevel ? gameStatus.customLevel.blocks : null;
    const targetData = gameStatus.customLevel ? gameStatus.customLevel.targets : null;
    
    // Clear and rebuild static meshes if it's a custom level or if we're coming from one
    setupLevel(scene, blocks);
    setupTargets(targetData);
    
    const total = getTotalTargets();
    gameStatus.totalTargets = total;
    gameStatus.targetsLeft = total;
    gameStatus.running = false;
    resetAmmo();
    
    // Reset player position
    const spawn = gameStatus.customLevel ? gameStatus.customLevel.spawn : { x: 0, y: 0, z: 0, yaw: 0 };
    setupPlayer(null, camera);
    camera.position.set(spawn.x, spawn.y + 1.37, spawn.z);
    cameraAngle.pitch = 0;
    cameraAngle.yaw = spawn.yaw || 0;
    applyCameraRotation();
}

export function startGame() {
    const total = getTotalTargets();
    gameStatus.totalTargets = total;
    gameStatus.targetsLeft = total;
    gameStatus.startTime = performance.now();
    gameStatus.elapsedTime = 0;
    gameStatus.running = true;
    resetAmmo();
}

export function decrementTargets() {
    gameStatus.targetsLeft--;
    if (gameStatus.targetsLeft <= 0) {
        gameStatus.running = false;
        const finalTime = gameStatus.elapsedTime + (performance.now() - gameStatus.startTime) / 1000;
        document.exitPointerLock();

        const resultsOverlay = document.getElementById('results-overlay');
        const completionMsg = document.getElementById('completion-msg');
        resultsOverlay.style.display = 'flex';

        const shareText = `I finished the Daily Aim Course in ${finalTime.toFixed(2)}s!`;

        fetchLeaderboard().then(data => {
            const rank = 1; // Logic for rank calculation...
            let title = "Finish!";
            let titleColor = "#4ade80";
            if (rank === 1) { title = "🏆 New Record!"; titleColor = "#ffd700"; }
            
            updateLeaderboardUI(data, finalTime, rank);
            completionMsg.innerHTML = `<h1 style="color:${titleColor}">${title}</h1><p>${finalTime.toFixed(2)}s</p>`;
            // ... (rest of results logic)
        });
    }
}

export function loadCustomLevel(code) {
    try {
        const json = atob(code);
        const data = JSON.parse(json);
        gameStatus.customLevel = data;
        showReadyScreen();
    } catch (e) {
        alert("Invalid level code!");
    }
}

// Initializing event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('custom-game-btn').addEventListener('click', showCustomMenu);
    document.getElementById('custom-back-btn').addEventListener('click', showMainMenu);
    document.getElementById('launch-editor-btn').addEventListener('click', () => {
        hideAllMenus();
        document.getElementById('editor-hud').style.display = 'block';
        setEditorActive(true);
    });
    document.getElementById('import-code-btn').addEventListener('click', () => {
        const code = prompt("Paste level code:");
        if (code) loadCustomLevel(code);
    });
});
