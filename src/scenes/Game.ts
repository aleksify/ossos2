import * as Phaser from 'phaser';
import { SceneKeys } from './keys';
import { AnimKeys, AssetKeys, GameEvents, ItemFrames, NpcFrames, ParentFrames, StinkyFrames, TeatroFrames, TileFrames } from '../assets/keys';
import vocab from '../assets/level-vocab.json';
import { LEVELS, LevelSpec } from '../systems/levels';
import { RegKeys } from '../systems/state';
import { touch } from '../systems/touch';
import { Player, PlayerEvents } from '../entities/Player';
import { Walker, WalkerEvents } from '../entities/Walker';
import { Saw } from '../entities/Saw';
import { Bat } from '../entities/Bat';
import { Karen, KarenEvents } from '../entities/Karen';
import { Lindy, LindyEvents, LINDY_MAX_HP } from '../entities/Lindy';
import { Bagel } from '../entities/Bagel';
import { Shot } from '../entities/Shot';

const VIEW_ZOOM = 2;
const STOMP_BOUNCE = 300; // upward pop after squashing an enemy (vs jump 390)

// clothesline swing (lisbon): a faked pendulum — no Matter joints needed
const SWING_W2 = 15; // pendulum stiffness (≈ g/L), tuned for a ~1.6s period
const SWING_PUMP = 14; // rad/s² added while pumping with the swing
const SWING_DAMP = 0.999;
const SWING_OMEGA_MAX = 6;
const SWING_THETA_MAX = 1.3; // the rope can't swing past ~75° — never over the top
const SWING_RELEASE = 1.15; // launch boost on let-go
const SWING_MIN_LAUNCH = 265; // forgiving floor so a mistimed release still carries forward
const SWING_POP = 110; // small upward hop on release to help clear the gap
// tram 28 (lisbon): immovable bodies that shuttle and carry their rider by friction
const TRAM_SPEED = 46;
const TRAM_AMP = 82;
// festa awning trampolines (lisbon): each consecutive bounce climbs by a fixed
// step (a real trampoline you pump higher), reset when you land on solid ground
const AWNING_BOUNCE_BASE = 380; // first bounce even from a standstill (~2.7 tiles)
const AWNING_BOUNCE_STEP = 100; // every chained bounce adds this
const AWNING_BOUNCE_MAX = 840; // ~11 tiles — clears the festa walls in ~3 bounces
const AWNING_RESET_MS = 160; // grounded on real ground this long → chain resets

type Phase = 'play' | 'dead' | 'won' | 'cinematic';

interface GameData {
    level?: number;
    died?: boolean;
    spawnX?: number;
    spawnY?: number;
    spawnGrav?: 1 | -1;
    killed?: number[];
    flagsTouched?: number[];
    collected?: number[];
}

export class Game extends Phaser.Scene {
    private levelIndex = 0;
    private phase: Phase = 'play';
    private fromDeath = false;
    private checkpoint?: { x: number; y: number; grav: 1 | -1 };
    private flags: { id: number; x: number; y: number }[] = [];
    private touchedFlags = new Set<number>();
    private killedEnemies = new Set<number>();
    private collectedGems = new Set<number>();
    private graceUntil = 0;
    private bossDefeated = false;
    private player!: Player;
    private ground!: Phaser.Tilemaps.TilemapLayer;
    private hazards!: Phaser.Tilemaps.TilemapLayer;
    // plain groups: a physics group would re-apply its defaults on add(),
    // wiping the body config (gravity, size) set in entity constructors
    private enemies!: Phaser.GameObjects.Group;
    private bagels!: Phaser.GameObjects.Group;
    private shots!: Phaser.GameObjects.Group;
    private lindy?: Lindy;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private keyA!: Phaser.Input.Keyboard.Key;
    private keyD!: Phaser.Input.Keyboard.Key;
    private keyW!: Phaser.Input.Keyboard.Key;
    private keyX!: Phaser.Input.Keyboard.Key;
    private keyJ!: Phaser.Input.Keyboard.Key;
    private prevTouchJump = false;
    private prevTouchThrow = false;
    private burst!: Phaser.GameObjects.Particles.ParticleEmitter;
    private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
    private attemptGems = 0;
    private skyFade?: { from: Phaser.Display.Color; to: Phaser.Display.Color; range: number };
    private autoScroll = 0;
    // clothesline anchors and the active swing
    private anchors: { x: number; y: number }[] = [];
    private swing?: { ax: number; ay: number; len: number; theta: number; omega: number };
    private rope?: Phaser.GameObjects.Graphics;
    private relatchAt = 0;
    private trams: { sprite: Phaser.Physics.Arcade.Sprite; min: number; max: number; dir: 1 | -1 }[] = [];
    private awningBounces = 0;
    private lastAwningBounceAt = 0;
    // rooftop levels have open death-pits: world bounds park the player at the
    // map floor instead of killing, so a kill-plane finishes the job
    private killPlane = Infinity;
    // teatro rhythm platforms: gold (phase 0) and blue (phase 1) blocks toggle
    // solid/ghost on the beat, overlapping briefly so a timed hop always lands
    private beatGroup?: Phaser.Physics.Arcade.StaticGroup;
    private beatBlocks: { sprite: Phaser.Physics.Arcade.Sprite; phase: 0 | 1 }[] = [];
    private beatMs = 0;
    private beatStart = 0;

    constructor() {
        super(SceneKeys.Game);
    }

    init(data: GameData): void {
        this.levelIndex = data.level ?? 0;
        this.fromDeath = data.died ?? false;
        this.checkpoint =
            data.spawnX !== undefined
                ? { x: data.spawnX, y: data.spawnY!, grav: data.spawnGrav ?? 1 }
                : undefined;
        this.flags = [];
        this.touchedFlags = new Set(data.flagsTouched ?? []);
        this.killedEnemies = new Set(data.killed ?? []);
        this.collectedGems = new Set(data.collected ?? []);
        this.phase = 'play';
        this.bossDefeated = false;
        this.lindy = undefined;
        this.attemptGems = 0;
        this.anchors = [];
        this.swing = undefined;
        this.relatchAt = 0;
        this.trams = [];
        this.awningBounces = 0;
        this.lastAwningBounceAt = 0;
        this.beatBlocks = [];
        this.beatMs = 0;
        this.beatStart = 0;
    }

