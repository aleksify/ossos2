import { Scene } from 'phaser';
import { SceneKeys } from './keys';
import { Tex, Anim, MapKey } from '../assets/keys';

export class Preload extends Scene {
    constructor() { super(SceneKeys.PRELOAD); }

    preload(): void {
        this.load.setPath('assets');

        this.load.spritesheet(Tex.PLAYER_RUN,   'sprites/player_run.png',   { frameWidth: 92, frameHeight: 92 });
        this.load.spritesheet(Tex.PLAYER_JUMP,  'sprites/player_jump.png',  { frameWidth: 92, frameHeight: 92 });
        this.load.spritesheet(Tex.PLAYER_PUNCH, 'sprites/player_punch.png', { frameWidth: 92, frameHeight: 92 });
        this.load.spritesheet(Tex.PLAYER_SPIN,  'sprites/player_spin.png',  { frameWidth: 92, frameHeight: 92 });

        this.load.image(Tex.BAGEL,    'sprites/bagel.png');
        this.load.image(Tex.TILES,    'tilesets/tileset.png');
        this.load.image(Tex.HEART_ICON, 'entities/heart.png');

        // entity textures — loaded with runtime key names matching THEMES lookup
        const entities: [string, string][] = [
            [Tex.COIN,         'entities/coin.png'],
            [Tex.CHECKPOINT,   'entities/checkpoint.png'],
            [Tex.GOAL,         'entities/goal.png'],
            [Tex.SPAWN,        'entities/spawn.png'],
            // bagel theme
            [Tex.CUSTOMER,     'entities/enemy_bagel.png'],
            [Tex.COAT_RACK,    'entities/tree_bagel.png'],
            [Tex.FLOUR_SACK,   'entities/bush_bagel.png'],
            [Tex.COFFEE_TUB,   'entities/rock_bagel.png'],
            [Tex.FORK_HAZARD,  'entities/spike_bagel.png'],
            [Tex.COUNTER,      'entities/counter.png'],
            [Tex.COUNTER_BIG,  'entities/counter_big.png'],
            // outdoor theme
            [Tex.ENEMY,        'entities/enemy_outdoor.png'],
            [Tex.TREE,         'entities/tree_outdoor.png'],
            [Tex.BUSH,         'entities/bush_outdoor.png'],
            [Tex.ROCK,         'entities/rock_outdoor.png'],
            [Tex.SPIKE,        'entities/spike_outdoor.png'],
            [Tex.PLATFORM,     'entities/platform.png'],
            [Tex.BIGPLATFORM,  'entities/bigplatform.png'],
        ];
        for (const [key, path] of entities) {
            this.load.image(key, path);
        }

        this.load.tilemapTiledJSON(MapKey.LEVEL1, 'tilemaps/level1.json');
    }

    create(): void {
        // generate tiny textures for particles and HUD hearts
        this.makeTexture(Tex.DUST,  8, 8,  (g) => { g.fillStyle(0xcccccc, 1); g.fillRect(0, 0, 8, 8); });
        this.makeTexture(Tex.SPARK, 6, 6,  (g) => { g.fillStyle(0xffee44, 1); g.fillRect(0, 0, 6, 6); });
        this.makeHeart(Tex.HEART_FULL,  0xff3030, 1.0);
        this.makeHeart(Tex.HEART_HALF,  0xff8080, 1.0);
        this.makeHeart(Tex.HEART_EMPTY, 0x333333, 0.5);

        // global animations
        this.anims.create({
            key: Anim.IDLE,
            frames: [{ key: Tex.PLAYER_RUN, frame: 0 }],
            frameRate: 1,
        });
        this.anims.create({
            key: Anim.RUN,
            frames: this.anims.generateFrameNumbers(Tex.PLAYER_RUN, { start: 0, end: 5 }),
            frameRate: 12,
            repeat: -1,
        });
        this.anims.create({
            key: Anim.JUMP,
            frames: this.anims.generateFrameNumbers(Tex.PLAYER_JUMP, { start: 0, end: 8 }),
            frameRate: 14,
            repeat: 0,
        });
        this.anims.create({
            key: Anim.PUNCH,
            frames: this.anims.generateFrameNumbers(Tex.PLAYER_PUNCH, { start: 0, end: 2 }),
            frameRate: 18,
            repeat: 0,
        });
        this.anims.create({
            key: Anim.TITLE,
            frames: this.anims.generateFrameNumbers(Tex.PLAYER_SPIN, { start: 0, end: 7 }),
            frameRate: 10,
            repeat: -1,
        });

        this.scene.start(SceneKeys.TITLE);
    }

    private makeTexture(key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
        const g = this.add.graphics();
        draw(g);
        g.generateTexture(key, w, h);
        g.destroy();
    }

    private makeHeart(key: string, color: number, alpha: number): void {
        const g = this.add.graphics();
        g.fillStyle(color, alpha);
        // pixel-art heart shape at 16×16
        const pixels: [number, number, number, number][] = [
            [2, 1, 4, 2], [10, 1, 4, 2],
            [1, 3, 14, 4],
            [2, 7, 12, 2],
            [4, 9, 8, 2],
            [6, 11, 4, 2],
            [7, 13, 2, 1],
        ];
        for (const [x, y, w, h] of pixels) g.fillRect(x, y, w, h);
        g.generateTexture(key, 16, 16);
        g.destroy();
    }
}
