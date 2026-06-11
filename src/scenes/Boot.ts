import * as Phaser from 'phaser';
import { SceneKeys } from './keys';
import { initState } from '../systems/state';

export class Boot extends Phaser.Scene {
    constructor() {
        super(SceneKeys.Boot);
    }

    create(): void {
        initState(this.registry);
        this.scene.start(SceneKeys.Preload);
    }
}
