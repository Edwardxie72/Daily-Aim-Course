import { THREE } from './state.js';
import { shootTarget } from './targets.js';
import { applyRecoil } from './controls.js';

let weaponGroup;
let currentMag = 30;
let reserveAmmo = 90;
let isReloading = false;
let reloadTimer = 0;
const RELOAD_TIME = 2.5;

let fireTimer = 0;
const FIRE_RATE = 0.1; 
let shotsFired = 0;

export function setupWeapon(camera) {
    if (weaponGroup) camera.remove(weaponGroup);
    weaponGroup = new THREE.Group();
    
    const woodMat = new THREE.MeshBasicMaterial({ color: 0x5d4037 });
    const metalMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.5), metalMat);
    weaponGroup.add(body);

    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.6), metalMat);
    barrel.position.set(0, 0.04, 0.4);
    weaponGroup.add(barrel);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.4), woodMat);
    stock.position.set(0, -0.02, -0.4);
    weaponGroup.add(stock);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.15), metalMat);
    mag.position.set(0, -0.2, 0.1);
    mag.rotation.x = Math.PI / 10;
    weaponGroup.add(mag);

    weaponGroup.position.set(0.3, -0.4, -0.6);
    camera.add(weaponGroup);
}

export function updateWeapon(delta, isFiring) {
    if (isReloading) {
        reloadTimer -= delta;
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
    
    // Permanently apply recoil to aim
    applyRecoil(kickX * 0.012, kickY * 0.012);

    // Visual weapon kick (snappy back and forth)
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
}

export function getAmmoInfo() {
    return {
        current: currentMag,
        reserve: reserveAmmo,
        isReloading: isReloading
    };
}
