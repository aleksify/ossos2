import * as Phaser from 'phaser';
import { SceneKeys } from './keys';
import { AnimKeys, AssetKeys, GameEvents, ItemFrames, NpcFrames, StinkyFrames, TileFrames } from '../assets/keys';
import vocab from '../assets/level-vocab.json';
import { LEVELS, LevelSpec } from '../systems/levels';
import { RegKeys } from '../systems/state';
import { Player, PlayerEvents } from '../entities/Player';
import { Walker } from '../entities/Walker';
import { Saw } from '../entities/Saw';
import { Bat } from '../entities/Bat';
import { Karen, KarenEvents } from '../entities/Karen';
import { Lindy, LindyEvents, LINDY_MAX_HP } from '../entities/Lindy';
import { Bagel } from '../entities/Bagel';
import { Shot } from '../entities/Shot';

const VIEW_ZOOM = 2;

type Phase = 'play' | 'dead' | 'won' | 'cinematic';

interface GameData {
    level?: number;
    died?: boolean;
    spawnX?: number;
    spawnY?: number;
}

export class Game extends Phaser.Scene {
    private levelIndex = 0;
    private phase: Phase = 'play';
    private fromDeath = false;
    private checkpoint?: { x: number; y: number };
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
    private burst!: Phaser.GameObjects.Particles.ParticleEmitter;
    private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
    private attemptGems = 0;
    private skyFade?: { from: Phaser.Display.Color; to: Phaser.Display.Color; range: number };

    constructor() {
        super(SceneKeys.Game);
    }

    init(data: GameData): void {
        this.levelIndex = data.level ?? 0;
        this.fromDeath = data.died ?? false;
        this.checkpoint = data.spawnX !== undefined ? { x: data.spawnX, y: data.spawnY! } : undefined;
        this.phase = 'play';
        this.bossDefeated = false;
        this.lindy = undefined;
        this.attemptGems = 0;
    }

