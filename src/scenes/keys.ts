export const SceneKeys = {
    Boot: 'Boot',
    Preload: 'Preload',
    Title: 'Title',
    Menu: 'Menu',
    Game: 'Game',
    UI: 'UI',
    Pause: 'Pause',
    GameOver: 'GameOver',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
