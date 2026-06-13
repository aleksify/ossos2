import * as Phaser from 'phaser';
import { SceneKeys } from './keys';
import { AnimKeys, AssetKeys } from '../assets/keys';
import { startMusic } from '../systems/audio';

const FONT = '"Courier New", monospace';

// "World of Sosso" splash — spinning Sosso + press-any-key, ported from the
// legacy build. First gesture starts the music and drops into the menu.
export class Title extends Phaser.Scene {
    constructor() {
        super(SceneKeys.Title);
    }

    create(): void {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor(0x1a1c2c);

        const hero = this.add.sprite(width / 2, height / 2 - 24, AssetKeys.SossoSpin, 0).setScale(2.4);
        hero.play(AnimKeys.SossoSpin);

        this.add
            .text(width / 2, height - 156, 'WORLD OF SOSSO', {
                fontFamily: FONT,
                fontStyle: 'bold',
                fontSize: 46,
                color: '#ffffff',
                stroke: '#1a1c2c',
                strokeThickness: 8,
            })
            .setOrigin(0.5)
            .setShadow(0, 5, '#00000066', 0, true, true);

        const prompt = this.add
            .text(width / 2, height - 100, 'press any key or tap to play', {
                fontFamily: FONT,
                fontSize: 18,
                color: '#aeb8cc',
            })
            .setOrigin(0.5);
        this.tweens.add({ targets: prompt, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

        const start = (): void => {
            startMusic(this);
            this.scene.start(SceneKeys.Menu);
        };
        this.input.once('pointerdown', start);
        this.input.keyboard!.once('keydown', start);
    }
}
