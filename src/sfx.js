import { settings } from './state.js';

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const masterGain = audioCtx.createGain();
masterGain.gain.setValueAtTime(settings.volume, audioCtx.currentTime);
masterGain.connect(audioCtx.destination);

export function updateVolume() {
    masterGain.gain.setTargetAtTime(settings.volume, audioCtx.currentTime, 0.05);
}

function createNoiseBuffer() {
    const bufferSize = audioCtx.sampleRate * 1.0;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    return buffer;
}

const noiseBuffer = createNoiseBuffer();

export function playShot() {
    resumeAudio();
    
    // 1. Heavy Low-End Thump (The explosion)
    const thump = audioCtx.createOscillator();
    const thumpGain = audioCtx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(140, audioCtx.currentTime);
    thump.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    thumpGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
    thumpGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    thump.connect(thumpGain);
    thumpGain.connect(masterGain);
    thump.start();
    thump.stop(audioCtx.currentTime + 0.15);

    // 2. Aggressive High-End Crack (The primer/initial blast)
    const crack = audioCtx.createBufferSource();
    const crackFilter = audioCtx.createBiquadFilter();
    const crackGain = audioCtx.createGain();
    crack.buffer = noiseBuffer;
    crackFilter.type = 'highpass';
    crackFilter.frequency.setValueAtTime(1200, audioCtx.currentTime);
    crackGain.gain.setValueAtTime(0.6, audioCtx.currentTime);
    crackGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.06);
    crack.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(masterGain);
    crack.start();
    crack.stop(audioCtx.currentTime + 0.06);

    // 3. Metallic Mechanical Pluck (The bolt/receiver)
    const bolt = audioCtx.createOscillator();
    const boltGain = audioCtx.createGain();
    bolt.type = 'triangle';
    bolt.frequency.setValueAtTime(800, audioCtx.currentTime);
    boltGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    boltGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
    bolt.connect(boltGain);
    boltGain.connect(masterGain);
    bolt.start();
    bolt.stop(audioCtx.currentTime + 0.04);

    // 4. Mid-range Body (The resonance of the gun)
    const body = audioCtx.createBufferSource();
    const bodyFilter = audioCtx.createBiquadFilter();
    const bodyGain = audioCtx.createGain();
    body.buffer = noiseBuffer;
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.setValueAtTime(400, audioCtx.currentTime);
    bodyFilter.Q.setValueAtTime(1, audioCtx.currentTime);
    bodyGain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    bodyGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    body.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(masterGain);
    body.start();
    body.stop(audioCtx.currentTime + 0.2);
}

export function playReload() {
    resumeAudio();
    
    // 1. Mag Out (Metallic scrape/release)
    const outNoise = audioCtx.createBufferSource();
    const outFilter = audioCtx.createBiquadFilter();
    const outGain = audioCtx.createGain();
    outNoise.buffer = noiseBuffer;
    outFilter.type = 'highpass';
    outFilter.frequency.setValueAtTime(1500, audioCtx.currentTime);
    outGain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    outGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    outNoise.connect(outFilter);
    outFilter.connect(outGain);
    outGain.connect(masterGain);
    outNoise.start();
    outNoise.stop(audioCtx.currentTime + 0.1);

    // 2. Mag In (Heavy metallic snap/lock)
    // Delay increased to match the 2.0s reload timer
    setTimeout(() => {
        const inNoise = audioCtx.createBufferSource();
        const inFilter = audioCtx.createBiquadFilter();
        const inGain = audioCtx.createGain();
        inNoise.buffer = noiseBuffer;
        
        // Peaking filter gives that metallic "ring" without being a beep
        inFilter.type = 'peaking';
        inFilter.frequency.setValueAtTime(1200, audioCtx.currentTime);
        inFilter.Q.setValueAtTime(10, audioCtx.currentTime);
        inFilter.gain.setValueAtTime(20, audioCtx.currentTime);
        
        inGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        inGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        
        inNoise.connect(inFilter);
        inFilter.connect(inGain);
        inGain.connect(masterGain);
        
        inNoise.start();
        inNoise.stop(audioCtx.currentTime + 0.08);
    }, 1900);
}

export function playClick() {
    resumeAudio();
    
    // 1. Sharp Noise Crack (The hammer impact)
    const noise = audioCtx.createBufferSource();
    const noiseFilter = audioCtx.createBiquadFilter();
    const noiseGain = audioCtx.createGain();
    noise.buffer = noiseBuffer;
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(2000, audioCtx.currentTime);
    noiseGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start();
    noise.stop(audioCtx.currentTime + 0.03);

    // 2. Metallic "Tink" (The metal-on-metal sound)
    const tink = audioCtx.createOscillator();
    const tinkGain = audioCtx.createGain();
    tink.type = 'triangle';
    tink.frequency.setValueAtTime(1200, audioCtx.currentTime);
    tink.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.02);
    tinkGain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    tinkGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02);
    tink.connect(tinkGain);
    tinkGain.connect(masterGain);
    tink.start();
    tink.stop(audioCtx.currentTime + 0.02);
}

export function playHeadshot() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2500, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1500, audioCtx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

export function playBodyHit() {
    const noise = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    noise.buffer = noiseBuffer;
    
    // Bandpass for a "woody" resonance
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, audioCtx.currentTime);
    filter.Q.setValueAtTime(2, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(0.8, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start();
    noise.stop(audioCtx.currentTime + 0.15);
}

export function playWallHit() {
    const noise = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    noise.buffer = noiseBuffer;
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start();
    noise.stop(audioCtx.currentTime + 0.04);
}

export function resumeAudio() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}
