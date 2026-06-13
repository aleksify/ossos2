import * as Phaser from 'phaser';
import { SceneKeys } from './keys';

const FONT = '"Courier New", monospace';

// Overlay launched on top of a paused Game. While paused the Game scene's input
// is disabled (see Game.pauseGame) so this scene owns the keys.
export class Pause extends Phaser.Scene {
    constructor() {
        super(SceneKeys.Pause);
    }

    create(): void {
        const { width, height } = this.scale;
        this.add.rectangle(0, 0, width, height, 0x0a0b12, 0.6).setOrigin(0, 0);
        this.add
            .text(width / 2, height / 2 - 22, 'PAUSED', {
                fontFamily: FONT,
                fontStyle: 'bold',
                fontSize: 56,
                color: '#ffffff',
            })
            .setOrigin(0.5);
        this.add
            .text(width / 2, height / 2 + 34, 'P to resume   ·   ESC for menu', {
                fontFamily: FONT,
                fontSize: 18,
                color: '#aeb8cc',
            })
            .setOrigin(0.5);

        const game = this.scene.get(SceneKeys.Game);
        const resume = (): void => {
            game.input.enabled = true;
            this.scene.resume(SceneKeys.Game);
            this.scene.stop();
        };
        this.input.keyboard!.once('keydown-P', resume);
        this.input.keyboard!.once('keydown-ESC', () => {
            game.input.enabled = true;
            this.scene.stop(SceneKeys.UI);
            this.scene.stop(SceneKeys.Game);
            this.scene.stop();
            this.scene.start(SceneKeys.Menu);
        });
    }
}
