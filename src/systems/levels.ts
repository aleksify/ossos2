export interface LevelSpec {
    key: string;
    name: string;
    hint?: string;
    intro?: string;
    sky: number;
    // frame indices in backgrounds.png used for the parallax horizon strip
    bgFrames: number[];
    // gravity flip available from the start (otherwise Sosso jumps)
    flip: boolean;
    collectible: 'bagel' | 'gem';
    boss?: boolean;
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
        name: 'First Steps',
        intro: 'The anti-gravity bagel hums in your stomach.',
        hint: 'SPACE flips gravity (only while standing)',
        sky: 0xd8f0ee,
        bgFrames: [8, 9, 10, 11],
        flip: true,
        collectible: 'gem',
    },
    {
        key: 'level5',
        name: 'Thorn Rhythm',
        hint: 'Flip in the gaps between the spikes',
        sky: 0xd8f0ee,
        bgFrames: [8, 9, 10, 11],
        flip: true,
        collectible: 'gem',
    },
    {
        key: 'level6',
        name: 'Night Patrol',
        hint: 'Patrols turn at edges — time your runs',
        sky: 0xf6d8a0,
        bgFrames: [12, 13],
        flip: true,
        collectible: 'gem',
    },
    {
        key: 'level7',
        name: 'The Comb',
        hint: 'Commit to the flip',
        sky: 0xc0ecba,
        bgFrames: [14, 15],
        flip: true,
        collectible: 'gem',
    },
    {
        key: 'level8',
        name: 'The Gauntlet',
        sky: 0xf6d8a0,
        bgFrames: [12, 13],
        flip: true,
        collectible: 'gem',
    },
];
