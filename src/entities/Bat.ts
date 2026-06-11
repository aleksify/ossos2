import * as Phaser from 'phaser';
import { AnimKeys, AssetKeys, CharFrames } from '../assets/keys';

const AMPLITUDE = 30;
const PERIOD_MS = 1900;

export class Bat extends Phaser.Physics.Arcade.Sprite {
    private readonly phaseOffset: number;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, AssetKeys.Characters, CharFrames.BatA);
        // desync bats so pairs don't bob in lockstep
        this.phaseOffset = (x * 13) % PERIOD_MS;
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.setSize(16, 12);
        body.setOffset(4, 6);
        this.anims.play(AnimKeys.BatFly);
    }

    preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        const t = ((time + this.phaseOffset) % PERIOD_MS) / PERIOD_MS;
        (this.body as Phaser.Physics.Arcade.Body).setVelocityY(
            Math.cos(t * Math.PI * 2) * AMPLITUDE * ((Math.PI * 2 * 1000) / PERIOD_MS),
        );
    }
}
