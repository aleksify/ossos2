import { Scene } from 'phaser';
import { SceneKeys } from './keys';
import { Tex, Anim } from '../assets/keys';
import { ensureAudio } from '../systems/audio';

export class Title extends Scene {
    constructor() { super(SceneKeys.TITLE); }

    create(): void {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor('#000000');

        const hero = this.add.sprite(width / 2, height / 2 - 40, Tex.PLAYER_SPIN);
        hero.setScale(2);
        hero.play(Anim.TITLE);

        this.add.text(width / 2, height - 110, 'World of Sosso', {
            fontFamily: 'monospace',
            fontSize: '40px',
            color: '#ffffff',
            stroke: '#444',
            strokeThickness: 2,
        }).setOrigin(0.5);

        const prompt = this.add.text(width / 2, height - 66, 'Press any key or tap to play', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#aaaaaa',
        }).setOrigin(0.5);
        this.tweens.add({ targets: prompt, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

        const start = () => {
            ensureAudio();
            this.scene.start(SceneKeys.GAME);
        };

        this.input.once('pointerdown', start);
        this.input.keyboard!.once('keydown', start);
    }
}
