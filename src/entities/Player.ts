import { PLAYER } from '../constants';
import { sfx } from '../systems/audio';

type GameSceneRef = Phaser.Scene & {
    dust: Phaser.GameObjects.Particles.ParticleEmitter;
    sparkles: Phaser.GameObjects.Particles.ParticleEmitter;
    enemies: Phaser.Physics.Arcade.Group;
    gameOver: boolean;
};

type EnemySprite = Phaser.Physics.Arcade.Sprite & { minX: number; maxX: number };

type PlayerState = 'idle' | 'run' | 'jump' | 'punch';

export class Player {
    sprite: Phaser.Physics.Arcade.Sprite;
    private scene: GameSceneRef;
    private state: PlayerState = 'idle';
    private lastAttackAt = 0;
    private wasOnGround = true;
    private lastRunDustAt = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene as GameSceneRef;
        const sp = scene.physics.add.sprite(x, y, 'player_run');
        sp.setCollideWorldBounds(true);
        sp.setMaxVelocity(PLAYER.MAX_VX, PLAYER.MAX_VY);
        sp.body.setSize(PLAYER.BODY_W, PLAYER.BODY_H).setOffset(PLAYER.BODY_OFF_X, PLAYER.BODY_OFF_Y);
        this.sprite = sp;
        sp.on('animationcomplete', (anim: Phaser.Animations.Animation) => {
            if (anim.key === 'punch' && this.state === 'punch') {
                this.state = 'idle';
                sp.anims.play('idle', true);
            }
        });
    }

    get x(): number { return this.sprite.x; }
    get y(): number { return this.sprite.y; }

    private setState(s: PlayerState): void {
        if (this.state === s) return;
        this.state = s;
        const map: Record<PlayerState, string> = { idle: 'idle', run: 'run', jump: 'jump', punch: 'punch' };
        this.sprite.anims.play(map[s], true);
    }

    update(input: { left: boolean; right: boolean; jump: boolean; attackJustPressed(): boolean }, time: number): void {
        const sp = this.sprite;
        const body = sp.body as Phaser.Physics.Arcade.Body;
        const onGround = body.blocked.down || body.touching.down;

        if (input.left) { sp.setAccelerationX(-PLAYER.RUN_ACCEL); sp.setFlipX(true); }
        else if (input.right) { sp.setAccelerationX(PLAYER.RUN_ACCEL); sp.setFlipX(false); }
        else { sp.setAccelerationX(0); sp.setVelocityX(body.velocity.x * PLAYER.FRICTION); }

        let justJumped = false;
        if (input.jump && onGround) {
            sp.setVelocityY(PLAYER.JUMP_VEL);
            sfx.jump();
            this.setState('jump');
            justJumped = true;
        }

        if (onGround && !justJumped && this.state !== 'punch') {
            if (Math.abs(body.velocity.x) > 10) this.setState('run');
            else this.setState('idle');
        }

        const feetX = sp.x;
        const feetY = sp.y + 23;

        if (!this.wasOnGround && onGround) {
            const vy = Math.min(800, Math.abs(body.velocity.y) + 200);
            const count = Math.floor(Math.max(4, Math.min(10, vy / 120)));
            this.scene.dust.emitParticleAt(feetX, feetY, count);
            sfx.land();
        }
        if (onGround && Math.abs(body.velocity.x) > PLAYER.RUN_DUST_VX_MIN && time - this.lastRunDustAt > PLAYER.RUN_DUST_INTERVAL) {
            const behind = feetX + (body.velocity.x > 0 ? -10 : 10);
            this.scene.dust.emitParticleAt(behind, feetY, 1);
            this.lastRunDustAt = time;
        }
        this.wasOnGround = onGround;

        if (input.attackJustPressed() && time - this.lastAttackAt > PLAYER.ATTACK_COOLDOWN) {
            this.lastAttackAt = time;
            this.attack();
        }
    }

    attack(): void {
        const sp = this.sprite;
        this.setState('punch');
        const dir = sp.flipX ? -1 : 1;
        const scene = this.scene;
        scene.time.delayedCall(PLAYER.ATTACK_HIT_DELAY, () => {
            if (!sp.active || scene.gameOver) return;
            scene.enemies.getChildren().forEach(go => {
                const e = go as EnemySprite;
                if (!e.active) return;
                const dx = e.x - sp.x;
                const dy = e.y - sp.y;
                if (Math.sign(dx) === dir && Math.abs(dx) < PLAYER.ATTACK_RANGE_X && Math.abs(dy) < PLAYER.ATTACK_RANGE_Y) {
                    (scene as unknown as { killEnemy(e: EnemySprite): void }).killEnemy(e);
                }
            });
        });
    }

    flash(): void {
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0.3,
            duration: 90,
            yoyo: true,
            repeat: 4,
            onComplete: () => { this.sprite.setAlpha(1); },
        });
    }
}
