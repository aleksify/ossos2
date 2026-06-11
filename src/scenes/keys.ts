export const SceneKeys = {
    Boot: 'Boot',
    Preload: 'Preload',
    Menu: 'Menu',
    Game: 'Game',
    UI: 'UI',
    GameOver: 'GameOver',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
