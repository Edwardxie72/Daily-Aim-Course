import { settings } from './state.js';

// ---------------------------------------------------------------------------
// Core audio context + master gain
// ---------------------------------------------------------------------------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const masterGain = audioCtx.createGain();
masterGain.gain.setValueAtTime(settings.volume, audioCtx.currentTime);
masterGain.connect(audioCtx.destination);

export function updateVolume() {
    masterGain.gain.setTargetAtTime(settings.volume, audioCtx.currentTime, 0.05);
}

export function resumeAudio() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

// ---------------------------------------------------------------------------
// Pre-rendering engine
// Each sound is built once into an AudioBuffer via OfflineAudioContext.
// Playing back = 1 BufferSourceNode instead of 10 live nodes → no GC spikes.
// ---------------------------------------------------------------------------

/**
 * Render a sound to an AudioBuffer synchronously-ish via OfflineAudioContext.
 * `buildFn(ctx)` receives the offline context and should attach nodes to ctx.destination.
 */
async function prerender(durationSec, buildFn) {
    const sr = audioCtx.sampleRate;
    const offline = new OfflineAudioContext(1, Math.ceil(sr * durationSec), sr);
    buildFn(offline);
    return offline.startRendering();
}

// Helper: create a noise buffer in a given audio context
function makeNoise(ctx, durationSec) {
    const n = Math.ceil(ctx.sampleRate * durationSec);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    return buf;
}

// ---------------------------------------------------------------------------
// Pre-rendered buffers (populated during initSFX)
// ---------------------------------------------------------------------------
const _buffers = {
    shot:       null,
    reloadOut:  null,
    reloadIn:   null,
    click:      null,
    headshot:   null,
    bodyHit:    null,
    wallHit:    null,
    targetFall: null,
};

// ---------------------------------------------------------------------------
// Playback helper — 1 node per sound, no GC-heavy graph construction at runtime
// ---------------------------------------------------------------------------
function playBuffer(buffer, gainScale = 1.0) {
    if (!buffer) return;
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    src.buffer = buffer;
    gain.gain.setValueAtTime(gainScale, audioCtx.currentTime);
    src.connect(gain);
    gain.connect(masterGain);
    src.start();
    // src auto-stops when buffer ends; no explicit .stop() needed
}

// ---------------------------------------------------------------------------
// initSFX — call once at startup, returns a Promise
// ---------------------------------------------------------------------------
export async function initSFX() {
    const [shot, reloadOut, reloadIn, click, headshot, bodyHit, wallHit, targetFall] =
        await Promise.all([
            prerender(0.25, buildShot),
            prerender(0.12, buildReloadOut),
            prerender(0.10, buildReloadIn),
            prerender(0.05, buildClick),
            prerender(0.32, buildHeadshot),
            prerender(0.18, buildBodyHit),
            prerender(0.06, buildWallHit),
            prerender(0.35, buildTargetFall),
        ]);

    _buffers.shot       = shot;
    _buffers.reloadOut  = reloadOut;
    _buffers.reloadIn   = reloadIn;
    _buffers.click      = click;
    _buffers.headshot   = headshot;
    _buffers.bodyHit    = bodyHit;
    _buffers.wallHit    = wallHit;
    _buffers.targetFall = targetFall;
}

// ---------------------------------------------------------------------------
// Sound builders — pure signal-graph constructors for OfflineAudioContext
// ---------------------------------------------------------------------------

function buildShot(ctx) {
    const noise = makeNoise(ctx, 0.25);
    const dur = ctx.length / ctx.sampleRate;

    // Thump (sine sweep)
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(140, 0);
    thump.frequency.exponentialRampToValueAtTime(0.01, 0.15);
    thumpGain.gain.setValueAtTime(1.0, 0);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, 0.15);
    thump.connect(thumpGain); thumpGain.connect(ctx.destination);
    thump.start(0); thump.stop(0.15);

    // Crack (highpass noise)
    const crack = ctx.createBufferSource();
    const crackFilter = ctx.createBiquadFilter();
    const crackGain = ctx.createGain();
    crack.buffer = noise;
    crackFilter.type = 'highpass';
    crackFilter.frequency.value = 1200;
    crackGain.gain.setValueAtTime(0.6, 0);
    crackGain.gain.exponentialRampToValueAtTime(0.001, 0.06);
    crack.connect(crackFilter); crackFilter.connect(crackGain); crackGain.connect(ctx.destination);
    crack.start(0); crack.stop(0.06);

    // Bolt (triangle osc)
    const bolt = ctx.createOscillator();
    const boltGain = ctx.createGain();
    bolt.type = 'triangle';
    bolt.frequency.value = 800;
    boltGain.gain.setValueAtTime(0.2, 0);
    boltGain.gain.exponentialRampToValueAtTime(0.001, 0.04);
    bolt.connect(boltGain); boltGain.connect(ctx.destination);
    bolt.start(0); bolt.stop(0.04);

    // Body resonance (bandpass noise)
    const body = ctx.createBufferSource();
    const bodyFilter = ctx.createBiquadFilter();
    const bodyGain = ctx.createGain();
    body.buffer = noise;
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.value = 400;
    bodyFilter.Q.value = 1;
    bodyGain.gain.setValueAtTime(0.5, 0);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, 0.2);
    body.connect(bodyFilter); bodyFilter.connect(bodyGain); bodyGain.connect(ctx.destination);
    body.start(0); body.stop(0.2);
}

