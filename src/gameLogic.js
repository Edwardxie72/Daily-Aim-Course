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
            completionMsg.innerHTML = `Course Cleared! Time: ${finalTime.toFixed(2)}s<br>Click background to reset`;
            completionMsg.style.display = 'block';
        }
    }
}

export function pauseGame() {
    // Timer no longer pauses
}

export function resumeGame() {
    // Timer no longer resumes
}


