import { setSens, getSens, setKeyBind, setIsListeningForKey, loadSettings } from './controls.js';
import { getAmmoInfo } from './weapon.js';
import { gameStatus, keyBinds } from './state.js';

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
                renderKeybinds(); 
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

let timerInterval = null;
export function setupHUDLoop() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        updateHUD();
    }, 10);
}

function updateHUD() {
    const timerDiv = document.getElementById('timer');
    const targetCountDiv = document.getElementById('target-count');
    const ammoDiv = document.getElementById('ammo-display');

    if (gameStatus.running) {
        const now = performance.now();
        const totalElapsed = (now - gameStatus.startTime) / 1000;
        timerDiv.innerText = totalElapsed.toFixed(2) + 's';
    }

    targetCountDiv.innerText = `Targets: ${gameStatus.totalTargets - gameStatus.targetsLeft}/${gameStatus.totalTargets}`;

    const ammo = getAmmoInfo();
    if (ammo.isReloading) {
        ammoDiv.innerText = "RELOADING...";
    } else {
        ammoDiv.innerText = `${ammo.current} / ${ammo.reserve}`;
    }
}