    create(): void {
        const spec = LEVELS[this.levelIndex];
        const map = this.make.tilemap({ key: spec.key });
        const tilesets = [
            map.addTilesetImage(vocab.tileset, AssetKeys.Tiles)!,
            map.addTilesetImage('iron', AssetKeys.Iron)!,
            map.addTilesetImage('brazil', AssetKeys.Brazil)!,
            map.addTilesetImage('lisbon', AssetKeys.Lisbon)!,
            map.addTilesetImage('teatro', AssetKeys.Teatro)!,
        ];
        this.autoScroll = spec.autoScroll ?? 0;

        this.cameras.main.setBackgroundColor(spec.sky);
        this.addParallax(spec, map.widthInPixels, map.heightInPixels);

        this.ground = map.createLayer(vocab.layers.ground, tilesets) as Phaser.Tilemaps.TilemapLayer;
        map.createLayer(vocab.layers.deco, tilesets);
        this.hazards = map.createLayer(vocab.layers.hazards, tilesets) as Phaser.Tilemaps.TilemapLayer;
        this.ground.setCollisionByExclusion([-1]);
        this.hazards.setCollisionByExclusion([-1]);

        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        // open orchestra-pit gaps need the same kill-plane backstop as Lisbon's rooftops
        this.killPlane =
            spec.theme === 'lisbon' || spec.theme === 'teatro' ? map.heightInPixels - 1 : Infinity;

        // the tower sparkles at twilight, a beacon blinks on top,
        // and the sky deepens into night as you climb
        if (spec.theme === 'paris' && map.heightInPixels > 540) {
            this.add.particles(0, 0, AssetKeys.Pixel, {
                x: { min: 18, max: map.widthInPixels - 18 },
                y: { min: 0, max: map.heightInPixels - 90 },
                lifespan: { min: 200, max: 550 },
                scale: { start: 1.1, end: 0 },
                tint: 0xffe9a8,
                frequency: 45,
                speed: 0,
            });
            const cx = map.widthInPixels / 2;
            const halo = this.add.image(cx, 7, AssetKeys.Pixel).setScale(9).setTint(0xff4455).setAlpha(0.22);
            const core = this.add.image(cx, 7, AssetKeys.Pixel).setScale(3).setTint(0xff6677);
            this.tweens.add({
                targets: [core, halo],
                alpha: 0.06,
                duration: 750,
                yoyo: true,
                repeat: -1,
                ease: 'sine.inOut',
            });
            this.skyFade = {
                from: Phaser.Display.Color.ValueToColor(spec.sky),
                to: Phaser.Display.Color.ValueToColor(0x2e3354),
                range: map.heightInPixels - 270,
            };
        } else {
            this.skyFade = undefined;
        }

        const objects = map.getObjectLayer(vocab.layers.objects)?.objects ?? [];
        const spawn = objects.find((o) => o.type === vocab.objects.spawn);
        const spawnAt = this.checkpoint ?? { x: spawn?.x ?? 32, y: spawn?.y ?? 32 };
        this.player = new Player(this, spawnAt.x, spawnAt.y);
        this.player.setDepth(5); // ride on top of trams (created later in the object loop)
        this.rope = this.add.graphics().setDepth(4);
        if (this.checkpoint && this.checkpoint.grav === -1) this.player.setGravityDir(-1);
        this.player.canFlip =
            !spec.forceJump && (spec.flip || (this.registry.get(RegKeys.FlipUnlocked) as boolean));
        this.player.canJump = !this.player.canFlip;

        this.enemies = this.add.group();
        this.bagels = this.add.group();
        this.shots = this.add.group();
        const gems = this.physics.add.staticGroup();
        this.beatGroup = this.physics.add.staticGroup();
        const collectibleTexture = spec.collectible === 'gem' ? AssetKeys.Tiles : AssetKeys.Items;
        const collectibleFrame =
            spec.collectible === 'gem'
                ? TileFrames.Gem
                : spec.collectible === 'bagel'
                  ? ItemFrames.Bagel
                  : spec.collectible === 'brigadeiro'
                    ? ItemFrames.Brigadeiro
                    : spec.collectible === 'nata'
                      ? ItemFrames.Nata
                      : spec.collectible === 'note'
                        ? ItemFrames.Note
                        : ItemFrames.Croissant;
        let doorAt: { x: number; y: number } | undefined;

        for (const [oid, obj] of objects.entries()) {
            const x = obj.x ?? 0;
            const y = obj.y ?? 0;
            const slain = this.killedEnemies.has(oid);
            switch (obj.type) {
                case vocab.objects.gem: {
                    if (this.collectedGems.has(oid)) break; // grabbed in an earlier attempt — stays banked
                    const gem = gems.create(x, y, collectibleTexture, collectibleFrame) as Phaser.Physics.Arcade.Sprite;
                    gem.setData('oid', oid);
                    (gem.body as Phaser.Physics.Arcade.StaticBody).setSize(26, 26);
                    this.tweens.add({
                        targets: gem,
                        y: y - 3,
                        duration: 700,
                        yoyo: true,
                        repeat: -1,
                        ease: 'sine.inOut',
                        delay: (x * 7) % 400,
                    });
                    break;
                }
                case vocab.objects.walker:
                    if (!slain) this.addSoft(new Walker(this, x, y, this.walkerConfig(spec, false)), oid);
                    break;
                case vocab.objects.walkerCeiling:
                    if (!slain) this.addSoft(new Walker(this, x, y, this.walkerConfig(spec, true)), oid);
                    break;
                case vocab.objects.customer:
                    if (!slain) this.addSoft(Walker.customer(this, x, y, this.ground, this.hazards, this.player), oid);
                    break;
                case vocab.objects.karen: {
                    if (slain) break;
                    const karen = new Karen(this, x, y, this.player);
                    karen.on(KarenEvents.Shoot, (sx: number, sy: number, dir: number) => {
                        this.shots.add(new Shot(this, sx, sy, ItemFrames.Coffee, 110 * dir, -240));
                    });
                    this.addSoft(karen, oid);
                    break;
                }
                case vocab.objects.saw:
                    this.enemies.add(new Saw(this, x, y));
                    break;
                case vocab.objects.bat:
                    if (!slain) {
                        const skin =
                            spec.theme === 'lisbon'
                                ? { texture: AssetKeys.Npcs, frame: NpcFrames.Gaivota1, anim: AnimKeys.GaivotaFly }
                                : undefined;
                        const bat = new Bat(this, x, y, this.player, skin);
                        bat.setData('flying', true); // can't be stomped — only bagels reach them
                        this.addSoft(bat, oid);
                    }
                    break;
                case vocab.objects.lindy:
                    this.spawnLindy(x, y);
                    break;
                case vocab.objects.checkpoint:
                    this.flags.push({ id: this.flags.length, x, y });
                    break;
                case vocab.objects.stinky:
                    this.createStinkyCage(x, y);
                    break;
                case vocab.objects.parents:
                    this.createParents(x, y);
                    break;
                case vocab.objects.alex:
                    this.createAlex(x, y);
                    break;
                case vocab.objects.line:
                    // hang point sits near the pole's crossbar, just below the tile top
                    this.anchors.push({ x, y: y - 8 });
                    break;
                case vocab.objects.tram:
                    this.createTram(x, y);
                    break;
                case vocab.objects.beatA:
                    this.createBeatBlock(x, y, 0);
                    break;
                case vocab.objects.beatB:
                    this.createBeatBlock(x, y, 1);
                    break;
                case vocab.objects.door:
                    doorAt = { x, y };
                    this.createDoorSensor(x, y, spec.boss === true);
                    break;
            }
        }

        // Stinky tags along through the vacation: she waits by each exit door
        if ((spec.theme === 'brasil' || spec.theme === 'lisbon') && doorAt) {
            this.add.sprite(doorAt.x - 22, doorAt.y - 3, AssetKeys.Stinky, StinkyFrames.Sit)
                .anims.play(AnimKeys.StinkyHappy);
        }

        const awningBounce = spec.theme === 'lisbon';
        this.physics.add.collider(
            this.player,
            this.ground,
            awningBounce ? (_p, tile) => this.onAwning(tile as Phaser.Tilemaps.Tile) : undefined,
        );
        this.physics.add.collider(this.enemies, this.ground);
        this.physics.add.collider(this.player, this.beatGroup);
        this.physics.add.collider(this.enemies, this.beatGroup);
        this.physics.add.overlap(this.player, gems, (_p, gemObj) => {
            this.collectGem(gemObj as Phaser.Physics.Arcade.Sprite);
        });
        this.physics.add.overlap(this.player, this.enemies, (_p, enemyObj) => {
            if (this.phase !== 'play' || this.time.now < this.graceUntil) return;
            if (this.tryStomp(enemyObj as Phaser.Physics.Arcade.Sprite)) return;
            this.die();
        });
        this.physics.add.overlap(this.player, this.shots, (_p, shot) => {
            if (this.phase === 'play') {
                shot.destroy();
                this.die();
            }
        });
        this.physics.add.collider(this.shots, this.ground, (shot, tile) => {
            const t = tile as Phaser.Tilemaps.Tile;
            if (t.index === vocab.tiles.awningA || t.index === vocab.tiles.awningB) {
                // coffee bounces off the festa awnings into slow mortar arcs
                const sb = (shot as Shot).body as Phaser.Physics.Arcade.Body;
                sb.setVelocityY(-Math.abs(sb.velocity.y) * 0.85 - 110);
                return;
            }
            this.puff(0x8a6244, 6, (shot as Shot).x, (shot as Shot).y);
            shot.destroy();
        });
        this.physics.add.collider(this.bagels, this.ground, (bagel) => {
            this.puff(0xcf9a5e, 6, (bagel as Bagel).x, (bagel as Bagel).y);
            bagel.destroy();
        });
        this.physics.add.overlap(this.bagels, this.enemies, (bagelObj, enemyObj) => {
            const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
            const bagel = bagelObj as Bagel;
            this.puff(0xcf9a5e, 6, bagel.x, bagel.y);
            bagel.destroy();
            if (enemy.getData('soft') === true) this.squashEnemy(enemy);
        });

        this.burst = this.add.particles(0, 0, AssetKeys.Pixel, {
            speed: { min: 50, max: 150 },
            lifespan: { min: 200, max: 450 },
            scale: { start: 1.4, end: 0 },
            emitting: false,
        });
        this.dust = this.add.particles(0, 0, AssetKeys.Pixel, {
            speed: { min: 5, max: 25 },
            lifespan: 250,
            scale: { start: 0.8, end: 0 },
            tint: 0xb89a6a,
            frequency: 70,
            emitting: false,
        });
        if (this.autoScroll > 0) {
            // wind streaks past the moving train; screen-space (scroll factor 0
            // is drawn in the x∈[240,720] band under the zoomed camera)
            this.add
                .particles(0, 0, AssetKeys.Pixel, {
                    x: 740,
                    y: { min: 140, max: 400 },
                    speedX: { min: -460, max: -300 },
                    speedY: 0,
                    lifespan: 1100,
                    frequency: 70,
                    scaleX: { start: 3.5, end: 1 },
                    scaleY: 0.25,
                    alpha: { start: 0.3, end: 0 },
                })
                .setScrollFactor(0);
        }

        this.player.on(PlayerEvents.Flip, () => {
            this.sound.play(AssetKeys.SfxFlip, { volume: 0.4 });
            this.burst.setParticleTint(0x7df0ff);
            this.burst.explode(14, this.player.x, this.player.feetY);
            this.cameras.main.shake(70, 0.004);
            this.zoomPunch();
        });
        this.player.on(PlayerEvents.Jump, () => {
            this.sound.play(AssetKeys.SfxJump, { volume: 0.3 });
            this.burst.setParticleTint(0xd9c9a8);
            this.burst.explode(6, this.player.x, this.player.feetY);
        });
        this.player.on(PlayerEvents.Throw, (dir: -1 | 1) => {
            this.sound.play(AssetKeys.SfxThrow, { volume: 0.35, detune: Phaser.Math.Between(-120, 150) });
            const bx = this.player.x + dir * 10;
            const by = this.player.y - 2;
            this.bagels.add(new Bagel(this, bx, by, dir));
            this.puff(0xf3e3c0, 4, bx, by);
            // no scale-squash here: Sosso's transform scale drives her Arcade body
            // size, so the punch/run frames carry the juice instead
        });

        this.beatMs = spec.beat ?? 720;
        this.beatStart = this.time.now;

        const cam = this.cameras.main;
        cam.setZoom(VIEW_ZOOM);
        cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        if (this.autoScroll > 0) {
            // the camera drives itself; spawn with a comfortable lead
            const view = cam.width / VIEW_ZOOM;
            cam.centerOn(spawnAt.x - 140 + view / 2, map.heightInPixels / 2);
        } else {
            cam.startFollow(this.player, true, 0.12, 0.12);
        }
        cam.fadeIn(300, 0, 0, 0);

        const keyboard = this.input.keyboard!;
        this.cursors = keyboard.createCursorKeys();
        this.keyA = keyboard.addKey('A');
        this.keyD = keyboard.addKey('D');
        this.keyW = keyboard.addKey('W');
        this.keyX = keyboard.addKey('X');
        this.keyJ = keyboard.addKey('J');
        keyboard.on('keydown-R', () => this.restart(false));
        keyboard.on('keydown-P', () => this.pauseGame());
        keyboard.on('keydown-ESC', () => this.pauseGame());

        // brief grace after a respawn so nothing can spawn-kill the player
        if (this.fromDeath) {
            this.graceUntil = this.time.now + 900;
            this.tweens.add({ targets: this.player, alpha: 0.35, duration: 110, yoyo: true, repeat: 3 });
        } else if (this.autoScroll > 0) {
            // a beat to read the intro before the screen starts rolling
            this.graceUntil = this.time.now + 1500;
        }
        // re-light shimmer on flags armed before this respawn
        for (const flag of this.flags) {
            if (this.touchedFlags.has(flag.id)) this.armFlagFx(flag.x, flag.y, false);
        }

        this.scene.launch(SceneKeys.UI, { level: this.levelIndex, died: this.fromDeath });
    }

