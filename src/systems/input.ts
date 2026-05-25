import * as Phaser from 'phaser';

export const touchState = { left: false, right: false, jump: false, attack: false };

export class Input {
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd: { up: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
    private spaceKey: Phaser.Input.Keyboard.Key;
    rKey: Phaser.Input.Keyboard.Key;
    private attackKey: Phaser.Input.Keyboard.Key;
    private jKey: Phaser.Input.Keyboard.Key;
    private pKey: Phaser.Input.Keyboard.Key;
    private escKey: Phaser.Input.Keyboard.Key;
    private _prevTouchAttack = false;

    constructor(scene: Phaser.Scene) {
        const kb = scene.input.keyboard!;
        this.cursors = kb.createCursorKeys();
        const keys = kb.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });
        this.wasd = keys as { up: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
        this.spaceKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.rKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.attackKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.X);
        this.jKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J);
        this.pKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this.escKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }

    get left(): boolean { return this.cursors.left.isDown || this.wasd.left.isDown || touchState.left; }
    get right(): boolean { return this.cursors.right.isDown || this.wasd.right.isDown || touchState.right; }
    get jump(): boolean { return this.cursors.up.isDown || this.wasd.up.isDown || this.spaceKey.isDown || touchState.jump; }

    attackJustPressed(): boolean {
        const k = Phaser.Input.Keyboard.JustDown(this.attackKey) || Phaser.Input.Keyboard.JustDown(this.jKey);
        const t = touchState.attack && !this._prevTouchAttack;
        this._prevTouchAttack = touchState.attack;
        return k || t;
    }

    restartJustPressed(): boolean {
        return Phaser.Input.Keyboard.JustDown(this.rKey);
    }

    pauseJustPressed(): boolean {
        return Phaser.Input.Keyboard.JustDown(this.pKey) || Phaser.Input.Keyboard.JustDown(this.escKey);
    }
}
