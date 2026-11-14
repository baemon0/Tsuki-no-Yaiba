import type { InputSnapshot } from './types';

export type VirtualControlKey =
  | 'left'
  | 'right'
  | 'down'
  | 'jump'
  | 'slash'
  | 'dash'
  | 'breath'
  | 'ultimate';

const LEFT_CODES = new Set(['KeyA', 'ArrowLeft']);
const RIGHT_CODES = new Set(['KeyD', 'ArrowRight']);
const DOWN_CODES = new Set(['KeyS', 'ArrowDown']);
const JUMP_CODES = new Set(['KeyW', 'ArrowUp']);
const SLASH_CODES = new Set(['KeyJ', 'KeyZ']);
const DASH_CODES = new Set(['KeyK', 'KeyX']);
const BREATH_CODES = new Set(['Space']);
const ULTIMATE_CODES = new Set(['KeyC', 'KeyL']);

export class InputManager {
  private heldCodes = new Set<string>();
  private virtualHeld = new Set<VirtualControlKey>();
  private prevJumpHeld = false;
  private prevSlashHeld = false;
  private prevDashHeld = false;
  private prevBreathHeld = false;
  private prevUltimateHeld = false;

  private bufferedJumpPress = false;
  private bufferedSlashPress = false;
  private bufferedDashPress = false;
  private bufferedBreathPress = false;
  private bufferedUltimatePress = false;

  constructor(private target: Window = window) {
    this.target.addEventListener('keydown', this.handleKeyDown);
    this.target.addEventListener('keyup', this.handleKeyUp);
    this.target.addEventListener('blur', this.handleBlur);
  }

  public setVirtualControl(key: VirtualControlKey, isDown: boolean): void {
    if (isDown) {
      if (!this.virtualHeld.has(key)) {
        if (key === 'jump') this.bufferedJumpPress = true;
        if (key === 'slash') this.bufferedSlashPress = true;
        if (key === 'dash') this.bufferedDashPress = true;
        if (key === 'breath') this.bufferedBreathPress = true;
        if (key === 'ultimate') this.bufferedUltimatePress = true;
      }
      this.virtualHeld.add(key);
    } else {
      this.virtualHeld.delete(key);
    }
  }

  public sample(): InputSnapshot {
    const left = this.isAnyHeld(LEFT_CODES) || this.virtualHeld.has('left');
    const right = this.isAnyHeld(RIGHT_CODES) || this.virtualHeld.has('right');
    const downHeld = this.isAnyHeld(DOWN_CODES) || this.virtualHeld.has('down');
    const jumpHeld = this.isAnyHeld(JUMP_CODES) || this.virtualHeld.has('jump');
    const slashHeld = this.isAnyHeld(SLASH_CODES) || this.virtualHeld.has('slash');
    const dashHeld = this.isAnyHeld(DASH_CODES) || this.virtualHeld.has('dash');
    const breathHeld = this.isAnyHeld(BREATH_CODES) || this.virtualHeld.has('breath');
    const ultimateHeld =
      this.isAnyHeld(ULTIMATE_CODES) || this.virtualHeld.has('ultimate');

    const jumpPressed = this.bufferedJumpPress || (jumpHeld && !this.prevJumpHeld);
    const slashPressed = this.bufferedSlashPress || (slashHeld && !this.prevSlashHeld);
    const dashPressed = this.bufferedDashPress || (dashHeld && !this.prevDashHeld);
    const breathPressed = this.bufferedBreathPress || (breathHeld && !this.prevBreathHeld);
    const ultimatePressed =
      this.bufferedUltimatePress || (ultimateHeld && !this.prevUltimateHeld);

    this.prevJumpHeld = jumpHeld;
    this.prevSlashHeld = slashHeld;
    this.prevDashHeld = dashHeld;
    this.prevBreathHeld = breathHeld;
    this.prevUltimateHeld = ultimateHeld;

    this.bufferedJumpPress = false;
    this.bufferedSlashPress = false;
    this.bufferedDashPress = false;
    this.bufferedBreathPress = false;
    this.bufferedUltimatePress = false;

    return {
      left,
      right,
      downHeld,
      jumpHeld,
      jumpPressed,
      slashPressed,
      dashPressed,
      breathPressed,
      ultimatePressed,
    };
  }

  public dispose(): void {
    this.target.removeEventListener('keydown', this.handleKeyDown);
    this.target.removeEventListener('keyup', this.handleKeyUp);
    this.target.removeEventListener('blur', this.handleBlur);
  }

  private isAnyHeld(codes: Set<string>): boolean {
    for (const code of codes) {
      if (this.heldCodes.has(code)) return true;
    }
    return false;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (
      LEFT_CODES.has(e.code) ||
      RIGHT_CODES.has(e.code) ||
      DOWN_CODES.has(e.code) ||
      JUMP_CODES.has(e.code) ||
      SLASH_CODES.has(e.code) ||
      DASH_CODES.has(e.code) ||
      BREATH_CODES.has(e.code) ||
      ULTIMATE_CODES.has(e.code)
    ) {
      e.preventDefault();
    }

    if (e.repeat) return;

    this.heldCodes.add(e.code);
    if (JUMP_CODES.has(e.code)) this.bufferedJumpPress = true;
    if (SLASH_CODES.has(e.code)) this.bufferedSlashPress = true;
    if (DASH_CODES.has(e.code)) this.bufferedDashPress = true;
    if (BREATH_CODES.has(e.code)) this.bufferedBreathPress = true;
    if (ULTIMATE_CODES.has(e.code)) this.bufferedUltimatePress = true;
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.heldCodes.delete(e.code);
  };

  private handleBlur = (): void => {
    this.heldCodes.clear();
    this.virtualHeld.clear();
    this.prevJumpHeld = false;
    this.prevSlashHeld = false;
    this.prevDashHeld = false;
    this.prevBreathHeld = false;
    this.prevUltimateHeld = false;
    this.bufferedJumpPress = false;
    this.bufferedSlashPress = false;
    this.bufferedDashPress = false;
    this.bufferedBreathPress = false;
    this.bufferedUltimatePress = false;
  };
}
