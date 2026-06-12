export interface LevelSpec {
    key: string;
    name: string;
    hint?: string;
    intro?: string;
    sky: number;
    // frame indices for the parallax horizon strip (backgrounds.png, or paris.png for the paris theme)
    bgFrames: number[];
    // gravity flip available from the start (otherwise Sosso jumps)
    flip: boolean;
    collectible: 'bagel' | 'gem' | 'croissant' | 'brigadeiro';
    boss?: boolean;
    theme?: 'paris' | 'brasil';
    // camera scrolls right at this speed (px/s); falling off the left edge kills
    autoScroll?: number;
}

export const LEVELS: LevelSpec[] = [
    {
        key: 'level1',
        name: 'Opening Shift',
        intro: 'Another shift at the bagel shop…',
        hint: '←/→ move · SPACE jump · X throw bagels',
        sky: 0xf4e3c8,
        bgFrames: [12, 13],
        flip: false,
        collectible: 'bagel',
    },
    {
        key: 'level2',
        name: 'Lunch Rush',
        intro: 'The lunch crowd is in a mood.',
        hint: 'Bagels stop complaints. Throw with X',
        sky: 0xf0d8b0,
        bgFrames: [12, 13],
        flip: false,
        collectible: 'bagel',
    },
    {
        key: 'level3',
        name: 'Closing Time',
        intro: 'Lindy wants a word with you.',
        hint: 'Flags are checkpoints',
        sky: 0xecd2ac,
        bgFrames: [12, 13],
        flip: false,
        collectible: 'bagel',
        boss: true,
    },
    {
        key: 'level4',
        name: 'Rue de la Flip',
        intro: 'Wait — is this Paris?',
        hint: 'SPACE flips gravity (only while standing)',
        sky: 0xf2c4cd,
        bgFrames: [0, 1, 2, 3],
        flip: true,
        collectible: 'croissant',
        theme: 'paris',
    },
    {
        key: 'level5',
        name: 'Boulevard of Thorns',
        hint: 'Flip in the gaps between the spikes',
        sky: 0xc9d4f0,
        bgFrames: [1, 3, 0, 2],
        flip: true,
        collectible: 'croissant',
        theme: 'paris',
    },
    {
        key: 'level6',
        name: 'Métro Patrol',
        hint: 'Pigeons turn at edges — time your runs',
        sky: 0xf6d8a0,
        bgFrames: [2, 0, 3, 1],
        flip: true,
        collectible: 'croissant',
        theme: 'paris',
    },
    {
        key: 'level7',
        name: 'Les Toits',
        hint: 'Commit to the flip',
        sky: 0xaeb8dc,
        bgFrames: [3, 1, 0, 2],
        flip: true,
        collectible: 'croissant',
        theme: 'paris',
    },
    {
        key: 'level8',
        name: 'La Tour de Stinky',
        intro: 'A faint meow from the top of the Tower… Stinky?!',
        hint: 'Flip to rise. The only way is up.',
        sky: 0x8a93c4,
        bgFrames: [0, 2, 1, 3],
        flip: true,
        collectible: 'croissant',
        theme: 'paris',
    },
    {
        key: 'level9',
        name: 'Ubatuba Express',
        intro: 'Férias! Próxima parada: Ubatuba. Stinky rides up front…',
        hint: 'They call it Ubachuva — outrun the rain, don’t fall behind!',
        sky: 0xf2a65e,
        bgFrames: [0, 2, 1, 0, 3, 1],
        flip: true,
        collectible: 'brigadeiro',
        theme: 'brasil',
        autoScroll: 88,
    },
];
