import { Game as PhaserGame, Scale, AUTO } from 'phaser';
import { Boot } from './scenes/Boot';
import { Preload } from './scenes/Preload';
import { Title } from './scenes/Title';
import { Game } from './scenes/Game';
import { Pause } from './scenes/Pause';
import { GameOver } from './scenes/GameOver';
import { initTouchControls } from './systems/touchControls';
import { initFullscreen } from './systems/fullscreen';
import { WIDTH, HEIGHT } from './constants';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: WIDTH,
    height: HEIGHT,
    parent: 'game-container',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    backgroundColor: '#f5dfb4',
    physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 900 }, debug: false },
    },
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
    },
    scene: [Boot, Preload, Title, Game, Pause, GameOver],
};

document.addEventListener('DOMContentLoaded', () => {
    const game = new PhaserGame(config);

    const container = document.getElementById('game-container')!;
    initTouchControls(container);
    initFullscreen(container);

    if (import.meta.env.DEV) {
        (window as unknown as { __game__: PhaserGame }).__game__ = game;
    }
});
