export interface LevelSpec {
    key: string;
    name: string;
    hint?: string;
    sky: number;
    // frame indices in backgrounds.png used for the parallax horizon strip
    bgFrames: number[];
}

export const LEVELS: LevelSpec[] = [
    {
        key: 'level1',
        name: 'First Steps',
        hint: '←/→ move · SPACE flips gravity (only while standing)',
        sky: 0xd8f0ee,
        bgFrames: [8, 9, 10, 11],
    },
    {
        key: 'level2',
        name: 'Thorn Rhythm',
        hint: 'Flip in the gaps between the spikes',
        sky: 0xd8f0ee,
        bgFrames: [8, 9, 10, 11],
    },
    {
        key: 'level3',
        name: 'Night Patrol',
        hint: 'Patrols turn at edges — time your runs',
        sky: 0xf6d8a0,
        bgFrames: [12, 13],
    },
    {
        key: 'level4',
        name: 'The Comb',
        hint: 'Commit to the flip',
        sky: 0xc0ecba,
        bgFrames: [14, 15],
    },
    {
        key: 'level5',
        name: 'The Gauntlet',
        sky: 0xf6d8a0,
        bgFrames: [12, 13],
    },
];
