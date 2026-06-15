import * as Phaser from 'phaser';
import { AssetKeys } from '../assets/keys';

// Looping background music. The SoundManager is game-global, so the track
// started here survives scene changes; we keep a single handle and never
// restart it. Started on the first user gesture (Title) so the browser
// audio context is unlocked.
let bgm: Phaser.Sound.BaseSound | null = null;

export function startMusic(scene: Phaser.Scene): void {
    if (bgm) {
        if (!bgm.isPlaying) bgm.play();
        return;
    }
    bgm = scene.sound.add(AssetKeys.Music, { loop: true, volume: 0.32 });
    bgm.play();
}

export function toggleMute(game: Phaser.Game): boolean {
    game.sound.mute = !game.sound.mute;
    return game.sound.mute;
}

// Level 14 silences the looping BGM and plays a live cello synth instead; these
// pause/resume the single global track without disturbing the SoundManager.
export function pauseMusic(): void {
    if (bgm && bgm.isPlaying) bgm.pause();
}

export function resumeMusic(): void {
    if (bgm && bgm.isPaused) bgm.resume();
}