    private pauseGame(): void {
        if (this.scene.isPaused() || this.phase !== 'play') return;
        // disable this scene's input so its ESC/P/R handlers stay quiet while the
        // Pause overlay owns the keyboard; Pause re-enables it on resume
        this.input.enabled = false;
        this.scene.pause();
        this.scene.launch(SceneKeys.Pause);
    }

    update(time: number, delta: number): void {
        if (this.skyFade) {
            const t = Phaser.Math.Clamp(1 - this.cameras.main.scrollY / this.skyFade.range, 0, 1);
            const c = Phaser.Display.Color.Interpolate.ColorWithColor(this.skyFade.from, this.skyFade.to, 100, t * 100);
            this.cameras.main.setBackgroundColor(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
        }
        if (this.phase === 'cinematic') {
            this.player.move(0, time);
            return;
        }
        if (this.phase !== 'play') return;

        if (touch.pause) {
            touch.pause = false;
            this.pauseGame();
            return;
        }
        // rising edges for the on-screen jump/attack buttons (held flags)
        const touchJump = touch.jump && !this.prevTouchJump;
        const touchJumpUp = !touch.jump && this.prevTouchJump;
        const touchThrow = touch.attack && !this.prevTouchThrow;
        this.prevTouchJump = touch.jump;
        this.prevTouchThrow = touch.attack;

        const left = this.cursors.left.isDown || this.keyA.isDown || touch.left;
        const right = this.cursors.right.isDown || this.keyD.isDown || touch.right;
        const ascendPressed =
            Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
            Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
            Phaser.Input.Keyboard.JustDown(this.keyW) ||
            touchJump;
        const throwPressed =
            Phaser.Input.Keyboard.JustDown(this.keyX) || Phaser.Input.Keyboard.JustDown(this.keyJ) || touchThrow;
        const body = this.player.body as Phaser.Physics.Arcade.Body;

        if (this.swing) {
            // SPACE releases; ←/→ pump the pendulum
            if (ascendPressed) this.releaseSwing(left === right ? 0 : left ? -1 : 1);
            else this.updateSwing(delta, left, right);
            if (throwPressed) this.player.tryThrow(time);
            this.updateTrams();
            if (this.touchingSpike()) this.die();
            return;
        }

        this.player.move(left === right ? 0 : left ? -1 : 1, time);
        if (ascendPressed) this.player.tryAscend(time);
        const ascendReleased =
            Phaser.Input.Keyboard.JustUp(this.cursors.space) ||
            Phaser.Input.Keyboard.JustUp(this.cursors.up) ||
            Phaser.Input.Keyboard.JustUp(this.keyW) ||
            touchJumpUp;
        if (ascendReleased) this.player.cutJump();
        if (throwPressed) this.player.tryThrow(time);
        if (this.anchors.length) this.tryLatch(time);

        this.dust.setPosition(this.player.x, this.player.feetY);
        this.dust.emitting = this.player.grounded && Math.abs(body.velocity.x) > 60;

        if (this.autoScroll > 0) this.updateAutoScroll(delta);
        if (this.trams.length) this.updateTrams();
        if (this.beatBlocks.length) this.updateBeat(time);
        // landing on real ground (not mid-chain in the air) resets the trampoline climb
        if (this.player.grounded && time - this.lastAwningBounceAt > AWNING_RESET_MS) this.awningBounces = 0;
        this.updateCheckpoints();
        if (this.touchingSpike()) this.die();
        if (body.bottom >= this.killPlane) this.die(); // fell off the rooftops
    }

    private tryLatch(time: number): void {
        if (this.swing || time < this.relatchAt || this.player.grounded) return;
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const g = this.player.gravityDir;
        for (const a of this.anchors) {
            const dx = this.player.x - a.x;
            const dyRaw = this.player.y - a.y;
            const along = g * dyRaw; // distance down the rope (positive on the hanging side)
            if (Math.abs(dx) > 22 || along < -12 || along > 86) continue;
            const len = Phaser.Math.Clamp(Math.hypot(dx, dyRaw), 22, 64);
            const theta = Math.atan2(dx, along); // dx = len·sinθ, along = len·cosθ
            const omega = (body.velocity.x * Math.cos(theta) - g * body.velocity.y * Math.sin(theta)) / len;
            this.swing = {
                ax: a.x,
                ay: a.y,
                len,
                theta,
                omega: Phaser.Math.Clamp(omega, -SWING_OMEGA_MAX, SWING_OMEGA_MAX),
            };
            body.setAllowGravity(false);
            this.sound.play(AssetKeys.SfxJump, { volume: 0.25 });
            this.dust.emitting = false;
            return;
        }
    }

    private updateSwing(delta: number, left: boolean, right: boolean): void {
        const s = this.swing!;
        const dt = Math.min(delta, 32) / 1000;
        const g = this.player.gravityDir;
        s.omega += -SWING_W2 * Math.sin(s.theta) * dt;
        if (right && s.omega >= -0.2) s.omega += SWING_PUMP * dt;
        if (left && s.omega <= 0.2) s.omega -= SWING_PUMP * dt;
        s.omega = Phaser.Math.Clamp(s.omega * SWING_DAMP, -SWING_OMEGA_MAX, SWING_OMEGA_MAX);
        s.theta += s.omega * dt;
        // the rope goes taut at the top of the arc — clamp, don't spin over
        if (s.theta > SWING_THETA_MAX && s.omega > 0) { s.theta = SWING_THETA_MAX; s.omega = 0; }
        if (s.theta < -SWING_THETA_MAX && s.omega < 0) { s.theta = -SWING_THETA_MAX; s.omega = 0; }

        const px = s.ax + s.len * Math.sin(s.theta);
        const py = s.ay + g * s.len * Math.cos(s.theta);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.reset(px, py);
        this.player.setTexture(AssetKeys.SossoJump, 3);
        this.player.setFlipX(s.omega < 0);

        this.rope!.clear();
        this.rope!.lineStyle(1.5, 0xf0e9d8, 0.9);
        this.rope!.lineBetween(s.ax, s.ay, px, py);
    }

    private releaseSwing(inputDir: -1 | 0 | 1): void {
        const s = this.swing!;
        const g = this.player.gravityDir;
        const rawVx = s.len * s.omega * Math.cos(s.theta) * SWING_RELEASE;
        let vy = -g * s.len * s.omega * Math.sin(s.theta) * SWING_RELEASE;
        // forgiving: launch the way the player is holding (or the way they're
        // already going), never below a usable speed, with a small upward hop —
        // so letting go anywhere in the arc still carries Sosso across the gap
        const dir = inputDir !== 0 ? inputDir : Math.sign(rawVx) || (this.player.flipX ? -1 : 1);
        const vx = dir * Math.max(Math.abs(rawVx), SWING_MIN_LAUNCH);
        vy -= g * SWING_POP;
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(true);
        this.player.launch(vx, vy);
        this.swing = undefined;
        this.relatchAt = this.time.now + 320;
        this.rope!.clear();
        this.sound.play(AssetKeys.SfxFlip, { volume: 0.28 });
        this.burst.setParticleTint(0xf0e9d8);
        this.burst.explode(6, this.player.x, this.player.y);
    }

    private updateTrams(): void {
        for (const t of this.trams) {
            const b = t.sprite.body as Phaser.Physics.Arcade.Body;
            if (t.dir > 0 && t.sprite.x >= t.max) {
                t.dir = -1;
                b.setVelocityX(-TRAM_SPEED);
            } else if (t.dir < 0 && t.sprite.x <= t.min) {
                t.dir = 1;
                b.setVelocityX(TRAM_SPEED);
            }
        }
    }

    private onAwning(tile: Phaser.Tilemaps.Tile): void {
        if (tile.index !== vocab.tiles.awningA && tile.index !== vocab.tiles.awningB) return;
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const g = this.player.gravityDir;
        const landed = g === 1 ? body.blocked.down : body.blocked.up;
        if (!landed) return;
        if (this.cursors.down.isDown) return; // hold ↓ to kill the bounce and stop
        const v = Math.min(AWNING_BOUNCE_BASE + this.awningBounces * AWNING_BOUNCE_STEP, AWNING_BOUNCE_MAX);
        this.awningBounces += 1;
        this.lastAwningBounceAt = this.time.now;
        this.player.launch(body.velocity.x, -g * v);
        this.sound.play(AssetKeys.SfxJump, { volume: 0.3, detune: Math.min(this.awningBounces * 120, 600) });
        this.puff(0xd9534f, 5, this.player.x, this.player.feetY);
    }

    private createTram(x: number, y: number): void {
        const tram = this.physics.add.sprite(x, y, AssetKeys.Tram);
        const body = tram.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.setFriction(1, 0); // carries the rider along its roof
        body.setSize(68, 26);
        body.setVelocityX(TRAM_SPEED);
        this.trams.push({ sprite: tram, min: x - TRAM_AMP, max: x + TRAM_AMP, dir: 1 });
        this.physics.add.collider(this.player, tram);
        this.physics.add.collider(this.enemies, tram);
    }

    private createBeatBlock(x: number, y: number, phase: 0 | 1): void {
        const frame = phase === 0 ? TeatroFrames.BeatA : TeatroFrames.BeatB;
        const block = this.beatGroup!.create(x, y, AssetKeys.Teatro, frame) as Phaser.Physics.Arcade.Sprite;
        block.setDepth(1);
        this.beatBlocks.push({ sprite: block, phase });
    }

    // continuous, pause-safe beat: a bar is two beats (gold, then blue). Each
    // phase stays solid a little past half the bar so the two overlap at every
    // hand-off — a well-timed hop always finds a block underfoot. Solidity is
    // physics; the ghost alpha just shows where the next block will be.
    private updateBeat(time: number): void {
        const period = this.beatMs * 2;
        let m = (time - this.beatStart) % period;
        if (m < 0) m += period;
        const pos = m / period; // 0..1 through the bar
        const overlap = 0.16;
        const aSolid = pos <= 0.5 + overlap || pos >= 1 - overlap;
        const bSolid = pos >= 0.5 - overlap || pos <= overlap;
        for (const blk of this.beatBlocks) {
            const solid = blk.phase === 0 ? aSolid : bSolid;
            const body = blk.sprite.body as Phaser.Physics.Arcade.StaticBody;
            if (body.enable !== solid) {
                body.enable = solid;
                if (solid) {
                    this.tweens.add({
                        targets: blk.sprite,
                        scale: { from: 0.7, to: 1 },
                        duration: 130,
                        ease: 'back.out',
                    });
                }
            }
            blk.sprite.setAlpha(solid ? 1 : 0.22);
        }
    }

    private updateAutoScroll(delta: number): void {
        const cam = this.cameras.main;
        // worldView is empty until the camera's first render pass
        if (cam.worldView.width === 0) return;
        // the screen waits out the respawn grace — no spawn-kills by scenery.
        // scrollX is offset from the visible edge under zoom, so all edge math
        // below uses worldView instead; the camera clamps itself to its bounds.
        if (this.time.now >= this.graceUntil) {
            cam.scrollX += (this.autoScroll * delta) / 1000;
        }

        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const left = cam.worldView.x;
        const right = left + cam.worldView.width;
        // can't outrun the screen…
        if (body.right > right - 6) {
            body.x = right - 6 - body.width;
            if (body.velocity.x > 0) body.setVelocityX(0);
        }
        // …and falling behind it is fatal
        if (body.right < left) this.die();
    }

    private walkerConfig(spec: LevelSpec, ceiling: boolean) {
        const base = { ceiling, ground: this.ground, hazards: this.hazards, player: this.player };
        if (spec.theme === 'paris') {
            return {
                ...base,
                texture: AssetKeys.Npcs,
                frame: NpcFrames.Pigeon1,
                anim: AnimKeys.PigeonWalk,
                startle: !ceiling,
            };
        }
        if (spec.theme === 'brasil') {
            return {
                ...base,
                texture: AssetKeys.Npcs,
                frame: NpcFrames.Maritaca1,
                anim: AnimKeys.MaritacaWalk,
                startle: !ceiling,
            };
        }
        if (spec.theme === 'lisbon') {
            // Lisbon's streets are full of pigeons too — reuse the Paris flock
            return {
                ...base,
                texture: AssetKeys.Npcs,
                frame: NpcFrames.Pigeon1,
                anim: AnimKeys.PigeonWalk,
                startle: !ceiling,
            };
        }
        return base;
    }

    private createStinkyCage(x: number, y: number): void {
        const cage = this.physics.add.staticSprite(x, y, AssetKeys.Stinky, StinkyFrames.Caged);
        (cage.body as Phaser.Physics.Arcade.StaticBody).setSize(28, 28);
        this.physics.add.overlap(this.player, cage, () => {
            if (this.phase !== 'play') return;
            this.phase = 'cinematic';
            this.sound.play(AssetKeys.SfxHit, { volume: 0.5 });
            this.burst.setParticleTint(0xc4cad8);
            this.burst.explode(20, cage.x, cage.y);
            cage.destroy();

            const cat = this.add.sprite(x, y, AssetKeys.Stinky, StinkyFrames.Sit);
            cat.anims.play(AnimKeys.StinkyHappy);
            this.sound.play(AssetKeys.SfxWin, { volume: 0.6 });
            this.game.events.emit(GameEvents.StinkyRescued);
            this.cameras.main.flash(400, 255, 220, 230);

            const hearts = this.add.particles(0, 0, AssetKeys.Pixel, {
                x: { min: x - 20, max: x + 20 },
                y: y - 10,
                speedY: { min: -50, max: -20 },
                lifespan: 1200,
                scale: { start: 1.2, end: 0 },
                tint: 0xf08a9e,
                frequency: 90,
            });
            this.tweens.add({
                targets: cat,
                x: this.player.x + (this.player.flipX ? 18 : -18),
                duration: 900,
                delay: 800,
                ease: 'sine.inOut',
            });
            this.time.delayedCall(3000, () => {
                hearts.destroy();
                this.advanceLevel(600);
            });
        });
    }

    // mamãe e papai wait at the end of the beach; reaching them ends the game
    private createParents(x: number, y: number): void {
        const mom = this.add.sprite(x - 9, y - 3, AssetKeys.Parents, ParentFrames.Mom);
        const dad = this.add.sprite(x + 11, y - 3, AssetKeys.Parents, ParentFrames.Dad);
        const cat = this.add.sprite(x + 26, y - 1, AssetKeys.Stinky, StinkyFrames.Sit);
        cat.anims.play(AnimKeys.StinkyHappy);
        this.tweens.add({
            targets: [mom, dad],
            y: y - 5,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut',
        });

        const zone = this.add.zone(x, y - 9, 44, 36);
        this.physics.add.existing(zone, true);
        this.physics.add.overlap(this.player, zone, () => {
            if (this.phase !== 'play') return;
            this.phase = 'cinematic';
            (this.player.body as Phaser.Physics.Arcade.Body).stop();
            this.dust.emitting = false;
            this.sound.play(AssetKeys.SfxWin, { volume: 0.6 });
            this.game.events.emit(GameEvents.ParentsReunited);
            this.cameras.main.flash(400, 255, 225, 200);
            this.tweens.add({ targets: [mom, dad], scale: 1.08, duration: 250, yoyo: true, repeat: 3 });

            const hearts = this.add.particles(0, 0, AssetKeys.Pixel, {
                x: { min: x - 36, max: x + 36 },
                y: y - 14,
                speedY: { min: -55, max: -25 },
                lifespan: 1300,
                scale: { start: 1.3, end: 0 },
                tint: [0xf08a9e, 0xf3d27e],
                frequency: 70,
            });
            this.time.delayedCall(3200, () => {
                hearts.destroy();
                this.advanceLevel(600);
            });
        });
    }

    // Alex waits at the miradouro; reaching him ends the journey
    private createAlex(x: number, y: number): void {
        const alex = this.add.sprite(x, y - 3, AssetKeys.Alex, 0);
        const cat = this.add.sprite(x + 20, y - 1, AssetKeys.Stinky, StinkyFrames.Sit);
        cat.anims.play(AnimKeys.StinkyHappy);
        this.tweens.add({
            targets: alex,
            y: y - 5,
            duration: 950,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut',
        });

        const zone = this.add.zone(x, y - 9, 40, 36);
        this.physics.add.existing(zone, true);
        this.physics.add.overlap(this.player, zone, () => {
            if (this.phase !== 'play') return;
            this.phase = 'cinematic';
            (this.player.body as Phaser.Physics.Arcade.Body).stop();
            this.dust.emitting = false;
            this.sound.play(AssetKeys.SfxWin, { volume: 0.6 });
            this.game.events.emit(GameEvents.AlexReunited);
            this.cameras.main.flash(400, 255, 230, 180);
            this.tweens.add({ targets: alex, scale: 1.1, duration: 250, yoyo: true, repeat: 3 });

            const hearts = this.add.particles(0, 0, AssetKeys.Pixel, {
                x: { min: x - 30, max: x + 30 },
                y: y - 14,
                speedY: { min: -55, max: -25 },
                lifespan: 1300,
                scale: { start: 1.3, end: 0 },
                tint: [0xf08a9e, 0xf3d27e, 0x7df0ff],
                frequency: 70,
            });
            this.time.delayedCall(3200, () => {
                hearts.destroy();
                this.advanceLevel(600);
            });
        });
    }

    private advanceLevel(fadeMs = 450): void {
        this.phase = 'won';
        const lastLevel = this.levelIndex === LEVELS.length - 1;
        this.cameras.main.fadeOut(fadeMs, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.stop(SceneKeys.UI);
            if (lastLevel) {
                this.scene.start(SceneKeys.GameOver);
            } else {
                this.scene.start(SceneKeys.Game, { level: this.levelIndex + 1 });
            }
        });
    }

