import * as Phaser from 'phaser';
import { AnimKeys, AssetKeys, LindyFrames } from '../assets/keys';

export const LindyEvents = {
    Hp: 'hp',
    Shoot: 'shoot',
    Slam: 'slam',
    Defeated: 'defeated',
} as const;

export const LINDY_MAX_HP = 8;

const AGGRO_RANGE = 240;
const DASH_SPEED = 90;
const DASH_SPEED_ENRAGED = 125;
const DASH_MS = 1500;
const ALERT_MS = 450;
const AIM_MS = 400;
const VOLLEY_GAP_MS = 450;
const TIRED_MS = 1150;
const INVULN_MS = 400;
// clears the 1-tile crates (apex ~29px), not the 2-tile arena wall
const HOP_VELOCITY = 230;
// enrage-only slam: a high telegraphed leap that ends in a ground shockwave
const SLAM_RISE = 330;
const SLAM_STEER = 60;

type State = 'waiting' | 'alert' | 'dash' | 'aim' | 'volley' | 'slam' | 'tired' | 'dying';

/**
 * The boss. Readable rhythm: alert (!) → dash (jump over her; she vaults
 * crates when enraged) → aim → pin volley (low/lobbed mix) → tired (punish window).
 */
export class Lindy extends Phaser.Physics.Arcade.Sprite {
    hp = LINDY_MAX_HP;
    private mode: State = 'waiting';
    private stateUntil = 0;
    private pinsLeft = 0;
    private nextPinAt = 0;
    private invulnUntil = 0;
    private dashDir: 1 | -1 = -1;
    private slamToggle = false;
    private slamAirborne = false;
    private readonly target: Phaser.GameObjects.Sprite;
    private readonly mark: Phaser.GameObjects.Text;

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

        this.mark = scene.add
            .text(x, y - 30, '!', {
                fontFamily: '"Courier New", monospace',
                fontStyle: 'bold',
                fontSize: 14,
                color: '#ff5a5a',
                stroke: '#1a1c2c',
                strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setVisible(false);
        this.once(Phaser.GameObjects.Events.DESTROY, () => this.mark.destroy());
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
        this.scene.tweens.add({ targets: this, scaleX: 1.25, duration: 70, yoyo: true });
        if (this.hp <= 0) {
            this.mode = 'dying';
            this.mark.setVisible(false);
            (this.body as Phaser.Physics.Arcade.Body).stop();
            this.emit(LindyEvents.Defeated, this.x, this.y);
        }
        return true;
    }

    private enterAlert(time: number): void {
        this.mode = 'alert';
        this.stateUntil = time + ALERT_MS;
        this.mark.setVisible(true);
        (this.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
        this.anims.stop();
        this.setFrame(LindyFrames.Stride1);
    }

    preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        this.mark.setPosition(this.x, this.y - 30);
        if (this.mode === 'dying' || !this.target.active) return;
        const body = this.body as Phaser.Physics.Arcade.Body;
        const dx = this.target.x - this.x;

        switch (this.mode) {
            case 'waiting':
                if (Math.abs(dx) < AGGRO_RANGE) this.enterAlert(time);
                break;
            case 'alert':
                this.setFlipX(dx < 0);
                if (this.enraged) this.setFrame(LindyFrames.Enraged);
                if (time > this.stateUntil) {
                    this.mark.setVisible(false);
                    // enraged: alternate the dash with a slam that shockwaves
                    if (this.enraged && this.slamToggle) {
                        this.mode = 'slam';
                        this.slamAirborne = false;
                        this.setFrame(LindyFrames.Throw);
                    } else {
                        this.mode = 'dash';
                        this.stateUntil = time + DASH_MS;
                        this.dashDir = dx < 0 ? -1 : 1;
                    }
                    this.slamToggle = !this.slamToggle;
                }
                break;
            case 'dash': {
                const speed = this.enraged ? DASH_SPEED_ENRAGED : DASH_SPEED;
                const grounded = body.blocked.down;
                if ((body.blocked.left || body.blocked.right) && grounded) {
                    if (this.enraged) {
                        // vault the crates instead of turning
                        body.setVelocityY(-HOP_VELOCITY);
                    } else {
                        this.dashDir = body.blocked.left ? 1 : -1;
                    }
                }
                body.setVelocityX(speed * this.dashDir);
                this.setFlipX(this.dashDir === -1);
                if (time >= this.invulnUntil) this.anims.play(AnimKeys.LindyStride, true);
                if (time > this.stateUntil) {
                    this.mode = 'aim';
                    this.stateUntil = time + AIM_MS;
                    body.setVelocityX(0);
                    this.anims.stop();
                    this.setFrame(LindyFrames.Throw);
                }
                break;
            }
            case 'slam': {
                // a big telegraphed leap toward the player that ends in a
                // floor-skimming shockwave (jump it). enrage-only.
                if (!this.slamAirborne) {
                    body.setVelocityY(-SLAM_RISE);
                    this.slamAirborne = true;
                }
                body.setVelocityX(Math.sign(dx) * SLAM_STEER);
                this.setFlipX(dx < 0);
                if (body.velocity.y > 0 && body.blocked.down) {
                    body.setVelocity(0, 0);
                    this.emit(LindyEvents.Slam, this.x, this.y);
                    this.setFrame(LindyFrames.Hurt);
                    this.mode = 'tired';
                    this.stateUntil = time + TIRED_MS * 0.75;
                }
                break;
            }
            case 'aim':
                this.setFlipX(dx < 0);
                if (this.enraged) this.setFrame(LindyFrames.Throw);
                if (time > this.stateUntil) {
                    this.mode = 'volley';
                    this.pinsLeft = this.enraged ? 3 : 2;
                    this.nextPinAt = time;
                }
                break;
            case 'volley':
                this.setFlipX(dx < 0);
                if (this.pinsLeft > 0 && time > this.nextPinAt) {
                    this.pinsLeft -= 1;
                    this.nextPinAt = time + VOLLEY_GAP_MS;
                    // alternate lobbed and low fast pins so dodges differ
                    const low = this.pinsLeft % 2 === (this.enraged ? 1 : 0);
                    this.emit(LindyEvents.Shoot, this.x, this.y - 14, Math.sign(dx) || 1, low);
                } else if (this.pinsLeft === 0 && time > this.nextPinAt - VOLLEY_GAP_MS + 250) {
                    this.mode = 'tired';
                    this.stateUntil = time + TIRED_MS;
                    this.setFrame(LindyFrames.Hurt);
                    this.scene.tweens.add({ targets: this, scaleY: 0.93, duration: 200, yoyo: true, repeat: 2 });
                }
                break;
            case 'tired':
                if (time > this.stateUntil) {
                    this.setScale(1);
                    this.enterAlert(time);
                }
                break;
        }
    }
}
