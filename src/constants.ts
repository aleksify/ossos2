export const WIDTH = 800;
export const HEIGHT = 480;
export const TILE = 32;
export const MAX_HP = 10;
export const HEART_COUNT = Math.ceil(MAX_HP / 2);

export const PLAYER = {
    JUMP_VEL: -470,
    RUN_ACCEL: 800,
    MAX_VX: 220,
    MAX_VY: 800,
    FRICTION: 0.8,
    ATTACK_COOLDOWN: 350,
    ATTACK_HIT_DELAY: 80,
    ATTACK_RANGE_X: 50,
    ATTACK_RANGE_Y: 35,
    INVULN_MS: 900,
    BODY_W: 21,
    BODY_H: 45,
    BODY_OFF_X: 35,
    BODY_OFF_Y: 24,
    RESPAWN_OFFSET_Y: 60,
    STOMP_VY_MIN: 50,
    STOMP_BOUNCE: -380,
    KNOCKBACK_VX: 220,
    KNOCKBACK_VY: -260,
    RUN_DUST_INTERVAL: 90,
    RUN_DUST_VX_MIN: 60,
} as const;

export const ENEMY = {
    PATROL_SPEED: 60,
    BODY_W: 28,
    BODY_H: 20,
    BODY_OFF_X: 2,
    BODY_OFF_Y: 4,
} as const;

export const SPIKE = {
    HALF: 8,
    BUFFER: 4,
    BODY_W: 12,
    BODY_H: 12,
    BODY_OFF_X: 2,
    BODY_OFF_Y: 4,
} as const;
