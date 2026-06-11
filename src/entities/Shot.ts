import * as Phaser from 'phaser';
import { AssetKeys } from '../assets/keys';

/** Lobbed enemy projectile (Karen's coffee, Lindy's rolling pins). */
export class Shot extends Phaser.Physics.Arcade.Sprite {
    constructor(scene: Phaser.Scene, x: number, y: number, frame: number, vx: number, vy: number) {
        super(scene, x, y, AssetKeys.Items, frame);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setCircle(5, 3, 3);
        body.setGravityY(700);
        body.setVelocity(vx, vy);
    }

    preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        this.angle += delta * 0.5;
        if (this.y > this.scene.physics.world.bounds.bottom + 60 || this.y < -60) this.destroy();
    }
}
