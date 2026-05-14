import { setupTargets, getTotalTargets } from './targets.js';
import { gameStatus, camera, cameraAngle, applyCameraRotation } from './state.js';
import { resetAmmo } from './weapon.js';
import { fetchLeaderboard, updateLeaderboardUI, getGlobalRank } from './leaderboard.js';
import { setupPlayer } from './player.js';

function setLeaderboard(visible) {
    const el = document.getElementById('leaderboard-panel');
    if (el) el.style.display = visible ? 'block' : 'none';
}

export function showMainMenu() {
    document.getElementById('main-menu').style.display = 'flex';
    document.getElementById('ready-screen').style.display = 'none';
    document.getElementById('pause-menu').style.display = 'none';
    document.getElementById('results-overlay').style.display = 'none';
    document.getElementById('keybinds-screen').style.display = 'none';
    document.getElementById('hud').style.display = 'none';
    setLeaderboard(true);
    fetchLeaderboard().then(data => updateLeaderboardUI(data));
}

export function showReadyScreen() {
    resetLevel(); // Always reset targets, player, ammo when going to ready screen
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('pause-menu').style.display = 'none';
    document.getElementById('results-overlay').style.display = 'none';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('submit-panel').style.display = 'none';
    document.getElementById('ready-screen').style.display = 'flex';
    setLeaderboard(false);
}

export function resetLevel() {
    setupTargets();
    const total = getTotalTargets();
    gameStatus.totalTargets = total;
    gameStatus.targetsLeft = total;
    gameStatus.running = false;
    resetAmmo();
    // Reset player position synchronously
    setupPlayer(null, camera);
    camera.position.set(0, 1.37, 0);
    // Reset camera angle synchronously
    cameraAngle.pitch = 0;
    cameraAngle.yaw = 0;
    applyCameraRotation();
}

export function startGame() {
    // NOTE: setupTargets() is NOT called here — resetLevel() (called by showReadyScreen())
    // already rebuilt the targets. Calling it again would waste CPU and cause a stall.
    const total = getTotalTargets();
    gameStatus.totalTargets = total;
    gameStatus.targetsLeft = total;
    gameStatus.startTime = performance.now();
    gameStatus.elapsedTime = 0;
    gameStatus.running = true;
    resetAmmo();
    setupPlayer(null, camera);
    cameraAngle.pitch = 0;
    cameraAngle.yaw = 0;
    applyCameraRotation();
}

export function decrementTargets() {
    gameStatus.targetsLeft--;
    if (gameStatus.targetsLeft <= 0) {
        gameStatus.running = false;
        const finalTime = gameStatus.elapsedTime + (performance.now() - gameStatus.startTime) / 1000;
        document.exitPointerLock();
        
        const resultsOverlay = document.getElementById('results-overlay');
        const completionMsg = document.getElementById('completion-msg');
        const hud = document.getElementById('hud');
        const submitPanel = document.getElementById('submit-panel');

        if (hud) hud.style.display = 'none';
        if (resultsOverlay) resultsOverlay.style.display = 'flex';
        
        // Show leaderboard on the results screen (on the left)
        setLeaderboard(true);

        // Show submission panel
        if (submitPanel) {
            submitPanel.style.display = 'block';
            const nameInput = document.getElementById('name-input');
            if (nameInput) { nameInput.value = ''; nameInput.focus(); }
            document.getElementById('submit-btn').dataset.time = finalTime;
        }

        if (completionMsg) {
            const shareText = `I cleared ${gameStatus.totalTargets}/${gameStatus.totalTargets} targets in ${finalTime.toFixed(2)}s\nhttps://edwardxie.io/Daily-Aim-Course`;
            
            Promise.all([fetchLeaderboard(), getGlobalRank(finalTime)]).then(([data, rank]) => {
                let title = "Course Cleared!";
                let titleColor = "#4ade80";

                if (rank === 1) { title = "🥇 World Record!"; titleColor = "#ffd700"; }
                else if (rank === 2) { title = "🥈 Silver!"; titleColor = "#c0c0c0"; }
                else if (rank === 3) { title = "🥉 Bronze!"; titleColor = "#cd7f32"; }

                updateLeaderboardUI(data, finalTime, rank);

                completionMsg.innerHTML = `
                    <div style="background: rgba(10,10,15,0.95); padding: 36px 44px; border-radius: 14px; border: 1px solid #333; box-shadow: 0 20px 60px rgba(0,0,0,0.8); text-align: center;">
                        <h1 style="margin-top: 0; color: ${titleColor}; font-size: 1.6rem;">${title}</h1>
                        <p style="font-size: 2rem; margin: 0 0 6px 0; color: white; font-weight: 700;">${finalTime.toFixed(2)}s</p>
                        <p style="font-size: 0.9rem; color: #666; margin: 0 0 24px 0;">Rank #${rank}</p>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button id="copy-btn" style="background: #1a1a22; color: white; border: 1px solid #444; padding: 9px 18px; border-radius: 6px; cursor: pointer; font-family: Inter, sans-serif;">Share</button>
                            <button id="play-again-btn" style="background: #1a1a22; color: white; border: 1px solid #4ade80; padding: 9px 18px; border-radius: 6px; cursor: pointer; font-family: Inter, sans-serif;">↺ Play Again</button>
                            <button id="back-to-menu-btn" style="background: #4ade80; color: #0a0a0a; border: none; padding: 9px 18px; border-radius: 6px; cursor: pointer; font-family: Inter, sans-serif; font-weight: 600;">Main Menu</button>
                        </div>
                    </div>
                `;

                document.getElementById('copy-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(shareText).then(() => {
                        const btn = document.getElementById('copy-btn');
                        btn.innerText = "Copied!";
                        setTimeout(() => { btn.innerText = "Share"; }, 2000);
                    });
                });

                document.getElementById('play-again-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    resetLevel();
                    showReadyScreen();
                });

                document.getElementById('back-to-menu-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    showMainMenu();
                });
            });
        }
    }
}

export function pauseGame() {
    // Timer keeps running
}

export function resumeGame() {
    // Timer keeps running
}
