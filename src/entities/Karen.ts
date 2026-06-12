import * as Phaser from 'phaser';
import { AssetKeys, NpcFrames } from '../assets/keys';

const THROW_INTERVAL_MS = 2300;
const AIM_MS = 380;
const AGGRO_RANGE = 190;

export const KarenEvents = {
    Shoot: 'shoot',
} as const;

/** Stationary complainer. Winds up (you can see it coming), then lobs coffee. */
export class Karen extends Phaser.Physics.Arcade.Sprite {
    private readonly target: Phaser.GameObjects.Sprite;
    private nextThrowAt = 0;
    private aimingUntil = 0;
    private nextFidgetAt = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, target: Phaser.GameObjects.Sprite) {
        super(scene, x, y, AssetKeys.Npcs, NpcFrames.Karen1);
        this.target = target;
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(16, 18);
        body.setOffset(4, 4);
        body.setGravityY(900);
    }

    preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        if (!this.target.active) return;
        const dx = this.target.x - this.x;
        this.setFlipX(dx < 0);

        if (this.aimingUntil > 0) {
            // winding up: arm raised, vibrating with indignation
            this.x += Math.sin(time / 18) * 0.6;
            if (time > this.aimingUntil) {
                this.aimingUntil = 0;
                this.setFrame(NpcFrames.Karen1);
                this.emit(KarenEvents.Shoot, this.x, this.y - 8, Math.sign(dx) || 1);
            }
            return;
        }

        if (Math.abs(dx) < AGGRO_RANGE && time > this.nextThrowAt) {
            this.nextThrowAt = time + THROW_INTERVAL_MS;
            this.aimingUntil = time + AIM_MS;
            this.setFrame(NpcFrames.Karen2);
        } else if (Math.abs(dx) >= AGGRO_RANGE && time > this.nextFidgetAt) {
            // impatient little hop while nobody serves her
            this.nextFidgetAt = time + Phaser.Math.Between(1600, 2800);
            const body = this.body as Phaser.Physics.Arcade.Body;
            if (body.blocked.down) body.setVelocityY(-70);
        }
    }
}
