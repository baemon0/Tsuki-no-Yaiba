import { CHARACTER_MAP, type CharacterDef, type CharacterId } from '../characters';
import { BREATH } from '../constants';
import { DIFFICULTY_MAP, type DifficultyConfig, type DifficultyId } from '../difficulty';
import type { BreathState, GameSystem, Particle, UpdateContext } from '../types';
import type { RunModifiers } from '../upgrades';

export class BreathRhythmSystem implements GameSystem {
  public readonly id = 'breath-rhythm';

  public characterId: CharacterId = 'tanjiro';
  public difficultyId: DifficultyId = 'kinoe';
  public hp: number = BREATH.maxHealth;
  public maxHp: number = BREATH.maxHealth;
  public ultimateCharge = 0; // 0..100
  public markUsedThisRun = false;
  public markTimer = 0;

  public readonly breath: BreathState = {
    mode: 'oscillating',
    cursor: 0.15,
    timer: 0,
    duration: 0,
  };

  private phase = 0;
  private sweetSpotBonus = 0;
  private damageTakenMult = 1;

  constructor(private getPlayerPos: () => { x: number; y: number; facing: 1 | -1 }) {}

  public get character(): CharacterDef {
    return CHARACTER_MAP[this.characterId];
  }

  public get difficulty(): DifficultyConfig {
    return DIFFICULTY_MAP[this.difficultyId];
  }

  public get isUltimateReady(): boolean {
    return this.ultimateCharge >= 100;
  }

  public get isMarkActive(): boolean {
    return this.markTimer > 0;
  }

  public setCharacter(characterId: CharacterId): void {
    this.characterId = characterId;
    this.maxHp = this.character.gameplay.maxHp;
    this.hp = this.maxHp;
  }

  public setDifficulty(difficultyId: DifficultyId): void {
    this.difficultyId = difficultyId;
  }

  public syncModifiers(mods: RunModifiers): void {
    const targetMax = this.character.gameplay.maxHp + mods.bonusMaxHp;
    if (targetMax > this.maxHp) {
      const gained = targetMax - this.maxHp;
      this.maxHp = targetMax;
      this.hp = Math.min(this.maxHp, this.hp + gained);
    } else {
      this.maxHp = targetMax;
      this.hp = Math.min(this.hp, this.maxHp);
    }
    this.sweetSpotBonus = mods.sweetSpotBonus;
    this.damageTakenMult = mods.damageTakenMult;
  }

  public reset(characterId?: CharacterId, difficultyId?: DifficultyId): void {
    if (characterId) {
      this.characterId = characterId;
    }
    if (difficultyId) {
      this.difficultyId = difficultyId;
    }
    this.maxHp = this.character.gameplay.maxHp;
    this.hp = this.maxHp;
    this.ultimateCharge = 0;
    this.markUsedThisRun = false;
    this.markTimer = 0;
    this.sweetSpotBonus = 0;
    this.damageTakenMult = 1;
    this.breath.mode = 'oscillating';
    this.breath.cursor = 0.15;
    this.breath.timer = 0;
    this.breath.duration = 0;
    this.phase = 0;
  }

  public get isCharged(): boolean {
    return this.breath.mode === 'charged' || this.markTimer > 0;
  }

  public get isExhausted(): boolean {
    return this.markTimer <= 0 && this.breath.mode === 'exhausted';
  }

  public addUltimateCharge(amount: number, mult = 1): void {
    this.ultimateCharge = Math.min(100, this.ultimateCharge + amount * mult);
  }

  public consumeUltimate(): boolean {
    if (this.ultimateCharge < 100) return false;
    this.ultimateCharge = 0;
    return true;
  }

  public damagePlayer(amount: number): void {
    const mitigated = Math.max(1, Math.round(amount * this.damageTakenMult));
    this.hp = Math.max(0, this.hp - mitigated);
  }

