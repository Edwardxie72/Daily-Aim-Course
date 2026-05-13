import { setupTargets, getTotalTargets } from './targets.js';
import { gameStatus } from './state.js';
import { resetAmmo } from './weapon.js';
import { fetchLeaderboard, updateLeaderboardUI, getRank, getGlobalRank } from './leaderboard.js';

export function startGame() {
    console.log("gameLogic: startGame called");
    setupTargets();
    const total = getTotalTargets();
    gameStatus.totalTargets = total;
    gameStatus.targetsLeft = total;
    gameStatus.startTime = performance.now();
    gameStatus.elapsedTime = 0;
    gameStatus.running = true;
    resetAmmo();

    // Reset player position and rotation on start/restart
    import('./player.js').then(m => m.setupPlayer());
    import('./controls.js').then(m => m.resetRotation());

    // Restore UI state
    const startBtn = document.getElementById('start-btn');
    const completionMsg = document.getElementById('completion-msg');
    const submitPanel = document.getElementById('submit-panel');
    const leaderboardPanel = document.getElementById('leaderboard-panel');
    
    if (startBtn) startBtn.style.display = 'block';
    if (completionMsg) completionMsg.style.display = 'none';
    if (submitPanel) submitPanel.style.display = 'none';
    if (leaderboardPanel) {
        // Just refresh the data, don't force it to show here
        fetchLeaderboard().then(updateLeaderboardUI);
    }
}

export function decrementTargets() {
    gameStatus.targetsLeft--;
    if (gameStatus.targetsLeft <= 0) {
        gameStatus.running = false;
        const finalTime = gameStatus.elapsedTime + (performance.now() - gameStatus.startTime) / 1000;
        document.exitPointerLock();
        
        const startBtn = document.getElementById('start-btn');
        const completionMsg = document.getElementById('completion-msg');
        
        if (startBtn) startBtn.style.display = 'none';
        if (completionMsg) {
            const shareText = `I cleared ${gameStatus.totalTargets}/${gameStatus.totalTargets} targets in ${finalTime.toFixed(2)}s\nhttps://edwardxie.io/Daily-Aim-Course`;
            
            // Get current leaderboard to find rank
            Promise.all([fetchLeaderboard(), getGlobalRank(finalTime)]).then(([data, rank]) => {
                let title = "Course Cleared!";
                let titleColor = "#00ff00";

                if (rank === 1) { title = "NEW WORLD RECORD!"; titleColor = "#ffd700"; }
                else if (rank === 2) { title = "SILVER PLACEMENT!"; titleColor = "#c0c0c0"; }
                else if (rank === 3) { title = "BRONZE PLACEMENT!"; titleColor = "#cd7f32"; }

                updateLeaderboardUI(data, finalTime, rank); // Show preview with correct rank

                completionMsg.innerHTML = `
                    <div style="background: rgba(0,0,0,0.8); padding: 30px; border-radius: 12px; border: 2px solid #555;">
                        <h1 style="margin-top: 0; color: ${titleColor};">${title}</h1>
                        <p style="font-size: 24px;">Time: ${finalTime.toFixed(2)}s (Rank #${rank})</p>
                        <button id="copy-btn" style="
                            background: #00ff00; 
                            color: black; 
                            border: none; 
                            padding: 10px 20px; 
                            font-weight: bold; 
                            border-radius: 5px; 
                            cursor: pointer;
                            margin-bottom: 10px;
                        ">Copy Result</button>
                        <p style="font-size: 14px; color: #aaa;">Click background to reset</p>
                    </div>
                `;
                completionMsg.style.display = 'block';

                document.getElementById('copy-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(shareText).then(() => {
                        const btn = document.getElementById('copy-btn');
                        btn.innerText = "Copied!";
                        btn.style.background = "#fff";
                        setTimeout(() => {
                            btn.innerText = "Copy Result";
                            btn.style.background = "#00ff00";
                        }, 2000);
                    });
                });
            });
        }

        // Show leaderboard submission if they finished
        const submitPanel = document.getElementById('submit-panel');
        if (submitPanel) {
            submitPanel.style.display = 'block';
            document.getElementById('name-input').value = '';
            document.getElementById('name-input').focus();
            
            // Store the final time on the submit button for the click handler
            document.getElementById('submit-btn').dataset.time = finalTime;
        }
    }
}

export function pauseGame() {
    // Timer no longer pauses
}

export function resumeGame() {
    // Timer no longer resumes
}


