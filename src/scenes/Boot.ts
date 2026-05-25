import { Scene } from 'phaser';
import { SceneKeys } from './keys';

export class Boot extends Scene {
    constructor() { super(SceneKeys.BOOT); }

    preload(): void {
        this.load.setPath('assets');
        this.load.image('logo', 'logo.png');
    }

    create(): void {
        this.scene.start(SceneKeys.PRELOAD);
    }
}
