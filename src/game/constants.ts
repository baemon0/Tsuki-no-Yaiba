import type { PlatformDef } from './types';

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

export const GROUND_Y = 226;

export const ARENA = {
  minX: -228,
  maxX: 228,
} as const;

// 3 elevated one-way wooden/bamboo platforms reachable from ground & via wall-jump
export const ARENA_PLATFORMS: PlatformDef[] = [
  { id: 'left_mid', x: -176, y: 184, width: 92 },
  { id: 'center_high', x: -50, y: 144, width: 100 },
  { id: 'right_mid', x: 84, y: 184, width: 92 },
];

export const PHYSICS = {
  gravity: 960, // base px/s^2
  ascentHeldGravityScale: 0.88, // lighter ascent while jump is held
  apexVelocityThreshold: 80, // |vy| threshold for floaty apex hang-time
  apexGravityScale: 0.48, // hang-time gravity multiplier at jump peak
  fallHeldGravityScale: 0.68, // gentler descent while holding jump
  fallGravityScale: 0.88, // natural, non-heavy descent when jump released
  maxFallSpeed: 330, // px/s normal max fall speed
  maxHeldFallSpeed: 235, // px/s floatier max fall speed while holding jump
  wallSlideMaxSpeed: 64, // px/s when holding toward screen-edge wall
  wallJumpVx: 225, // px/s horizontal kick off wall
  wallJumpVy: -395, // px/s vertical lift off wall
  moveSpeed: 128, // px/s
  groundAccel: 1350, // px/s^2
  groundDecel: 1450, // px/s^2
  airAccel: 920, // px/s^2
  airDecel: 480, // px/s^2
  jumpVelocity: -412, // px/s (~30% higher impulse, clears multi-level platforms)
  jumpCutMultiplier: 0.56, // smooth variable jump height on early release
  coyoteTime: 0.1, // seconds after leaving ground/platform
  jumpBufferTime: 0.11, // seconds before landing
} as const;

export const SLASH = {
  windupDuration: 0.055,
  activeDuration: 0.115,
  recoveryDuration: 0.12,
  cooldownDuration: 0.08,
  lungeSpeed: 42, // subtle forward step on ground slash
  baseParryWindow: 0.19, // Sekiro-style deflect window on slash start
} as const;

export const BREATH = {
  maxHealth: 100,
  oscillationSpeed: 1.35, // cycles per second (back and forth)
  sweetSpotMin: 0.37,
  sweetSpotMax: 0.63,
  chargeDuration: 3.5, // seconds of empowered sword aura
  exhaustDuration: 1.5, // seconds of exhaustion penalty
  exhaustSpeedMultiplier: 0.55,
} as const;

export const DASH = {
  standardSpeed: 290,
  standardDuration: 0.14,
  standardCooldown: 0.45,
  thunderBlinkSpeed: 680,
  thunderBlinkChargedSpeed: 800,
  thunderBlinkDuration: 0.16,
  thunderBlinkCooldown: 0.55,
  mistEvadeSpeed: 390,
  mistEvadeDuration: 0.16,
} as const;

export const CAMERA = {
  lookAheadX: 34,
  followLerpX: 7.5,
  followLerpY: 5.0,
} as const;
