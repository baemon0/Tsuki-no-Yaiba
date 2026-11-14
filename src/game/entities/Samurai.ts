import { CHARACTER_MAP, type CharacterDef, type CharacterId } from '../characters';
import { ARENA, ARENA_PLATFORMS, BREATH, DASH, GROUND_Y, PHYSICS, SLASH } from '../constants';
import { getCharacterSprites, type SamuraiSpriteSet } from '../sprites/samuraiSprites';
import type {
  ActiveSlashBox,
  Facing,
  InputSnapshot,
  Particle,
  PlayerActionEvent,
  SamuraiAnimState,
  SlashArcEffect,
  SlashPhase,
} from '../types';
import type { RunModifiers } from '../upgrades';

interface Afterimage {
  x: number;
  y: number;
  facing: Facing;
  life: number;
  maxLife: number;
  color: string;
}

export interface SamuraiUpdateOptions {
  characterId: CharacterId;
  isCharged: boolean;
  isExhausted: boolean;
  isMarkActive: boolean;
  modifiers: RunModifiers;
}

export class Samurai {
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public facing: Facing = 1;
  public grounded = true;
  public characterId: CharacterId;

  public animState: SamuraiAnimState = 'idle';
  private animTimer = 0;
  private footstepAccum = 0;

  // Responsive jump, drop-through & wall-jump helpers
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private dropThroughTimer = 0;
  private wallSlideDir: -1 | 0 | 1 = 0;
  private wallJumpLockTimer = 0;
  private wallSlideParticleAccum = 0;

  // Katana slash state
  private slashPhase: SlashPhase = 'none';
  private slashTimer = 0;
  private slashCooldownTimer = 0;
  private slashCharged = false;
  private slashCounter = 0;
  private slashDamageMult = 1;
  private activeArc: SlashArcEffect | null = null;

  // Sekiro-style Perfect Parry window on slash start
  private parryTimer = 0;

  // Dash / Thunder Blink / Mist Evade state
  private dashTimer = 0;
  private dashCooldownTimer = 0;
  private dashMode: 'standard' | 'thunder_blink' | 'mist_evade' = 'standard';
  private dashStartX = 0;
  private dashSpeedBonus = 1;
  private afterimages: Afterimage[] = [];
  private afterimageAccum = 0;

  // Aura / mist particle spawn throttle
  private auraParticleAccum = 0;
  private mistTrailAccum = 0;

  // Damage / Ultimate invulnerability frames
  private invulnTimer = 0;
  private ultimateGlowTimer = 0;

  private sprites: SamuraiSpriteSet;

  constructor(startX = 0, startY = GROUND_Y, characterId: CharacterId = 'tanjiro') {
    this.x = startX;
    this.y = startY;
    this.characterId = characterId;
    this.sprites = getCharacterSprites(characterId);
  }

  public get character(): CharacterDef {
    return CHARACTER_MAP[this.characterId];
  }

  public setCharacter(characterId: CharacterId): void {
    this.characterId = characterId;
    this.sprites = getCharacterSprites(characterId);
  }

  public get isParrying(): boolean {
    return this.parryTimer > 0;
  }

  public get isDashing(): boolean {
    return this.dashTimer > 0;
  }

  public get isInvulnerable(): boolean {
    return this.invulnTimer > 0 || this.ultimateGlowTimer > 0 || this.dashTimer > 0;
  }

  public triggerUltimatePose(duration = 1.15): void {
    this.ultimateGlowTimer = Math.max(this.ultimateGlowTimer, duration);
    this.invulnTimer = Math.max(this.invulnTimer, duration);
  }

  public triggerMarkAwakeningPose(duration = 0.65): void {
    this.invulnTimer = Math.max(this.invulnTimer, duration);
  }

  public applyHurtKnockback(dir: Facing): void {
    this.invulnTimer = 0.78;
    this.vx = dir * 135;
    if (this.grounded) {
      this.vy = -125;
      this.grounded = false;
    }
  }

  public getActiveSlashBox(): ActiveSlashBox | null {
    if (this.slashPhase !== 'active') return null;
    const g = this.character.gameplay;
    const width = this.slashCharged ? g.chargedRange : g.slashRange;
    const height = this.slashCharged ? g.chargedHeight : g.slashHeight;
    const damage = Math.round(
      (this.slashCharged ? g.chargedDamage : g.baseDamage) * this.slashDamageMult
    );

    return {
      slashId: this.slashCounter,
      x: this.facing === 1 ? this.x + 2 : this.x - 2 - width,
      y: this.y - height - 2,
      width,
      height,
      facing: this.facing,
      damage,
      characterId: this.characterId,
      charged: this.slashCharged,
    };
  }

