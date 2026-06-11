import * as Phaser from 'phaser';
import { AnimKeys, AssetKeys, CharFrames, NpcFrames } from '../assets/keys';

const GRAVITY = 900;

export interface WalkerConfig {
    ceiling: boolean;
    ground: Phaser.Tilemaps.TilemapLayer;
    hazards: Phaser.Tilemaps.TilemapLayer;
    texture?: string;
    frame?: number;
    anim?: string;
    speed?: number;
}

/** Patrolling enemy: turns at walls, ledges and spikes. Alien blocks and bagel-shop customers alike. */
export class Walker extends Phaser.Physics.Arcade.Sprite {
    private dir: 1 | -1 = 1;
    private readonly cfg: Required<WalkerConfig>;

    constructor(scene: Phaser.Scene, x: number, y: number, config: WalkerConfig) {
        const cfg = {
            texture: AssetKeys.Characters,
            frame: CharFrames.WalkerA,
            anim: AnimKeys.WalkerMove,
            speed: 40,
            ...config,
        };
        super(scene, x, y, cfg.texture, cfg.frame);
        this.cfg = cfg;
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(16, 16);
        body.setOffset(4, cfg.ceiling ? 2 : 6);
        body.setGravityY(cfg.ceiling ? -GRAVITY : GRAVITY);
        this.setFlipY(cfg.ceiling);
        this.anims.play(cfg.anim);
    }

    static customer(
        scene: Phaser.Scene,
        x: number,
        y: number,
        ground: Phaser.Tilemaps.TilemapLayer,
        hazards: Phaser.Tilemaps.TilemapLayer,
    ): Walker {
        return new Walker(scene, x, y, {
            ceiling: false,
            ground,
            hazards,
            texture: AssetKeys.Npcs,
            frame: NpcFrames.Customer1,
            anim: AnimKeys.CustomerWalk,
            speed: 35,
        });
    }

    preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        const body = this.body as Phaser.Physics.Arcade.Body;
        const grounded = this.cfg.ceiling ? body.blocked.up : body.blocked.down;

        if (grounded) {
            const frontX = this.x + this.dir * 12;
            const footY = this.y + (this.cfg.ceiling ? -18 : 18);
            const hitWall = this.dir === 1 ? body.blocked.right : body.blocked.left;
            const noFloorAhead = this.cfg.ground.getTileAtWorldXY(frontX, footY) === null;
            const spikeAhead =
                this.cfg.hazards.getTileAtWorldXY(frontX, this.y + (this.cfg.ceiling ? -6 : 6)) !== null;
            if (hitWall || noFloorAhead || spikeAhead) this.dir = this.dir === 1 ? -1 : 1;
        }

        body.setVelocityX(this.cfg.speed * this.dir);
        this.setFlipX(this.dir === -1);
    }
}
