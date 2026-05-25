import * as Phaser from 'phaser';
import { HEIGHT, WIDTH } from '../constants';
import type { Theme } from './themes';

export function buildBackground(scene: Phaser.Scene, theme: Theme, worldWidth: number): () => void {
    const sky = scene.add.graphics();
    const drawSky = () => {
        sky.clear();
        sky.fillGradientStyle(theme.skyTop, theme.skyTop, theme.skyBot, theme.skyBot, 1);
        sky.fillRect(0, 0, scene.scale.width, scene.scale.height);
    };
    drawSky();
    sky.setScrollFactor(0).setDepth(-100);

    if (theme.showMountains) {
        for (let x = -100; x < worldWidth; x += 220) {
            scene.add.image(x, HEIGHT - 60, theme.mountain)
                .setOrigin(0, 1).setScrollFactor(0.2).setDepth(-90).setAlpha(0.6);
        }
        const cloudRange = worldWidth * 0.1 + Math.max(WIDTH, scene.scale.width) + 200;
        for (let i = 0; i < 20; i++) {
            const cx = Phaser.Math.Between(-100, cloudRange);
            const cy = Phaser.Math.Between(30, 160);
            const c = scene.add.image(cx, cy, 'cloud').setScrollFactor(0.1).setDepth(-80).setAlpha(0.85);
            scene.tweens.add({
                targets: c, x: cloudRange + 100,
                duration: Phaser.Math.Between(40000, 70000),
                repeat: -1,
                onRepeat: () => { c.x = -100; },
            });
        }
    }

    if (theme.showHills) {
        const hills = scene.add.graphics();
        hills.fillStyle(theme.hillColor, 0.7);
        for (let x = 0; x < worldWidth; x += 180) hills.fillCircle(x, HEIGHT - 50, 110);
        hills.setScrollFactor(0.4).setDepth(-70);
    }

    if (theme.showBgTrees) {
        for (let x = 30; x < worldWidth; x += 110) {
            scene.add.image(x + Phaser.Math.Between(-20, 20), HEIGHT - 32, theme.tree)
                .setOrigin(0.5, 1).setScale(0.6).setTint(theme.bgTreeTint).setAlpha(0.7)
                .setScrollFactor(0.55).setDepth(-60);
        }
    }

    let drawWall = (): void => { /* noop */ };
    if (!theme.showMountains) {
        // bagel theme: painted wall
        const wall = scene.add.graphics();
        const doDrawWall = () => {
            const vw = scene.scale.width;
            wall.clear();
            wall.fillStyle(0xd9b896, 1).fillRect(0, HEIGHT - 180, vw, 180);
            wall.fillStyle(0xc89866, 1).fillRect(0, HEIGHT - 180, vw, 3);
            wall.fillStyle(0xa87648, 0.25);
            for (let vx = 0; vx < vw; vx += 40) wall.fillRect(vx, HEIGHT - 175, 1, 175);
        };
        doDrawWall();
        wall.setScrollFactor(0).setDepth(-90);
        drawWall = doDrawWall;
    }

    return () => {
        drawSky();
        drawWall();
    };
}
