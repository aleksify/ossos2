import * as Phaser from 'phaser';
import { SceneKeys } from './keys';
import { AnimKeys, AssetKeys, TileFrames } from '../assets/keys';
import { startRun } from '../systems/state';

export class Menu extends Phaser.Scene {
    private demo!: Phaser.Physics.Arcade.Sprite;
    private demoFlipped = false;

    constructor() {
        super(SceneKeys.Menu);
    }

    create(): void {
        this.cameras.main.setBackgroundColor(0xd8f0ee);

        for (let x = 0; x < 960; x += 24) {
            this.add.image(x, 420, AssetKeys.Backgrounds, 8 + ((x / 24) % 4)).setOrigin(0, 1).setScale(2.2).setAlpha(0.8);
        }
        // floor and ceiling strips the demo player bounces between
        for (let x = 0; x < 960; x += 36) {
            this.add.image(x, 458, AssetKeys.Tiles, TileFrames.GrassMid).setOrigin(0, 0).setScale(2);
            this.add.image(x, 36, AssetKeys.Tiles, TileFrames.GrassMid).setOrigin(0, 1).setScale(2).setFlipY(true);
        }

        this.physics.world.setBounds(0, 36, 960, 422);
        this.demo = this.physics.add.sprite(120, 400, AssetKeys.Sosso, 0).setScale(2);
        const body = this.demo.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        body.setGravityY(1200);
        body.setVelocityX(130);
        this.demo.anims.play(AnimKeys.SossoWalk);
        this.time.addEvent({
            delay: 1400,
            loop: true,
            callback: () => this.flipDemo(),
        });

        this.add
            .text(480, 200, 'FLIPSIDE', {
                fontFamily: '"Courier New", monospace',
                fontStyle: 'bold',
                fontSize: 96,
                color: '#ffffff',
                stroke: '#1a1c2c',
                strokeThickness: 10,
            })
            .setOrigin(0.5)
            .setShadow(0, 6, '#1a1c2c55', 0, true, true);

        this.add
            .text(480, 268, 'a Sosso story', {
                fontFamily: '"Courier New", monospace',
                fontSize: 22,
                color: '#3b4456',
            })
            .setOrigin(0.5);

        const prompt = this.add
            .text(480, 330, 'PRESS SPACE TO START', {
                fontFamily: '"Courier New", monospace',
                fontStyle: 'bold',
                fontSize: 26,
                color: '#1a1c2c',
            })
            .setOrigin(0.5);
        this.tweens.add({ targets: prompt, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });

        this.input.keyboard!.once('keydown-SPACE', () => {
            startRun(this.registry);
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.scene.start(SceneKeys.Game, { level: 0 });
            });
        });
    }

    private flipDemo(): void {
        this.demoFlipped = !this.demoFlipped;
        const body = this.demo.body as Phaser.Physics.Arcade.Body;
        body.setGravityY(this.demoFlipped ? -1200 : 1200);
        this.demo.setFlipY(this.demoFlipped);
        if (this.demo.x > 800) {
            this.demo.x = 120;
        }
    }
}
