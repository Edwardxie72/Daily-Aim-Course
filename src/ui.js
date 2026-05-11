import { setSens, getSens, keyBinds, setKeyBind, setIsListeningForKey, loadSettings } from './controls.js';
import { setupTargets, getTotalTargets } from './targets.js';

let gameRunning = false;
let startTime = 0;
let totalTargets = 0;
let targetsLeft = 0;
let timerInterval = null;

export function setupUI() {
    loadSettings();

    const sensInput = document.getElementById('sens-input');
    const editKeybindsBtn = document.getElementById('edit-keybinds-btn');
    const saveKeybindsBtn = document.getElementById('save-keybinds-btn');
    const startScreen = document.getElementById('start-screen');
    const keybindsScreen = document.getElementById('keybinds-screen');

    sensInput.value = getSens();

    sensInput.addEventListener('input', (e) => {
        setSens(parseFloat(e.target.value) || 1.0);
    });

    editKeybindsBtn.addEventListener('click', () => {
        startScreen.style.display = 'none';
        keybindsScreen.style.display = 'block';
        renderKeybinds();
    });

    saveKeybindsBtn.addEventListener('click', () => {
        keybindsScreen.style.display = 'none';
        startScreen.style.display = 'block';
    });
}

function renderKeybinds() {
    const list = document.getElementById('keybinds-list');
    list.innerHTML = '';

    for (const [action, currentKey] of Object.entries(keyBinds)) {
        const row = document.createElement('div');
        row.className = 'keybind-row';
        
        const label = document.createElement('span');
        label.innerText = action.charAt(0).toUpperCase() + action.slice(1);

        const btn = document.createElement('button');
        btn.className = 'keybind-btn';
        btn.innerText = currentKey;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            btn.innerText = "Press Key...";
            btn.classList.add('listening');
            setIsListeningForKey(true);

            const onKeyDown = (e) => {
                e.preventDefault();
                let code = e.code;
                if (e.type === 'mousedown') {
                    code = 'Mouse' + e.button;
                }
                
                setKeyBind(action, code);
                btn.innerText = code;
                btn.classList.remove('listening');
                setIsListeningForKey(false);
                
                document.removeEventListener('keydown', onKeyDown);
                document.removeEventListener('mousedown', onKeyDown);
            };

            document.addEventListener('keydown', onKeyDown);
            document.addEventListener('mousedown', onKeyDown);
        });

        row.appendChild(label);
        row.appendChild(btn);
        list.appendChild(row);
    }
}

export function isGameRunning() {
    return gameRunning;
}

export function startGame() {
    if (!gameRunning) {
        setupTargets();
        totalTargets = getTotalTargets();
        targetsLeft = totalTargets;
        startTime = performance.now();
        gameRunning = true;
    } else {
        // Just resuming, maybe adjust start time if we want to pause timer?
        // For now, timer keeps running in background
    }
    
    updateHUD();

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        updateHUD();
    }, 10);
}

export function targetHit() {
    targetsLeft--;
    updateHUD();
    if (targetsLeft <= 0) {
        endGame();
    }
}

function updateHUD() {
    const timerDiv = document.getElementById('timer');
    const targetCountDiv = document.getElementById('target-count');

    if (gameRunning) {
        const elapsed = (performance.now() - startTime) / 1000;
        timerDiv.innerText = elapsed.toFixed(2) + 's';
    }
    targetCountDiv.innerText = `Targets: ${totalTargets - targetsLeft}/${totalTargets}`;
}

function endGame() {
    gameRunning = false;
    clearInterval(timerInterval);
    document.exitPointerLock();
    document.getElementById('start-btn').innerText = "Course Cleared! Click to Play Again";
}
