import { Scene } from 'phaser';
import { SceneKeys } from './keys';

export class Pause extends Scene {
    constructor() { super(SceneKeys.PAUSE); }

    create(): void {
        const { width, height } = this.scale;

        this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0, 0);
        this.add.text(width / 2, height / 2 - 20, 'PAUSED', {
            fontFamily: 'monospace', fontSize: '40px', color: '#ffffff',
            stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5);
        this.add.text(width / 2, height / 2 + 30, 'P / Esc to resume', {
            fontFamily: 'monospace', fontSize: '14px', color: '#aaaaaa',
        }).setOrigin(0.5);

        const resume = () => {
            this.scene.resume(SceneKeys.GAME);
            this.scene.stop();
        };

        this.input.keyboard!.once('keydown-P', resume);
        this.input.keyboard!.once('keydown-ESC', resume);
        this.input.once('pointerdown', resume);
    }
}
