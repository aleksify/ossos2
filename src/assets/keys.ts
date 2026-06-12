export const AssetKeys = {
    Tiles: 'tiles',
    Characters: 'characters',
    Backgrounds: 'backgrounds',
    Sosso: 'sosso',
    Npcs: 'npcs',
    Lindy: 'lindy',
    Items: 'items',
    Paris: 'paris',
    Eiffel: 'eiffel',
    Stinky: 'stinky',
    Iron: 'iron',
    Rio: 'rio',
    RioHills: 'riohills',
    Brazil: 'brazil',
    Pixel: 'pixel',
    SfxFlip: 'sfx-flip',
    SfxGem: 'sfx-gem',
    SfxDeath: 'sfx-death',
    SfxDoor: 'sfx-door',
    SfxWin: 'sfx-win',
    SfxThrow: 'sfx-throw',
    SfxHit: 'sfx-hit',
    SfxJump: 'sfx-jump',
} as const;

// cross-scene events on game.events (Game scene → UI scene)
export const GameEvents = {
    BossHp: 'boss-hp',
    FlipUnlocked: 'flip-unlocked',
    StinkyRescued: 'stinky-rescued',
} as const;

export const AnimKeys = {
    SossoWalk: 'sosso-walk',
    CustomerWalk: 'customer-walk',
    KarenWave: 'karen-wave',
    LindyStride: 'lindy-stride',
    PigeonWalk: 'pigeon-walk',
    ToucanWalk: 'toucan-walk',
    StinkyHappy: 'stinky-happy',
    WalkerMove: 'walker-move',
    BatFly: 'bat-fly',
} as const;

// frame indices in tiles.png (18px sheet, 20 columns)
export const TileFrames = {
    Gem: 67,
    Heart: 44,
    GrassMid: 2,
    FlagA: 111,
    FlagB: 112,
} as const;

// frame indices in characters.png (24px sheet, 9 columns)
export const CharFrames = {
    WalkerA: 11,
    WalkerB: 12,
    Saw: 8,
    BatA: 24,
    BatB: 25,
} as const;

export const SossoFrames = {
    Idle: 0,
    Walk1: 1,
    Walk2: 2,
    Jump: 3,
    Throw: 4,
} as const;

export const NpcFrames = {
    Customer1: 0,
    Customer2: 1,
    Karen1: 2,
    Karen2: 3,
    Pigeon1: 4,
    Pigeon2: 5,
    Toucan1: 6,
    Toucan2: 7,
} as const;

export const LindyFrames = {
    Stride1: 0,
    Stride2: 1,
    Throw: 2,
    Hurt: 3,
} as const;

export const ItemFrames = {
    Bagel: 0,
    Pin: 1,
    Coffee: 2,
    GoldenBagel: 3,
    Croissant: 4,
    Brigadeiro: 5,
} as const;

export const StinkyFrames = {
    Caged: 0,
    Sit: 1,
    Happy: 2,
} as const;
