import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { SceneKeys } from './keys';
import { Tex } from '../assets/keys';
import { MAX_HP, HEART_COUNT, HEIGHT, ENEMY, PLAYER, SPIKE } from '../constants';
import { loadTilemap } from '../systems/tilemap';
import { THEMES } from '../systems/themes';
import { computeHolesFromLayer, type Hole } from '../systems/holes';
import { buildBackground } from '../systems/parallax';
import { Input } from '../systems/input';
import { sfx, ensureAudio, startBGM, toggleMute } from '../systems/audio';
import { toggleFs } from '../systems/fullscreen';
import { Player } from '../entities/Player';
import type { EnemySprite } from '../entities/Enemy';

type BobTarget = Phaser.Physics.Arcade.Sprite & {
    baseY: number;
    bobAmp: number;
    bobPeriod: number;
    bobPhase: number;
};

type CheckpointFlag = Phaser.Physics.Arcade.Sprite & {
    activated: boolean;
};

// persists across scene restarts
let savedCheckpoint: { x: number; y: number } | null = null;

const CUSTOMER_LINES = [
    "WHERE'S MY BAGEL?!", 'EXTRA SCHMEAR!', 'TOO SLOW!',
    'MANAGER!', 'DECAF, NOT REGULAR!', 'I WANT A REFUND!', "IT'S COLD!",
];

export class Game extends Scene {
    tilemap: Phaser.Tilemaps.Tilemap;
    groundLayer: Phaser.Tilemaps.TilemapLayer;
    platforms: Phaser.Physics.Arcade.StaticGroup;
    spikes: Phaser.Physics.Arcade.StaticGroup;
    coins: Phaser.Physics.Arcade.Group;
    enemies: Phaser.Physics.Arcade.Group;
    healthPickups: Phaser.Physics.Arcade.Group;
    checkpointFlags: Phaser.Physics.Arcade.StaticGroup;
    goal: Phaser.Physics.Arcade.Sprite;
    player: Player;
    controls: Input;
    dust: Phaser.GameObjects.Particles.ParticleEmitter;
    sparkles: Phaser.GameObjects.Particles.ParticleEmitter;
    bobbers: BobTarget[] = [];
    scoreText: Phaser.GameObjects.Text;
    levelText: Phaser.GameObjects.Text;
    heartIcons: Phaser.GameObjects.Image[] = [];
    hp = MAX_HP;
    score = 0;
    gameOver = false;
    invulnUntil = 0;
    private spawnPoint = { x: 100, y: 400 };
    private holes: Hole[] = [];
    private inHole: (x: number) => boolean = () => false;
    private overHole: (x: number, hw: number) => boolean = () => false;
    private worldWidth = 800;
    private levelName = '';
    private isBagel = false;
    private resizeHandler: (() => void) | null = null;

    constructor() { super(SceneKeys.GAME); }

    create(): void {
        this.hp = MAX_HP;
        this.score = 0;
        this.gameOver = false;
        this.invulnUntil = 0;
        this.bobbers = [];
        this.heartIcons = [];

        const { map, ground, props } = loadTilemap(this, 'level1');
        this.tilemap = map;
        this.groundLayer = ground;
        ground.setDepth(-20);

        const themeName = String(props['theme'] ?? 'outdoor');
        const theme = THEMES[themeName] ?? THEMES['outdoor'];
        this.isBagel = themeName === 'bagel';
        this.levelName = String(props['name'] ?? '');
        this.worldWidth = map.widthInPixels;

        this.physics.world.setBounds(0, 0, this.worldWidth, HEIGHT);

        this.holes = computeHolesFromLayer(ground);
        this.inHole = (x) => this.holes.some(h => x >= h.left && x < h.right);
        this.overHole = (x, hw) => this.holes.some(h => (x + hw) > h.left && (x - hw) < h.right);

        const drawAll = buildBackground(this, theme, this.worldWidth);

        this.platforms = this.physics.add.staticGroup();
        this.spikes = this.physics.add.staticGroup();
        this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
        this.enemies = this.physics.add.group();
        this.healthPickups = this.physics.add.group({ allowGravity: false, immovable: true });
        this.checkpointFlags = this.physics.add.staticGroup();

        this.createEntities(theme);
        this.spawnPlayer();
        this.buildParticles();
        this.wireColliders();
        this.buildHUD();
        this.wireInput();

        const onResize = () => {
            drawAll();
            this.levelText.setPosition(this.scale.width - 16, 16);
        };
        this.game.events.on('viewport-resize', onResize);
        this.resizeHandler = onResize;

        this.cameras.main.setBounds(0, 0, this.worldWidth, HEIGHT);
        this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.15);
        this.cameras.main.fadeIn(250, 0, 0, 0);

