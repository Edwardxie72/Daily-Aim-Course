import { setSens, getSens, setKeyBind, setIsListeningForKey, loadSettings } from './controls.js';
import { getAmmoInfo } from './weapon.js';
import { gameStatus, keyBinds, settings } from './state.js';
import { fetchLeaderboard, submitTime, updateLeaderboardUI } from './leaderboard.js';
import { showMainMenu, showReadyScreen, startGame, hideAllMenus } from './gameLogic.js';
import { updateVolume } from './sfx.js';
import { stopTesting } from './editor.js';

export function setupUI() {
    loadSettings();

    // Set today's date in the main menu subtitle
    const dailyDate = document.getElementById('daily-date');
    if (dailyDate) {
        dailyDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }

    // Settings sliders
    const sensSlider = document.getElementById('sens-slider');
    const sensInput = document.getElementById('sens-input');
    const volSlider = document.getElementById('volume-slider');
    const volInput = document.getElementById('volume-input');

    sensSlider.value = getSens();
    sensInput.value = getSens();

    sensSlider.addEventListener('input', (e) => setSens(parseFloat(e.target.value)));
    sensInput.addEventListener('change', (e) => setSens(parseFloat(e.target.value) || 1.0));

    // Volume
    const updateVolUI = (val, isPercent = false) => {
        let num = parseFloat(val);
        if (isNaN(num)) return;
        if (isPercent) num = num / 100;
        settings.volume = Math.max(0, Math.min(1, num));
        volSlider.value = settings.volume;
        volInput.value = Math.round(settings.volume * 100);
        updateVolume();
        localStorage.setItem('aimCourse_volume', settings.volume.toString());
    };
    volSlider.value = settings.volume;
    volInput.value = Math.round(settings.volume * 100);
    updateVolume();
    volSlider.addEventListener('input', (e) => updateVolUI(e.target.value));
    volInput.addEventListener('change', (e) => updateVolUI(e.target.value, true));

    // ---- Main Menu buttons ----
    document.getElementById('daily-game-btn').addEventListener('click', () => {
        showReadyScreen();
    });

    document.getElementById('archives-btn').addEventListener('click', () => {
        alert('Archives coming soon!');
    });

    document.getElementById('edit-keybinds-btn').addEventListener('click', () => {
        document.getElementById('main-menu').style.display = 'none';
        const kb = document.getElementById('keybinds-screen');
        kb.style.display = 'flex';
        kb.dataset.from = 'main-menu';
        renderKeybinds();
    });

    // ---- Pause menu buttons ----
    document.getElementById('pause-resume-btn').addEventListener('click', () => {
        document.getElementById('pause-menu').style.display = 'none';
        // Browser enforces a cooldown after pointer lock exits before it can be re-acquired
        setTimeout(() => {
            document.body.requestPointerLock({ unadjustedMovement: true }).catch(() => {
                document.body.requestPointerLock();
            });
        }, 150);
    });

    document.getElementById('pause-restart-btn').addEventListener('click', () => {
        showReadyScreen();
    });

    document.getElementById('pause-keybinds-btn').addEventListener('click', () => {
        document.getElementById('pause-menu').style.display = 'none';
        const kb = document.getElementById('keybinds-screen');
        kb.style.display = 'flex';
        kb.dataset.from = 'pause-menu';
        renderKeybinds();
    });

    document.getElementById('pause-mainmenu-btn').addEventListener('click', () => {
        showMainMenu();
    });

    const pauseEditorBtn = document.getElementById('pause-editor-btn');

    // ---- Keybinds back button ----
    document.getElementById('save-keybinds-btn').addEventListener('click', () => {
        const kb = document.getElementById('keybinds-screen');
        kb.style.display = 'none';
        const from = kb.dataset.from || 'main-menu';
        if (from === 'pause-menu') {
            document.getElementById('pause-menu').style.display = 'flex';
        } else {
            document.getElementById('main-menu').style.display = 'flex';
        }
    });

    // ---- Score submission ----
    const submitBtn = document.getElementById('submit-btn');
    const nameInput = document.getElementById('name-input');
    const submitPanel = document.getElementById('submit-panel');

    submitBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const name = nameInput.value.trim().toUpperCase() || 'AAA';
        const time = parseFloat(submitBtn.dataset.time);
        
        submitBtn.disabled = true;
        submitBtn.innerText = "Submitting...";
        
        const success = await submitTime(name, time);
        if (success) {
            submitPanel.style.display = 'none';
            // Refresh leaderboard so the new score appears
            const data = await fetchLeaderboard();
            updateLeaderboardUI(data);
        }
        
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit to Leaderboard";
    });

    // Initial leaderboard fetch
    fetchLeaderboard().then(updateLeaderboardUI);
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

            const onKey = (e) => {
                e.preventDefault();
                let code = e.code;
                if (e.type === 'mousedown') code = 'Mouse' + e.button;
                
                setKeyBind(action, code);
                renderKeybinds(); 
                setIsListeningForKey(false);
                
                document.removeEventListener('keydown', onKey);
                document.removeEventListener('mousedown', onKey);
            };

            document.addEventListener('keydown', onKey);
            document.addEventListener('mousedown', onKey);
        });

        row.appendChild(label);
        row.appendChild(btn);
        list.appendChild(row);
    }
}

// Cached HUD element refs — queried once, never inside the RAF loop
let _hudTimer = null;
let _hudTargetCount = null;
let _hudAmmo = null;
let _hudLastUpdate = 0;

// HUD is driven by the RAF loop in engine.js — no separate setInterval needed
export function setupHUDLoop() {}

export function updateHUD() {
    // Lazily cache refs after DOM is ready
    if (!_hudTimer) {
        _hudTimer       = document.getElementById('timer');
        _hudTargetCount = document.getElementById('target-count');
        _hudAmmo        = document.getElementById('ammo-display');
    }

    // Throttle DOM writes to ~20Hz — no need to update text 60x per second
    const now = performance.now();
    if (now - _hudLastUpdate < 50) return;
    _hudLastUpdate = now;

    if (gameStatus.running && _hudTimer) {
        const totalElapsed = (now - gameStatus.startTime) / 1000;
        _hudTimer.innerText = totalElapsed.toFixed(2) + 's';
    }

    if (_hudTargetCount) {
        _hudTargetCount.innerText = `Targets: ${gameStatus.totalTargets - gameStatus.targetsLeft}/${gameStatus.totalTargets}`;
    }

    const ammo = getAmmoInfo();
    if (_hudAmmo) {
        _hudAmmo.innerText = ammo.isReloading ? 'RELOADING...' : `${ammo.current} / ${ammo.reserve}`;
    }
}
