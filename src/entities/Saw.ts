import * as Phaser from 'phaser';
import { AssetKeys, CharFrames } from '../assets/keys';

export class Saw extends Phaser.Physics.Arcade.Sprite {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, AssetKeys.Characters, CharFrames.Saw);
        scene.add.existing(this);
        scene.physics.add.existing(this, true);
        (this.body as Phaser.Physics.Arcade.StaticBody).setCircle(9, 3, 3);

        const sparks = scene.add.particles(x, y, AssetKeys.Pixel, {
            frequency: 700,
            quantity: 2,
            speed: { min: 30, max: 70 },
            angle: { min: 40, max: 140 },
            gravityY: 300,
            lifespan: { min: 250, max: 500 },
            scale: { start: 0.8, end: 0 },
            tint: [0xffd166, 0xff9f43],
        });
        this.once(Phaser.GameObjects.Events.DESTROY, () => sparks.destroy());
    }

    preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        this.angle += delta * 0.35;
    }
}
