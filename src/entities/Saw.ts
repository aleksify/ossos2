import * as Phaser from 'phaser';
import { AssetKeys, CharFrames } from '../assets/keys';

export class Saw extends Phaser.Physics.Arcade.Sprite {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, AssetKeys.Characters, CharFrames.Saw);
        scene.add.existing(this);
        scene.physics.add.existing(this, true);
        (this.body as Phaser.Physics.Arcade.StaticBody).setCircle(9, 3, 3);
    }

    preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        this.angle += delta * 0.35;
    }
}
