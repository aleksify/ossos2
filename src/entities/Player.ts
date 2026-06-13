import * as Phaser from 'phaser';
import { AnimKeys, AssetKeys, SossoFrames } from '../assets/keys';

const GRAVITY = 1500;
export const MAX_RUN = 170;
const ACCEL = 1400;
const DRAG = 1600;
export const MAX_FALL = 460;
const JUMP_VELOCITY = 390;
const THROW_COOLDOWN_MS = 350;
const THROW_POSE_MS = 220;
// flip/jump allowed shortly after leaving a surface, VVVVVV-style
const COYOTE_MS = 100;

export const PlayerEvents = {
    Flip: 'flip',
    Land: 'land',
    Jump: 'jump',
    Throw: 'throw',
} as const;

export class Player extends Phaser.Physics.Arcade.Sprite {
    gravityDir: 1 | -1 = 1;
    canJump = false;
    canFlip = false;
    private coyoteUntil = 0;
    private wasGrounded = false;
    private throwReadyAt = 0;
    private throwPoseUntil = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, AssetKeys.Sosso, SossoFrames.Idle);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(14, 19);
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

    setGravityDir(dir: 1 | -1): void {
        this.gravityDir = dir;
        (this.body as Phaser.Physics.Arcade.Body).setGravityY(GRAVITY * dir);
        this.setFlipY(dir === -1);
    }

    /** SPACE/W/up — flips gravity once unlocked, jumps before that. */
    tryAscend(now: number): void {
        if (now > this.coyoteUntil) return;
        if (this.canFlip) {
            this.setGravityDir(this.gravityDir === 1 ? -1 : 1);
            this.coyoteUntil = 0;
            this.emit(PlayerEvents.Flip, this.gravityDir);
        } else if (this.canJump) {
            (this.body as Phaser.Physics.Arcade.Body).setVelocityY(-JUMP_VELOCITY * this.gravityDir);
            this.coyoteUntil = 0;
            this.emit(PlayerEvents.Jump);
        }
    }

    /** Variable jump height: releasing the key early cuts the rise short. */
    cutJump(): void {
        if (!this.canJump || this.canFlip) return;
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body.velocity.y * this.gravityDir < 0) body.setVelocityY(body.velocity.y * 0.45);
    }

    tryThrow(now: number): boolean {
        if (now < this.throwReadyAt) return false;
        this.throwReadyAt = now + THROW_COOLDOWN_MS;
        this.throwPoseUntil = now + THROW_POSE_MS;
        this.emit(PlayerEvents.Throw, this.flipX ? -1 : 1);
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

        if (now < this.throwPoseUntil) {
            this.anims.stop();
            this.setFrame(SossoFrames.Throw);
        } else if (!grounded) {
            this.anims.stop();
            this.setFrame(SossoFrames.Jump);
        } else if (Math.abs(body.velocity.x) > 20) {
            this.anims.play(AnimKeys.SossoWalk, true);
        } else {
            this.anims.stop();
            this.setFrame(SossoFrames.Idle);
        }
    }

    get feetY(): number {
        const body = this.body as Phaser.Physics.Arcade.Body;
        return this.gravityDir === 1 ? body.bottom : body.top;
    }
}