    create(): void {
        const spec = LEVELS[this.levelIndex];
        const map = this.make.tilemap({ key: spec.key });
        const tilesets = [
            map.addTilesetImage(vocab.tileset, AssetKeys.Tiles)!,
            map.addTilesetImage('iron', AssetKeys.Iron)!,
        ];

        this.cameras.main.setBackgroundColor(spec.sky);
        this.addParallax(spec, map.widthInPixels, map.heightInPixels);

        this.ground = map.createLayer(vocab.layers.ground, tilesets) as Phaser.Tilemaps.TilemapLayer;
        map.createLayer(vocab.layers.deco, tilesets);
        this.hazards = map.createLayer(vocab.layers.hazards, tilesets) as Phaser.Tilemaps.TilemapLayer;
        this.ground.setCollisionByExclusion([-1]);
        this.hazards.setCollisionByExclusion([-1]);

        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

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
        this.player.canFlip = spec.flip || (this.registry.get(RegKeys.FlipUnlocked) as boolean);
        this.player.canJump = !this.player.canFlip;

        this.enemies = this.add.group();
        this.bagels = this.add.group();
        this.shots = this.add.group();
        const gems = this.physics.add.staticGroup();
        const collectibleTexture = spec.collectible === 'gem' ? AssetKeys.Tiles : AssetKeys.Items;
        const collectibleFrame =
            spec.collectible === 'gem'
                ? TileFrames.Gem
                : spec.collectible === 'bagel'
                  ? ItemFrames.Bagel
                  : ItemFrames.Croissant;

        for (const obj of objects) {
            const x = obj.x ?? 0;
            const y = obj.y ?? 0;
            switch (obj.type) {
                case vocab.objects.gem: {
                    const gem = gems.create(x, y, collectibleTexture, collectibleFrame) as Phaser.Physics.Arcade.Sprite;
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
                    this.addSoft(new Walker(this, x, y, this.walkerConfig(spec, false)));
                    break;
                case vocab.objects.walkerCeiling:
                    this.addSoft(new Walker(this, x, y, this.walkerConfig(spec, true)));
                    break;
                case vocab.objects.customer:
                    this.addSoft(Walker.customer(this, x, y, this.ground, this.hazards));
                    break;
                case vocab.objects.karen: {
                    const karen = new Karen(this, x, y, this.player);
                    karen.on(KarenEvents.Shoot, (sx: number, sy: number, dir: number) => {
                        this.shots.add(new Shot(this, sx, sy, ItemFrames.Coffee, 110 * dir, -240));
                    });
                    this.addSoft(karen);
                    break;
                }
                case vocab.objects.saw:
                    this.enemies.add(new Saw(this, x, y));
                    break;
                case vocab.objects.bat:
                    this.addSoft(new Bat(this, x, y));
                    break;
                case vocab.objects.lindy:
                    this.spawnLindy(x, y);
                    break;
                case vocab.objects.checkpoint:
                    this.createCheckpoint(x, y);
                    break;
                case vocab.objects.stinky:
                    this.createStinkyCage(x, y);
                    break;
                case vocab.objects.door:
                    this.createDoorSensor(x, y, spec.boss === true);
                    break;
            }
        }

        this.physics.add.collider(this.player, this.ground);
        this.physics.add.collider(this.enemies, this.ground);
        this.physics.add.overlap(this.player, gems, (_p, gemObj) => {
            this.collectGem(gemObj as Phaser.Physics.Arcade.Sprite);
        });
        this.physics.add.overlap(this.player, this.enemies, () => this.die());
        this.physics.add.overlap(this.player, this.shots, (_p, shot) => {
            if (this.phase === 'play') {
                shot.destroy();
                this.die();
            }
        });
        this.physics.add.collider(this.shots, this.ground, (shot) => {
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
            this.sound.play(AssetKeys.SfxThrow, { volume: 0.35 });
            this.bagels.add(new Bagel(this, this.player.x + dir * 10, this.player.y - 2, dir));
        });
        this.player.on(PlayerEvents.Land, () => {
            this.tweens.add({
                targets: this.player,
                scaleY: 0.82,
                duration: 60,
                yoyo: true,
                ease: 'sine.out',
            });
        });

        const cam = this.cameras.main;
        cam.setZoom(VIEW_ZOOM);
        cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        cam.startFollow(this.player, true, 0.12, 0.12);
        cam.fadeIn(300, 0, 0, 0);

        const keyboard = this.input.keyboard!;
        this.cursors = keyboard.createCursorKeys();
        this.keyA = keyboard.addKey('A');
        this.keyD = keyboard.addKey('D');
        this.keyW = keyboard.addKey('W');
        this.keyX = keyboard.addKey('X');
        this.keyJ = keyboard.addKey('J');
        keyboard.on('keydown-R', () => this.restart(false));
        keyboard.on('keydown-ESC', () => {
            this.scene.stop(SceneKeys.UI);
            this.scene.start(SceneKeys.Menu);
        });

        this.scene.launch(SceneKeys.UI, { level: this.levelIndex, died: this.fromDeath });
    }

    update(time: number): void {
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

        const left = this.cursors.left.isDown || this.keyA.isDown;
        const right = this.cursors.right.isDown || this.keyD.isDown;
        this.player.move(left === right ? 0 : left ? -1 : 1, time);

        const ascendPressed =
            Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
            Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
            Phaser.Input.Keyboard.JustDown(this.keyW);
        if (ascendPressed) this.player.tryAscend(time);
        const ascendReleased =
            Phaser.Input.Keyboard.JustUp(this.cursors.space) ||
            Phaser.Input.Keyboard.JustUp(this.cursors.up) ||
            Phaser.Input.Keyboard.JustUp(this.keyW);
        if (ascendReleased) this.player.cutJump();

        if (Phaser.Input.Keyboard.JustDown(this.keyX) || Phaser.Input.Keyboard.JustDown(this.keyJ)) {
            this.player.tryThrow(time);
        }

        this.dust.setPosition(this.player.x, this.player.feetY);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        this.dust.emitting = this.player.grounded && Math.abs(body.velocity.x) > 60;

        if (this.touchingSpike()) this.die();
    }

    private walkerConfig(spec: LevelSpec, ceiling: boolean) {
        const base = { ceiling, ground: this.ground, hazards: this.hazards };
        if (spec.theme !== 'paris') return base;
        return {
            ...base,
            texture: AssetKeys.Npcs,
            frame: NpcFrames.Pigeon1,
            anim: AnimKeys.PigeonWalk,
        };
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
                this.enterEnding();
            });
        });
    }

    private enterEnding(): void {
        this.phase = 'won';
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.stop(SceneKeys.UI);
            this.scene.start(SceneKeys.GameOver);
        });
    }

    private addSoft(enemy: Phaser.Physics.Arcade.Sprite): void {
        enemy.setData('soft', true);
        this.enemies.add(enemy);
    }

    private squashEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
        this.sound.play(AssetKeys.SfxHit, { volume: 0.45 });
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
            if (this.lindy.hit(this.time.now)) this.sound.play(AssetKeys.SfxHit, { volume: 0.5 });
        });
        this.lindy.on(LindyEvents.Shoot, (sx: number, sy: number, dir: number) => {
            this.shots.add(new Shot(this, sx, sy, ItemFrames.Pin, 140 * dir, -220));
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

    private unlockFlip(): void {
        if (this.phase !== 'play') return;
        this.phase = 'cinematic';
        this.registry.set(RegKeys.FlipUnlocked, true);
        this.sound.play(AssetKeys.SfxWin, { volume: 0.6 });
        this.burst.setParticleTint(0xf7d976);
        this.burst.explode(36, this.player.x, this.player.y);
        this.cameras.main.flash(400, 255, 235, 160);
        this.game.events.emit(GameEvents.FlipUnlocked);
        this.time.delayedCall(2200, () => {
            this.player.canFlip = true;
            this.player.canJump = false;
            this.phase = 'play';
        });
    }

    private createCheckpoint(x: number, y: number): void {
        const zone = this.add.zone(x, y, 18, 36);
        this.physics.add.existing(zone, true);
        this.physics.add.overlap(this.player, zone, () => {
            if (this.checkpoint?.x === x) return;
            this.checkpoint = { x, y };
            this.sound.play(AssetKeys.SfxGem, { volume: 0.3 });
            this.burst.setParticleTint(0x9bf6a3);
            this.burst.explode(10, x, y);
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
        this.phase = 'won';
        const lastLevel = this.levelIndex === LEVELS.length - 1;
        this.sound.play(lastLevel ? AssetKeys.SfxWin : AssetKeys.SfxDoor, { volume: 0.6 });
        this.dust.emitting = false;
        (this.player.body as Phaser.Physics.Arcade.Body).stop();
        this.tweens.add({ targets: this.player, alpha: 0, scale: 0.4, duration: 350 });
        this.cameras.main.fadeOut(450, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.stop(SceneKeys.UI);
            if (lastLevel) {
                this.scene.start(SceneKeys.GameOver);
            } else {
                this.scene.start(SceneKeys.Game, { level: this.levelIndex + 1 });
            }
        });
    }

    private die(): void {
        if (this.phase !== 'play') return;
        this.phase = 'dead';
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
        // gems picked up this attempt come back with the level
        this.registry.inc(RegKeys.Gems, -this.attemptGems);
        this.scene.restart({
            level: this.levelIndex,
            died: true,
            spawnX: this.checkpoint?.x,
            spawnY: this.checkpoint?.y,
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
