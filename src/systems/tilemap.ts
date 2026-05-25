export interface TilemapResult {
    map: Phaser.Tilemaps.Tilemap;
    tileset: Phaser.Tilemaps.Tileset;
    ground: Phaser.Tilemaps.TilemapLayer;
    objects: Phaser.Types.Tilemaps.TiledObject[];
    props: Record<string, unknown>;
}

export function loadTilemap(scene: Phaser.Scene, key: string): TilemapResult {
    const map = scene.make.tilemap({ key });
    if (!map || map.width === 0) throw new Error('tilemap not loaded: ' + key);
    const tileset = map.addTilesetImage('tileset', 'tiles');
    if (!tileset) throw new Error('tileset image missing for: ' + key);
    // why: Phaser 4 createLayer can return TilemapGPULayer; cast to TilemapLayer for setCollisionByProperty
    const ground = map.createLayer('ground', tileset, 0, 0) as Phaser.Tilemaps.TilemapLayer | null;
    if (!ground) throw new Error('ground layer missing in: ' + key);
    ground.setCollisionByProperty({ collides: true });
    const objects = map.getObjectLayer('objects')?.objects ?? [];
    const raw = map.properties as unknown;
    const props = Array.isArray(raw)
        ? Object.fromEntries((raw as Array<{ name: string; value: unknown }>).map(p => [p.name, p.value]))
        : (raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {});
    return { map, tileset, ground, objects, props };
}
