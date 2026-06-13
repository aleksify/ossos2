export const AssetKeys = {
    Tiles: 'tiles',
    Characters: 'characters',
    Backgrounds: 'backgrounds',
    // hand-drawn Sosso (92px sheets, run/jump/punch/spin); run frame 0 is idle
    SossoRun: 'sosso-run',
    SossoJump: 'sosso-jump',
    SossoPunch: 'sosso-punch',
    SossoSpin: 'sosso-spin',
    Npcs: 'npcs',
    Lindy: 'lindy',
    Items: 'items',
    Paris: 'paris',
    Eiffel: 'eiffel',
    Stinky: 'stinky',
    Iron: 'iron',
    Brasil: 'brasil',
    Serra: 'serra',
    Sampa: 'sampa',
    Brazil: 'brazil',
    Parents: 'parents',
    Lisboa: 'lisboa',
    LisboaStrip: 'lisboa-strip',
    Lisbon: 'lisbon',
    Alex: 'alex',
    Tram: 'tram',
    Pixel: 'pixel',
    SfxFlip: 'sfx-flip',
    SfxGem: 'sfx-gem',
    SfxDeath: 'sfx-death',
    SfxDoor: 'sfx-door',
    SfxWin: 'sfx-win',
    SfxThrow: 'sfx-throw',
    SfxHit: 'sfx-hit',
    SfxJump: 'sfx-jump',
    Music: 'music',
} as const;

// cross-scene events on game.events (Game scene → UI scene)
export const GameEvents = {
    BossHp: 'boss-hp',
    FlipUnlocked: 'flip-unlocked',
    StinkyRescued: 'stinky-rescued',
    ParentsReunited: 'parents-reunited',
    AlexReunited: 'alex-reunited',
} as const;

export const AnimKeys = {
    SossoWalk: 'sosso-walk',
    SossoJump: 'sosso-jump',
    SossoThrow: 'sosso-throw',
    SossoSpin: 'sosso-spin',
    CustomerWalk: 'customer-walk',
    KarenWave: 'karen-wave',
    LindyStride: 'lindy-stride',
    PigeonWalk: 'pigeon-walk',
    MaritacaWalk: 'maritaca-walk',
    StinkyHappy: 'stinky-happy',
    WalkerMove: 'walker-move',
    BatFly: 'bat-fly',
    GaivotaFly: 'gaivota-fly',
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

export const NpcFrames = {
    Customer1: 0,
    Customer2: 1,
    Karen1: 2,
    Karen2: 3,
    Pigeon1: 4,
    Pigeon2: 5,
    Maritaca1: 6,
    Maritaca2: 7,
    Gaivota1: 8,
    Gaivota2: 9,
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
    Nata: 6,
} as const;

export const StinkyFrames = {
    Caged: 0,
    Sit: 1,
    Happy: 2,
} as const;

export const ParentFrames = {
    Mom: 0,
    Dad: 1,
} as const;
