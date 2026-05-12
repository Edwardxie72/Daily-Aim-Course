import { THREE } from './state.js';
import { shootTarget } from './targets.js';
import { applyRecoil } from './controls.js';

let weaponGroup;
let magMesh; // Store reference for animation
let currentMag = 30;
let reserveAmmo = 90;
let isReloading = false;
let reloadTimer = 0;
const RELOAD_TIME = 2.0; // Shortened slightly for better feel

let fireTimer = 0;
const FIRE_RATE = 0.1; 
let shotsFired = 0;

export function setupWeapon(camera) {
    if (weaponGroup) camera.remove(weaponGroup);
    weaponGroup = new THREE.Group();
    
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.5), metalMat);
    weaponGroup.add(body);

    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.6), metalMat);
    barrel.position.set(0, 0.04, 0.4);
    weaponGroup.add(barrel);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.4), woodMat);
    stock.position.set(0, -0.02, -0.4);
    weaponGroup.add(stock);

    magMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.15), metalMat);
    magMesh.position.set(0, -0.2, 0.1);
    magMesh.rotation.x = Math.PI / 10;
    weaponGroup.add(magMesh);

    weaponGroup.position.set(0.3, -0.4, -0.6);
    camera.add(weaponGroup);
}

export function updateWeapon(delta, isFiring) {
    if (isReloading) {
        reloadTimer -= delta;
        animateReload(delta);
        if (reloadTimer <= 0) {
            completeReload();
        }
    }

    if (isFiring && !isReloading && currentMag > 0) {
        fireTimer -= delta;
        if (fireTimer <= 0) {
            fire();
            fireTimer = FIRE_RATE;
        }
    } else {
        if (!isFiring) {
            shotsFired = 0;
        }
        fireTimer = Math.max(0, fireTimer - delta);
    }
}

function animateReload(delta) {
    const progress = 1 - (reloadTimer / RELOAD_TIME); // 0 to 1
    
    if (progress < 0.4) {
        // Phase 1: Mag drops out (0% to 40% of time)
        const p = progress / 0.4;
        magMesh.position.y = -0.2 - (p * 0.5);
        magMesh.position.z = 0.1 - (p * 0.2);
        magMesh.rotation.x = (Math.PI / 10) + (p * 0.5);
    } else if (progress < 0.6) {
        // Phase 2: Mag hidden (40% to 60% of time)
        magMesh.visible = false;
    } else {
        // Phase 3: New mag enters (60% to 100% of time)
        magMesh.visible = true;
        const p = (progress - 0.6) / 0.4; // 0 to 1
        magMesh.position.y = -0.7 + (p * 0.5);
        magMesh.position.z = -0.1 + (p * 0.2);
        magMesh.rotation.x = (Math.PI / 10 + 0.5) - (p * 0.5);
    }

    // Add a slight weapon tilt during reload
    if (progress < 0.2) {
        weaponGroup.rotation.x += delta * 2;
    } else if (progress > 0.8) {
        weaponGroup.rotation.x -= delta * 2;
    } else {
        weaponGroup.rotation.x = 0;
    }
}

function fire() {
    currentMag--;
    shotsFired++;
    
    let kickX = 0;
    let kickY = 0;

    if (shotsFired <= 8) {
        kickY = 1.6 + (shotsFired * 0.1); 
        if (shotsFired > 1) {
            kickX = (Math.random() - 0.5) * 0.8;
        }
    } else if (shotsFired <= 12) {
        kickX = -3.0; 
        kickY = 0.5;
    } else if (shotsFired <= 16) {
        kickX = 3.0;
        kickY = 0.3;
    } else if (shotsFired <= 20) {
        kickX = -2.5;
        kickY = 0.1;
    } else if (shotsFired <= 25) {
        kickX = 2.5;
        kickY = 0.1;
    } else {
        kickX = (Math.random() - 0.5) * 4.0;
        kickY = 0;
    }
    
    applyRecoil(kickX * 0.012, kickY * 0.012);

    weaponGroup.position.z += 0.06;
    setTimeout(() => { if (weaponGroup) weaponGroup.position.z -= 0.06; }, 50);

    shootTarget();
}

export function startReload() {
    if (isReloading || currentMag === 30 || reserveAmmo <= 0) return;
    isReloading = true;
    reloadTimer = RELOAD_TIME;
}

function completeReload() {
    isReloading = false;
    const needed = 30 - currentMag;
    const take = Math.min(needed, reserveAmmo);
    currentMag += take;
    reserveAmmo -= take;
    
    // Reset mag position
    magMesh.position.set(0, -0.2, 0.1);
    magMesh.rotation.x = Math.PI / 10;
    magMesh.visible = true;
    weaponGroup.rotation.x = 0;
}

export function resetAmmo() {
    currentMag = 30;
    reserveAmmo = 90;
    isReloading = false;
    reloadTimer = 0;
    if (magMesh) {
        magMesh.position.set(0, -0.2, 0.1);
        magMesh.rotation.x = Math.PI / 10;
        magMesh.visible = true;
    }
    if (weaponGroup) weaponGroup.rotation.x = 0;
}

export function getAmmoInfo() {
    return {
        current: currentMag,
        reserve: reserveAmmo,
        isReloading: isReloading
    };
}