  public healPlayer(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  public tryTriggerSlayerMark(
    hasActiveBoss: boolean,
    emitAction: UpdateContext['emitAction'],
    spawnParticles: (particles: Particle[]) => void
  ): boolean {
    if (
      this.markUsedThisRun ||
      !hasActiveBoss ||
      this.hp <= 0 ||
      this.hp / this.maxHp >= 0.3
    ) {
      return false;
    }

    this.markUsedThisRun = true;
    this.markTimer = 10.0;
    this.breath.mode = 'charged';
    this.breath.timer = 10.0;
    this.breath.duration = 10.0;
    this.addUltimateCharge(25);

    const pos = this.getPlayerPos();
    emitAction({
      type: 'slayer_mark',
      x: pos.x,
      y: pos.y,
      facing: pos.facing,
      characterId: this.characterId,
      charged: true,
    });

    const c = this.character.colors;
    const burst: Particle[] = [];
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const speed = 55 + Math.random() * 115;
      burst.push({
        x: pos.x,
        y: pos.y - 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 18,
        life: 0.45 + Math.random() * 0.3,
        maxLife: 0.75,
        size: i % 3 === 0 ? 3 : 2,
        color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? c.bright : '#ef4444',
        gravityFactor: -0.06,
      });
    }
    spawnParticles(burst);
    return true;
  }

  public update(ctx: UpdateContext): void {
    const { dt, input, modifiers, emitAction, spawnParticles } = ctx;
    this.syncModifiers(modifiers);

    if (this.markTimer > 0) {
      this.markTimer = Math.max(0, this.markTimer - dt);
      if (this.markTimer > 0) {
        this.breath.mode = 'charged';
        this.breath.timer = this.markTimer;
        this.breath.duration = 10.0;
        return;
      } else {
        this.breath.mode = 'oscillating';
        this.breath.timer = 0;
        this.breath.duration = 0;
      }
    }

    const diff = this.difficulty;
    const minSweet = Math.max(0.08, diff.sweetSpotMin - this.sweetSpotBonus);
    const maxSweet = Math.min(0.92, diff.sweetSpotMax + this.sweetSpotBonus);

    if (this.breath.mode === 'oscillating') {
      this.phase =
        (this.phase + dt * BREATH.oscillationSpeed * diff.oscillationSpeedMult) % 2;
      this.breath.cursor = this.phase <= 1 ? this.phase : 2 - this.phase;

      if (input.breathPressed) {
        const inSweetSpot =
          this.breath.cursor >= minSweet && this.breath.cursor <= maxSweet;

        const pos = this.getPlayerPos();

        if (inSweetSpot) {
          const duration = BREATH.chargeDuration + modifiers.chargeDurationBonus;
          this.breath.mode = 'charged';
          this.breath.timer = duration;
          this.breath.duration = duration;
          this.addUltimateCharge(8, modifiers.ultimateChargeMult);

          emitAction({
            type: 'breath_charge',
            x: pos.x,
            y: pos.y,
            facing: pos.facing,
            characterId: this.characterId,
          });
          this.spawnChargeBurst(spawnParticles, pos.x, pos.y);
        } else {
          this.breath.mode = 'exhausted';
          this.breath.timer = BREATH.exhaustDuration;
          this.breath.duration = BREATH.exhaustDuration;

          emitAction({
            type: 'breath_fail',
            x: pos.x,
            y: pos.y,
            facing: pos.facing,
            characterId: this.characterId,
          });
          this.spawnExhaustBurst(spawnParticles, pos.x, pos.y);
        }
      }
    } else {
      this.breath.timer = Math.max(0, this.breath.timer - dt);
      if (this.breath.timer <= 0) {
        this.breath.mode = 'oscillating';
        this.breath.duration = 0;
      }
    }
  }

