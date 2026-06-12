import * as Phaser from 'phaser';
import { SceneKeys } from './keys';
import { AssetKeys, GameEvents, ItemFrames, TileFrames } from '../assets/keys';
import { LEVELS } from '../systems/levels';
import { RegKeys } from '../systems/state';

const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: '"Courier New", monospace',
    fontStyle: 'bold',
    fontSize: 20,
    color: '#ffffff',
    stroke: '#1a1c2c',
    strokeThickness: 4,
};

export class UI extends Phaser.Scene {
    private gemText!: Phaser.GameObjects.Text;
    private deathText!: Phaser.GameObjects.Text;
    private bossBar!: Phaser.GameObjects.Rectangle;
    private bossBarBg!: Phaser.GameObjects.Container;

    constructor() {
        super(SceneKeys.UI);
    }

    create(data: { level: number; died?: boolean }): void {
        const spec = LEVELS[data.level];

        if (spec.collectible === 'gem') {
            this.add.image(24, 24, AssetKeys.Tiles, TileFrames.Gem).setScale(1.6);
        } else {
            const frame = spec.collectible === 'bagel' ? ItemFrames.Bagel : ItemFrames.Croissant;
            this.add.image(24, 24, AssetKeys.Items, frame).setScale(1.8);
        }
        this.gemText = this.add.text(40, 13, '', TEXT_STYLE);
        this.add.image(24, 52, AssetKeys.Tiles, TileFrames.Heart).setScale(1.6);
        this.deathText = this.add.text(40, 41, '', TEXT_STYLE);
        this.refresh();

        const barW = 300;
        this.bossBar = this.add.rectangle(480 - barW / 2, 36, barW, 12, 0xd2627a).setOrigin(0, 0.5);
        this.bossBarBg = this.add.container(0, 0, [
            this.add.rectangle(480, 36, barW + 6, 18, 0x1a1c2c).setDepth(-1),
            this.add.text(480, 14, 'LINDY', { ...TEXT_STYLE, fontSize: 14, color: '#ffd5de' }).setOrigin(0.5),
        ]);
        this.bossBarBg.add(this.bossBar);
        this.bossBarBg.setVisible(false);

        const onBossHp = (hp: number, max: number) => {
            this.bossBarBg.setVisible(hp > 0);
            this.tweens.add({ targets: this.bossBar, width: (barW * hp) / max, duration: 150 });
        };
        const onUnlock = () => {
            this.bossBarBg.setVisible(false);
            const big = this.add
                .text(480, 230, 'GRAVITY FLIP UNLOCKED', { ...TEXT_STYLE, fontSize: 36, color: '#f7d976' })
                .setOrigin(0.5)
                .setAlpha(0);
            const small = this.add
                .text(480, 270, 'SPACE now flips gravity — jumping is for quitters', { ...TEXT_STYLE, fontSize: 17 })
                .setOrigin(0.5)
                .setAlpha(0);
            this.tweens.add({ targets: [big, small], alpha: 1, duration: 300, yoyo: true, hold: 2600 });
        };
        const onRescue = () => {
            const big = this.add
                .text(480, 230, 'STINKY IS SAFE!', { ...TEXT_STYLE, fontSize: 40, color: '#f08a9e' })
                .setOrigin(0.5)
                .setAlpha(0);
            const small = this.add
                .text(480, 272, 'the stinkiest girl in all of Paris', { ...TEXT_STYLE, fontSize: 17 })
                .setOrigin(0.5)
                .setAlpha(0);
            this.tweens.add({ targets: [big, small], alpha: 1, duration: 300, yoyo: true, hold: 2200 });
        };
        this.game.events.on(GameEvents.BossHp, onBossHp);
        this.game.events.on(GameEvents.FlipUnlocked, onUnlock);
        this.game.events.on(GameEvents.StinkyRescued, onRescue);
        this.registry.events.on('changedata', this.refresh, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.game.events.off(GameEvents.BossHp, onBossHp);
            this.game.events.off(GameEvents.FlipUnlocked, onUnlock);
            this.game.events.off(GameEvents.StinkyRescued, onRescue);
            this.registry.events.off('changedata', this.refresh, this);
        });

        // replaying the banner/hint on every quick respawn is just noise
        if (!data.died) {
            const banner = this.add
                .text(480, 84, `${data.level + 1} / ${LEVELS.length} — ${spec.name}`, {
                    ...TEXT_STYLE,
                    fontSize: 26,
                })
                .setOrigin(0.5)
                .setAlpha(0);
            this.tweens.chain({
                targets: banner,
                tweens: [
                    { alpha: 1, duration: 350 },
                    { alpha: 0, duration: 500, delay: 1600 },
                ],
            });
            if (spec.intro) {
                const intro = this.add
                    .text(480, 116, spec.intro, { ...TEXT_STYLE, fontSize: 18, color: '#ffe9b8' })
                    .setOrigin(0.5)
                    .setAlpha(0);
                this.tweens.chain({
                    targets: intro,
                    tweens: [
                        { alpha: 1, duration: 350, delay: 250 },
                        { alpha: 0, duration: 500, delay: 2200 },
                    ],
                });
            }
        }

        if (spec.hint && !data.died) {
            const hint = this.add
                .text(480, 510, spec.hint, { ...TEXT_STYLE, fontSize: 17, color: '#d7e4ef' })
                .setOrigin(0.5);
            this.tweens.add({ targets: hint, alpha: 0, duration: 800, delay: 6500 });
        }
    }

    private refresh(): void {
        const gems = this.registry.get(RegKeys.Gems) as number;
        const total = this.registry.get(RegKeys.GemsTotal) as number;
        const deaths = this.registry.get(RegKeys.Deaths) as number;
        this.gemText.setText(`${gems}/${total}`);
        this.deathText.setText(`${deaths}`);
    }
}