        ensureAudio();
        startBGM();

        this.events.once('shutdown', () => this.cleanup());
    }

    private createEntities(theme: { plat: string; bigplat: string; tree: string; bush: string; rock: string; enemy: string; spike: string }): void {
        const objects = this.tilemap.getObjectLayer('objects')?.objects ?? [];
        const propsOf = (o: Phaser.Types.Tilemaps.TiledObject) =>
            Object.fromEntries(((o.properties ?? []) as Array<{ name: string; value: unknown }>).map(p => [p.name, p.value]));

        const BOTTOM_ANCHORED = new Set(['goal', 'checkpoint', 'tree', 'bush', 'rock']);
        const posOf = (o: Phaser.Types.Tilemaps.TiledObject) => {
            const isTile = o.gid !== undefined;
            const w = o.width ?? 0;
            const h = o.height ?? 0;
            const cx = isTile ? (o.x ?? 0) + w / 2 : (o.x ?? 0);
            const cy = isTile ? (o.y ?? 0) - h / 2 : (o.y ?? 0);
            return BOTTOM_ANCHORED.has(o.type ?? '') ? { x: cx, y: o.y ?? 0 } : { x: cx, y: cy };
        };

        const platKey = (k: unknown) => k === 'bigplatform' ? theme.bigplat : theme.plat;

        for (const o of objects) {
            const p = propsOf(o);
            const { x, y } = posOf(o);

            switch (o.type) {
                case 'spawn':
                    this.spawnPoint = { x, y };
                    break;

                case 'goal': {
                    const g = this.physics.add.staticSprite(x, y, Tex.GOAL).setOrigin(0.5, 1);
                    if (this.isBagel) g.setTint(0xffd24a);
                    g.refreshBody();
                    this.goal = g;
                    break;
                }

                case 'coin': {
                    if (y > HEIGHT - 60 && this.inHole(x)) break;
                    const c = this.coins.create(x, y, Tex.COIN) as BobTarget;
                    this.addBob(c, y, 6, 600);
                    break;
                }

                case 'heart': {
                    const h = this.healthPickups.create(x, y, Tex.BAGEL) as BobTarget;
                    (h as Phaser.Physics.Arcade.Sprite).setScale(0.55);
                    (h.body as Phaser.Physics.Arcade.Body).setSize(56, 56).setOffset(4, 4);
                    this.addBob(h, y, 6, 700);
                    this.tweens.add({ targets: h, scale: 0.65, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                    break;
                }

                case 'checkpoint': {
                    const f = this.checkpointFlags.create(x, y, Tex.CHECKPOINT).setOrigin(0.5, 1) as CheckpointFlag;
                    (f.body as Phaser.Physics.Arcade.StaticBody).setSize(14, 44).setOffset(1, 4);
                    f.refreshBody();
                    f.activated = false;
                    if (savedCheckpoint && savedCheckpoint.x === f.x && savedCheckpoint.y === f.y) {
                        f.activated = true;
                    } else {
                        f.setTint(0x666666);
                    }
                    break;
                }

                case 'enemy': {
                    let minX = (p['min'] as number) ?? 0;
                    let maxX = (p['max'] as number) ?? this.worldWidth;
                    // ground-level enemies: clamp to avoid hole edges
                    if (y > HEIGHT - 100) {
                        for (const h of this.holes) {
                            if (minX >= h.left && minX < h.right) minX = h.right;
                            if (maxX > h.left && maxX <= h.right) maxX = h.left;
                        }
                        if (minX > maxX) break;
                    }
                    const e = this.enemies.create(x, y, theme.enemy) as EnemySprite;
                    (e.body as Phaser.Physics.Arcade.Body).setSize(ENEMY.BODY_W, ENEMY.BODY_H).setOffset(ENEMY.BODY_OFF_X, ENEMY.BODY_OFF_Y);
                    e.setVelocityX(ENEMY.PATROL_SPEED);
                    e.setBounce(0, 0);
                    e.setCollideWorldBounds(true);
                    e.minX = minX;
                    e.maxX = maxX;
                    this.tweens.add({ targets: e, scaleY: 0.85, duration: 350, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                    if (this.isBagel) this.addCustomerShouts(e);
                    break;
                }

                case 'platform':
                    this.platforms.create(x, y, platKey(p['key'])).refreshBody();
                    break;

                case 'tree':
                    if (!this.overHole(x, 32)) this.add.image(x, y, theme.tree).setOrigin(0.5, 1).setDepth(-10);
                    break;

                case 'bush':
                    if (!this.overHole(x, 24)) this.add.image(x, y, theme.bush).setOrigin(0.5, 1).setDepth(-5);
                    break;

                case 'rock':
                    if (!this.overHole(x, 14)) this.add.image(x, y, theme.rock).setOrigin(0.5, 1).setDepth(-5);
                    break;

                case 'spike': {
                    // object-layer only — no auto-fill
                    const s = this.spikes.create(x, y, theme.spike);
                    (s.body as Phaser.Physics.Arcade.StaticBody).setSize(SPIKE.BODY_W, SPIKE.BODY_H).setOffset(SPIKE.BODY_OFF_X, SPIKE.BODY_OFF_Y);
                    s.refreshBody();
                    break;
                }
            }
        }
    }

    private addCustomerShouts(e: EnemySprite): void {
        const shout = () => {
            if (!e.active) return;
            const line = Phaser.Math.RND.pick(CUSTOMER_LINES);
            const t = this.add.text(e.x, e.y - 22, line, {
                fontSize: '9px', color: '#fff', fontFamily: 'monospace',
                backgroundColor: '#c23030', padding: { x: 3, y: 1 },
            }).setOrigin(0.5).setDepth(20);
            this.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 1500, onComplete: () => t.destroy() });
        };
        this.time.addEvent({
            delay: Phaser.Math.Between(2500, 5500),
            startAt: Phaser.Math.Between(0, 2000),
            loop: true,
            callback: shout,
        });
    }

    private spawnPlayer(): void {
        let sx = this.spawnPoint.x;
        let sy = this.spawnPoint.y;
        if (savedCheckpoint) {
            sx = savedCheckpoint.x;
            sy = savedCheckpoint.y - PLAYER.RESPAWN_OFFSET_Y;
        }
        this.player = new Player(this, sx, sy);
    }

    private buildParticles(): void {
        this.dust = this.add.particles(0, 0, Tex.DUST, {
            speed: { min: 20, max: 70 },
            angle: { min: 200, max: 340 },
            scale: { start: 0.9, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 450,
            gravityY: 200,
            emitting: false,
        });
        this.dust.setDepth(5);

        this.sparkles = this.add.particles(0, 0, Tex.SPARK, {
            speed: { min: 60, max: 160 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: { min: 300, max: 600 },
            gravityY: 120,
            rotate: { start: 0, end: 360 },
            blendMode: 'ADD',
            emitting: false,
        });
        this.sparkles.setDepth(10);
    }

    private wireColliders(): void {
        const p = this.player.sprite;
        this.physics.add.collider(p, this.platforms);
        this.physics.add.collider(this.enemies, this.platforms);
        this.physics.add.collider(p, this.groundLayer);
        this.physics.add.collider(this.enemies, this.groundLayer);

        this.physics.add.overlap(p, this.coins,
            (_p, c) => this.collectCoin(c as Phaser.Physics.Arcade.Sprite));
        this.physics.add.overlap(p, this.spikes,
            () => this.die());
        this.physics.add.overlap(p, this.goal,
            () => this.reachGoal());
        this.physics.add.overlap(p, this.enemies,
            (_p, e) => this.hitEnemy(e as EnemySprite));
        this.physics.add.overlap(p, this.healthPickups,
            (_p, h) => this.collectHealth(h as Phaser.Physics.Arcade.Sprite));
        this.physics.add.overlap(p, this.checkpointFlags,
            (_p, f) => this.hitCheckpoint(f as CheckpointFlag));
    }

    private buildHUD(): void {
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '20px', color: '#fff', fontFamily: 'monospace',
            stroke: '#000', strokeThickness: 3,
        }).setScrollFactor(0).setDepth(100);

        this.levelText = this.add.text(this.scale.width - 16, 16, `Level 1 — ${this.levelName}`, {
            fontSize: '18px', color: '#fff', fontFamily: 'monospace',
            stroke: '#000', strokeThickness: 3,
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

        for (let i = 0; i < HEART_COUNT; i++) {
            const h = this.add.image(20 + i * 36, 56, Tex.HEART_FULL)
                .setOrigin(0, 0).setScale(2).setScrollFactor(0).setDepth(100);
            this.heartIcons.push(h);
        }
        this.updateHearts();
    }

    private wireInput(): void {
        this.controls = new Input(this);
        this.input.keyboard!.on('keydown-F', toggleFs);
        this.input.keyboard!.on('keydown-M', toggleMute);
    }

    private cleanup(): void {
        if (this.resizeHandler) this.game.events.off('viewport-resize', this.resizeHandler);
        this.input.keyboard!.off('keydown-F', toggleFs);
        this.input.keyboard!.off('keydown-M', toggleMute);
        this.input.keyboard!.removeAllKeys(true);
    }

    updateHearts(): void {
        for (let i = 0; i < HEART_COUNT; i++) {
            const left = this.hp - i * 2;
            const key = left >= 2 ? Tex.HEART_FULL : left === 1 ? Tex.HEART_HALF : Tex.HEART_EMPTY;
            this.heartIcons[i].setTexture(key);
        }
    }

    update(time: number): void {
        if (this.gameOver) {
            if (this.controls.restartJustPressed()) this.restartFromScratch();
            return;
        }
        if (this.controls.pauseJustPressed()) {
            this.scene.launch(SceneKeys.PAUSE);
            this.scene.pause();
            return;
        }

        this.player.update(this.controls, time);

        this.enemies.getChildren().forEach(go => {
            const e = go as EnemySprite;
            if (!e.active) return;
            const body = e.body as Phaser.Physics.Arcade.Body;
            if (e.x <= e.minX && body.velocity.x <= 0) { e.setVelocityX(ENEMY.PATROL_SPEED); e.setFlipX(false); }
            if (e.x >= e.maxX && body.velocity.x >= 0) { e.setVelocityX(-ENEMY.PATROL_SPEED); e.setFlipX(true); }
        });

        for (const b of this.bobbers) {
            if (!b.active) continue;
            b.y = b.baseY - Math.sin((time / b.bobPeriod) * Math.PI * 2 + b.bobPhase) * b.bobAmp;
        }

        if (this.player.y > HEIGHT + 50) this.die();
    }

    // ---------- event handlers ----------

    collectCoin(coin: Phaser.Physics.Arcade.Sprite): void {
        this.sparkles.emitParticleAt(coin.x, coin.y, 12);
        sfx.coin();
        coin.destroy();
        this.score += 10;
        this.scoreText.setText('Score: ' + this.score);
    }

    collectHealth(heart: Phaser.Physics.Arcade.Sprite): void {
        if (this.hp >= MAX_HP) return;
        this.sparkles.emitParticleAt(heart.x, heart.y, 16);
        this.hp = MAX_HP;
        this.updateHearts();
        sfx.heal();
        const txt = this.add.text(heart.x, heart.y - 10, '+FULL', {
            fontSize: '14px', color: '#7bff7b', fontFamily: 'monospace',
            stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5);
        this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 700, onComplete: () => txt.destroy() });
        heart.destroy();
    }

    hitCheckpoint(flag: CheckpointFlag): void {
        if (flag.activated) return;
        flag.activated = true;
        flag.clearTint();
        savedCheckpoint = { x: flag.x, y: flag.y };
        this.sparkles.emitParticleAt(flag.x, flag.y - 36, 16);
        sfx.checkpoint();
        const txt = this.add.text(flag.x, flag.y - 60, 'CHECKPOINT', {
            fontSize: '14px', color: '#7bf0ff', fontFamily: 'monospace',
            stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5);
        this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 900, onComplete: () => txt.destroy() });
    }

    hitEnemy(enemy: EnemySprite): void {
        if (this.gameOver || !enemy.active) return;
        const sp = this.player.sprite;
        const body = sp.body as Phaser.Physics.Arcade.Body;
        if (body.velocity.y > PLAYER.STOMP_VY_MIN && (sp.y + 23) < enemy.y + 4) {
            this.killEnemy(enemy);
            sp.setVelocityY(PLAYER.STOMP_BOUNCE);
            return;
        }
        if (this.time.now < this.invulnUntil) return;
        this.damagePlayer(1, enemy.x);
    }

    damagePlayer(amount: number, sourceX: number): void {
        if (this.gameOver) return;
        this.hp = Math.max(0, this.hp - amount);
        this.updateHearts();
        this.invulnUntil = this.time.now + PLAYER.INVULN_MS;
        const sp = this.player.sprite;
        const dir = sp.x < sourceX ? -1 : 1;
        sp.setVelocity(dir * PLAYER.KNOCKBACK_VX, PLAYER.KNOCKBACK_VY);
        sfx.hurt();
        this.player.flash();
        if (this.hp <= 0) this.die();
    }

    killEnemy(enemy: EnemySprite): void {
        this.sparkles.emitParticleAt(enemy.x, enemy.y, 8);
        this.dust.emitParticleAt(enemy.x, enemy.y + 8, 6);
        enemy.disableBody(true, true);
        sfx.stomp();
        this.score += 20;
        this.scoreText.setText('Score: ' + this.score);
    }

    die(): void {
        if (this.gameOver) return;
        this.gameOver = true;
        sfx.death();
        const sp = this.player.sprite;
        sp.setTint(0xff0000);
        (sp.body as Phaser.Physics.Arcade.Body).checkCollision.none = true;
        sp.setVelocity(0, -300);
        this.cameras.main.flash(250, 200, 0, 0);
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.hp = MAX_HP;
            this.invulnUntil = 0;
            this.gameOver = false;
            this.scene.restart();
        });
    }

    reachGoal(): void {
        if (this.gameOver) return;
        this.gameOver = true;
        this.physics.world.pause();
        this.player.sprite.setVelocity(0, 0);
        this.player.sprite.setAcceleration(0, 0);
        sfx.win();
        savedCheckpoint = null;

        const banner = this.add.text(this.scale.width / 2, HEIGHT / 2 - 20, 'Level 1 Clear!', {
            fontSize: '36px', color: '#fff700', fontFamily: 'monospace',
            align: 'center', stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

        this.add.text(this.scale.width / 2, HEIGHT / 2 + 30, `Score: ${this.score}`, {
            fontSize: '22px', color: '#ffffff', fontFamily: 'monospace',
            stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

        this.tweens.add({
            targets: banner, y: HEIGHT / 2 - 30, duration: 300, ease: 'Back.easeOut',
        });

        this.time.delayedCall(2500, () => {
            this.cameras.main.fadeOut(600, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.hp = MAX_HP;
                this.gameOver = false;
                this.scene.restart();
            });
        });
    }

    private restartFromScratch(): void {
        this.hp = MAX_HP;
        savedCheckpoint = null;
        this.score = 0;
        this.gameOver = false;
        this.scene.restart();
    }

    private addBob(obj: BobTarget, baseY: number, amp: number, period: number): void {
        obj.baseY = baseY;
        obj.bobAmp = amp;
        obj.bobPeriod = period;
        obj.bobPhase = Math.random() * Math.PI * 2;
        this.bobbers.push(obj);
    }
}
