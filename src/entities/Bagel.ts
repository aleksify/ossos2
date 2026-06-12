import * as Phaser from 'phaser';
import { AssetKeys, ItemFrames } from '../assets/keys';

const SPEED = 300;
const RANGE = 126;

export class Bagel extends Phaser.Physics.Arcade.Sprite {
    private readonly startX: number;

    constructor(scene: Phaser.Scene, x: number, y: number, dir: -1 | 1) {
        super(scene, x, y, AssetKeys.Items, ItemFrames.Bagel);
        this.startX = x;
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setCircle(5, 3, 3);
        body.setVelocityX(SPEED * dir);

        const trail = scene.add.particles(0, 0, AssetKeys.Pixel, {
            follow: this,
            frequency: 30,
            lifespan: 260,
            speed: { min: 0, max: 16 },
            scale: { start: 0.9, end: 0 },
            alpha: { start: 0.9, end: 0 },
            tint: [0xd9b285, 0xf3e3c0],
        });
        this.once(Phaser.GameObjects.Events.DESTROY, () => trail.destroy());
    }

    preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        this.angle += delta * 0.9;
        if (Math.abs(this.x - this.startX) > RANGE) this.destroy();
    }
}
