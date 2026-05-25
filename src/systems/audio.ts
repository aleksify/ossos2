let actx: AudioContext | null = null;
const sfxBuffers: Record<string, AudioBuffer | undefined> = {};
let bgmGain: GainNode | null = null;
let bgmSource: AudioBufferSourceNode | null = null;
let bgmMuted = false;
let bgmShouldPlay = false;

export function ensureAudio(): void {
    if (!actx) {
        actx = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
        bgmGain = actx.createGain();
        bgmGain.connect(actx.destination);
        void loadBuffer('coin');
        void loadBuffer('hurt');
        void loadBuffer('death');
        void loadBuffer('heal');
        void loadBuffer('jump');
        void loadBuffer('hit');
        void loadBGM();
    }
    if (actx.state === 'suspended') void actx.resume();
}

async function loadBuffer(name: string): Promise<void> {
    if (!actx) return;
    try {
        const res = await fetch(`assets/audio/${name}.mp3`);
        sfxBuffers[name] = await actx.decodeAudioData(await res.arrayBuffer());
    } catch (_) {}
}

async function loadBGM(): Promise<void> {
    if (!actx) return;
    try {
        const res = await fetch('assets/audio/music.mp3');
        sfxBuffers['music'] = await actx.decodeAudioData(await res.arrayBuffer());
        if (bgmShouldPlay) playBGM();
    } catch (_) {}
}

function playBGM(): void {
    if (!actx || !sfxBuffers['music'] || !bgmGain || bgmSource) return;
    bgmSource = actx.createBufferSource();
    bgmSource.buffer = sfxBuffers['music'];
    bgmSource.loop = true;
    bgmSource.connect(bgmGain);
    bgmSource.start();
    bgmSource.onended = () => { bgmSource = null; };
}

function playBuffer(name: string, vol = 1.0): void {
    if (!actx || !sfxBuffers[name]) return;
    const src = actx.createBufferSource();
    const gain = actx.createGain();
    src.buffer = sfxBuffers[name]!;
    gain.gain.value = vol;
    src.connect(gain).connect(actx.destination);
    src.start();
}

export const sfx = {
    jump:       (): void => playBuffer('jump', 0.8),
    land:       (): void => { /* no asset yet */ },
    coin:       (): void => playBuffer('coin', 0.8),
    heal:       (): void => playBuffer('heal', 0.8),
    hurt:       (): void => playBuffer('hurt', 0.9),
    death:      (): void => playBuffer('death', 1.0),
    win:        (): void => { /* no asset yet */ },
    stomp:      (): void => playBuffer('hit', 0.9),
    checkpoint: (): void => { /* no asset yet */ },
};

export function startBGM(): void {
    bgmShouldPlay = true;
    if (sfxBuffers['music']) playBGM();
}

export function toggleMute(): void {
    bgmMuted = !bgmMuted;
    if (bgmGain) bgmGain.gain.value = bgmMuted ? 0 : 1;
}
