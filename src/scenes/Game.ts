import * as Phaser from 'phaser';
import { SceneKeys } from './keys';
import { AssetKeys, TileFrames } from '../assets/keys';
import vocab from '../assets/level-vocab.json';
import { LEVELS } from '../systems/levels';
import { RegKeys } from '../systems/state';
import { Player, PlayerEvents } from '../entities/Player';
import { Walker } from '../entities/Walker';
import { Saw } from '../entities/Saw';
import { Bat } from '../entities/Bat';

const VIEW_ZOOM = 2;
const LEVEL_HEIGHT = 270;

type Phase = 'play' | 'dead' | 'won';

export class Game extends Phaser.Scene {
    private levelIndex = 0;
    private phase: Phase = 'play';
    private player!: Player;
    private ground!: Phaser.Tilemaps.TilemapLayer;
    private hazards!: Phaser.Tilemaps.TilemapLayer;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private keyA!: Phaser.Input.Keyboard.Key;
    private keyD!: Phaser.Input.Keyboard.Key;
    private keyW!: Phaser.Input.Keyboard.Key;
    private burst!: Phaser.GameObjects.Particles.ParticleEmitter;
    private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
    private attemptGems = 0;

    constructor() {
        super(SceneKeys.Game);
    }

    private fromDeath = false;

    init(data: { level?: number; died?: boolean }): void {
        this.levelIndex = data.level ?? 0;
        this.fromDeath = data.died ?? false;
        this.phase = 'play';
        this.attemptGems = 0;
    }

    create(): void {
        const spec = LEVELS[this.levelIndex];
        const map = this.make.tilemap({ key: spec.key });
        const tileset = map.addTilesetImage(vocab.tileset, AssetKeys.Tiles)!;

        this.cameras.main.setBackgroundColor(spec.sky);
        this.addParallax(spec.bgFrames, map.widthInPixels);

        this.ground = map.createLayer(vocab.layers.ground, tileset) as Phaser.Tilemaps.TilemapLayer;
        map.createLayer(vocab.layers.deco, tileset);
        this.hazards = map.createLayer(vocab.layers.hazards, tileset) as Phaser.Tilemaps.TilemapLayer;
        this.ground.setCollisionByExclusion([-1]);
        this.hazards.setCollisionByExclusion([-1]);

        this.physics.world.setBounds(0, 0, map.widthInPixels, LEVEL_HEIGHT);

        const objects = map.getObjectLayer(vocab.layers.objects)?.objects ?? [];
        const spawn = objects.find((o) => o.type === vocab.objects.spawn);
        this.player = new Player(this, spawn?.x ?? 32, spawn?.y ?? 32);

        const enemies = this.physics.add.group();
        const gems = this.physics.add.staticGroup();
        for (const obj of objects) {
            const x = obj.x ?? 0;
            const y = obj.y ?? 0;
            switch (obj.type) {
                case vocab.objects.gem: {
                    const gem = gems.create(x, y, AssetKeys.Tiles, TileFrames.Gem) as Phaser.Physics.Arcade.Sprite;
                    // generous pickup zone — ceiling riders only graze the gem row
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
                    enemies.add(new Walker(this, x, y, false, this.ground, this.hazards));
                    break;
                case vocab.objects.walkerCeiling:
                    enemies.add(new Walker(this, x, y, true, this.ground, this.hazards));
                    break;
                case vocab.objects.saw:
                    enemies.add(new Saw(this, x, y));
                    break;
                case vocab.objects.bat:
                    enemies.add(new Bat(this, x, y));
                    break;
                case vocab.objects.door:
                    this.createDoorSensor(x, y);
                    break;
            }
        }

        this.physics.add.collider(this.player, this.ground);
        this.physics.add.collider(enemies, this.ground);
        this.physics.add.overlap(this.player, gems, (_p, gemObj) => {
            this.collectGem(gemObj as Phaser.Physics.Arcade.Sprite);
        });
        this.physics.add.overlap(this.player, enemies, () => this.die());

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
        cam.setBounds(0, 0, map.widthInPixels, LEVEL_HEIGHT);
        cam.startFollow(this.player, true, 0.12, 0.12);
        cam.fadeIn(300, 0, 0, 0);

        const keyboard = this.input.keyboard!;
        this.cursors = keyboard.createCursorKeys();
        this.keyA = keyboard.addKey('A');
        this.keyD = keyboard.addKey('D');
        this.keyW = keyboard.addKey('W');
        keyboard.on('keydown-R', () => this.restart(false));
        keyboard.on('keydown-ESC', () => {
            this.scene.stop(SceneKeys.UI);
            this.scene.start(SceneKeys.Menu);
        });

        this.scene.launch(SceneKeys.UI, { level: this.levelIndex, died: this.fromDeath });
    }

    update(time: number): void {
        if (this.phase !== 'play') return;

        const left = this.cursors.left.isDown || this.keyA.isDown;
        const right = this.cursors.right.isDown || this.keyD.isDown;
        this.player.move(left === right ? 0 : left ? -1 : 1, time);

        const flipPressed =
            Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
            Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
            Phaser.Input.Keyboard.JustDown(this.keyW);
        if (flipPressed) this.player.tryFlip(time);

        this.dust.setPosition(this.player.x, this.player.feetY);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        this.dust.emitting = this.player.grounded && Math.abs(body.velocity.x) > 60;

        if (this.touchingSpike()) this.die();
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
        this.burst.setParticleTint(0x59c2ff);
        this.burst.explode(10, gem.x, gem.y);
        this.tweens.add({
            targets: gem,
            scale: 1.8,
            alpha: 0,
            duration: 180,
            onComplete: () => gem.destroy(),
        });
    }

    private createDoorSensor(x: number, y: number): void {
        const zone = this.add.zone(x, y - 9, 14, 32);
        this.physics.add.existing(zone, true);
        this.physics.add.overlap(this.player, zone, () => this.enterDoor());
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
        this.scene.restart({ level: this.levelIndex, died: true });
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

    private addParallax(frames: number[], mapWidth: number): void {
        for (let x = 0; x < mapWidth + 480; x += 24) {
            const frame = frames[(x / 24) % frames.length];
            this.add
                .image(x, LEVEL_HEIGHT - 30, AssetKeys.Backgrounds, frame)
                .setOrigin(0, 1)
                .setScrollFactor(0.35, 1)
                .setScale(1.6)
                .setAlpha(0.85);
        }
    }
}
