import * as Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Preload } from './scenes/Preload';
import { Menu } from './scenes/Menu';
import { Game as GameScene } from './scenes/Game';
import { UI } from './scenes/UI';
import { GameOver } from './scenes/GameOver';

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
    scene: [Boot, Preload, Menu, GameScene, UI, GameOver],
};

document.addEventListener('DOMContentLoaded', () => {
    window.__game__ = new Phaser.Game(config);
});