  public renderHUD(ctx: CanvasRenderingContext2D, elapsed: number): void {
    const hudX = 10;
    const hudY = 9;
    const barW = 114;
    const char = this.character;
    const c = char.colors;

    // Subtle dark backing plate behind top-left HUD
    const panelW = Math.max(barW + 56, 180);
    ctx.fillStyle = 'rgba(5, 8, 16, 0.78)';
    ctx.fillRect(hudX - 3, hudY - 3, panelW, 56);
    ctx.fillStyle = c.primary;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(hudX - 3, hudY - 3, panelW, 1);
    ctx.globalAlpha = 1;

    // 1. RED HEALTH BAR
    const hpBarH = 8;
    ctx.fillStyle = '#070a12';
    ctx.fillRect(hudX, hudY, barW, hpBarH);
    ctx.fillStyle = '#3b1520';
    ctx.fillRect(hudX + 1, hudY + 1, barW - 2, hpBarH - 2);

    const hpRatio = Math.max(0, Math.min(1, this.hp / this.maxHp));
    const hpFillW = Math.round((barW - 2) * hpRatio);
    if (hpFillW > 0) {
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(hudX + 1, hudY + 1, hpFillW, hpBarH - 2);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(hudX + 1, hudY + 1, hpFillW, 2);
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(hudX + 1, hudY + 1, hpFillW, 1);
    }

    this.drawPixelBorder(ctx, hudX, hudY, barW, hpBarH, '#475569');

    ctx.font = 'bold 7px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';
    this.drawShadowText(ctx, `HP ${this.hp}`, hudX + barW + 5, hudY + 1, '#fecaca');

    // 2. OSCILLATING BREATH RHYTHM METER
    const meterY = hudY + 11;
    const meterH = 8;

    ctx.fillStyle = '#070b14';
    ctx.fillRect(hudX, meterY, barW, meterH);

    if (this.breath.mode === 'oscillating') {
      const diff = this.difficulty;
      const minSweet = Math.max(0.08, diff.sweetSpotMin - this.sweetSpotBonus);
      const maxSweet = Math.min(0.92, diff.sweetSpotMax + this.sweetSpotBonus);
      const innerW = barW - 2;
      const sweetX = hudX + 1 + Math.round(innerW * minSweet);
      const sweetW = Math.round(innerW * (maxSweet - minSweet));
      const inSweet = this.breath.cursor >= minSweet && this.breath.cursor <= maxSweet;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(hudX + 1, meterY + 1, innerW, meterH - 2);

      ctx.fillStyle = c.dark;
      ctx.fillRect(sweetX, meterY + 1, sweetW, meterH - 2);
      ctx.fillStyle = inSweet ? c.bright : c.primary;
      ctx.globalAlpha = inSweet ? 0.55 : 0.28;
      ctx.fillRect(sweetX, meterY + 1, sweetW, meterH - 2);
      ctx.globalAlpha = 1;

      ctx.fillStyle = c.bright;
      ctx.fillRect(sweetX, meterY + 1, 1, meterH - 2);
      ctx.fillRect(sweetX + sweetW - 1, meterY + 1, 1, meterH - 2);

      const cursorX = hudX + 1 + Math.round(this.breath.cursor * (innerW - 3));
      ctx.fillStyle = inSweet ? c.bright : '#e2e8f0';
      ctx.fillRect(cursorX, meterY, 3, meterH);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cursorX + 1, meterY + 1, 1, meterH - 2);

      this.drawPixelBorder(
        ctx,
        hudX,
        meterY,
        barW,
        meterH,
        inSweet ? c.primary : '#334155'
      );
      this.drawShadowText(ctx, 'SPACE', hudX + barW + 5, meterY, '#94a3b8');
    } else if (this.breath.mode === 'charged') {
      const ratio = Math.max(0, this.breath.timer / Math.max(0.01, this.breath.duration));
      const fillW = Math.round((barW - 2) * ratio);
      const pulse = Math.sin(elapsed * 16) > 0;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(hudX + 1, meterY + 1, barW - 2, meterH - 2);
      if (fillW > 0) {
        ctx.fillStyle = this.isMarkActive ? (pulse ? '#ef4444' : c.primary) : c.primary;
        ctx.fillRect(hudX + 1, meterY + 1, fillW, meterH - 2);
        ctx.fillStyle = pulse ? '#ffffff' : this.isMarkActive ? '#fef08a' : c.bright;
        ctx.fillRect(hudX + 1, meterY + 1, fillW, 2);
      }

      this.drawPixelBorder(
        ctx,
        hudX,
        meterY,
        barW,
        meterH,
        this.isMarkActive ? (pulse ? '#fef08a' : '#ef4444') : c.bright
      );
      this.drawShadowText(
        ctx,
        this.isMarkActive
          ? `MARK ${this.markTimer.toFixed(1)}s`
          : `${this.breath.timer.toFixed(1)}s`,
        hudX + barW + 5,
        meterY,
        this.isMarkActive ? '#fecaca' : c.bright
      );
    } else {
      const ratio = Math.max(0, this.breath.timer / this.breath.duration);
      const fillW = Math.round((barW - 2) * ratio);
      ctx.fillStyle = '#14111c';
      ctx.fillRect(hudX + 1, meterY + 1, barW - 2, meterH - 2);
      if (fillW > 0) {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(hudX + 1, meterY + 1, fillW, meterH - 2);
      }
      this.drawPixelBorder(ctx, hudX, meterY, barW, meterH, '#7f1d1d');
      this.drawShadowText(ctx, 'TIRED', hudX + barW + 5, meterY, '#f87171');
    }

