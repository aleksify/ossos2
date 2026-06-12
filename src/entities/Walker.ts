import * as Phaser from 'phaser';
import { AnimKeys, AssetKeys, CharFrames, NpcFrames } from '../assets/keys';

const GRAVITY = 900;
const CHARGE_SPEED = 70;
const CHARGE_RANGE = 130;
const STARTLE_RANGE = 52;
const STARTLE_COOLDOWN_MS = 2200;

export const WalkerEvents = {
    Turned: 'turned',
    Startled: 'startled',
} as const;

export interface WalkerConfig {
    ceiling: boolean;
    ground: Phaser.Tilemaps.TilemapLayer;
    hazards: Phaser.Tilemaps.TilemapLayer;
    texture?: string;
    frame?: number;
    anim?: string;
    speed?: number;
    /** target to react to */
    player?: Phaser.GameObjects.Sprite;
    /** customers: see the player, get angry, speed up */
    charge?: boolean;
    /** pigeons: flutter up when the player gets close */
    startle?: boolean;
}

/** Patrolling enemy: turns at walls, ledges and spikes. Alien blocks, customers, pigeons. */
export class Walker extends Phaser.Physics.Arcade.Sprite {
    private dir: 1 | -1 = 1;
    private readonly cfg: Required<Omit<WalkerConfig, 'player'>> & { player?: Phaser.GameObjects.Sprite };
    private startleReadyAt = 0;
    private charging = false;

    constructor(scene: Phaser.Scene, x: number, y: number, config: WalkerConfig) {
        const cfg = {
            texture: AssetKeys.Characters,
            frame: CharFrames.WalkerA,
            anim: AnimKeys.WalkerMove,
            speed: 40,
            charge: false,
            startle: false,
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
        player: Phaser.GameObjects.Sprite,
    ): Walker {
        return new Walker(scene, x, y, {
            ceiling: false,
            ground,
            hazards,
            texture: AssetKeys.Npcs,
            frame: NpcFrames.Customer1,
            anim: AnimKeys.CustomerWalk,
            speed: 35,
            player,
            charge: true,
        });
    }

    preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        const body = this.body as Phaser.Physics.Arcade.Body;
        const grounded = this.cfg.ceiling ? body.blocked.up : body.blocked.down;
        const player = this.cfg.player;
        const dx = player && player.active ? player.x - this.x : Infinity;
        const dy = player && player.active ? player.y - this.y : Infinity;

        // pigeons flutter off when crowded
        if (this.cfg.startle && grounded && time > this.startleReadyAt && Math.abs(dx) < STARTLE_RANGE && Math.abs(dy) < 40) {
            this.startleReadyAt = time + STARTLE_COOLDOWN_MS;
            body.setVelocityY(-175);
            this.dir = dx > 0 ? -1 : 1; // flee
            this.emit(WalkerEvents.Startled, this.x, this.y);
        }

        // customers spot Sosso and storm over, fuming
        if (this.cfg.charge) {
            const sees = grounded && Math.abs(dx) < CHARGE_RANGE && Math.abs(dy) < 30;
            if (sees && !this.charging) {
                this.charging = true;
                this.setTint(0xffb4a4);
                if (this.anims.currentAnim) this.anims.timeScale = 2;
            } else if (!sees && this.charging) {
                this.charging = false;
                this.clearTint();
                if (this.anims.currentAnim) this.anims.timeScale = 1;
            }
            if (this.charging) this.dir = dx > 0 ? 1 : -1;
        }

        if (grounded && !this.charging) {
            const frontX = this.x + this.dir * 12;
            const footY = this.y + (this.cfg.ceiling ? -18 : 18);
            const hitWall = this.dir === 1 ? body.blocked.right : body.blocked.left;
            const noFloorAhead = this.cfg.ground.getTileAtWorldXY(frontX, footY) === null;
            const spikeAhead =
                this.cfg.hazards.getTileAtWorldXY(frontX, this.y + (this.cfg.ceiling ? -6 : 6)) !== null;
            if (hitWall || noFloorAhead || spikeAhead) {
                this.dir = this.dir === 1 ? -1 : 1;
                this.emit(WalkerEvents.Turned, this.x, this.y + (this.cfg.ceiling ? -10 : 10));
            }
        } else if (grounded && this.charging) {
            // even furious customers stop at ledges and spikes
            const frontX = this.x + this.dir * 12;
            const noFloorAhead = this.cfg.ground.getTileAtWorldXY(frontX, this.y + 18) === null;
            const spikeAhead = this.cfg.hazards.getTileAtWorldXY(frontX, this.y + 6) !== null;
            if (noFloorAhead || spikeAhead) {
                body.setVelocityX(0);
                this.angle = Math.sin(time / 40) * 3; // fume in place
                return;
            }
        }

        const speed = this.charging ? CHARGE_SPEED : this.cfg.speed;
        body.setVelocityX(speed * this.dir);
        this.setFlipX(this.dir === -1);
        // waddle
        const moving = Math.abs(body.velocity.x) > 5;
        this.angle = moving && grounded ? Math.sin(time / (this.charging ? 45 : 85)) * 4 : 0;
    }
}
