import * as Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Preload } from './scenes/Preload';
import { Title } from './scenes/Title';
import { Menu } from './scenes/Menu';
import { Game as GameScene } from './scenes/Game';
import { UI } from './scenes/UI';
import { Pause } from './scenes/Pause';
import { GameOver } from './scenes/GameOver';
import { initFullscreen } from './systems/fullscreen';
import { initTouchControls } from './systems/touch';

declare global {
    interface Window {
        __game__: Phaser.Game;
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.WEBGL,
    width: 960,
    height: 540,
    parent: 'game-container',
    backgroundColor: '#1a1c2c',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            tileBias: 18,
        },
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [Boot, Preload, Title, Menu, GameScene, UI, Pause, GameOver],
};

document.addEventListener('DOMContentLoaded', () => {
    window.__game__ = new Phaser.Game(config);
    const container = document.getElementById('game-container');
    if (container) {
        initFullscreen(container);
        initTouchControls(container);
    }
});
