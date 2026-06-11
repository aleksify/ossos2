import * as Phaser from 'phaser';
import { AssetKeys, NpcFrames } from '../assets/keys';

const THROW_INTERVAL_MS = 2300;
const POSE_MS = 350;
const AGGRO_RANGE = 190;

export const KarenEvents = {
    Shoot: 'shoot',
} as const;

/** Stationary complainer. Lobs coffee at Sosso when she's in range. */
export class Karen extends Phaser.Physics.Arcade.Sprite {
    private readonly target: Phaser.GameObjects.Sprite;
    private nextThrowAt = 0;

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

        if (Math.abs(dx) < AGGRO_RANGE && time > this.nextThrowAt) {
            this.nextThrowAt = time + THROW_INTERVAL_MS;
            this.setFrame(NpcFrames.Karen2);
            this.scene.time.delayedCall(POSE_MS, () => {
                if (this.active) this.setFrame(NpcFrames.Karen1);
            });
            this.emit(KarenEvents.Shoot, this.x, this.y - 8, Math.sign(dx) || 1);
        }
    }
}
