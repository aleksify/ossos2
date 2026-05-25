import StartGame from './game/main';

document.addEventListener('DOMContentLoaded', () => {

    const game = StartGame('game-container');

    if (import.meta.env.DEV) {
        (window as unknown as { __game__: typeof game }).__game__ = game;
    }

});