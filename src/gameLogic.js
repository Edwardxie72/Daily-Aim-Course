import { setupTargets, resetTargets, getTotalTargets, setTargetsVisibility } from './targets.js';
import { gameStatus, camera, cameraAngle, applyCameraRotation, scene } from './state.js';
import { resetAmmo } from './weapon.js';
import { fetchLeaderboard, updateLeaderboardUI } from './leaderboard.js';
import { setupPlayer } from './player.js';
import { setupLevel, setLevelVisibility } from './level.js';
import { setEditorActive, getSerializedData, stopTesting, decompressLevelCode } from './editor.js';

function setLeaderboard(visible) {
    const el = document.getElementById('leaderboard-panel');
    if (el) el.style.display = visible ? 'block' : 'none';
}

export function showMainMenu() {
    hideAllMenus();
    document.getElementById('main-menu').style.display = 'flex';
    setLeaderboard(true);
    
    // Ensure game level is visible and editor is hidden
    setLevelVisibility(true);
    setTargetsVisibility(true);
    setEditorActive(false);
    
    fetchLeaderboard().then(data => updateLeaderboardUI(data));
}

export function showCustomMenu() {
    hideAllMenus();
    document.getElementById('custom-menu').style.display = 'flex';
    setLeaderboard(true);
}

export function showReadyScreen() {
    resetLevel(); 
    hideAllMenus();
    document.getElementById('ready-screen').style.display = 'flex';
    setLeaderboard(false);
}

export function hideAllMenus() {
    const menus = ['main-menu', 'custom-menu', 'ready-screen', 'pause-menu', 'results-overlay', 'keybinds-screen', 'hud', 'editor-hud'];
    menus.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const editorBtn = document.getElementById('pause-editor-btn');
    if (editorBtn) editorBtn.style.display = 'none';
}
window.hideAllMenus = hideAllMenus;

export function resetLevel() {
    // If testing from editor, don't use the daily layout
    const blocks = gameStatus.customLevel ? gameStatus.customLevel.blocks : null;
    const targetData = gameStatus.customLevel ? gameStatus.customLevel.targets : null;
    
    // When playing a custom level, hide the daily level meshes
    const isCustom = !!gameStatus.customLevel;
    setLevelVisibility(!isCustom);
    setTargetsVisibility(!isCustom);
    
    setupLevel(scene, blocks);
    setupTargets(targetData);
    
    const total = getTotalTargets();
    gameStatus.totalTargets = total;
    gameStatus.targetsLeft = total;
    gameStatus.running = false;
    resetAmmo();
    
    const spawn = (gameStatus.customLevel && gameStatus.customLevel.spawn) ? gameStatus.customLevel.spawn : { x: 0, y: 0, z: 0, yaw: 0 };
    console.log("Aim Course - Resetting level. Spawn point:", spawn);
    
    setupPlayer(scene, camera, spawn);
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

export function pauseGame() {
    if (!gameStatus.running) return;
    gameStatus.running = false;
    gameStatus.elapsedTime += (performance.now() - gameStatus.startTime) / 1000;
    document.exitPointerLock();
    document.getElementById('pause-menu').style.display = 'flex';
    
    // Show/hide Back to Editor button based on testing status
    const editorBtn = document.getElementById('pause-editor-btn');
    if (editorBtn) {
        console.log("Aim Course - Pause Menu. isTesting:", gameStatus.isTesting);
        editorBtn.style.display = gameStatus.isTesting ? 'flex' : 'none';
    }
}

export function resumeGame() {
    gameStatus.startTime = performance.now();
    gameStatus.running = true;
    document.getElementById('pause-menu').style.display = 'none';
}

export function decrementTargets() {
    gameStatus.targetsLeft--;
    if (gameStatus.targetsLeft <= 0) {
        gameStatus.running = false;
        const finalTime = gameStatus.elapsedTime + (performance.now() - gameStatus.startTime) / 1000;
        document.exitPointerLock();

        const resultsOverlay = document.getElementById('results-overlay');
        const completionMsg = document.getElementById('completion-msg');
        const submitPanel = document.getElementById('submit-panel');
        
        resultsOverlay.style.display = 'flex';
        submitPanel.style.display = (gameStatus.customLevel && !gameStatus.isTesting) ? 'none' : (gameStatus.isTesting ? 'none' : 'block');

        fetchLeaderboard().then(data => {
            let rank = 1;
            for (const entry of data) {
                if (finalTime < entry.time) break;
                rank++;
            }
            
            let title = "Course Clear!";
            let titleColor = "#4ade80";
            if (rank === 1 && !gameStatus.customLevel) { title = "🏆 World Record!"; titleColor = "#ffd700"; }

            updateLeaderboardUI(data, finalTime, rank);

            const backText = gameStatus.isTesting ? 'Editor' : 'Main Menu';
            const backFunc = gameStatus.isTesting ? 'stopTesting' : 'showMainMenu';

            completionMsg.innerHTML = `
                <div style="background: rgba(10,10,15,0.95); padding: 36px 44px; border-radius: 14px; border: 1px solid #333; box-shadow: 0 20px 60px rgba(0,0,0,0.8); text-align: center;">
                    <h1 style="margin-top: 0; color: ${titleColor}; font-size: 1.6rem;">${gameStatus.customLevel ? 'Custom Course Clear!' : title}</h1>
                    <p style="font-size: 2rem; margin: 0 0 6px 0; color: white; font-weight: 700;">${finalTime.toFixed(2)}s</p>
                    <p style="font-size: 0.9rem; color: #666; margin: 0 0 24px 0;">Time</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button id="play-again-btn" style="background: #1a1a22; color: white; border: 1px solid #4ade80; padding: 9px 18px; border-radius: 6px; cursor: pointer;">↺ Play Again</button>
                        <button id="back-to-menu-btn" style="background: #4ade80; color: #0a0a0a; border: none; padding: 9px 18px; border-radius: 6px; cursor: pointer; font-weight: 600;">${backText}</button>
                    </div>
                </div>
            `;

            document.getElementById('play-again-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                showReadyScreen();
            });

            document.getElementById('back-to-menu-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (gameStatus.isTesting) {
                    hideAllMenus();
                    stopTesting();
                } else {
                    showMainMenu();
                }
            });
        });
    }
}

