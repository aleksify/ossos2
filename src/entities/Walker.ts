import * as Phaser from 'phaser';
import { AnimKeys, AssetKeys, CharFrames } from '../assets/keys';

const SPEED = 40;
const GRAVITY = 900;

export class Walker extends Phaser.Physics.Arcade.Sprite {
    private dir: 1 | -1 = 1;
    private readonly ceiling: boolean;
    private readonly ground: Phaser.Tilemaps.TilemapLayer;
    private readonly hazards: Phaser.Tilemaps.TilemapLayer;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        ceiling: boolean,
        ground: Phaser.Tilemaps.TilemapLayer,
        hazards: Phaser.Tilemaps.TilemapLayer,
    ) {
        super(scene, x, y, AssetKeys.Characters, CharFrames.WalkerA);
        this.ceiling = ceiling;
        this.ground = ground;
        this.hazards = hazards;
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(16, 16);
        body.setOffset(4, ceiling ? 2 : 6);
        body.setGravityY(ceiling ? -GRAVITY : GRAVITY);
        this.setFlipY(ceiling);
        this.anims.play(AnimKeys.WalkerMove);
    }

    preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        const body = this.body as Phaser.Physics.Arcade.Body;
        const grounded = this.ceiling ? body.blocked.up : body.blocked.down;

        if (grounded) {
            const frontX = this.x + this.dir * 12;
            const footY = this.y + (this.ceiling ? -18 : 18);
            const hitWall = this.dir === 1 ? body.blocked.right : body.blocked.left;
            const noFloorAhead = this.ground.getTileAtWorldXY(frontX, footY) === null;
            const spikeAhead =
                this.hazards.getTileAtWorldXY(frontX, this.y + (this.ceiling ? -6 : 6)) !== null;
            if (hitWall || noFloorAhead || spikeAhead) this.dir = this.dir === 1 ? -1 : 1;
        }

        body.setVelocityX(SPEED * this.dir);
        this.setFlipX(this.dir === -1);
    }
}