  public reset(startX = 0, startY = GROUND_Y, characterId?: CharacterId): void {
    if (characterId) {
      this.setCharacter(characterId);
    }
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.grounded = true;
    this.animState = 'idle';
    this.animTimer = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.dropThroughTimer = 0;
    this.wallSlideDir = 0;
    this.wallJumpLockTimer = 0;
    this.slashPhase = 'none';
    this.slashTimer = 0;
    this.slashCooldownTimer = 0;
    this.slashDamageMult = 1;
    this.activeArc = null;
    this.parryTimer = 0;
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.dashMode = 'standard';
    this.dashSpeedBonus = 1;
    this.afterimages = [];
    this.invulnTimer = 0;
    this.ultimateGlowTimer = 0;
  }

  public update(
    dt: number,
    input: InputSnapshot,
    opts: SamuraiUpdateOptions,
    emitAction: (event: PlayerActionEvent) => void,
    spawnParticles: (particles: Particle[]) => void
  ): void {
    if (opts.characterId !== this.characterId) {
      this.setCharacter(opts.characterId);
    }

    const char = this.character;
    const g = char.gameplay;
    const c = char.colors;
    const mods = opts.modifiers;

    this.animTimer += dt;
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.ultimateGlowTimer > 0)
      this.ultimateGlowTimer = Math.max(0, this.ultimateGlowTimer - dt);
    if (this.slashCooldownTimer > 0)
      this.slashCooldownTimer = Math.max(0, this.slashCooldownTimer - dt);
    if (this.dashCooldownTimer > 0)
      this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - dt);
    if (this.parryTimer > 0) this.parryTimer = Math.max(0, this.parryTimer - dt);
    if (this.dropThroughTimer > 0)
      this.dropThroughTimer = Math.max(0, this.dropThroughTimer - dt);
    if (this.wallJumpLockTimer > 0)
      this.wallJumpLockTimer = Math.max(0, this.wallJumpLockTimer - dt);

    this.updateAfterimages(dt);

    // Charged sword aura & intense Demon Slayer Mark elemental aura particles
    if (opts.isCharged || opts.isMarkActive || this.ultimateGlowTimer > 0) {
      this.auraParticleAccum += dt;
      const interval = opts.isMarkActive ? 0.022 : 0.055;
      if (this.auraParticleAccum >= interval) {
        this.auraParticleAccum = 0;
        const count = opts.isMarkActive ? 2 : 1;
        const particles: Particle[] = [];
        for (let i = 0; i < count; i++) {
          particles.push({
            x: this.x + (Math.random() - 0.5) * (opts.isMarkActive ? 22 : 18),
            y: this.y - 2 - Math.random() * 23,
            vx: (Math.random() - 0.5) * (opts.isMarkActive ? 28 : 18),
            vy: (opts.isMarkActive ? -36 : -22) - Math.random() * 24,
            life: opts.isMarkActive ? 0.42 : 0.32,
            maxLife: opts.isMarkActive ? 0.42 : 0.32,
            size: Math.random() > 0.5 ? 2 : 1,
            color:
              opts.isMarkActive && i === 1
                ? Math.random() > 0.45
                  ? '#ef4444'
                  : '#fef08a'
                : Math.random() > 0.45
                  ? c.bright
                  : c.primary,
            gravityFactor: -0.06,
          });
        }
        spawnParticles(particles);
      }
    } else {
      this.auraParticleAccum = 0;
    }

    // Muichiro Mist ambient drift trail while moving
    if (g.vfxStyle === 'mist' && Math.abs(this.vx) > 40) {
      this.mistTrailAccum += dt;
      if (this.mistTrailAccum >= 0.08) {
        this.mistTrailAccum = 0;
        spawnParticles([
          {
            x: this.x - this.facing * 4 + (Math.random() - 0.5) * 6,
            y: this.y - 6 - Math.random() * 14,
            vx: -this.facing * (8 + Math.random() * 14),
            vy: -5 - Math.random() * 8,
            life: 0.38,
            maxLife: 0.38,
            size: Math.random() > 0.4 ? 3 : 2,
            color: Math.random() > 0.5 ? c.bright : c.primary,
            gravityFactor: -0.03,
          },
        ]);
      }
    }

    // 1. Update coyote & jump buffer timers + Drop-Down through elevated platform (S/Down + Jump)
    if (this.grounded) {
      this.coyoteTimer = PHYSICS.coyoteTime;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    const standingOnPlatform = this.grounded && this.y < GROUND_Y;
    if (standingOnPlatform && input.downHeld && input.jumpPressed) {
      // Drop smoothly through one-way elevated platform
      this.dropThroughTimer = 0.24;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.y += 2;
      this.vy = 55;
      this.spawnDustBurst(spawnParticles, 4, 18);
    } else if (input.jumpPressed) {
      this.jumpBufferTimer = PHYSICS.jumpBufferTime;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }

    // 2. Dash / Thunder Blink / Mist Evade (disabled while exhausted)
    if (
      input.dashPressed &&
      !opts.isExhausted &&
      this.dashTimer <= 0 &&
      this.dashCooldownTimer <= 0 &&
      this.slashPhase === 'none'
    ) {
      this.startDash(input, opts, emitAction, spawnParticles);
    }

    // 3. Handle katana slash input (disabled while exhausted or mid-dash)
    if (
      input.slashPressed &&
      !opts.isExhausted &&
      this.dashTimer <= 0 &&
      this.slashPhase === 'none' &&
      this.slashCooldownTimer <= 0
    ) {
      this.startSlash(input, opts, emitAction, spawnParticles);
    }

    // 4. Horizontal & Vertical movement + Wall Slide + Wall Jump
    this.wallSlideDir = 0;
    const minWallX = ARENA.minX + 6;
    const maxWallX = ARENA.maxX - 6;

    if (this.dashTimer > 0) {
      this.dashTimer = Math.max(0, this.dashTimer - dt);
      let baseDashSpeed: number;
      if (this.dashMode === 'thunder_blink') {
        baseDashSpeed = opts.isCharged
          ? DASH.thunderBlinkChargedSpeed
          : DASH.thunderBlinkSpeed;
      } else if (this.dashMode === 'mist_evade') {
        baseDashSpeed = DASH.mistEvadeSpeed;
      } else {
        baseDashSpeed = DASH.standardSpeed;
      }
      this.vx = this.facing * baseDashSpeed * g.dashSpeedMult * this.dashSpeedBonus;
      this.vy = 0;

      // Spawn afterimages during dash
      this.afterimageAccum += dt;
      const interval =
        this.dashMode === 'thunder_blink'
          ? 0.02
          : this.dashMode === 'mist_evade'
            ? 0.03
            : 0.055;
      if (this.afterimageAccum >= interval) {
        this.afterimageAccum = 0;
        this.afterimages.push({
          x: this.x,
          y: this.y,
          facing: this.facing,
          life: this.dashMode !== 'standard' ? 0.25 : 0.14,
          maxLife: this.dashMode !== 'standard' ? 0.25 : 0.14,
          color: c.primary,
        });

        if (this.dashMode === 'thunder_blink') {
          spawnParticles([
            {
              x: this.x + (Math.random() - 0.5) * 10,
              y: this.y - 6 - Math.random() * 18,
              vx: -this.facing * (25 + Math.random() * 45),
              vy: (Math.random() - 0.5) * 40,
              life: 0.22,
              maxLife: 0.22,
              size: Math.random() > 0.5 ? 2 : 1,
              color: Math.random() > 0.4 ? c.bright : c.primary,
              gravityFactor: 0,
            },
          ]);
        } else if (this.dashMode === 'mist_evade') {
          spawnParticles([
            {
              x: this.x - this.facing * 4,
              y: this.y - 8 - Math.random() * 14,
              vx: -this.facing * (12 + Math.random() * 20),
              vy: -10 + (Math.random() - 0.5) * 16,
              life: 0.36,
              maxLife: 0.36,
              size: 3,
              color: Math.random() > 0.5 ? c.bright : c.primary,
              gravityFactor: -0.02,
            },
          ]);
        }
      }

      if (this.dashTimer <= 0) {
        this.vx *= 0.35;
        if (this.dashMode === 'thunder_blink') {
          this.spawnThunderArrivalSparks(spawnParticles);
        }
      }
    } else {
      const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (moveDir !== 0 && this.slashPhase === 'none' && this.wallJumpLockTimer <= 0) {
        this.facing = moveDir as Facing;
      }

      const markSpeedBonus = opts.isMarkActive ? 1.4 : 1;
      const speedMult =
        g.moveSpeedMult *
        mods.moveSpeedMult *
        markSpeedBonus *
        (opts.isExhausted ? BREATH.exhaustSpeedMultiplier : 1);
      const isSlashingOnGround = this.slashPhase !== 'none' && this.grounded;
      const targetVx = isSlashingOnGround
        ? 0
        : moveDir * PHYSICS.moveSpeed * speedMult;

      if (this.wallJumpLockTimer <= 0) {
        const accel = this.grounded
          ? moveDir !== 0
            ? PHYSICS.groundAccel
            : PHYSICS.groundDecel
          : moveDir !== 0
            ? PHYSICS.airAccel
            : PHYSICS.airDecel;

        if (this.vx < targetVx) {
          this.vx = Math.min(targetVx, this.vx + accel * dt);
        } else if (this.vx > targetVx) {
          this.vx = Math.max(targetVx, this.vx - accel * dt);
        }
      }

      // Check screen-edge wall contact while airborne
      const nearLeftWall = !this.grounded && this.x <= minWallX + 4;
      const nearRightWall = !this.grounded && this.x >= maxWallX - 4;

      if (nearLeftWall && input.left && this.vy >= -15) {
        this.wallSlideDir = -1;
        this.facing = 1;
      } else if (nearRightWall && input.right && this.vy >= -15) {
        this.wallSlideDir = 1;
        this.facing = -1;
      }

      // Ground / Coyote Jump OR Wall Jump on screen edges
      if (this.jumpBufferTimer > 0) {
        if (this.coyoteTimer > 0) {
          this.vy = PHYSICS.jumpVelocity;
          this.grounded = false;
          this.coyoteTimer = 0;
          this.jumpBufferTimer = 0;

          emitAction({
            type: 'jump',
            x: this.x,
            y: this.y,
            facing: this.facing,
            characterId: this.characterId,
          });
          this.spawnDustBurst(spawnParticles, 5, -26);
        } else if (nearLeftWall || nearRightWall) {
          const wallDir: -1 | 1 = nearLeftWall ? -1 : 1;
          this.facing = (-wallDir) as Facing;
          this.vx = -wallDir * PHYSICS.wallJumpVx;
          this.vy = PHYSICS.wallJumpVy;
          this.wallJumpLockTimer = 0.11;
          this.jumpBufferTimer = 0;
          this.wallSlideDir = 0;

          emitAction({
            type: 'wall_jump',
            x: this.x,
            y: this.y,
            facing: this.facing,
            characterId: this.characterId,
          });
          this.spawnWallJumpBurst(spawnParticles, wallDir);
        }
      }

      if (!input.jumpHeld && this.vy < -60) {
        this.vy *= Math.pow(PHYSICS.jumpCutMultiplier, dt * 18);
      }

      this.vy = Math.min(
        this.wallSlideDir !== 0 ? PHYSICS.wallSlideMaxSpeed : PHYSICS.maxFallSpeed,
        this.vy + PHYSICS.gravity * dt
      );

      // Wall slide sparks/dust
      if (this.wallSlideDir !== 0 && this.vy > 10) {
        this.wallSlideParticleAccum += dt;
        if (this.wallSlideParticleAccum >= 0.08) {
          this.wallSlideParticleAccum = 0;
          spawnParticles([
            {
              x: this.x + this.wallSlideDir * 5,
              y: this.y - 12 - Math.random() * 10,
              vx: -this.wallSlideDir * (10 + Math.random() * 16),
              vy: -14 - Math.random() * 14,
              life: 0.2,
              maxLife: 0.2,
              size: 1,
              color: '#94a3b8',
              gravityFactor: 0.2,
            },
          ]);
        }
      }
    }

    // 5. Integrate position & clamp to arena walls
    const prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x < minWallX) {
      this.x = minWallX;
      if (this.vx < 0) this.vx = 0;
    } else if (this.x > maxWallX) {
      this.x = maxWallX;
      if (this.vx > 0) this.vx = 0;
    }

    // 6. One-way elevated platform & Ground collision
    const wasGrounded = this.grounded;
    let landed = false;

    if (this.vy >= 0 && this.dropThroughTimer <= 0) {
      for (const plat of ARENA_PLATFORMS) {
        if (
          this.x >= plat.x - 4 &&
          this.x <= plat.x + plat.width + 4 &&
          prevY <= plat.y + 3 &&
          this.y >= plat.y
        ) {
          this.y = plat.y;
          if (!wasGrounded && this.vy > 80) {
            emitAction({
              type: 'land',
              x: this.x,
              y: this.y,
              facing: this.facing,
              characterId: this.characterId,
            });
            this.spawnDustBurst(spawnParticles, 5, -15);
          }
          this.vy = 0;
          this.grounded = true;
          landed = true;
          break;
        }
      }
    }

    if (!landed) {
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        if (!wasGrounded && this.vy > 80) {
          emitAction({
            type: 'land',
            x: this.x,
            y: this.y,
            facing: this.facing,
            characterId: this.characterId,
          });
          this.spawnDustBurst(spawnParticles, 6, -18);
        }
        this.vy = 0;
        this.grounded = true;
      } else {
        this.grounded = false;
      }
    }

    // 7. Footstep particles while running
    if (
      this.grounded &&
      this.dashTimer <= 0 &&
      Math.abs(this.vx) > 65 &&
      this.slashPhase === 'none'
    ) {
      this.footstepAccum += Math.abs(this.vx) * dt;
      if (this.footstepAccum >= 38) {
        this.footstepAccum = 0;
        emitAction({
          type: 'footstep',
          x: this.x,
          y: this.y,
          facing: this.facing,
          characterId: this.characterId,
        });
        spawnParticles([
          {
            x: this.x - this.facing * 4,
            y: this.y - 1,
            vx: -this.facing * (12 + Math.random() * 14),
            vy: -14 - Math.random() * 12,
            life: 0.24,
            maxLife: 0.24,
            size: 1,
            color: '#4f7a82',
            gravityFactor: 0.15,
          },
        ]);
      }
    } else {
      this.footstepAccum = 18;
    }

    // 8. Update slash state machine & crescent arc effect (+40% attack speed when Mark is active)
    const effectiveAttackSpeed = mods.attackSpeedMult * (opts.isMarkActive ? 1.4 : 1);
    this.updateSlash(dt, effectiveAttackSpeed);

    // 9. Resolve animation state
    if (this.dashTimer > 0) {
      this.animState = 'dash';
    } else if (this.slashPhase !== 'none') {
      this.animState = 'slash';
    } else if (this.wallSlideDir !== 0) {
      this.animState = 'wall_slide';
    } else if (!this.grounded) {
      this.animState = this.vy < 0 ? 'jump' : 'fall';
    } else if (Math.abs(this.vx) > 12) {
      this.animState = 'run';
    } else {
      this.animState = 'idle';
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    opts: SamuraiUpdateOptions,
    elapsed: number
  ): void {
    const char = this.character;
    const c = char.colors;
    const screenX = Math.round(this.x - cameraX);
    const screenY = Math.round(this.y);

    // Render Thunder lightning blink beam
    if (this.dashTimer > 0 && this.dashMode === 'thunder_blink') {
      const startScreenX = Math.round(this.dashStartX - cameraX);
      const yMid = screenY - 14;
      ctx.fillStyle = c.primary;
      const minX = Math.min(startScreenX, screenX);
      const span = Math.abs(screenX - startScreenX);
      ctx.fillRect(minX, yMid, span, 2);
      ctx.fillStyle = c.bright;
      ctx.fillRect(minX, yMid, span, 1);
    }

    // Afterimages
    for (const imgGhost of this.afterimages) {
      const alpha = Math.max(0, imgGhost.life / imgGhost.maxLife) * 0.55;
      const gx = Math.round(imgGhost.x - cameraX);
      const gy = Math.round(imgGhost.y);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = imgGhost.color;
      ctx.fillRect(gx - 5, gy - 25, 10, 22);
      ctx.fillRect(gx - 3, gy - 29, 6, 4);
      ctx.globalAlpha = 1;
    }

    // Contact shadow on ground or standing platform
    let shadowSurfaceY = GROUND_Y;
    for (const plat of ARENA_PLATFORMS) {
      if (this.y <= plat.y + 1 && this.x >= plat.x - 4 && this.x <= plat.x + plat.width + 4) {
        shadowSurfaceY = Math.min(shadowSurfaceY, plat.y);
      }
    }
    if (this.y <= shadowSurfaceY) {
      const dist = Math.max(0, shadowSurfaceY - this.y);
      const shadowAlpha = Math.max(0.12, 0.42 - dist * 0.004);
      const shadowHalfW = Math.max(
        3,
        Math.round((char.id === 'gyomei' ? 9 : 7) - dist * 0.05)
      );
      ctx.fillStyle = `rgba(3, 5, 10, ${shadowAlpha.toFixed(2)})`;
      ctx.fillRect(screenX - shadowHalfW, shadowSurfaceY - 1, shadowHalfW * 2, 2);
    }

    // Charged 3.5s Sword Aura, Ultimate Aura, or Blazing Demon Slayer Mark Aura behind character
    if (opts.isCharged || opts.isMarkActive || this.ultimateGlowTimer > 0) {
      const pulse = Math.sin(elapsed * 18);
      const auraR =
        (pulse > 0 ? 15 : 13) +
        (char.id === 'gyomei' ? 3 : 0) +
        (opts.isMarkActive ? 3 : 0);

      if (opts.isMarkActive) {
        // Outer scarlet-crimson Demon Slayer Mark flame shroud
        ctx.fillStyle = '#ef4444';
        ctx.globalAlpha = 0.22;
        ctx.fillRect(screenX - auraR - 2, screenY - 31, (auraR + 2) * 2, 30);
        // Rising flame flicker tongues
        for (let f = -1; f <= 1; f++) {
          const flameH = 4 + Math.round(Math.abs(Math.sin(elapsed * 16 + f * 1.7)) * 6);
          ctx.fillStyle = f === 0 ? '#fef08a' : c.bright;
          ctx.globalAlpha = 0.45;
          ctx.fillRect(screenX + f * 6 - 1, screenY - 30 - flameH, 3, flameH);
        }
      }

      ctx.fillStyle = c.primary;
      ctx.globalAlpha = opts.isMarkActive ? 0.24 : 0.17;
      ctx.fillRect(screenX - auraR, screenY - 28, auraR * 2, 26);
      ctx.globalAlpha = opts.isMarkActive ? 0.36 : 0.28;
      ctx.fillRect(screenX - auraR + 3, screenY - 26, (auraR - 3) * 2, 22);
      ctx.globalAlpha = 1;

      const orbCount = opts.isMarkActive ? 6 : 4;
      for (let i = 0; i < orbCount; i++) {
        const ang = elapsed * (opts.isMarkActive ? 8.5 : 6.5) + (i * Math.PI * 2) / orbCount;
        const ox = Math.round(screenX + Math.cos(ang) * (opts.isMarkActive ? 14 : 12));
        const oy = Math.round(screenY - 15 + Math.sin(ang * 1.4) * 10);
        ctx.fillStyle =
          opts.isMarkActive && i % 3 === 0 ? '#ef4444' : i % 2 === 0 ? c.bright : c.primary;
        ctx.fillRect(ox, oy, 2, 2);
      }
    }

    const sprite = this.selectSprite();
    const img = this.facing === 1 ? sprite.right : sprite.left;
    const drawX =
      this.facing === 1
        ? screenX - this.sprites.anchorX
        : screenX - (sprite.width - this.sprites.anchorX);
    const drawY = screenY - this.sprites.anchorY;

    if (this.invulnTimer > 0 && this.ultimateGlowTimer <= 0 && Math.sin(elapsed * 38) > 0) {
      ctx.globalAlpha = 0.35;
    } else if (opts.isExhausted && Math.sin(elapsed * 24) > 0.35) {
      ctx.globalAlpha = 0.72;
    }
    ctx.drawImage(img, Math.round(drawX), Math.round(drawY));
    ctx.globalAlpha = 1;

    // Glowing Demon Slayer Mark directly on the Slayer's forehead/cheek when awakened
    if (opts.isMarkActive) {
      const markPulse = Math.sin(elapsed * 20) > 0;
      const mx = screenX + this.facing * 1;
      const my = screenY - (char.id === 'gyomei' ? 28 : 25);
      // Flame/scar mark pixel pattern
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(mx - 2, my - 1, 4, 3);
      ctx.fillStyle = markPulse ? '#ffffff' : '#fef08a';
      ctx.fillRect(mx - 1, my - 2, 2, 2);
      ctx.fillRect(mx, my, 2, 1);
      ctx.fillStyle = c.bright;
      ctx.fillRect(mx - 2, my - 2, 1, 1);
      ctx.fillRect(mx + 2, my - 1, 1, 1);
    }

    // Exhausted sweat droplet
    if (opts.isExhausted) {
      const dropY = screenY - 31 + Math.round(Math.sin(elapsed * 8) * 1.5);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(screenX + this.facing * 7, dropY, 2, 3);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(screenX + this.facing * 7, dropY + 1, 1, 1);
    }

    // Sekiro deflect / Parry glint during active parry window
    if (this.parryTimer > 0) {
      const px = screenX + this.facing * 9;
      const py = screenY - 21;
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(px - 1, py - 4, 2, 9);
      ctx.fillStyle = c.bright;
      ctx.fillRect(px + this.facing * 2, py - 6, 1, 13);
      ctx.fillRect(px - this.facing * 2, py - 2, 1, 5);
    }

    // Active elemental slash arc
    if (this.activeArc) {
      const arcFrames = this.activeArc.large
        ? this.sprites.slashArcsLarge
        : this.sprites.slashArcs;

      const progress = this.activeArc.timer / this.activeArc.duration;
      const frameIdx = Math.min(
        arcFrames.length - 1,
        Math.floor(progress * arcFrames.length)
      );
      const arcSprite = arcFrames[frameIdx];
      const arcImg =
        this.activeArc.facing === 1 ? arcSprite.right : arcSprite.left;

      const arcScreenX = Math.round(this.activeArc.x - cameraX);
      const arcScreenY = Math.round(this.activeArc.y);

      const offX = this.activeArc.large
        ? this.sprites.largeArcOffsetX
        : this.sprites.arcOffsetX;
      const offY = this.activeArc.large
        ? this.sprites.largeArcOffsetY
        : this.sprites.arcOffsetY;

      const arcDrawX =
        this.activeArc.facing === 1
          ? arcScreenX + offX
          : arcScreenX - offX - arcSprite.width;
      const arcDrawY = arcScreenY + offY;

      ctx.drawImage(arcImg, Math.round(arcDrawX), Math.round(arcDrawY));
    }
  }

  private startDash(
    input: InputSnapshot,
    opts: SamuraiUpdateOptions,
    emitAction: (event: PlayerActionEvent) => void,
    spawnParticles: (particles: Particle[]) => void
  ): void {
    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (moveDir !== 0) {
      this.facing = moveDir as Facing;
    }

    const g = this.character.gameplay;
    const mods = opts.modifiers;
    this.dashMode = g.dashStyle;
    this.dashStartX = this.x;
    this.dashSpeedBonus = mods.dashSpeedMult;

    if (this.dashMode === 'thunder_blink') {
      this.dashTimer = DASH.thunderBlinkDuration;
      this.dashCooldownTimer =
        DASH.thunderBlinkCooldown * g.dashCooldownMult * mods.dashCooldownMult;
    } else if (this.dashMode === 'mist_evade') {
      this.dashTimer = DASH.mistEvadeDuration;
      this.dashCooldownTimer =
        DASH.standardCooldown * g.dashCooldownMult * mods.dashCooldownMult;
    } else {
      this.dashTimer = DASH.standardDuration;
      this.dashCooldownTimer =
        DASH.standardCooldown * g.dashCooldownMult * mods.dashCooldownMult;
    }
    this.afterimageAccum = 0;

    emitAction({
      type: 'dash',
      x: this.x,
      y: this.y,
      facing: this.facing,
      characterId: this.characterId,
      charged: opts.isCharged,
    });

    if (this.dashMode === 'thunder_blink') {
      this.spawnThunderArrivalSparks(spawnParticles);
    } else if (this.dashMode === 'mist_evade') {
      this.spawnMistBurst(spawnParticles);
    } else {
      this.spawnDustBurst(spawnParticles, 5, -18);
    }
  }

  private startSlash(
    input: InputSnapshot,
    opts: SamuraiUpdateOptions,
    emitAction: (event: PlayerActionEvent) => void,
    spawnParticles: (particles: Particle[]) => void
  ): void {
    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (moveDir !== 0) {
      this.facing = moveDir as Facing;
    }

    const g = this.character.gameplay;
    const c = this.character.colors;
    const mods = opts.modifiers;
    const effectiveAttackSpeed = mods.attackSpeedMult * (opts.isMarkActive ? 1.4 : 1);
    this.slashCounter += 1;
    this.slashCharged = opts.isCharged || opts.isMarkActive;
    this.slashDamageMult = mods.damageMult;
    this.slashPhase = 'windup';
    this.slashTimer = (SLASH.windupDuration * g.windupScale) / effectiveAttackSpeed;

    if (this.grounded) {
      this.vx = this.facing * SLASH.lungeSpeed * g.lungeMult;
    }

    // Sekiro-style universal Perfect Parry window on slash start
    const baseParry = Math.max(SLASH.baseParryWindow, g.parryDuration) + mods.parryWindowBonus;
    this.parryTimer = opts.isCharged ? baseParry * 1.15 : baseParry;
    emitAction({
      type: 'parry_window',
      x: this.x,
      y: this.y,
      facing: this.facing,
      characterId: this.characterId,
    });

    emitAction({
      type: 'slash',
      x: this.x,
      y: this.y,
      facing: this.facing,
      characterId: this.characterId,
      charged: opts.isCharged,
    });

    const count = opts.isCharged ? 15 : 9;
    const reach = opts.isCharged ? g.chargedRange * 0.72 : g.slashRange * 0.65;
    const sparks: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const isPetal = g.vfxStyle === 'flower' || g.vfxStyle === 'love_whip';
      const isStone = g.vfxStyle === 'stone';
      const isFlame =
        g.vfxStyle === 'flame' || g.vfxStyle === 'sun' || g.vfxStyle === 'blood_claw';

      sparks.push({
        x: this.x + this.facing * (8 + Math.random() * reach),
        y: this.y - 8 - Math.random() * 18,
        vx:
          this.facing * (30 + Math.random() * 75) +
          (g.vfxStyle === 'soundwave' ? (Math.random() - 0.5) * 80 : 0),
        vy: isStone
          ? -35 - Math.random() * 45
          : isPetal
            ? -12 + (Math.random() - 0.5) * 32
            : (Math.random() - 0.5) * 58,
        life: isPetal ? 0.45 + Math.random() * 0.25 : 0.22 + Math.random() * 0.16,
        maxLife: isPetal ? 0.7 : 0.38,
        size: isStone || (opts.isCharged && i % 3 === 0) ? 2 : 1,
        color: i % 3 === 0 ? c.bright : i % 3 === 1 ? c.primary : c.accent,
        gravityFactor: isStone ? 0.55 : isFlame ? -0.1 : isPetal ? 0.08 : 0.04,
      });
    }
    spawnParticles(sparks);
  }

  private updateSlash(dt: number, attackSpeedMult: number): void {
    const g = this.character.gameplay;
    if (this.activeArc) {
      this.activeArc.timer += dt;
      this.activeArc.x = this.x;
      this.activeArc.y = this.y;
      if (this.activeArc.timer >= this.activeArc.duration) {
        this.activeArc = null;
      }
    }

    if (this.slashPhase === 'none') return;

    this.slashTimer -= dt;
    if (this.slashTimer > 0) return;

    if (this.slashPhase === 'windup') {
      this.slashPhase = 'active';
      this.slashTimer = (SLASH.activeDuration * g.activeScale) / attackSpeedMult;
      const isLargeStyle =
        g.vfxStyle === 'flame' ||
        g.vfxStyle === 'sun' ||
        g.vfxStyle === 'stone' ||
        g.vfxStyle === 'love_whip' ||
        g.vfxStyle === 'soundwave';

      this.activeArc = {
        x: this.x,
        y: this.y,
        facing: this.facing,
        timer: 0,
        duration:
          this.slashTimer +
          (SLASH.recoveryDuration * g.recoveryScale * 0.65) / attackSpeedMult,
        characterId: this.characterId,
        large: this.slashCharged || isLargeStyle,
      };
    } else if (this.slashPhase === 'active') {
      this.slashPhase = 'recovery';
      this.slashTimer = (SLASH.recoveryDuration * g.recoveryScale) / attackSpeedMult;
    } else if (this.slashPhase === 'recovery') {
      this.slashPhase = 'none';
      this.slashTimer = 0;
      this.slashCooldownTimer =
        (SLASH.cooldownDuration * g.cooldownScale) / attackSpeedMult;
    }
  }

  private updateAfterimages(dt: number): void {
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].life -= dt;
      if (this.afterimages[i].life <= 0) {
        this.afterimages.splice(i, 1);
      }
    }
  }

  private selectSprite() {
    switch (this.animState) {
      case 'dash':
        return this.sprites.dash;
      case 'slash': {
        if (this.slashPhase === 'windup') return this.sprites.slash[0];
        if (this.slashPhase === 'active') return this.sprites.slash[1];
        return this.sprites.slash[2];
      }
      case 'wall_slide':
      case 'fall':
        return this.sprites.jumpFall;
      case 'jump':
        return this.sprites.jumpUp;
      case 'run': {
        const frame = Math.floor(this.animTimer * 11) % this.sprites.run.length;
        return this.sprites.run[frame];
      }
      case 'idle':
      default: {
        const frame = Math.floor(this.animTimer * 4.5) % this.sprites.idle.length;
        return this.sprites.idle[frame];
      }
    }
  }

  private spawnDustBurst(
    spawnParticles: (particles: Particle[]) => void,
    count: number,
    upSpeed: number
  ): void {
    const burst: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      burst.push({
        x: this.x + (Math.random() - 0.5) * 8,
        y: this.y - 1,
        vx: dir * (16 + Math.random() * 26),
        vy: upSpeed * (0.4 + Math.random() * 0.6),
        life: 0.22 + Math.random() * 0.14,
        maxLife: 0.36,
        size: Math.random() > 0.6 ? 2 : 1,
        color: i % 2 === 0 ? '#5c8b91' : '#35565e',
        gravityFactor: 0.25,
      });
    }
    spawnParticles(burst);
  }

  private spawnWallJumpBurst(
    spawnParticles: (particles: Particle[]) => void,
    wallDir: -1 | 1
  ): void {
    const c = this.character.colors;
    const burst: Particle[] = [];
    for (let i = 0; i < 8; i++) {
      burst.push({
        x: this.x + wallDir * 5,
        y: this.y - 10 - Math.random() * 12,
        vx: -wallDir * (28 + Math.random() * 44),
        vy: -18 - Math.random() * 30,
        life: 0.22 + Math.random() * 0.12,
        maxLife: 0.34,
        size: i % 2 === 0 ? 2 : 1,
        color: i % 3 === 0 ? c.bright : '#cbd5e1',
        gravityFactor: 0.2,
      });
    }
    spawnParticles(burst);
  }

  private spawnMistBurst(spawnParticles: (particles: Particle[]) => void): void {
    const c = this.character.colors;
    const puffs: Particle[] = [];
    for (let i = 0; i < 10; i++) {
      puffs.push({
        x: this.x + (Math.random() - 0.5) * 12,
        y: this.y - 6 - Math.random() * 18,
        vx: (Math.random() - 0.5) * 32,
        vy: -10 - Math.random() * 16,
        life: 0.38 + Math.random() * 0.14,
        maxLife: 0.52,
        size: i % 2 === 0 ? 3 : 2,
        color: i % 2 === 0 ? c.bright : c.primary,
        gravityFactor: -0.02,
      });
    }
    spawnParticles(puffs);
  }

  private spawnThunderArrivalSparks(
    spawnParticles: (particles: Particle[]) => void
  ): void {
    const c = this.character.colors;
    const sparks: Particle[] = [];
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const spd = 45 + Math.random() * 65;
      sparks.push({
        x: this.x,
        y: this.y - 14,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.2 + Math.random() * 0.1,
        maxLife: 0.3,
        size: i % 3 === 0 ? 2 : 1,
        color: i % 2 === 0 ? c.bright : c.primary,
        gravityFactor: 0,
      });
    }
    spawnParticles(sparks);
  }
}
