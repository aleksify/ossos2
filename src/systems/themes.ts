export interface Theme {
    ground: string;
    plat: string;
    bigplat: string;
    tree: string;
    bush: string;
    rock: string;
    enemy: string;
    spike: string;
    mountain: string;
    skyTop: number;
    skyBot: number;
    hillColor: number;
    bgTreeTint: number;
    showMountains: boolean;
    showHills: boolean;
    showBgTrees: boolean;
}

export const THEMES: Record<string, Theme> = {
    outdoor: {
        ground: 'ground', plat: 'platform', bigplat: 'bigplatform',
        tree: 'tree', bush: 'bush', rock: 'rock',
        enemy: 'enemy', spike: 'spike', mountain: 'mountain',
        skyTop: 0x6cb7e0, skyBot: 0xc9e7f5,
        hillColor: 0x3d7028, bgTreeTint: 0x7a9a6a,
        showMountains: true, showHills: true, showBgTrees: true,
    },
    bagel: {
        ground: 'ground_tile', plat: 'counter', bigplat: 'counter_big',
        tree: 'coat_rack', bush: 'flour_sack', rock: 'coffee_tub',
        enemy: 'customer', spike: 'fork_hazard', mountain: 'shop_bldg',
        skyTop: 0xf5dfb4, skyBot: 0xe8c690,
        hillColor: 0xb98456, bgTreeTint: 0xffffff,
        showMountains: false, showHills: false, showBgTrees: false,
    },
};
