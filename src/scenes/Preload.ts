import * as Phaser from 'phaser';
import { SceneKeys } from './keys';
import { AnimKeys, AssetKeys, CharFrames } from '../assets/keys';
import { LEVELS } from '../systems/levels';
import { RegKeys } from '../systems/state';

export class Preload extends Phaser.Scene {
    constructor() {
        super(SceneKeys.Preload);
    }

    preload(): void {
        const { width, height } = this.scale;
        const barBg = this.add.rectangle(width / 2, height / 2, 320, 14, 0x2a2a3a);
        const bar = this.add.rectangle(width / 2 - 158, height / 2, 1, 10, 0x7df0ff).setOrigin(0, 0.5);
        this.load.on('progress', (value: number) => {
            bar.width = 316 * value;
        });
        this.load.on('complete', () => {
            barBg.destroy();
            bar.destroy();
        });

        this.load.spritesheet(AssetKeys.Tiles, 'assets/tiles/tiles.png', {
            frameWidth: 18,
            frameHeight: 18,
        });
        this.load.spritesheet(AssetKeys.Characters, 'assets/tiles/characters.png', {
            frameWidth: 24,
            frameHeight: 24,
        });
        this.load.spritesheet(AssetKeys.Backgrounds, 'assets/tiles/backgrounds.png', {
            frameWidth: 24,
            frameHeight: 24,
        });

        for (const level of LEVELS) {
            this.load.tilemapTiledJSON(level.key, `assets/tilemaps/${level.key}.json`);
        }

        this.load.audio(AssetKeys.SfxFlip, 'assets/audio/flip.ogg');
        this.load.audio(AssetKeys.SfxGem, 'assets/audio/gem.ogg');
        this.load.audio(AssetKeys.SfxDeath, 'assets/audio/death.ogg');
        this.load.audio(AssetKeys.SfxDoor, 'assets/audio/door.ogg');
        this.load.audio(AssetKeys.SfxWin, 'assets/audio/win.ogg');
    }

    create(): void {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        g.fillStyle(0xffffff);
        g.fillRect(0, 0, 3, 3);
        g.generateTexture(AssetKeys.Pixel, 3, 3);
        g.destroy();

        this.anims.create({
            key: AnimKeys.PlayerWalk,
            frames: this.anims.generateFrameNumbers(AssetKeys.Characters, {
                frames: [CharFrames.PlayerIdle, CharFrames.PlayerWalk],
            }),
            frameRate: 10,
            repeat: -1,
        });
        this.anims.create({
            key: AnimKeys.WalkerMove,
            frames: this.anims.generateFrameNumbers(AssetKeys.Characters, {
                frames: [CharFrames.WalkerA, CharFrames.WalkerB],
            }),
            frameRate: 6,
            repeat: -1,
        });
        this.anims.create({
            key: AnimKeys.BatFly,
            frames: this.anims.generateFrameNumbers(AssetKeys.Characters, {
                frames: [CharFrames.BatA, CharFrames.BatB],
            }),
            frameRate: 8,
            repeat: -1,
        });

        this.registry.set(RegKeys.GemsTotal, this.countGems());
        this.scene.start(SceneKeys.Menu);
    }

    private countGems(): number {
        let total = 0;
        for (const level of LEVELS) {
            const data = this.cache.tilemap.get(level.key)?.data as
                | { layers?: { type: string; objects?: { type: string }[] }[] }
                | undefined;
            for (const layer of data?.layers ?? []) {
                if (layer.type === 'objectgroup') {
                    total += (layer.objects ?? []).filter((o) => o.type === 'gem').length;
                }
            }
        }
        return total;
    }
}
