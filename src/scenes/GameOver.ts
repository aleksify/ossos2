import { Scene } from 'phaser';
import { SceneKeys } from './keys';

export class GameOver extends Scene {
    constructor() { super(SceneKeys.GAME_OVER); }

    create(): void {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor(0x000000);
        this.add.text(width / 2, height / 2 - 30, 'GAME OVER', {
            fontFamily: 'monospace', fontSize: '48px', color: '#ff3333',
            stroke: '#000', strokeThickness: 5,
        }).setOrigin(0.5);
        this.add.text(width / 2, height / 2 + 40, 'Press R or tap to restart', {
            fontFamily: 'monospace', fontSize: '16px', color: '#ffffff',
            stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5);

        const restart = () => this.scene.start(SceneKeys.GAME);
        this.input.keyboard!.once('keydown-R', restart);
        this.input.once('pointerdown', restart);
    }
}
