import * as Phaser from 'phaser';
import { SceneKeys } from './keys';
import { AnimKeys, AssetKeys, TileFrames } from '../assets/keys';
import { startRun } from '../systems/state';
import { LEVELS } from '../systems/levels';

const FONT = '"Courier New", monospace';

export class Menu extends Phaser.Scene {
    private demo!: Phaser.Physics.Arcade.Sprite;
    private demoFlipped = false;
    private starting = false;

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
            .text(480, 322, 'PRESS SPACE TO START', {
                fontFamily: FONT,
                fontStyle: 'bold',
                fontSize: 26,
                color: '#1a1c2c',
            })
            .setOrigin(0.5);
        this.tweens.add({ targets: prompt, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });

        this.buildLevelSelect();

        this.input.keyboard!.once('keydown-SPACE', () => this.launch(0));
    }

    // playtest convenience: jump straight to any level
    private buildLevelSelect(): void {
        this.add
            .text(480, 356, 'or pick a level', { fontFamily: FONT, fontSize: 14, color: '#3b4456' })
            .setOrigin(0.5)
            .setDepth(10);

        const cols = 7;
        const cellW = 130;
        const cellH = 42;
        const gap = 6;
        const x0 = 480 - ((cols - 1) * cellW) / 2;
        const y0 = 392;
        LEVELS.forEach((spec, i) => {
            const cx = x0 + (i % cols) * cellW;
            const cy = y0 + Math.floor(i / cols) * (cellH + gap);
            const box = this.add
                .rectangle(cx, cy, cellW - gap, cellH, 0x1a1c2c, 0.8)
                .setStrokeStyle(2, 0x3b4456)
                .setDepth(10)
                .setInteractive({ useHandCursor: true });
            const num = this.add
                .text(cx, cy - 8, `${i + 1}`, { fontFamily: FONT, fontStyle: 'bold', fontSize: 18, color: '#ffffff' })
                .setOrigin(0.5)
                .setDepth(11);
            this.add
                .text(cx, cy + 11, spec.name, { fontFamily: FONT, fontSize: 9, color: '#aeb8cc' })
                .setOrigin(0.5)
                .setDepth(11);
            box.on('pointerover', () => {
                box.setFillStyle(0x2b4a6a, 0.95);
                num.setColor('#7df0ff');
            });
            box.on('pointerout', () => {
                box.setFillStyle(0x1a1c2c, 0.8);
                num.setColor('#ffffff');
            });
            box.on('pointerdown', () => this.launch(i));
        });
    }

    private launch(level: number): void {
        if (this.starting) return;
        this.starting = true;
        startRun(this.registry);
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start(SceneKeys.Game, { level });
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