export async function loadCustomLevel(code) {
    try {
        const json = await decompressLevelCode(code);
        const data = JSON.parse(json);
        gameStatus.customLevel = data;
        gameStatus.isTesting = false;
        showReadyScreen();
    } catch (e) {
        console.error("Failed to load custom level:", e);
        alert("Invalid level code!");
    }
}

// Initializing event listeners
export function initUIEventListeners() {
    const customBtn = document.getElementById('custom-game-btn');
    if (customBtn) customBtn.onclick = showCustomMenu;
    
    const backBtn = document.getElementById('custom-back-btn');
    if (backBtn) backBtn.onclick = showMainMenu;
    
    const editorBtn = document.getElementById('launch-editor-btn');
    if (editorBtn) {
        editorBtn.onclick = () => {
            hideAllMenus();
            document.getElementById('editor-hud').style.display = 'block';
            setLevelVisibility(false);
            setTargetsVisibility(false);
            setEditorActive(true, false); 
        };
    }

    const editorBlankBtn = document.getElementById('launch-editor-blank-btn');
    if (editorBlankBtn) {
        editorBlankBtn.onclick = () => {
            hideAllMenus();
            document.getElementById('editor-hud').style.display = 'block';
            setLevelVisibility(false);
            setTargetsVisibility(false);
            setEditorActive(true, true); 
        };
    }
    
    const testBtn = document.getElementById('editor-test');
    if (testBtn) {
        testBtn.onclick = () => {
            const data = getSerializedData();
            if (data.targets.length === 0) {
                alert("Add at least one target before testing!");
                return;
            }
            gameStatus.customLevel = data;
            gameStatus.isTesting = true;
            setEditorActive(false);
            showReadyScreen();
        };
    }
    
    const importBtn = document.getElementById('import-code-btn');
    if (importBtn) {
        importBtn.onclick = () => {
            const code = prompt("Paste level code:");
            if (code) loadCustomLevel(code);
        };
    }

    const dailyBtn = document.getElementById('daily-game-btn');
    if (dailyBtn) {
        dailyBtn.onclick = () => {
            gameStatus.customLevel = null;
            gameStatus.isTesting = false;
            showReadyScreen();
        };
    }
}