    // 3. ULTIMATE GAUGE (C / L)
    const ultY = meterY + 11;
    const ultH = 6;
    const ultReady = this.ultimateCharge >= 100;
    const ultPulse = ultReady && Math.sin(elapsed * 14) > 0;

    ctx.fillStyle = '#070a12';
    ctx.fillRect(hudX, ultY, barW, ultH);
    const ultFillW = Math.round(((barW - 2) * Math.min(100, this.ultimateCharge)) / 100);
    if (ultFillW > 0) {
      ctx.fillStyle = ultReady ? (ultPulse ? '#fef08a' : '#f59e0b') : c.primary;
      ctx.fillRect(hudX + 1, ultY + 1, ultFillW, ultH - 2);
      ctx.fillStyle = ultReady ? '#ffffff' : c.bright;
      ctx.fillRect(hudX + 1, ultY + 1, ultFillW, 1);
    }
    this.drawPixelBorder(
      ctx,
      hudX,
      ultY,
      barW,
      ultH,
      ultReady ? (ultPulse ? '#ffffff' : '#fbbf24') : '#334155'
    );
    ctx.font = 'bold 6px "JetBrains Mono", monospace';
    this.drawShadowText(
      ctx,
      ultReady ? 'C/L ULT!' : `ULT ${Math.floor(this.ultimateCharge)}%`,
      hudX + barW + 5,
      ultY,
      ultReady ? (ultPulse ? '#ffffff' : '#fde047') : '#94a3b8'
    );

    // 4. LOCKED CHARACTER & SIGNATURE BREATHING STYLE INDICATOR
    const styleY = ultY + 10;
    ctx.fillStyle = '#090e18';
    ctx.fillRect(hudX, styleY, 8, 8);
    this.drawPixelBorder(
      ctx,
      hudX,
      styleY,
      8,
      8,
      this.isMarkActive ? '#ef4444' : c.primary
    );
    ctx.fillStyle = this.isMarkActive ? '#fef08a' : c.bright;
    ctx.fillRect(hudX + 2, styleY + 2, 4, 4);

    ctx.font = 'bold 7px "DM Sans", sans-serif';
    this.drawShadowText(
      ctx,
      this.isMarkActive
        ? `${char.shortName.toUpperCase()} · علامة الصياد +40%`
        : `${char.shortName.toUpperCase()} · ${char.arabicStyleName}`,
      hudX + 12,
      styleY,
      this.isMarkActive ? '#fca5a5' : c.bright
    );
  }

  private drawPixelBorder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ): void {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
  }

  private drawShadowText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color: string
  ): void {
    ctx.fillStyle = '#03050a';
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  private spawnChargeBurst(
    spawnParticles: (particles: Particle[]) => void,
    px: number,
    py: number
  ): void {
    const c = this.character.colors;
    const burst: Particle[] = [];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const speed = 42 + Math.random() * 55;
      burst.push({
        x: px,
        y: py - 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 14,
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.55,
        size: i % 3 === 0 ? 2 : 1,
        color: i % 2 === 0 ? c.bright : c.primary,
        gravityFactor: -0.05,
      });
    }
    spawnParticles(burst);
  }

  private spawnExhaustBurst(
    spawnParticles: (particles: Particle[]) => void,
    px: number,
    py: number
  ): void {
    const burst: Particle[] = [];
    for (let i = 0; i < 10; i++) {
      burst.push({
        x: px + (Math.random() - 0.5) * 14,
        y: py - 12 - Math.random() * 12,
        vx: (Math.random() - 0.5) * 26,
        vy: -12 - Math.random() * 16,
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.55,
        size: i % 2 === 0 ? 2 : 1,
        color: i % 2 === 0 ? '#64748b' : '#475569',
        gravityFactor: 0.08,
      });
    }
    spawnParticles(burst);
  }
}
