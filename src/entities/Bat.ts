import * as Phaser from 'phaser';
import { AnimKeys, AssetKeys, CharFrames } from '../assets/keys';

const AMPLITUDE = 30;
const PERIOD_MS = 1900;
const SWOOP_RANGE = 64;
const SWOOP_COOLDOWN_MS = 2600;
const SWOOP_MS = 450;

export class Bat extends Phaser.Physics.Arcade.Sprite {
    private readonly phaseOffset: number;
    private readonly target?: Phaser.GameObjects.Sprite;
    private readonly baseY: number;
    private swoopUntil = 0;
    private swoopReadyAt = 0;
    private swoopVy = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, target?: Phaser.GameObjects.Sprite) {
        super(scene, x, y, AssetKeys.Characters, CharFrames.BatA);
        // desync bats so pairs don't bob in lockstep
        this.phaseOffset = (x * 13) % PERIOD_MS;
        this.target = target;
        this.baseY = y;
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
        const body = this.body as Phaser.Physics.Arcade.Body;

        if (time < this.swoopUntil) {
            body.setVelocityY(this.swoopVy);
            this.angle = Math.sign(this.swoopVy) * 12;
            return;
        }
        this.angle = 0;
        this.anims.timeScale = 1;

        if (
            this.target?.active &&
            time > this.swoopReadyAt &&
            Math.abs(this.target.x - this.x) < SWOOP_RANGE &&
            Math.abs(this.target.y - this.y) > 24
        ) {
            // wings beat faster, then it lunges toward Sosso's altitude
            this.swoopReadyAt = time + SWOOP_COOLDOWN_MS;
            this.swoopUntil = time + SWOOP_MS;
            this.swoopVy = Math.sign(this.target.y - this.y) * 160;
            this.anims.timeScale = 2.5;
            return;
        }

        // drift back toward the patrol line, then bob
        const drift = Phaser.Math.Clamp(this.baseY - this.y, -60, 60) * 2.2;
        const t = ((time + this.phaseOffset) % PERIOD_MS) / PERIOD_MS;
        const bob = Math.cos(t * Math.PI * 2) * AMPLITUDE * ((Math.PI * 2 * 1000) / PERIOD_MS);
        body.setVelocityY(Math.abs(drift) > 14 ? drift : bob);
    }
}
