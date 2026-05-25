import { TILE } from '../constants';

export interface Hole {
    left: number;
    right: number;
}

export function computeHolesFromLayer(layer: Phaser.Tilemaps.TilemapLayer): Hole[] {
    const row = layer.layer.height - 1;
    const holes: Hole[] = [];
    let inHole = false;
    let start = 0;
    for (let x = 0; x < layer.layer.width; x++) {
        const tile = layer.getTileAt(x, row);
        const empty = !tile || tile.index === -1;
        if (empty && !inHole) { inHole = true; start = x * TILE; }
        else if (!empty && inHole) { inHole = false; holes.push({ left: start, right: x * TILE }); }
    }
    if (inHole) holes.push({ left: start, right: layer.layer.width * TILE });
    return holes;
}