function buildReloadOut(ctx) {
    const noise = makeNoise(ctx, 0.12);
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = noise;
    filter.type = 'highpass';
    filter.frequency.value = 1500;
    gain.gain.setValueAtTime(0.1, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, 0.1);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(0); src.stop(0.1);
}

function buildReloadIn(ctx) {
    const noise = makeNoise(ctx, 0.10);
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = noise;
    filter.type = 'peaking';
    filter.frequency.value = 1200;
    filter.Q.value = 10;
    filter.gain.value = 20;
    gain.gain.setValueAtTime(0.3, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, 0.08);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(0); src.stop(0.08);
}

function buildClick(ctx) {
    const noise = makeNoise(ctx, 0.05);

    const nSrc = ctx.createBufferSource();
    const nFilter = ctx.createBiquadFilter();
    const nGain = ctx.createGain();
    nSrc.buffer = noise;
    nFilter.type = 'highpass';
    nFilter.frequency.value = 2000;
    nGain.gain.setValueAtTime(0.15, 0);
    nGain.gain.exponentialRampToValueAtTime(0.001, 0.03);
    nSrc.connect(nFilter); nFilter.connect(nGain); nGain.connect(ctx.destination);
    nSrc.start(0); nSrc.stop(0.03);

    const tink = ctx.createOscillator();
    const tinkGain = ctx.createGain();
    tink.type = 'triangle';
    tink.frequency.setValueAtTime(1200, 0);
    tink.frequency.exponentialRampToValueAtTime(1000, 0.02);
    tinkGain.gain.setValueAtTime(0.1, 0);
    tinkGain.gain.exponentialRampToValueAtTime(0.001, 0.02);
    tink.connect(tinkGain); tinkGain.connect(ctx.destination);
    tink.start(0); tink.stop(0.02);
}

function buildHeadshot(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2500, 0);
    osc.frequency.exponentialRampToValueAtTime(1500, 0.05);
    gain.gain.setValueAtTime(0.3, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, 0.3);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(0); osc.stop(0.3);
}

function buildBodyHit(ctx) {
    const noise = makeNoise(ctx, 0.18);
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = noise;
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 2;
    gain.gain.setValueAtTime(0.8, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, 0.15);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(0); src.stop(0.15);
}

function buildWallHit(ctx) {
    const noise = makeNoise(ctx, 0.06);
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = noise;
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    gain.gain.setValueAtTime(0.2, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, 0.04);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(0); src.stop(0.04);
}

function buildTargetFall(ctx) {
    const noise = makeNoise(ctx, 0.35);

    // Thud
    const thud = ctx.createBufferSource();
    const thudFilter = ctx.createBiquadFilter();
    const thudGain = ctx.createGain();
    thud.buffer = noise;
    thudFilter.type = 'lowpass';
    thudFilter.frequency.value = 200;
    thudGain.gain.setValueAtTime(0.4, 0);
    thudGain.gain.exponentialRampToValueAtTime(0.001, 0.3);
    thud.connect(thudFilter); thudFilter.connect(thudGain); thudGain.connect(ctx.destination);
    thud.start(0); thud.stop(0.3);

    // Clatter
    const clatter = ctx.createBufferSource();
    const clatterFilter = ctx.createBiquadFilter();
    const clatterGain = ctx.createGain();
    clatter.buffer = noise;
    clatterFilter.type = 'bandpass';
    clatterFilter.frequency.value = 1000;
    clatterGain.gain.setValueAtTime(0.2, 0);
    clatterGain.gain.exponentialRampToValueAtTime(0.001, 0.15);
    clatter.connect(clatterFilter); clatterFilter.connect(clatterGain); clatterGain.connect(ctx.destination);
    clatter.start(0); clatter.stop(0.15);
}

// ---------------------------------------------------------------------------
// Public play functions — each creates only 1 BufferSourceNode at runtime
// ---------------------------------------------------------------------------
export function playShot()       { resumeAudio(); playBuffer(_buffers.shot); }
export function playClick()      { resumeAudio(); playBuffer(_buffers.click); }
export function playHeadshot()   { playBuffer(_buffers.headshot, 1.0); }
export function playBodyHit()    { playBuffer(_buffers.bodyHit, 1.0); }
export function playWallHit()    { playBuffer(_buffers.wallHit, 1.0); }
export function playTargetFall() { playBuffer(_buffers.targetFall, 1.0); }

export function playReload() {
    resumeAudio();
    playBuffer(_buffers.reloadOut);
    // Schedule mag-in snap at 1.9s using AudioContext clock (no setTimeout)
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    if (_buffers.reloadIn) {
        src.buffer = _buffers.reloadIn;
        gain.gain.setValueAtTime(1.0, audioCtx.currentTime);
        src.connect(gain);
        gain.connect(masterGain);
        src.start(audioCtx.currentTime + 1.9);
    }
}
