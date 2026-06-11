import * as Phaser from 'phaser';
import { SceneKeys } from './keys';
import { AssetKeys, TileFrames } from '../assets/keys';
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

    constructor() {
        super(SceneKeys.UI);
    }

    create(data: { level: number }): void {
        const spec = LEVELS[data.level];

        this.add.image(24, 24, AssetKeys.Tiles, TileFrames.Gem).setScale(1.6);
        this.gemText = this.add.text(40, 13, '', TEXT_STYLE);
        this.add.image(24, 52, AssetKeys.Tiles, TileFrames.Heart).setScale(1.6);
        this.deathText = this.add.text(40, 41, '', TEXT_STYLE);
        this.refresh();

        this.registry.events.on('changedata', this.refresh, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.registry.events.off('changedata', this.refresh, this);
        });

        const banner = this.add
            .text(480, 90, `${data.level + 1} / ${LEVELS.length} — ${spec.name}`, {
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

        if (spec.hint) {
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
