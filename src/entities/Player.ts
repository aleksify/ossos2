import * as Phaser from 'phaser';
import { AnimKeys, AssetKeys, CharFrames } from '../assets/keys';

const GRAVITY = 1500;
const MAX_RUN = 170;
const ACCEL = 1400;
const DRAG = 1600;
const MAX_FALL = 460;
// flip is allowed shortly after leaving a surface, VVVVVV-style
const COYOTE_MS = 100;

export const PlayerEvents = {
    Flip: 'flip',
    Land: 'land',
} as const;

export class Player extends Phaser.Physics.Arcade.Sprite {
    gravityDir: 1 | -1 = 1;
    private coyoteUntil = 0;
    private wasGrounded = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, AssetKeys.Characters, CharFrames.PlayerIdle);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(14, 18);
        body.setOffset(5, 3);
        body.setMaxVelocity(MAX_RUN, MAX_FALL);
        body.setDragX(DRAG);
        body.setGravityY(GRAVITY);
        body.setCollideWorldBounds(true);
    }

    get grounded(): boolean {
        const body = this.body as Phaser.Physics.Arcade.Body;
        return this.gravityDir === 1 ? body.blocked.down : body.blocked.up;
    }

    /** Returns true when the flip actually happened. */
    tryFlip(now: number): boolean {
        if (now > this.coyoteUntil) return false;
        this.gravityDir = this.gravityDir === 1 ? -1 : 1;
        (this.body as Phaser.Physics.Arcade.Body).setGravityY(GRAVITY * this.gravityDir);
        this.setFlipY(this.gravityDir === -1);
        this.coyoteUntil = 0;
        this.emit(PlayerEvents.Flip, this.gravityDir);
        return true;
    }

    move(direction: -1 | 0 | 1, now: number): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setAccelerationX(direction * ACCEL);
        if (direction !== 0) this.setFlipX(direction === -1);

        const grounded = this.grounded;
        if (grounded) this.coyoteUntil = now + COYOTE_MS;
        if (grounded && !this.wasGrounded) this.emit(PlayerEvents.Land);
        this.wasGrounded = grounded;

        if (!grounded) {
            this.setFrame(CharFrames.PlayerWalk);
            this.anims.stop();
        } else if (Math.abs(body.velocity.x) > 20) {
            this.anims.play(AnimKeys.PlayerWalk, true);
        } else {
            this.anims.stop();
            this.setFrame(CharFrames.PlayerIdle);
        }
    }

    get feetY(): number {
        const body = this.body as Phaser.Physics.Arcade.Body;
        return this.gravityDir === 1 ? body.bottom : body.top;
    }
}
