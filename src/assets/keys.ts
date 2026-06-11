export const AssetKeys = {
    Tiles: 'tiles',
    Characters: 'characters',
    Backgrounds: 'backgrounds',
    Pixel: 'pixel',
    SfxFlip: 'sfx-flip',
    SfxGem: 'sfx-gem',
    SfxDeath: 'sfx-death',
    SfxDoor: 'sfx-door',
    SfxWin: 'sfx-win',
} as const;

export const AnimKeys = {
    PlayerWalk: 'player-walk',
    WalkerMove: 'walker-move',
    BatFly: 'bat-fly',
} as const;

// frame indices in tiles.png (18px sheet, 20 columns)
export const TileFrames = {
    Gem: 67,
    Heart: 44,
    GrassMid: 2,
} as const;

// frame indices in characters.png (24px sheet, 9 columns)
export const CharFrames = {
    PlayerIdle: 0,
    PlayerWalk: 1,
    WalkerA: 11,
    WalkerB: 12,
    Saw: 8,
    BatA: 24,
    BatB: 25,
} as const;
