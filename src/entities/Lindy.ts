import * as Phaser from 'phaser';
import { AnimKeys, AssetKeys, LindyFrames } from '../assets/keys';

export const LindyEvents = {
    Hp: 'hp',
    Shoot: 'shoot',
    Defeated: 'defeated',
} as const;

export const LINDY_MAX_HP = 6;

const AGGRO_RANGE = 240;
const DASH_SPEED = 105;
const DASH_SPEED_ENRAGED = 150;
const DASH_MS = 1700;
const VOLLEY_GAP_MS = 380;
const REST_MS = 650;
const INVULN_MS = 500;

type State = 'waiting' | 'dash' | 'volley' | 'dying';

/** The boss. Skinny, furious, throws rolling pins, must be jumped over. */
export class Lindy extends Phaser.Physics.Arcade.Sprite {
    hp = LINDY_MAX_HP;
    private mode: State = 'waiting';
    private stateUntil = 0;
    private pinsLeft = 0;
    private nextPinAt = 0;
    private invulnUntil = 0;
    private dashDir: 1 | -1 = -1;
    private readonly target: Phaser.GameObjects.Sprite;

    constructor(scene: Phaser.Scene, x: number, y: number, target: Phaser.GameObjects.Sprite) {
        super(scene, x, y, AssetKeys.Lindy, LindyFrames.Stride1);
        this.target = target;
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(14, 28);
        body.setOffset(5, 4);
        body.setGravityY(900);
        body.setCollideWorldBounds(true);
    }

    get enraged(): boolean {
        return this.hp <= LINDY_MAX_HP / 2;
    }

    /** Returns true when damage landed (not invulnerable / already down). */
    hit(now: number): boolean {
        if (this.mode === 'dying' || now < this.invulnUntil) return false;
        this.hp -= 1;
        this.invulnUntil = now + INVULN_MS;
        this.emit(LindyEvents.Hp, this.hp);
        this.setFrame(LindyFrames.Hurt);
        this.scene.tweens.add({ targets: this, alpha: 0.3, duration: 80, yoyo: true, repeat: 2 });
        if (this.hp <= 0) {
            this.mode = 'dying';
            (this.body as Phaser.Physics.Arcade.Body).stop();
            this.emit(LindyEvents.Defeated, this.x, this.y);
        }
        return true;
    }

    preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        if (this.mode === 'dying' || !this.target.active) return;
        const body = this.body as Phaser.Physics.Arcade.Body;
        const dx = this.target.x - this.x;

        switch (this.mode) {
            case 'waiting':
                if (Math.abs(dx) < AGGRO_RANGE) {
                    this.mode = 'dash';
                    this.stateUntil = time + DASH_MS;
                    this.dashDir = dx < 0 ? -1 : 1;
                }
                break;
            case 'dash': {
                const speed = this.enraged ? DASH_SPEED_ENRAGED : DASH_SPEED;
                if (body.blocked.left) this.dashDir = 1;
                if (body.blocked.right) this.dashDir = -1;
                body.setVelocityX(speed * this.dashDir);
                this.setFlipX(this.dashDir === -1);
                if (time < this.invulnUntil + 100) break; // hold the hurt frame briefly
                this.anims.play(AnimKeys.LindyStride, true);
                if (time > this.stateUntil) {
                    this.mode = 'volley';
                    this.pinsLeft = this.enraged ? 3 : 2;
                    this.nextPinAt = time + 300;
                    body.setVelocityX(0);
                    this.anims.stop();
                    this.setFrame(LindyFrames.Throw);
                }
                break;
            }
            case 'volley':
                this.setFlipX(dx < 0);
                if (this.pinsLeft > 0 && time > this.nextPinAt) {
                    this.pinsLeft -= 1;
                    this.nextPinAt = time + VOLLEY_GAP_MS;
                    this.emit(LindyEvents.Shoot, this.x, this.y - 14, Math.sign(dx) || 1);
                } else if (this.pinsLeft === 0 && time > this.nextPinAt + REST_MS) {
                    this.mode = 'dash';
                    this.stateUntil = time + DASH_MS;
                    this.dashDir = dx < 0 ? -1 : 1;
                }
                break;
        }
    }
}
