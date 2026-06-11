import * as Phaser from 'phaser';
export const RegKeys = {
    Gems: 'gems',
    GemsTotal: 'gemsTotal',
    Deaths: 'deaths',
    StartTime: 'startTime',
    FlipUnlocked: 'flipUnlocked',
} as const;

export function initState(registry: Phaser.Data.DataManager): void {
    registry.set(RegKeys.Gems, 0);
    registry.set(RegKeys.GemsTotal, 0);
    registry.set(RegKeys.Deaths, 0);
    registry.set(RegKeys.StartTime, 0);
    registry.set(RegKeys.FlipUnlocked, false);
}

export function startRun(registry: Phaser.Data.DataManager): void {
    registry.set(RegKeys.Gems, 0);
    registry.set(RegKeys.Deaths, 0);
    registry.set(RegKeys.StartTime, Date.now());
    registry.set(RegKeys.FlipUnlocked, false);
}

export function elapsedSeconds(registry: Phaser.Data.DataManager): number {
    const start = registry.get(RegKeys.StartTime) as number;
    return start === 0 ? 0 : Math.floor((Date.now() - start) / 1000);
}

export function formatTime(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}
