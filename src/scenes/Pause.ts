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
            .text(width / 2, height / 2 - 70, 'PAUSED', {
                fontFamily: FONT,
                fontStyle: 'bold',
                fontSize: 56,
                color: '#ffffff',
            })
            .setOrigin(0.5);

        const game = this.scene.get(SceneKeys.Game);
        const resume = (): void => {
            game.input.enabled = true;
            this.scene.resume(SceneKeys.Game);
            this.scene.stop();
        };
        const toMenu = (): void => {
            game.input.enabled = true;
            this.scene.stop(SceneKeys.UI);
            this.scene.stop(SceneKeys.Game);
            this.scene.stop();
            this.scene.start(SceneKeys.Menu);
        };

        this.makeButton(width / 2, height / 2 + 6, 'Resume', resume);
        this.makeButton(width / 2, height / 2 + 56, 'Main menu', toMenu);

        this.add
            .text(width / 2, height / 2 + 110, 'P or ESC to resume', {
                fontFamily: FONT,
                fontSize: 16,
                color: '#8b95a8',
            })
            .setOrigin(0.5);

        this.input.keyboard!.once('keydown-P', resume);
        this.input.keyboard!.once('keydown-ESC', resume);
    }

    private makeButton(x: number, y: number, label: string, onClick: () => void): void {
        const text = this.add
            .text(x, y, label, {
                fontFamily: FONT,
                fontSize: 26,
                color: '#aeb8cc',
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        text.on('pointerover', () => text.setColor('#ffffff'));
        text.on('pointerout', () => text.setColor('#aeb8cc'));
        text.on('pointerup', onClick);
    }
}