    private addSoft(enemy: Phaser.Physics.Arcade.Sprite, oid?: number): void {
        enemy.setData('soft', true);
        if (oid !== undefined) enemy.setData('oid', oid);
        enemy.on(WalkerEvents.Turned, (x: number, y: number) => this.puff(0xb89a6a, 3, x, y));
        enemy.on(WalkerEvents.Startled, (x: number, y: number) => this.puff(0xe8ecf2, 8, x, y));
        this.enemies.add(enemy);
    }

    // jumping onto a walking enemy from above squashes it and bounces Sosso.
    // "above" follows her gravity so it also works while ceiling-walking. Saws
    // (not soft), flying bats, and the boss (separate overlap) are immune.
    private tryStomp(enemy: Phaser.Physics.Arcade.Sprite): boolean {
        if (enemy.getData('soft') !== true || enemy.getData('flying') === true) return false;
        const dir = this.player.gravityDir;
        const pb = this.player.body as Phaser.Physics.Arcade.Body;
        const eb = enemy.body as Phaser.Physics.Arcade.Body;
        const falling = pb.velocity.y * dir > 4;
        const fromFeetSide = (eb.center.y - pb.center.y) * dir > 0;
        if (!falling || !fromFeetSide) return false;
        this.squashEnemy(enemy);
        pb.setVelocityY(-STOMP_BOUNCE * dir);
        this.sound.play(AssetKeys.SfxJump, { volume: 0.3 });
        return true;
    }

