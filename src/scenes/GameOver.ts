import * as Phaser from 'phaser';
import { SceneKeys } from './keys';
import { AssetKeys, TileFrames } from '../assets/keys';
import { RegKeys, elapsedSeconds, formatTime } from '../systems/state';

export class GameOver extends Phaser.Scene {
    constructor() {
        super(SceneKeys.GameOver);
    }

    create(): void {
        this.cameras.main.setBackgroundColor(0x1a1c2c);

        const gems = this.registry.get(RegKeys.Gems) as number;
        const total = this.registry.get(RegKeys.GemsTotal) as number;
        const deaths = this.registry.get(RegKeys.Deaths) as number;
        const time = formatTime(elapsedSeconds(this.registry));

        // gravity falls both ways here too
        this.add.particles(0, 0, AssetKeys.Pixel, {
            x: { min: 0, max: 960 },
            y: -10,
            speedY: { min: 40, max: 110 },
            lifespan: 9000,
            scale: { min: 0.8, max: 1.6 },
            tint: [0x7df0ff, 0xffd166, 0xff5a5a, 0x9bf6a3],
            frequency: 120,
        });
        this.add.particles(0, 0, AssetKeys.Pixel, {
            x: { min: 0, max: 960 },
            y: 550,
            speedY: { min: -110, max: -40 },
            lifespan: 9000,
            scale: { min: 0.8, max: 1.6 },
            tint: [0x7df0ff, 0xffd166, 0xff5a5a, 0x9bf6a3],
            frequency: 120,
        });

        this.add
            .text(480, 170, 'YOU FLIPPED IT!', {
                fontFamily: '"Courier New", monospace',
                fontStyle: 'bold',
                fontSize: 64,
                color: '#ffffff',
                stroke: '#7df0ff',
                strokeThickness: 8,
            })
            .setOrigin(0.5);

        this.add.image(380, 280, AssetKeys.Tiles, TileFrames.Gem).setScale(2);
        this.add.image(380, 330, AssetKeys.Tiles, TileFrames.Heart).setScale(2);
        const statStyle = {
            fontFamily: '"Courier New", monospace',
            fontSize: 26,
            color: '#d7e4ef',
        };
        this.add.text(410, 266, `${gems} / ${total} gems`, statStyle);
        this.add.text(410, 316, `${deaths} deaths`, statStyle);
        this.add.text(366, 366, `time  ${time}`, statStyle);

        const prompt = this.add
            .text(480, 470, 'PRESS SPACE FOR MENU', {
                fontFamily: '"Courier New", monospace',
                fontStyle: 'bold',
                fontSize: 24,
                color: '#7df0ff',
            })
            .setOrigin(0.5);
        this.tweens.add({ targets: prompt, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });

        this.input.keyboard!.once('keydown-SPACE', () => {
            this.scene.start(SceneKeys.Menu);
        });
    }
}
