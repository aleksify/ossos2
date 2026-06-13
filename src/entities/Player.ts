import * as Phaser from 'phaser';
import { AnimKeys, AssetKeys } from '../assets/keys';

// hand-drawn Sosso is a 92px frame; scale it down and pin a 14×19 world body
// (28×38 source × 0.5 scale) over her lower torso→feet. SCALE/body keep the
// classic physics feel; OFF_Y mirrors on flip so feet anchor on ceilings too.
const SPRITE_SCALE = 0.5;
const FRAME = 92;
const BODY_W = 28;
const BODY_H = 38;
const OFF_X = 33;
const OFF_Y = 33;
const GRAVITY = 1500;
export const MAX_RUN = 170;
const ACCEL = 1400;
const DRAG = 1600;
export const MAX_FALL = 460;
const JUMP_VELOCITY = 390;
// a swing release or awning bounce launches faster than running and should
// coast through the air; these caps/drag are lifted for the flight and
// restored the moment Sosso lands (so levels 1–10 feel identical)
const LAUNCH_MAX = 390;
const LAUNCH_FALL = 760;
const LAUNCH_DRAG = 200;
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
    private launched = false;
    private coyoteUntil = 0;
    private wasGrounded = false;
    private throwReadyAt = 0;
    private throwPoseUntil = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, AssetKeys.SossoRun, 0);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setScale(SPRITE_SCALE);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(BODY_W, BODY_H);
        body.setOffset(OFF_X, OFF_Y);
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
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setGravityY(GRAVITY * dir);
        this.setFlipY(dir === -1);
        // mirror the body offset so the collision box stays at her feet when she
        // walks the ceiling (offset is from the unflipped frame top-left)
        body.setOffset(OFF_X, dir === 1 ? OFF_Y : FRAME - BODY_H - OFF_Y);
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

    /** Fling Sosso with a speed that can exceed running — for swing releases
     * and awning bounces. The lifted caps/drag restore automatically on landing. */
    launch(vx: number, vy: number): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setMaxVelocity(LAUNCH_MAX, LAUNCH_FALL);
        body.setDragX(LAUNCH_DRAG);
        body.setVelocity(vx, vy);
        this.launched = true;
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

        const grounded = this.grounded;
        // landing ends a launch: restore normal run cap and ground drag
        if (grounded && this.launched) {
            this.launched = false;
            body.setMaxVelocity(MAX_RUN, MAX_FALL);
            body.setDragX(DRAG);
        }
        // mid-launch, don't pump the held direction past the fling speed —
        // air control may steer/brake but not re-accelerate beyond running
        const coasting = this.launched && Math.abs(body.velocity.x) > MAX_RUN;
        if (coasting && direction !== 0 && Math.sign(direction) === Math.sign(body.velocity.x)) {
            body.setAccelerationX(0);
        } else {
            body.setAccelerationX(direction * ACCEL);
        }
        if (direction !== 0) this.setFlipX(direction === -1);

        if (grounded) this.coyoteUntil = now + COYOTE_MS;
        if (grounded && !this.wasGrounded) this.emit(PlayerEvents.Land);
        this.wasGrounded = grounded;

        if (now < this.throwPoseUntil) {
            this.anims.play(AnimKeys.SossoThrow, true);
        } else if (!grounded) {
            this.anims.stop();
            this.setTexture(AssetKeys.SossoJump, 3);
        } else if (Math.abs(body.velocity.x) > 20) {
            this.anims.play(AnimKeys.SossoWalk, true);
        } else {
            this.anims.stop();
            this.setTexture(AssetKeys.SossoRun, 0);
        }
    }

    get feetY(): number {
        const body = this.body as Phaser.Physics.Arcade.Body;
        return this.gravityDir === 1 ? body.bottom : body.top;
    }
}
