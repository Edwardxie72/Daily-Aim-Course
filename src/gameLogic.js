import { setupTargets, getTotalTargets } from './targets.js';
import { gameStatus } from './state.js';

export function startGame() {
    console.log("gameLogic: startGame called");
    setupTargets();
    const total = getTotalTargets();
    gameStatus.totalTargets = total;
    gameStatus.targetsLeft = total;
    gameStatus.startTime = performance.now();
    gameStatus.elapsedTime = 0;
    gameStatus.running = true;

    // Reset player position and rotation on start/restart
    import('./player.js').then(m => m.setupPlayer());
    import('./controls.js').then(m => m.resetRotation());

    // Restore UI state
    const startBtn = document.getElementById('start-btn');
    const completionMsg = document.getElementById('completion-msg');
    if (startBtn) startBtn.style.display = 'block';
    if (completionMsg) completionMsg.style.display = 'none';
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
            completionMsg.innerHTML = `
                <div style="background: rgba(0,0,0,0.8); padding: 30px; border-radius: 12px; border: 2px solid #555;">
                    <h1 style="margin-top: 0; color: #00ff00;">Course Cleared!</h1>
                    <p style="font-size: 24px;">Time: ${finalTime.toFixed(2)}s</p>
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
        }
    }
}

export function pauseGame() {
    // Timer no longer pauses
}

export function resumeGame() {
    // Timer no longer resumes
}


