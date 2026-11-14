import type { CharacterId } from './characters';
import type { RunModifiers } from './upgrades';

export type Facing = 1 | -1;

export type SamuraiAnimState =
  | 'idle'
  | 'run'
  | 'jump'
  | 'fall'
  | 'slash'
  | 'dash'
  | 'wall_slide';

export type SlashPhase = 'none' | 'windup' | 'active' | 'recovery';

export type BreathMode = 'oscillating' | 'charged' | 'exhausted';

export interface BreathState {
  mode: BreathMode;
  cursor: number; // 0..1 position along meter
  timer: number; // remaining seconds for charged or exhausted
  duration: number;
}

export interface PlatformDef {
  id: string;
  x: number;
  y: number;
  width: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface CameraState {
  x: number;
  y: number;
}

export interface InputSnapshot {
  left: boolean;
  right: boolean;
  downHeld: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  slashPressed: boolean;
  dashPressed: boolean;
  breathPressed: boolean;
  ultimatePressed: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravityFactor?: number;
}

export interface SlashArcEffect {
  x: number;
  y: number;
  facing: Facing;
  timer: number;
  duration: number;
  characterId: CharacterId;
  large: boolean;
}

export interface ActiveSlashBox {
  slashId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  facing: Facing;
  damage: number;
  characterId: CharacterId;
  charged: boolean;
}

export type GamePhase =
  | 'TITLE_MENU'
  | 'CHARACTER_SELECT'
  | 'PLAYING'
  | 'UPGRADE_SELECT'
  | 'GAME_OVER'
  | 'VICTORY';

export interface PlayerActionEvent {
  type:
    | 'jump'
    | 'wall_jump'
    | 'land'
    | 'slash'
    | 'footstep'
    | 'dash'
    | 'breath_charge'
    | 'breath_fail'
    | 'parry_window'
    | 'enemy_hit'
    | 'enemy_kill'
    | 'parry_success'
    | 'deathblow'
    | 'ultimate'
    | 'crystal_pickup'
    | 'peril_warning'
    | 'slayer_mark'
    | 'player_hurt'
    | 'boss_spawn';
  x: number;
  y: number;
  facing: Facing;
  characterId?: CharacterId;
  charged?: boolean;
  combo?: number;
}

export interface UpdateContext {
  dt: number;
  elapsed: number;
  input: InputSnapshot;
  camera: CameraState;
  modifiers: RunModifiers;
  emitAction: (event: PlayerActionEvent) => void;
  spawnParticles: (particles: Particle[]) => void;
}

export interface GameSystem {
  readonly id: string;
  update?(ctx: UpdateContext): void;
  render?(ctx: CanvasRenderingContext2D, camera: CameraState, elapsed: number): void;
  renderHUD?(ctx: CanvasRenderingContext2D, elapsed: number): void;
  onPlayerAction?(event: PlayerActionEvent): void;
  dispose?(): void;
}