    private squashEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
        const oid = enemy.getData('oid') as number | undefined;
        if (oid !== undefined) this.killedEnemies.add(oid);
        this.sound.play(AssetKeys.SfxHurt, { volume: 0.5 });
        (enemy.body as Phaser.Physics.Arcade.Body).enable = false;
        this.burst.setParticleTint(0xffffff);
        this.burst.explode(12, enemy.x, enemy.y);
        this.tweens.add({
            targets: enemy,
            scaleY: 0.2,
            scaleX: 1.4,
            alpha: 0,
            duration: 200,
            onComplete: () => enemy.destroy(),
        });
    }

    private spawnLindy(x: number, y: number): void {
        this.lindy = new Lindy(this, x, y, this.player);
        this.physics.add.collider(this.lindy, this.ground);
        this.physics.add.overlap(this.player, this.lindy, () => this.die());
        this.physics.add.overlap(this.bagels, this.lindy, (bagelObj) => {
            const bagel = bagelObj as Bagel;
            if (!this.lindy || this.phase !== 'play') return;
            this.puff(0xcf9a5e, 6, bagel.x, bagel.y);
            bagel.destroy();
            if (this.lindy.hit(this.time.now)) this.sound.play(AssetKeys.SfxHurt, { volume: 0.55 });
        });
        this.lindy.on(LindyEvents.Shoot, (sx: number, sy: number, dir: number, low: boolean) => {
            // low pins skim the floor (jump them), lobs arc overhead (walk under)
            this.shots.add(
                low
                    ? new Shot(this, sx, sy + 6, ItemFrames.Pin, 200 * dir, -40)
                    : new Shot(this, sx, sy, ItemFrames.Pin, 110 * dir, -250),
            );
        });
        this.lindy.on(LindyEvents.Slam, (lx: number, ly: number) => {
            // rolling-pin shockwave skimming the floor both ways — jump it
            this.cameras.main.shake(220, 0.013);
            this.puff(0xcf9a5e, 12, lx, ly + 12);
            this.shots.add(new Shot(this, lx, ly + 8, ItemFrames.Pin, 240, -40));
            this.shots.add(new Shot(this, lx, ly + 8, ItemFrames.Pin, -240, -40));
        });
        this.lindy.on(LindyEvents.Hp, (hp: number) => {
            this.game.events.emit(GameEvents.BossHp, hp, LINDY_MAX_HP);
        });
        this.lindy.on(LindyEvents.Defeated, (lx: number, ly: number) => this.defeatLindy(lx, ly));
        this.game.events.emit(GameEvents.BossHp, this.lindy.hp, LINDY_MAX_HP);
    }

    private defeatLindy(x: number, y: number): void {
        this.bossDefeated = true;
        this.cameras.main.shake(250, 0.01);
        this.burst.setParticleTint(0xf3d27e);
        this.burst.explode(40, x, y);
        this.sound.play(AssetKeys.SfxDeath, { volume: 0.5 });
        this.lindy?.destroy();
        this.lindy = undefined;

        const golden = this.physics.add.staticSprite(x, y - 6, AssetKeys.Items, ItemFrames.GoldenBagel);
        (golden.body as Phaser.Physics.Arcade.StaticBody).setSize(30, 30);
        this.tweens.add({ targets: golden, y: y - 14, duration: 900, yoyo: true, repeat: -1, ease: 'sine.inOut' });
        this.tweens.add({ targets: golden, alpha: 0.65, duration: 450, yoyo: true, repeat: -1 });
        this.physics.add.overlap(this.player, golden, () => {
            golden.destroy();
            this.unlockFlip();
        });
    }

    // eating the anti-gravity bagel: the world holds its breath, Sosso
    // levitates in a column of upward gold, spins, and gravity lets go
    private unlockFlip(): void {
        if (this.phase !== 'play') return;
        this.phase = 'cinematic';
        this.registry.set(RegKeys.FlipUnlocked, true);
        const cam = this.cameras.main;
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.stop();
        body.setAllowGravity(false);
        this.player.anims.stop();
        this.sound.play(AssetKeys.SfxWin, { volume: 0.6 });

        cam.zoomTo(2.6, 600, 'Sine.easeInOut');
        const rain = this.add.particles(0, 0, AssetKeys.Pixel, {
            x: { min: this.player.x - 36, max: this.player.x + 36 },
            y: { min: this.player.y - 10, max: this.player.y + 40 },
            speedY: { min: -140, max: -60 },
            speedX: { min: -10, max: 10 },
            lifespan: 800,
            scale: { start: 1.3, end: 0 },
            tint: [0xf7d976, 0xffe9a8, 0xe8b53a],
            frequency: 18,
        });
        this.tweens.add({ targets: this.player, y: this.player.y - 24, duration: 1100, ease: 'sine.out' });
        this.tweens.add({ targets: this.player, angle: 360, duration: 800, delay: 700, ease: 'sine.inOut' });
        this.time.delayedCall(900, () => this.sound.play(AssetKeys.SfxFlip, { volume: 0.5 }));
        this.time.delayedCall(1500, () => {
            cam.flash(350, 255, 235, 160);
            cam.shake(200, 0.006);
            this.burst.setParticleTint(0xf7d976);
            this.burst.explode(40, this.player.x, this.player.y);
            this.game.events.emit(GameEvents.FlipUnlocked);
        });
        this.time.delayedCall(2400, () => {
            rain.stop();
            this.player.setAngle(0);
            body.setAllowGravity(true);
            this.player.canFlip = true;
            this.player.canJump = false;
            cam.zoomTo(2, 450, 'Sine.easeInOut');
            this.phase = 'play';
            this.time.delayedCall(900, () => rain.destroy());
        });
    }

    // flags are proximity beacons: they save the player's actual footing
    // (and gravity direction) while grounded nearby, so respawns never
    // drop into a shaft — even from mid-air flags in the tower. A flag
    // refuses to arm while an enemy is close (no saving doomed spots).
    private updateCheckpoints(): void {
        if (!this.player.grounded) return;
        for (const flag of this.flags) {
            if (Math.abs(this.player.x - flag.x) > 58 || Math.abs(this.player.y - flag.y) > 58) continue;
            const danger = this.enemies.getChildren().some((e) => {
                const foe = e as Phaser.Physics.Arcade.Sprite;
                return foe.active && Math.abs(foe.x - this.player.x) < 48 && Math.abs(foe.y - this.player.y) < 36;
            });
            if (danger) continue;
            this.checkpoint = { x: this.player.x, y: this.player.y - 2, grav: this.player.gravityDir };
            if (!this.touchedFlags.has(flag.id)) {
                this.touchedFlags.add(flag.id);
                this.armFlagFx(flag.x, flag.y, true);
                this.sound.play(AssetKeys.SfxHeal, { volume: 0.4 });
            }
        }
    }

    private armFlagFx(x: number, y: number, fresh: boolean): void {
        // armed flags keep a gentle green shimmer
        this.add.particles(x, y - 4, AssetKeys.Pixel, {
            frequency: 380,
            speedY: { min: -22, max: -10 },
            speedX: { min: -6, max: 6 },
            lifespan: 700,
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.9, end: 0 },
            tint: 0x9bf6a3,
        });
        if (!fresh) return;
        this.sound.play(AssetKeys.SfxGem, { volume: 0.5 });
        this.burst.setParticleTint(0x9bf6a3);
        this.burst.explode(18, x, y);
        const label = this.add
            .text(x, y - 16, 'CHECKPOINT', {
                fontFamily: '"Courier New", monospace',
                fontStyle: 'bold',
                fontSize: 10,
                color: '#9bf6a3',
                stroke: '#1a1c2c',
                strokeThickness: 3,
            })
            .setOrigin(0.5);
        this.tweens.add({
            targets: label,
            y: y - 34,
            alpha: 0,
            duration: 1100,
            ease: 'sine.out',
            onComplete: () => label.destroy(),
        });
    }

    // spikes only fill the surface half of their tile; kill on the graphic, not the cell
    private touchingSpike(): boolean {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const tiles = this.hazards.getTilesWithinWorldXY(body.x, body.y, body.width, body.height);
        return tiles.some((t) => {
            if (t.index === -1) return false;
            const top = t.pixelY + (t.flipY ? 0 : 8);
            const bottom = t.pixelY + (t.flipY ? 10 : 18);
            const left = t.pixelX + 2;
            const right = t.pixelX + 16;
            return body.x < right && body.right > left && body.y < bottom && body.bottom > top;
        });
    }

    private collectGem(gem: Phaser.Physics.Arcade.Sprite): void {
        gem.disableBody(true, false);
        const oid = gem.getData('oid') as number | undefined;
        if (oid !== undefined) this.collectedGems.add(oid); // survives a respawn
        this.attemptGems += 1;
        this.registry.inc(RegKeys.Gems, 1);
        this.sound.play(AssetKeys.SfxGem, { volume: 0.45 });
        this.burst.setParticleTint(0xf3d27e);
        this.burst.explode(10, gem.x, gem.y);
        this.tweens.add({
            targets: gem,
            scale: 1.8,
            alpha: 0,
            duration: 180,
            onComplete: () => gem.destroy(),
        });
    }

    private createDoorSensor(x: number, y: number, locked: boolean): void {
        const zone = this.add.zone(x, y - 9, 14, 32);
        this.physics.add.existing(zone, true);
        this.physics.add.overlap(this.player, zone, () => {
            if (!locked || this.bossDefeated) this.enterDoor();
        });
    }

    private enterDoor(): void {
        if (this.phase !== 'play') return;
        const lastLevel = this.levelIndex === LEVELS.length - 1;
        this.sound.play(lastLevel ? AssetKeys.SfxWin : AssetKeys.SfxDoor, { volume: 0.6 });
        this.dust.emitting = false;
        (this.player.body as Phaser.Physics.Arcade.Body).stop();
        this.tweens.add({ targets: this.player, alpha: 0, scale: 0.4, duration: 350 });
        this.advanceLevel();
    }

    private die(): void {
        if (this.phase !== 'play' || this.time.now < this.graceUntil) return;
        this.phase = 'dead';
        if (this.swing) {
            this.swing = undefined;
            this.rope?.clear();
            (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        }
        this.sound.play(AssetKeys.SfxDeath, { volume: 0.5 });
        this.burst.setParticleTint(0xff5a5a);
        this.burst.explode(26, this.player.x, this.player.y);
        this.player.setVisible(false);
        (this.player.body as Phaser.Physics.Arcade.Body).stop();
        (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
        this.dust.emitting = false;
        this.cameras.main.shake(180, 0.012);
        this.registry.inc(RegKeys.Deaths, 1);
        this.time.delayedCall(650, () => this.restart(true));
    }

    private restart(fromDeath: boolean): void {
        if (!fromDeath && this.phase !== 'play') return;
        // dying keeps the bagels you grabbed this level (banked + skipped on
        // respawn); a manual restart (R) wipes the attempt for a fresh run
        if (!fromDeath) {
            this.registry.inc(RegKeys.Gems, -this.attemptGems);
            this.collectedGems.clear();
        }
        this.scene.restart({
            level: this.levelIndex,
            died: true,
            spawnX: this.checkpoint?.x,
            spawnY: this.checkpoint?.y,
            spawnGrav: this.checkpoint?.grav,
            killed: [...this.killedEnemies],
            flagsTouched: [...this.touchedFlags],
            collected: [...this.collectedGems],
        } satisfies GameData);
    }

    private puff(tint: number, count: number, x: number, y: number): void {
        this.burst.setParticleTint(tint);
        this.burst.explode(count, x, y);
    }

    private zoomPunch(): void {
        const cam = this.cameras.main;
        this.tweens.add({
            targets: cam,
            zoom: VIEW_ZOOM * 1.04,
            duration: 70,
            yoyo: true,
            ease: 'sine.out',
            onComplete: () => cam.setZoom(VIEW_ZOOM),
        });
    }

    private addParallax(spec: LevelSpec, mapWidth: number, mapHeight: number): void {
        if (spec.theme === 'teatro') {
            // a grand concert hall: gilded boxes recede in tiers, a red valance
            // swags across the top, chandeliers glow over the stalls
            const drawBoxes = (
                gfx: Phaser.GameObjects.Graphics,
                span: number,
                boxW: number,
                gap: number,
                top: number,
                boxH: number,
            ): void => {
                for (let x = 12; x < span; x += boxW + gap) {
                    gfx.fillStyle(0x140a14, 1);
                    gfx.fillRect(x, top, boxW, boxH);
                    gfx.fillStyle(0x6e1b28, 1);
                    gfx.fillRect(x, top, boxW, 3); // drape over the box mouth
                    gfx.fillStyle(0x2a1a22, 1);
                    for (let i = 0; i < 3; i++) gfx.fillRect(x + 5 + i * 6, top + boxH - 8, 3, 4); // silhouetted heads
                    gfx.lineStyle(2, 0xb8923a, 0.85);
                    gfx.strokeRect(x, top, boxW, boxH); // gilt frame
                    gfx.fillStyle(0xe8c45a, 0.9);
                    gfx.fillRect(x, top + boxH - 3, boxW, 2); // gold rail
                }
            };
            const far = this.add.graphics().setScrollFactor(0.25, 1).setDepth(-8);
            const near = this.add.graphics().setScrollFactor(0.5, 1).setDepth(-6);
            const farSpan = mapWidth * 0.25 + 960;
            const nearSpan = mapWidth * 0.5 + 960;
            drawBoxes(far, farSpan, 42, 16, mapHeight - 150, 34);
            drawBoxes(far, farSpan, 42, 16, mapHeight - 108, 34);
            drawBoxes(near, nearSpan, 56, 22, mapHeight - 76, 40);
            const valance = this.add.graphics().setScrollFactor(0.25, 1).setDepth(-7);
            valance.fillStyle(0x6e1b28, 1);
            valance.fillRect(0, 0, farSpan, 16);
            valance.fillStyle(0x8a2434, 1);
            for (let x = 0; x < farSpan; x += 20) valance.fillTriangle(x, 16, x + 20, 16, x + 10, 28);
            valance.lineStyle(2, 0xe8c45a, 0.8);
            for (let x = 0; x < farSpan; x += 20) {
                valance.lineBetween(x, 16, x + 10, 28);
                valance.lineBetween(x + 10, 28, x + 20, 16);
            }
            const chSpan = mapWidth * 0.5 + 960;
            for (let x = 160; x < chSpan; x += 260) {
                const glow = this.add
                    .image(x, mapHeight - 168, AssetKeys.Pixel)
                    .setScrollFactor(0.5, 1)
                    .setScale(11)
                    .setTint(0xf7e08a)
                    .setAlpha(0.16)
                    .setDepth(-6);
                this.add
                    .image(x, mapHeight - 168, AssetKeys.Pixel)
                    .setScrollFactor(0.5, 1)
                    .setScale(3.2)
                    .setTint(0xfff2c0)
                    .setDepth(-5);
                this.tweens.add({
                    targets: glow,
                    alpha: 0.07,
                    duration: 1300 + (x % 4) * 140,
                    yoyo: true,
                    repeat: -1,
                    ease: 'sine.inOut',
                });
            }
            return;
        }
        if (spec.theme === 'brasil') {
            const ride = mapWidth - 480;
            const seenAt = (p: number, sf: number, off: number) => ride * p * sf + 240 * (1 - sf) + off;
            if (!spec.autoScroll) {
                // static beach level: Serra do Mar behind the sand all the way
                for (const p of [0, 0.35, 0.7, 1]) {
                    this.add
                        .image(seenAt(p, 0.3, 240), mapHeight - 18, AssetKeys.Serra)
                        .setOrigin(0.5, 1)
                        .setScrollFactor(0.3, 1)
                        .setScale(2.4)
                        .setAlpha(0.55);
                }
                const shore = [2, 3, 0, 2]; // palms, kiosks, beach houses
                for (let x = 0; x < ride * 0.35 + 720; x += 24) {
                    this.add
                        .image(x, mapHeight - 18, AssetKeys.Brasil, shore[(x / 24) % shore.length])
                        .setOrigin(0, 1)
                        .setScrollFactor(0.35, 1)
                        .setScale(1.4)
                        .setAlpha(0.9);
                }
                return;
            }
            // the ride to the coast: São Paulo skyline (MASP, Banespa, Copan,
            // Ponte Estaiada) gives way to the Serra do Mar. Parallax compresses
            // placement: an element with scroll factor s is on screen at camera
            // progress p when x ≈ ride·p·s + 240·(1−s), NOT at p·mapWidth.
            for (const off of [90, 350]) {
                this.add
                    .image(seenAt(0, 0.3, off), mapHeight - 64, AssetKeys.Sampa)
                    .setOrigin(0.5, 1)
                    .setScrollFactor(0.3, 1)
                    .setScale(2.4)
                    .setAlpha(0.6);
            }
            for (const off of [40, 210, 380]) {
                this.add
                    .image(seenAt(1, 0.3, off), mapHeight - 18, AssetKeys.Serra)
                    .setOrigin(0.5, 1)
                    .setScrollFactor(0.3, 1)
                    .setScale(2.4)
                    .setAlpha(0.6);
            }
            const city = [4, 0, 5, 1]; // cityA, favela, cityB, favela
            const outskirts = [1, 2, 5, 0];
            const coast = [2, 3, 0, 2]; // palms and beach kiosks
            const stripSpan = ride * 0.35 + 720;
            for (let x = 0; x < stripSpan; x += 24) {
                const p = (x - 396) / (ride * 0.35); // progress when this column is on screen
                const set = p < 0.42 ? city : p < 0.62 ? outskirts : coast;
                this.add
                    .image(x, mapHeight - 18, AssetKeys.Brasil, set[(x / 24) % set.length])
                    .setOrigin(0, 1)
                    .setScrollFactor(0.35, 1)
                    .setScale(1.4)
                    .setAlpha(0.9);
            }
            return;
        }
        if (spec.theme === 'lisbon') {
            // a sea of red roofs behind everything: Sé, the bridge, the castelo
            const span = mapWidth * 0.3 + 720;
            for (let x = 0; x < span; x += 220) {
                this.add
                    .image(x, mapHeight - 18, AssetKeys.Lisboa)
                    .setOrigin(0, 1)
                    .setScrollFactor(0.3, 1)
                    .setScale(2.4)
                    .setAlpha(0.6);
            }
            const frames = spec.bgFrames;
            for (let x = 0; x < mapWidth + 480; x += 24) {
                this.add
                    .image(x, mapHeight - 18, AssetKeys.LisboaStrip, frames[(x / 24) % frames.length])
                    .setOrigin(0, 1)
                    .setScrollFactor(0.35, 1)
                    .setScale(1.4)
                    .setAlpha(0.92);
            }
            return;
        }
        if (spec.theme === 'paris') {
            // tall maps are climbed from inside the tower — no exterior Eiffel
            if (mapHeight <= 540) {
                for (const fx of [0.3, 0.75]) {
                    this.add
                        .image(mapWidth * fx, mapHeight - 18, AssetKeys.Eiffel)
                        .setOrigin(0.5, 1)
                        .setScrollFactor(0.15, 1)
                        .setScale(1.7)
                        .setAlpha(0.55);
                }
            }
            for (let x = 0; x < mapWidth + 480; x += 24) {
                const frame = spec.bgFrames[(x / 24) % spec.bgFrames.length];
                this.add
                    .image(x, mapHeight - 18, AssetKeys.Paris, frame)
                    .setOrigin(0, 1)
                    .setScrollFactor(0.35, 1)
                    .setScale(1.4)
                    .setAlpha(0.9);
            }
            return;
        }
        for (let x = 0; x < mapWidth + 480; x += 24) {
            const frame = spec.bgFrames[(x / 24) % spec.bgFrames.length];
            this.add
                .image(x, mapHeight - 30, AssetKeys.Backgrounds, frame)
                .setOrigin(0, 1)
                .setScrollFactor(0.35, 1)
                .setScale(1.6)
                .setAlpha(0.85);
        }
    }
}
