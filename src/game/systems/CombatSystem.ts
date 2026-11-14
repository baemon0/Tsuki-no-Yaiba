import { CHARACTER_MAP, type CharacterId } from '../characters';
import { ARENA, ARENA_PLATFORMS, GAME_HEIGHT, GAME_WIDTH, GROUND_Y, PHYSICS } from '../constants';
import type { Samurai } from '../entities/Samurai';
import {
  addBloodCrystals,
  addDemonsSlain,
  loadMetaProgression,
  recordBossDefeated,
  recordHighestCombo,
  unlockSecretTitle,
  type MetaProgressionState,
  type SecretTitleDef,
} from '../metaProgression';
import { createEnemySprites, type EnemySpritePair, type EnemySpriteSet } from '../sprites/enemySprites';
import { STORY_STAGES, type BossId, type GameMode, type StageTheme } from '../storyStages';
import type {
  ActiveSlashBox,
  CameraState,
  Facing,
  GameSystem,
  Particle,
  UpdateContext,
} from '../types';
import type { RunModifiers } from '../upgrades';
import type { BreathRhythmSystem } from './BreathRhythmSystem';

export type EnemyKind = 'kage' | 'oni' | 'boss';

type EnemyAIState =
  | 'chase'
  | 'telegraph'
  | 'attack'
  | 'recover'
  | 'stunned'
  | 'posture_broken';

type BossAttackPattern = 'dash' | 'slam' | 'peril';

type BossProjectileKind =
  | 'web'
  | 'claw'
  | 'orb'
  | 'sickle'
  | 'crescent'
  | 'whip_arc';

export const HIGH_SCORE_STORAGE_KEY = 'tsuki_endless_highscore';

export function loadEndlessHighScore(): number {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
    const val = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(val) && val > 0 ? val : 0;
  } catch {
    return 0;
  }
}

export function saveEndlessHighScore(score: number): number {
  const best = Math.max(score, loadEndlessHighScore());
  try {
    localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(best));
  } catch {
    // ignore storage errors
  }
  return best;
}

interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facing: Facing;
  hp: number;
  maxHp: number;
  posture: number;
  maxPosture: number;
  postureDecayDelay: number;
  width: number;
  height: number;
  speed: number;
  damage: number;
  knockbackResist: number;

  aiState: EnemyAIState;
  stateTimer: number;
  animTimer: number;
  hitFlashTimer: number;
  lastHitSlashId: number;
  hasDealtAttackHit: boolean;
  poisonTimer: number;
  poisonDps: number;

  bossId: BossId;
  bossName: string;
  bossColor: string;
  bossBrightColor: string;
  bossPattern: BossAttackPattern;
  bossNextPattern: BossAttackPattern;
  bossAttackCount: number;
  unblockableMelee: boolean;
}

interface BossShockwave {
  x: number;
  y: number;
  vx: number;
  facing: Facing;
  damage: number;
  life: number;
  hitPlayer: boolean;
  color: string;
  brightColor: string;
  sourceEnemyId: number;
  unblockable: boolean;
}

interface BossProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  kind: BossProjectileKind;
  color: string;
  brightColor: string;
  damage: number;
  life: number;
  maxLife: number;
  hitPlayer: boolean;
  facing: Facing;
  phase: number;
  homing: boolean;
}

interface LightningPillar {
  x: number;
  timer: number;
  strikeDuration: number;
  width: number;
  damage: number;
  struck: boolean;
  hitPlayer: boolean;
  color: string;
  brightColor: string;
  isWaterGeyser?: boolean;
}

interface BloodCrystalDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  age: number;
  sparklePhase: number;
}

interface PendingSpawn {
  kind: EnemyKind;
  delay: number;
  side: -1 | 1;
}

interface FloatingCallout {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface ScreenSplitFinisher {
  timer: number;
  duration: number;
  targetScreenX: number;
  targetScreenY: number;
  color: string;
  brightColor: string;
  angle: number;
}

interface UltimateScreenEffect {
  timer: number;
  duration: number;
  characterId: CharacterId;
  originX: number;
  originY: number;
  appliedWave2: boolean;
}

export interface CombatRunSummary {
  mode: GameMode;
  stage: number;
  stageWave: number;
  wave: number;
  kills: number;
  maxCombo: number;
  score: number;
  highScore: number;
  crystalsEarned: number;
}

export interface CombatCallbacks {
  getPlayer: () => Samurai;
  getBreathSystem: () => BreathRhythmSystem;
  triggerHitStop: (duration: number) => void;
  triggerShake: (intensity: number, duration: number) => void;
  triggerSlowMo: (timeScale: number, duration: number) => void;
  onStageChange: (theme: StageTheme) => void;
  onOfferUpgrades: () => void;
  onGameOver: (stats: CombatRunSummary) => void;
  onVictory: (stats: CombatRunSummary) => void;
  onMetaUpdated?: (meta: MetaProgressionState) => void;
  onTitleUnlocked?: (title: SecretTitleDef) => void;
}

const COMBO_WINDOW = 3.2;

export class CombatSystem implements GameSystem {
  public readonly id = 'combat';

  public mode: GameMode = 'endless';
  public stage = 1;
  public stageWave = 1;
  public wave = 1;
  public kills = 0;
  public combo = 0;
  public maxCombo = 0;
  public score = 0;
  public highScore = loadEndlessHighScore();
  public crystalsEarned = 0;
  public totalSavedCrystals = loadMetaProgression().bloodCrystals;
  public isGameOver = false;
  public isVictory = false;

  private comboTimer = 0;
  private comboPopTimer = 0;

  private enemies: Enemy[] = [];
  private shockwaves: BossShockwave[] = [];
  private bossProjectiles: BossProjectile[] = [];
  private lightningPillars: LightningPillar[] = [];
  private crystalDrops: BloodCrystalDrop[] = [];
  private spawnQueue: PendingSpawn[] = [];
  private callouts: FloatingCallout[] = [];
  private nextEnemyId = 1;

  private bannerTimer = 2.0;
  private bannerTitle = 'WAVE 1';
  private bannerSubtitle = 'Shadows stir in the bamboo grove';
  private bannerIsBoss = false;
  private bannerAccent = '#38bdf8';
  private waveClearDelay = 0;
  private pendingStageRecoveryBanner = 0;
  private bossDamageTakenThisFight = 0;
  private stageTimer = 0;
  private runParries = 0;

  private finisherEffect: ScreenSplitFinisher | null = null;
  private ultimateEffect: UltimateScreenEffect | null = null;

  private sprites: EnemySpriteSet;

  constructor(private callbacks: CombatCallbacks) {
    this.sprites = createEnemySprites();
    this.startWave(1);
  }

  public get hasActiveBoss(): boolean {
    return this.enemies.some((e) => e.kind === 'boss');
  }

  public onSlayerMarkAwakened(x: number, y: number, characterId: CharacterId): void {
    const char = CHARACTER_MAP[characterId];
    this.callouts.push({
      x,
      y: y - 36,
      text: 'DEMON SLAYER MARK! · علامة الصياد',
      color: '#fecaca',
      life: 1.45,
      maxLife: 1.45,
    });
    this.bannerTimer = 2.1;
    this.bannerIsBoss = true;
    this.bannerAccent = '#ef4444';
    this.bannerTitle = `${char.shortName.toUpperCase()} · DEMON SLAYER MARK!`;
    this.bannerSubtitle = 'علامة الصياد · Max Breath & +40% Speed (10s)';
    this.awardSecretTitle('mark_awakened');
  }

  private awardSecretTitle(titleId: string): void {
    const res = unlockSecretTitle(titleId);
    if (res.newlyUnlocked && res.title) {
      this.callbacks.onMetaUpdated?.(res.state);
      this.callbacks.onTitleUnlocked?.(res.title);
    }
  }

  private incrementCombo(popDuration = 0.14): void {
    this.combo += 1;
    if (this.combo >= 30) {
      this.awardSecretTitle('combo_tempest');
    }
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
      const updated = recordHighestCombo(this.maxCombo);
      this.callbacks.onMetaUpdated?.(updated);
    }
    this.comboTimer = COMBO_WINDOW;
    this.comboPopTimer = popDuration;
  }

  public refreshMetaDisplay(meta: MetaProgressionState): void {
    this.totalSavedCrystals = meta.bloodCrystals;
  }

  public reset(mode: GameMode = this.mode): void {
    this.mode = mode;
    this.stage = 1;
    this.stageWave = 1;
    this.wave = 1;
    this.kills = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.score = 0;
    this.crystalsEarned = 0;
    this.totalSavedCrystals = loadMetaProgression().bloodCrystals;
    this.highScore = loadEndlessHighScore();
    this.comboTimer = 0;
    this.comboPopTimer = 0;
    this.isGameOver = false;
    this.isVictory = false;
    this.enemies = [];
    this.shockwaves = [];
    this.bossProjectiles = [];
    this.lightningPillars = [];
    this.crystalDrops = [];
    this.spawnQueue = [];
    this.callouts = [];
    this.waveClearDelay = 0;
    this.pendingStageRecoveryBanner = 0;
    this.bossDamageTakenThisFight = 0;
    this.stageTimer = 0;
    this.runParries = 0;
    this.finisherEffect = null;
    this.ultimateEffect = null;

    if (this.mode === 'story') {
      this.callbacks.onStageChange(STORY_STAGES[0].theme);
    } else {
      this.callbacks.onStageChange('bamboo_night');
    }

    this.startWave(1);
  }

  public finishPostBossTransition(spawnParticles: (particles: Particle[]) => void): void {
    const player = this.callbacks.getPlayer();
    const breath = this.callbacks.getBreathSystem();
    this.stageTimer = 0;

    if (this.mode === 'story') {
      // 30% HP Recovery after defeating each Stage Boss
      const recoverAmount = Math.round(breath.maxHp * 0.3);
      breath.healPlayer(recoverAmount);
      this.pendingStageRecoveryBanner = 2.6;

      const healBurst: Particle[] = [];
      for (let i = 0; i < 16; i++) {
        healBurst.push({
          x: player.x + (Math.random() - 0.5) * 16,
          y: player.y - 8 - Math.random() * 14,
          vx: (Math.random() - 0.5) * 24,
          vy: -28 - Math.random() * 34,
          life: 0.45 + Math.random() * 0.2,
          maxLife: 0.65,
          size: i % 3 === 0 ? 2 : 1,
          color: i % 2 === 0 ? '#4ade80' : '#bbf7d0',
          gravityFactor: -0.05,
        });
      }
      spawnParticles(healBurst);

      this.stage += 1;
      this.stageWave = 1;
      const nextStageDef = STORY_STAGES[this.stage - 1];
      this.callbacks.onStageChange(nextStageDef.theme);
      this.startWave(this.wave + 1);
    } else {
      breath.healPlayer(20);
      this.startWave(this.wave + 1);
    }
  }

  public update(ctx: UpdateContext): void {
    if (this.isGameOver || this.isVictory) return;

    const { dt, input, camera, modifiers, emitAction, spawnParticles } = ctx;
    const player = this.callbacks.getPlayer();
    const breath = this.callbacks.getBreathSystem();
    this.stageTimer += dt;

    if (this.bannerTimer > 0) this.bannerTimer = Math.max(0, this.bannerTimer - dt);
    if (this.pendingStageRecoveryBanner > 0) {
      this.pendingStageRecoveryBanner = Math.max(0, this.pendingStageRecoveryBanner - dt);
    }
    if (this.comboPopTimer > 0) this.comboPopTimer = Math.max(0, this.comboPopTimer - dt);

    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }

    // Update cinematic finisher & ultimate overlays
    if (this.finisherEffect) {
      this.finisherEffect.timer -= dt;
      if (this.finisherEffect.timer <= 0) this.finisherEffect = null;
    }

    if (this.ultimateEffect) {
      this.ultimateEffect.timer -= dt;
      // Second wave burst halfway through ultimate animation
      if (!this.ultimateEffect.appliedWave2 && this.ultimateEffect.timer <= 0.55) {
        this.ultimateEffect.appliedWave2 = true;
        this.applyUltimateDamage(
          player,
          breath,
          modifiers,
          65,
          0.35,
          emitAction,
          spawnParticles
        );
      }
      if (this.ultimateEffect.timer <= 0) {
        this.ultimateEffect = null;
      }
    }

    for (let i = this.callouts.length - 1; i >= 0; i--) {
      const c = this.callouts[i];
      c.life -= dt;
      c.y -= 18 * dt;
      if (c.life <= 0) this.callouts.splice(i, 1);
    }

    // 0. Ultimate Technique trigger (C or L)
    if (input.ultimatePressed && breath.consumeUltimate()) {
      this.triggerUltimateTechnique(player, breath, modifiers, emitAction, spawnParticles);
    }

    // 1. Process staggered wave spawn queue
    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      this.spawnQueue[i].delay -= dt;
      if (this.spawnQueue[i].delay <= 0) {
        const req = this.spawnQueue.splice(i, 1)[0];
        this.spawnEnemy(req.kind, req.side, emitAction);
      }
    }

    // 2. Check wave / stage completion
    if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
      if (this.waveClearDelay <= 0) {
        const wasStoryFinal = this.mode === 'story' && this.stage === 10 && this.stageWave === 3;
        this.waveClearDelay = wasStoryFinal ? 0.95 : 1.35;
      } else {
        this.waveClearDelay -= dt;
        if (this.waveClearDelay <= 0) {
          this.advanceWaveOrStage(breath);
          if (this.isVictory) return;
        }
      }
    }

    // 3. Player active slash vs Enemies (with Posture Break Deathblow check)
    const slashBox = player.getActiveSlashBox();
    if (slashBox) {
      this.checkPlayerSlashHits(
        slashBox,
        player,
        breath,
        camera,
        modifiers,
        emitAction,
        spawnParticles
      );
    }

    // 4. Update all enemies (gravity, platform awareness, posture decay, AI)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.animTimer += dt;
      if (e.hitFlashTimer > 0) e.hitFlashTimer = Math.max(0, e.hitFlashTimer - dt);

      if (e.postureDecayDelay > 0) {
        e.postureDecayDelay -= dt;
      } else if (e.aiState !== 'posture_broken' && e.posture > 0) {
        e.posture = Math.max(0, e.posture - 8 * dt);
      }

      if (e.poisonTimer > 0) {
        e.poisonTimer = Math.max(0, e.poisonTimer - dt);
        e.hp -= e.poisonDps * dt;
        if (Math.random() < dt * 8) {
          spawnParticles([
            {
              x: e.x + (Math.random() - 0.5) * e.width * 0.7,
              y: e.y - 6 - Math.random() * (e.height * 0.75),
              vx: (Math.random() - 0.5) * 14,
              vy: -16 - Math.random() * 14,
              life: 0.28,
              maxLife: 0.28,
              size: 1,
              color: Math.random() > 0.4 ? '#c084fc' : '#f3e8ff',
              gravityFactor: -0.05,
            },
          ]);
        }
      }

      this.updateEnemyAI(e, dt, player, breath, modifiers, emitAction, spawnParticles);
      this.integrateEnemyPhysics(e, dt);

      if (e.hp <= 0) {
        this.handleEnemyDeath(e, breath, modifiers, emitAction, spawnParticles);
        this.enemies.splice(i, 1);
      }
    }

    // 5. Update Boss Shockwaves, Projectiles, Lightning Pillars & Blood Crystals
    this.updateShockwaves(dt, player, breath, modifiers, emitAction, spawnParticles);
    this.updateBossProjectiles(dt, player, breath, emitAction, spawnParticles);
    this.updateLightningPillars(dt, player, breath, emitAction, spawnParticles);
    this.updateCrystalDrops(dt, player, emitAction, spawnParticles);

    // 6. Check Player Death
    if (breath.hp <= 0 && !this.isGameOver) {
      this.collectAllPendingCrystals(emitAction);
      this.isGameOver = true;
      if (this.mode === 'endless') {
        this.highScore = saveEndlessHighScore(this.score);
      }
      this.callbacks.onGameOver(this.buildSummary());
    }
  }

  private integrateEnemyPhysics(e: Enemy, dt: number): void {
    const prevY = e.y;
    e.vy = Math.min(PHYSICS.maxFallSpeed, e.vy + PHYSICS.gravity * dt);
    e.y += e.vy * dt;

    let landed = false;
    if (e.vy >= 0) {
      for (const plat of ARENA_PLATFORMS) {
        if (
          e.x >= plat.x - 4 &&
          e.x <= plat.x + plat.width + 4 &&
          prevY <= plat.y + 3 &&
          e.y >= plat.y
        ) {
          e.y = plat.y;
          e.vy = 0;
          e.grounded = true;
          landed = true;
          break;
        }
      }
    }

    if (!landed) {
      if (e.y >= GROUND_Y) {
        e.y = GROUND_Y;
        e.vy = 0;
        e.grounded = true;
      } else {
        e.grounded = false;
      }
    }

    // Keep active enemies inside arena walls once they enter
    if (e.aiState !== 'chase' || (e.x > ARENA.minX + 10 && e.x < ARENA.maxX - 10)) {
      e.x = Math.max(ARENA.minX + 10, Math.min(ARENA.maxX - 10, e.x));
    }
  }

  private triggerUltimateTechnique(
    player: Samurai,
    breath: BreathRhythmSystem,
    modifiers: RunModifiers,
    emitAction: UpdateContext['emitAction'],
    spawnParticles: (particles: Particle[]) => void
  ): void {
    const char = CHARACTER_MAP[player.characterId];
    player.triggerUltimatePose(1.15);

    this.ultimateEffect = {
      timer: 1.05,
      duration: 1.05,
      characterId: player.characterId,
      originX: player.x,
      originY: player.y,
      appliedWave2: false,
    };

    emitAction({
      type: 'ultimate',
      x: player.x,
      y: player.y,
      facing: player.facing,
      characterId: player.characterId,
      charged: true,
    });

    this.callbacks.triggerSlowMo(0.45, 0.22);
    this.callbacks.triggerShake(3.8, 0.35);

    this.callouts.push({
      x: player.x,
      y: player.y - 34,
      text: `${char.styleName.toUpperCase()}!`,
      color: char.colors.bright,
      life: 1.1,
      maxLife: 1.1,
    });

    // Screen-wide initial particle explosion
    const burst: Particle[] = [];
    for (let i = 0; i < 42; i++) {
      const ang = (i / 42) * Math.PI * 2;
      const spd = 70 + Math.random() * 170;
      burst.push({
        x: player.x,
        y: player.y - 16,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.75,
        life: 0.45 + Math.random() * 0.3,
        maxLife: 0.75,
        size: i % 3 === 0 ? 3 : 2,
        color: i % 2 === 0 ? char.colors.bright : char.colors.primary,
        gravityFactor: 0.04,
      });
    }
    spawnParticles(burst);

    // Clear enemy shockwaves/projectiles/pillars and deal Wave 1 of Ultimate damage
    this.shockwaves = [];
    this.bossProjectiles = [];
    this.lightningPillars = [];
    this.applyUltimateDamage(
      player,
      breath,
      modifiers,
      85,
      0.4,
      emitAction,
      spawnParticles
    );
  }

  private applyUltimateDamage(
    player: Samurai,
    breath: BreathRhythmSystem,
    modifiers: RunModifiers,
    baseDamage: number,
    posturePct: number,
    emitAction: UpdateContext['emitAction'],
    spawnParticles: (particles: Particle[]) => void
  ): void {
    const char = CHARACTER_MAP[player.characterId];
    const dmg = Math.round(baseDamage * modifiers.damageMult);

    for (const e of this.enemies) {
      e.hp -= dmg;
      e.hitFlashTimer = 0.14;
      e.vx = (e.x >= player.x ? 1 : -1) * 140 * (1 - e.knockbackResist);
      this.applyPostureDamage(e, Math.round(e.maxPosture * posturePct), spawnParticles);

      this.incrementCombo(0.16);

      this.spawnHitParticles(
        spawnParticles,
        e.x,
        e.y - e.height * 0.5,
        player.facing,
        char.colors.primary,
        char.colors.bright,
        true
      );
    }

    if (this.enemies.length > 0) {
      emitAction({
        type: 'enemy_hit',
        x: player.x,
        y: player.y,
        facing: player.facing,
        characterId: player.characterId,
        charged: true,
        combo: this.combo,
      });
    }
    void breath;
  }

  private advanceWaveOrStage(breath: BreathRhythmSystem): void {
    if (this.mode === 'endless') {
      if (this.wave % 3 === 0) {
        this.collectAllPendingCrystals();
        this.callbacks.onOfferUpgrades();
      } else {
        breath.healPlayer(15);
        this.startWave(this.wave + 1);
      }
      return;
    }

    // Story Campaign progression: 10 Stages x 3 Waves each
    if (this.stageWave < 3) {
      breath.healPlayer(12);
      this.stageWave += 1;
      this.startWave(this.wave + 1);
      return;
    }

    // Stage Boss defeated!
    this.collectAllPendingCrystals();
    if (this.stage >= 10) {
      this.isVictory = true;
      this.callbacks.onVictory(this.buildSummary());
      return;
    }

    // Pause and present 3 random pixel-art Upgrade Cards!
    this.callbacks.onOfferUpgrades();
  }

  private buildSummary(): CombatRunSummary {
    return {
      mode: this.mode,
      stage: this.stage,
      stageWave: this.stageWave,
      wave: this.wave,
      kills: this.kills,
      maxCombo: this.maxCombo,
      score: this.score,
      highScore: this.highScore,
      crystalsEarned: this.crystalsEarned,
    };
  }

  public render(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    elapsed: number
  ): void {
    // 1. Ultimate Technique screen-wide elemental spectacle
    if (this.ultimateEffect) {
      this.renderUltimateEffect(ctx, camera.x, elapsed, this.ultimateEffect);
    }

    // 2. Boss/Oni telegraphs & ground lightning warnings
    for (const e of this.enemies) {
      this.renderEnemyTelegraph(ctx, e, camera.x, elapsed);
    }
    this.renderLightningPillars(ctx, camera.x, elapsed);

    // 3. Blood Crystal Drops
    this.renderCrystalDrops(ctx, camera.x, elapsed);

    // 4. Enemies
    for (const e of this.enemies) {
      this.renderEnemy(ctx, e, camera.x, elapsed);
    }

    // 5. Boss shockwaves & unique projectiles
    for (const sw of this.shockwaves) {
      const sx = Math.round(sw.x - camera.x);
      const sy = Math.round(sw.y);
      const h = sw.unblockable ? 19 : 15;
      ctx.fillStyle = '#090910';
      ctx.fillRect(sx - 6, sy - h + 2, 12, h - 2);
      ctx.fillStyle = sw.color;
      ctx.fillRect(sx - 4, sy - h, 8, h);
      ctx.fillStyle = sw.brightColor;
      ctx.fillRect(sx + sw.facing * 2 - 1, sy - h + 2, 3, h - 3);
      if (sw.unblockable) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(sx - 3, sy - h - 2, 6, 2);
      }
    }
    this.renderBossProjectiles(ctx, camera.x, elapsed);

    // 6. Floating combat callouts (PARRY!, POSTURE BROKEN!, DEATHBLOW!, UNBLOCKABLE!)
    for (const c of this.callouts) {
      const cx = Math.round(c.x - camera.x);
      const cy = Math.round(c.y);
      ctx.globalAlpha = Math.max(0, Math.min(1, c.life / c.maxLife));
      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      this.drawShadowText(ctx, c.text, cx, cy, c.color);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    // 7. Cinematic Screen-Splitting Deathblow Finisher
    if (this.finisherEffect) {
      this.renderScreenSplitFinisher(ctx, this.finisherEffect);
    }
  }

  private renderUltimateEffect(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    elapsed: number,
    ult: UltimateScreenEffect
  ): void {
    const char = CHARACTER_MAP[ult.characterId];
    const c = char.colors;
    const progress = 1 - ult.timer / ult.duration;
    const alpha = Math.sin(Math.min(1, progress) * Math.PI);
    const ox = Math.round(ult.originX - cameraX);
    const oy = Math.round(ult.originY - 14);

    // Subtle darkened dramatic backdrop
    ctx.fillStyle = `rgba(3, 5, 12, ${(alpha * 0.42).toFixed(2)})`;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Elemental wide beams / lightning / waves across the entire screen
    const style = char.gameplay.vfxStyle;
    ctx.globalAlpha = Math.min(1, alpha * 1.15);

    if (style === 'thunder') {
      // 7-Fold Lightning Thunderclap zigzags across screen
      for (let b = 0; b < 5; b++) {
        const yBase = 48 + b * 36;
        ctx.fillStyle = b % 2 === 0 ? c.bright : c.primary;
        let lx = 0;
        let ly = yBase;
        while (lx < GAME_WIDTH) {
          const seg = 22 + ((b * 13) % 18);
          const dy = Math.sin(lx * 0.1 + elapsed * 35 + b) * 10;
          ctx.fillRect(lx, Math.round(ly), seg, b === 2 ? 3 : 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(lx, Math.round(ly), seg, 1);
          ctx.fillStyle = b % 2 === 0 ? c.bright : c.primary;
          lx += seg;
          ly = yBase + dy;
        }
      }
    } else if (style === 'water' || style === 'mist') {
      // Sweeping tidal wave bands across screen
      for (let w = 0; w < 4; w++) {
        const wy = Math.round(62 + w * 40 + Math.sin(elapsed * 14 + w) * 8);
        ctx.fillStyle = c.dark;
        ctx.fillRect(0, wy, GAME_WIDTH, 14);
        ctx.fillStyle = c.primary;
        ctx.fillRect(0, wy + 2, GAME_WIDTH, 6);
        ctx.fillStyle = c.bright;
        ctx.fillRect(0, wy + 2, GAME_WIDTH, 2);
      }
    } else {
      // Blazing Sun / Flame / Crimson / Wind / Stone / Love / Sound / Insect screen slash rings & pillars
      const radius = Math.round(progress * 320);
      for (const rx of [ox - radius * 0.65, ox, ox + radius * 0.65]) {
        ctx.fillStyle = c.primary;
        ctx.fillRect(Math.round(rx - 10), 0, 20, GAME_HEIGHT);
        ctx.fillStyle = c.bright;
        ctx.fillRect(Math.round(rx - 3), 0, 6, GAME_HEIGHT);
      }
      // Horizontal elemental shock ribbons
      for (let r = 0; r < 5; r++) {
        const ry = 42 + r * 42;
        ctx.fillStyle = r % 2 === 0 ? c.bright : c.primary;
        ctx.fillRect(0, ry, GAME_WIDTH, 3);
      }
    }

    // Center burst diamond at player
    const r = Math.round(18 + Math.sin(progress * Math.PI) * 28);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ox - r, oy - 2, r * 2, 4);
    ctx.fillRect(ox - 2, oy - r, 4, r * 2);

    ctx.globalAlpha = 1;
  }

  private renderScreenSplitFinisher(
    ctx: CanvasRenderingContext2D,
    finisher: ScreenSplitFinisher
  ): void {
    const progress = 1 - finisher.timer / finisher.duration;
    const alpha = Math.max(0, 1 - progress * 0.85);

    // Ink-black letterbox flash bars
    const barH = Math.round(24 * alpha);
    ctx.fillStyle = '#020308';
    ctx.fillRect(0, 0, GAME_WIDTH, barH);
    ctx.fillRect(0, GAME_HEIGHT - barH, GAME_WIDTH, barH);

    // Screen-splitting diagonal pixel slash across the entire 480x270 canvas!
    const slope = Math.tan(finisher.angle);
    const cy = finisher.targetScreenY;
    const cx = finisher.targetScreenX;
    const thickness = progress < 0.25 ? 7 : Math.max(1, Math.round(5 * alpha));

    ctx.globalAlpha = Math.min(1, alpha * 1.2);
    for (let x = 0; x < GAME_WIDTH; x += 2) {
      const y = Math.round(cy + (x - cx) * slope);
      ctx.fillStyle = finisher.color;
      ctx.fillRect(x, y - Math.floor(thickness / 2), 2, thickness);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, 2, Math.max(1, Math.floor(thickness / 2)));
    }

    // Big crimson/gold Deathblow label at center
    if (progress < 0.78) {
      ctx.font = 'bold 11px "Cinzel", Georgia, serif';
      ctx.textAlign = 'center';
      this.drawShadowText(ctx, 'DEATHBLOW · 斬', GAME_WIDTH / 2, 34, finisher.brightColor);
      ctx.textAlign = 'left';
    }
    ctx.globalAlpha = 1;
  }

  public renderHUD(ctx: CanvasRenderingContext2D, elapsed: number): void {
    const diff = this.callbacks.getBreathSystem().difficulty;
    const boxW = 148;
    const boxX = GAME_WIDTH - boxW - 10;
    const boxY = 9;
    const isBossWave = this.mode === 'story' ? this.stageWave === 3 : this.wave % 3 === 0;
    const activeStage = this.mode === 'story' ? STORY_STAGES[this.stage - 1] : null;

    ctx.fillStyle = 'rgba(5, 8, 16, 0.78)';
    ctx.fillRect(boxX, boxY, boxW, 24);
    ctx.fillStyle = isBossWave
      ? activeStage
        ? activeStage.bossColor
        : 'rgba(244, 63, 94, 0.7)'
      : 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(boxX, boxY, boxW, 1);

    ctx.font = 'bold 7px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';
    const topLabel =
      this.mode === 'story'
        ? `STG ${this.stage}/10 · W${this.stageWave}/3`
        : isBossWave
          ? `W${this.wave} · BOSS`
          : `WAVE ${this.wave}`;

    this.drawShadowText(
      ctx,
      topLabel,
      boxX + 6,
      boxY + 4,
      isBossWave ? (activeStage ? activeStage.bossBrightColor : '#fda4af') : '#e2e8f0'
    );

    // Active Difficulty Rank Badge inside top-right corner of HUD box
    const badgeText = diff.name.toUpperCase();
    const badgeW = 46;
    const badgeH = 9;
    const badgeX = boxX + boxW - badgeW - 5;
    const badgeY = boxY + 3;
    ctx.fillStyle = diff.darkColor;
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.fillStyle = diff.color;
    ctx.fillRect(badgeX, badgeY, badgeW, 1);
    ctx.fillRect(badgeX, badgeY + badgeH - 1, badgeW, 1);
    ctx.fillRect(badgeX, badgeY, 1, badgeH);
    ctx.fillRect(badgeX + badgeW - 1, badgeY, 1, badgeH);

    ctx.font = 'bold 6px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    this.drawShadowText(ctx, badgeText, badgeX + badgeW / 2, badgeY + 2, diff.brightColor);
    ctx.textAlign = 'left';

    ctx.font = 'bold 7px "JetBrains Mono", monospace';
    const subLine =
      this.mode === 'story'
        ? `PTS ${this.score} · LEFT ${this.enemies.length + this.spawnQueue.length}`
        : `PTS ${this.score} · HI ${this.highScore}`;
    this.drawShadowText(ctx, subLine, boxX + 6, boxY + 14, '#94a3b8');

    // Blood Crystal pill right under top-right HUD box (left of audio/restart buttons)
    const crysW = 58;
    const crysX = boxX;
    const crysY = boxY + 26;
    ctx.fillStyle = 'rgba(5, 8, 16, 0.78)';
    ctx.fillRect(crysX, crysY, crysW, 12);
    ctx.fillStyle = 'rgba(244, 63, 94, 0.55)';
    ctx.fillRect(crysX, crysY, crysW, 1);
    // Tiny crimson diamond sprite
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(crysX + 5, crysY + 4, 4, 4);
    ctx.fillStyle = '#fecdd3';
    ctx.fillRect(crysX + 6, crysY + 3, 2, 6);
    ctx.font = 'bold 7px "JetBrains Mono", monospace';
    this.drawShadowText(
      ctx,
      `${this.totalSavedCrystals}`,
      crysX + 13,
      crysY + 3,
      '#fda4af'
    );

    // Combo Counter to the left of the Top-Right box
    if (this.combo > 0) {
      const charColors = this.callbacks.getBreathSystem().character.colors;
      const comboW = 72;
      const comboX = boxX - comboW - 6;
      const comboY = boxY;
      const pop = this.comboPopTimer > 0;

      ctx.fillStyle = 'rgba(5, 8, 16, 0.78)';
      ctx.fillRect(comboX, comboY, comboW, 24);
      ctx.fillStyle = pop ? charColors.bright : charColors.primary;
      ctx.fillRect(comboX, comboY, comboW, 1);

      ctx.font = pop
        ? 'bold 9px "JetBrains Mono", monospace'
        : 'bold 8px "JetBrains Mono", monospace';
      this.drawShadowText(
        ctx,
        `COMBO x${this.combo}`,
        comboX + 6,
        comboY + (pop ? 4 : 5),
        pop ? '#ffffff' : charColors.bright
      );

      const ratio = Math.max(0, Math.min(1, this.comboTimer / COMBO_WINDOW));
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(comboX + 5, comboY + 17, comboW - 10, 2);
      ctx.fillStyle = charColors.primary;
      ctx.fillRect(comboX + 5, comboY + 17, Math.round((comboW - 10) * ratio), 2);
    }

    // 2. Boss Health Bar + Yellow Sekiro Posture Bar (bottom-center above controls)
    const boss = this.enemies.find((e) => e.kind === 'boss');
    if (boss) {
      const barW = 220;
      const barH = 7;
      const bx = Math.round((GAME_WIDTH - barW) / 2);
      const by = GAME_HEIGHT - 44;

      ctx.fillStyle = 'rgba(5, 8, 16, 0.86)';
      ctx.fillRect(bx - 4, by - 11, barW + 8, 28);

      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      this.drawShadowText(
        ctx,
        boss.aiState === 'posture_broken'
          ? `${boss.bossName.toUpperCase()} · POSTURE BROKEN!`
          : boss.bossName.toUpperCase(),
        bx,
        by - 9,
        boss.aiState === 'posture_broken' ? '#fde047' : boss.bossBrightColor
      );
      ctx.textAlign = 'right';
      this.drawShadowText(
        ctx,
        `${Math.ceil(boss.hp)}/${boss.maxHp}`,
        bx + barW,
        by - 9,
        '#e2e8f0'
      );
      ctx.textAlign = 'left';

      // Boss HP fill
      ctx.fillStyle = '#120810';
      ctx.fillRect(bx, by, barW, barH);

      const ratio = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
      const fillW = Math.round((barW - 2) * ratio);
      if (fillW > 0) {
        ctx.fillStyle = '#3b0d1b';
        ctx.fillRect(bx + 1, by + 1, fillW, barH - 2);
        ctx.fillStyle = boss.bossColor;
        ctx.fillRect(bx + 1, by + 1, fillW, 3);
        ctx.fillStyle = boss.bossBrightColor;
        ctx.fillRect(bx + 1, by + 1, fillW, 1);
      }

      ctx.fillStyle = boss.bossColor;
      ctx.fillRect(bx, by, barW, 1);
      ctx.fillRect(bx, by + barH - 1, barW, 1);
      ctx.fillRect(bx, by, 1, barH);
      ctx.fillRect(bx + barW - 1, by, 1, barH);

      // Boss Yellow Sekiro Posture Bar right underneath HP bar
      const pBarY = by + barH + 2;
      const pBarH = 4;
      const pRatio = Math.max(0, Math.min(1, boss.posture / boss.maxPosture));
      const pFillW = Math.round((barW - 2) * pRatio);
      ctx.fillStyle = '#1a1404';
      ctx.fillRect(bx, pBarY, barW, pBarH);
      if (pFillW > 0) {
        const brokenFlash = boss.aiState === 'posture_broken' && Math.sin(elapsed * 26) > 0;
        ctx.fillStyle = brokenFlash ? '#ef4444' : '#eab308';
        ctx.fillRect(bx + 1, pBarY + 1, pFillW, pBarH - 2);
        ctx.fillStyle = brokenFlash ? '#fecaca' : '#fef08a';
        ctx.fillRect(bx + 1, pBarY + 1, pFillW, 1);
      }
    }

    // 3. Wave / Stage Announcement Banner
    if (this.bannerTimer > 0) {
      const alpha = Math.min(1, this.bannerTimer * 1.4);
      ctx.globalAlpha = alpha;
      const bw = 216;
      const bx = Math.round((GAME_WIDTH - bw) / 2);
      const by = 54;

      ctx.fillStyle = 'rgba(6, 9, 18, 0.82)';
      ctx.fillRect(bx, by, bw, 30);
      ctx.fillStyle = this.bannerAccent;
      ctx.fillRect(bx, by, bw, 1);
      ctx.fillRect(bx, by + 29, bw, 1);

      ctx.textAlign = 'center';
      ctx.font = 'bold 9px "Cinzel", Georgia, serif';
      this.drawShadowText(
        ctx,
        this.bannerTitle,
        GAME_WIDTH / 2,
        by + 5,
        this.bannerIsBoss ? '#ffe4e6' : '#f1f5f9'
      );

      ctx.font = '7px "DM Sans", sans-serif';
      this.drawShadowText(
        ctx,
        this.bannerSubtitle,
        GAME_WIDTH / 2,
        by + 17,
        this.bannerIsBoss ? '#fda4af' : '#cbd5e1'
      );
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    // 4. "+30% HP RECOVERED" badge below top-left Ultimate bar right after Stage Boss kill
    if (this.pendingStageRecoveryBanner > 0) {
      const alpha = Math.min(1, this.pendingStageRecoveryBanner * 1.4);
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      this.drawShadowText(ctx, 'STAGE CLEAR · +30% HP', 12, 65, '#4ade80');
      ctx.globalAlpha = 1;
    }
  }

  private startWave(waveNum: number): void {
    const diff = this.callbacks.getBreathSystem().difficulty;
    this.wave = waveNum;
    this.spawnQueue = [];

    if (this.mode === 'story') {
      const stg = STORY_STAGES[this.stage - 1];
      const isBossWave = this.stageWave === 3;
      this.bannerIsBoss = isBossWave;
      this.bannerTimer = isBossWave ? 2.7 : 2.0;
      this.bannerAccent = isBossWave ? stg.bossColor : '#38bdf8';

      if (isBossWave) {
        this.bannerTitle = `STAGE ${stg.stageNumber}: ${stg.bossName.toUpperCase()}`;
        this.bannerSubtitle = `${stg.bossTitle} · ${stg.name}`;
        this.spawnQueue.push({ kind: 'boss', delay: 0.7 * diff.spawnDelayMult, side: 1 });

        const adds =
          (this.stage >= 4 ? 1 : 0) +
          (this.stage >= 8 ? 1 : 0) +
          (diff.extraEnemiesPerWave > 0 ? 1 : 0);
        for (let i = 0; i < adds; i++) {
          this.spawnQueue.push({
            kind: 'kage',
            delay: (2.8 + i * 2.2) * diff.spawnDelayMult,
            side: i % 2 === 0 ? -1 : 1,
          });
        }
      } else {
        this.bannerTitle = `STAGE ${stg.stageNumber}: ${stg.name.toUpperCase()}`;
        this.bannerSubtitle = `Wave ${this.stageWave}/3 · ${stg.arabicName}`;

        const kageCount =
          2 +
          Math.min(4, Math.floor((this.stage + 1) / 2)) +
          (this.stageWave === 2 ? 1 : 0) +
          diff.extraEnemiesPerWave;
        const oniCount =
          (this.stage >= 2 || this.stageWave === 2 ? 1 : 0) +
          Math.floor(this.stage / 4) +
          (diff.extraEnemiesPerWave > 0 && this.stage >= 3 ? 1 : 0);

        let t = 0.5 * diff.spawnDelayMult;
        for (let i = 0; i < kageCount; i++) {
          this.spawnQueue.push({
            kind: 'kage',
            delay: t,
            side: i % 2 === 0 ? 1 : -1,
          });
          t += 0.9 * diff.spawnDelayMult;
        }
        for (let i = 0; i < oniCount; i++) {
          this.spawnQueue.push({
            kind: 'oni',
            delay: (1.2 + i * 1.9) * diff.spawnDelayMult,
            side: i % 2 === 0 ? -1 : 1,
          });
        }
      }
      return;
    }

    const isBossWave = waveNum % 3 === 0;
    this.bannerIsBoss = isBossWave;
    this.bannerTimer = isBossWave ? 2.6 : 1.9;
    this.bannerAccent = isBossWave ? '#f43f5e' : '#38bdf8';

    if (isBossWave) {
      this.bannerTitle = `WAVE ${waveNum} · DEMON MOON`;
      this.bannerSubtitle = `${diff.name} Rank · Parry attacks to break Posture`;
      this.spawnQueue.push({ kind: 'boss', delay: 0.7 * diff.spawnDelayMult, side: 1 });

      const kageAdds =
        Math.min(3, Math.floor(waveNum / 3)) + (diff.extraEnemiesPerWave > 0 ? 1 : 0);
      for (let i = 0; i < kageAdds; i++) {
        this.spawnQueue.push({
          kind: 'kage',
          delay: (2.6 + i * 2.1) * diff.spawnDelayMult,
          side: i % 2 === 0 ? -1 : 1,
        });
      }
    } else {
      this.bannerTitle = `WAVE ${waveNum}`;
      this.bannerSubtitle =
        waveNum === 1
          ? `${diff.name} Rank · Parry with J/Z as enemies strike`
          : `${diff.name} Rank · Stronger demons emerge`;

      const kageCount = 2 + Math.min(5, waveNum) + diff.extraEnemiesPerWave;
      const oniCount =
        1 + Math.floor(waveNum / 2) + (diff.extraEnemiesPerWave > 0 && waveNum >= 2 ? 1 : 0);

      let t = 0.55 * diff.spawnDelayMult;
      for (let i = 0; i < kageCount; i++) {
        this.spawnQueue.push({
          kind: 'kage',
          delay: t,
          side: i % 2 === 0 ? 1 : -1,
        });
        t += 0.95 * diff.spawnDelayMult;
      }
      for (let i = 0; i < oniCount; i++) {
        this.spawnQueue.push({
          kind: 'oni',
          delay: (1.2 + i * 1.9) * diff.spawnDelayMult,
          side: i % 2 === 0 ? -1 : 1,
        });
      }
    }
  }

  private spawnEnemy(
    kind: EnemyKind,
    side: -1 | 1,
    emitAction: UpdateContext['emitAction']
  ): void {
    const diff = this.callbacks.getBreathSystem().difficulty;
    const spawnX = side === 1 ? ARENA.maxX + 18 : ARENA.minX - 18;
    const facing: Facing = side === 1 ? -1 : 1;

    const effectiveWave =
      this.mode === 'story' ? (this.stage - 1) * 2 + (this.stageWave - 1) : this.wave - 1;
    const waveBonus = Math.max(0, effectiveWave);

    if (kind === 'kage') {
      const maxHp = Math.round((34 + waveBonus * 4) * diff.enemyHpMult);
      const maxPosture = Math.round((48 + waveBonus * 3) * diff.enemyHpMult);
      this.enemies.push({
        id: this.nextEnemyId++,
        kind: 'kage',
        x: spawnX,
        y: GROUND_Y,
        vx: 0,
        vy: 0,
        grounded: true,
        facing,
        hp: maxHp,
        maxHp,
        posture: 0,
        maxPosture,
        postureDecayDelay: 0,
        width: 16,
        height: 22,
        speed: (92 + Math.min(28, waveBonus * 3.5)) * diff.enemySpeedMult,
        damage: Math.round(11 * diff.enemyDamageMult),
        knockbackResist: 0.15,
        aiState: 'chase',
        stateTimer: 0,
        animTimer: Math.random() * 2,
        hitFlashTimer: 0,
        lastHitSlashId: -1,
        hasDealtAttackHit: false,
        poisonTimer: 0,
        poisonDps: 0,
        bossId: 'demon_moon',
        bossName: '',
        bossColor: '#f43f5e',
        bossBrightColor: '#ffe4e6',
        bossPattern: 'dash',
        bossNextPattern: 'dash',
        bossAttackCount: 0,
        unblockableMelee: false,
      });
    } else if (kind === 'oni') {
      const maxHp = Math.round((95 + waveBonus * 12) * diff.enemyHpMult);
      const maxPosture = Math.round((95 + waveBonus * 6) * diff.enemyHpMult);
      this.enemies.push({
        id: this.nextEnemyId++,
        kind: 'oni',
        x: spawnX,
        y: GROUND_Y,
        vx: 0,
        vy: 0,
        grounded: true,
        facing,
        hp: maxHp,
        maxHp,
        posture: 0,
        maxPosture,
        postureDecayDelay: 0,
        width: 24,
        height: 32,
        speed: (42 + Math.min(18, waveBonus * 2)) * diff.enemySpeedMult,
        damage: Math.round(22 * diff.enemyDamageMult),
        knockbackResist: 0.72,
        aiState: 'chase',
        stateTimer: 0,
        animTimer: Math.random() * 2,
        hitFlashTimer: 0,
        lastHitSlashId: -1,
        hasDealtAttackHit: false,
        poisonTimer: 0,
        poisonDps: 0,
        bossId: 'demon_moon',
        bossName: '',
        bossColor: '#f43f5e',
        bossBrightColor: '#ffe4e6',
        bossPattern: 'dash',
        bossNextPattern: 'dash',
        bossAttackCount: 0,
        unblockableMelee: false,
      });
    } else {
      const stg = this.mode === 'story' ? STORY_STAGES[this.stage - 1] : null;
      const bossTier = Math.max(0, Math.floor(this.wave / 3) - 1);

      const bossId: BossId = stg ? stg.bossId : 'demon_moon';
      const bossName = stg ? stg.bossName : 'Demon Moon';
      const bossColor = stg ? stg.bossColor : '#f43f5e';
      const bossBrightColor = stg ? stg.bossBrightColor : '#ffe4e6';
      const baseHp = stg ? stg.bossBaseHp : 260 + bossTier * 95;
      const baseSpeed = stg ? stg.bossSpeed : 68 + bossTier * 8;
      const baseDamage = stg ? stg.bossDamage : 26;

      const maxHp = Math.round(baseHp * diff.enemyHpMult);
      const maxPosture = Math.round((165 + (stg ? stg.stageNumber * 14 : bossTier * 24)) * diff.enemyHpMult);
      this.enemies.push({
        id: this.nextEnemyId++,
        kind: 'boss',
        x: spawnX,
        y: GROUND_Y,
        vx: 0,
        vy: 0,
        grounded: true,
        facing,
        hp: maxHp,
        maxHp,
        posture: 0,
        maxPosture,
        postureDecayDelay: 0,
        width: 28,
        height: 38,
        speed: baseSpeed * diff.enemySpeedMult,
        damage: Math.round(baseDamage * diff.enemyDamageMult),
        knockbackResist: 0.88,
        aiState: 'chase',
        stateTimer: 0,
        animTimer: 0,
        hitFlashTimer: 0,
        lastHitSlashId: -1,
        hasDealtAttackHit: false,
        poisonTimer: 0,
        poisonDps: 0,
        bossId,
        bossName,
        bossColor,
        bossBrightColor,
        bossPattern: 'dash',
        bossNextPattern: 'dash',
        bossAttackCount: 0,
        unblockableMelee: false,
      });
      this.bossDamageTakenThisFight = 0;
      emitAction({
        type: 'boss_spawn',
        x: spawnX,
        y: GROUND_Y,
        facing,
      });
    }
  }

  private applyPostureDamage(
    e: Enemy,
    amount: number,
    spawnParticles: (particles: Particle[]) => void
  ): boolean {
    if (e.aiState === 'posture_broken') return true;
    e.posture = Math.min(e.maxPosture, e.posture + amount);
    e.postureDecayDelay = 3.2;

    if (e.posture >= e.maxPosture) {
      e.aiState = 'posture_broken';
      e.stateTimer = 2.6;
      e.vx = 0;

      this.callouts.push({
        x: e.x,
        y: e.y - e.height - 10,
        text: 'POSTURE BROKEN!',
        color: '#fde047',
        life: 0.9,
        maxLife: 0.9,
      });

      const burst: Particle[] = [];
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2;
        const spd = 40 + Math.random() * 65;
        burst.push({
          x: e.x,
          y: e.y - e.height * 0.55,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 0.35,
          maxLife: 0.35,
          size: 2,
          color: i % 2 === 0 ? '#fef08a' : '#ef4444',
          gravityFactor: 0.08,
        });
      }
      spawnParticles(burst);
      return true;
    }
    return false;
  }

  private checkPlayerSlashHits(
    box: ActiveSlashBox,
    player: Samurai,
    breath: BreathRhythmSystem,
    camera: CameraState,
    modifiers: RunModifiers,
    emitAction: UpdateContext['emitAction'],
    spawnParticles: (particles: Particle[]) => void
  ): void {
    const char = CHARACTER_MAP[box.characterId];
    const c = char.colors;
    const g = char.gameplay;
    let hitAny = false;
    let hitCharged = false;
    let executedFinisher = false;
    let hitX = 0;

    for (const e of this.enemies) {
      if (e.lastHitSlashId === box.slashId) continue;

      const ex = e.x - e.width / 2;
      const ey = e.y - e.height;
      const overlap =
        box.x < ex + e.width &&
        box.x + box.width > ex &&
        box.y < ey + e.height &&
        box.y + box.height > ey;

      if (!overlap) continue;

      e.lastHitSlashId = box.slashId;
      e.hitFlashTimer = 0.095;
      hitAny = true;
      hitX = e.x;
      if (box.charged) hitCharged = true;

      // Check for Sekiro Posture-Broken Cinematic Screen-Splitting Finisher!
      if (e.aiState === 'posture_broken') {
        executedFinisher = true;
        const finisherDmg =
          e.kind === 'boss'
            ? Math.max(
                box.damage * 2.2,
                Math.round(e.maxHp * 0.36 * modifiers.finisherBossMult)
              )
            : e.hp + 999; // Instant lethal Deathblow on Kage & Oni

        e.hp -= finisherDmg;
        e.posture = 0;
        e.aiState = 'stunned';
        e.stateTimer = 0.55;
        e.vx = box.facing * (e.kind === 'boss' ? 95 : 160);

        if (modifiers.finisherHealPct > 0) {
          breath.healPlayer(Math.round(breath.maxHp * modifiers.finisherHealPct));
        }
        breath.addUltimateCharge(22, modifiers.ultimateChargeMult);

        this.finisherEffect = {
          timer: 0.46,
          duration: 0.46,
          targetScreenX: e.x - camera.x,
          targetScreenY: e.y - e.height * 0.55,
          color: c.primary,
          brightColor: c.bright,
          angle: (box.facing === 1 ? -0.22 : 0.22) + (Math.random() - 0.5) * 0.14,
        };

        emitAction({
          type: 'deathblow',
          x: e.x,
          y: e.y,
          facing: box.facing,
          characterId: box.characterId,
          charged: true,
        });
        this.callbacks.triggerSlowMo(0.28, 0.26);
        this.callbacks.triggerHitStop(0.08);
        this.callbacks.triggerShake(4.0, 0.24);
      } else {
        e.hp -= box.damage;
        const basePostureHit = box.charged ? 26 : 15;
        const postureBroke = this.applyPostureDamage(
          e,
          Math.round(basePostureHit * modifiers.postureDamageMult),
          spawnParticles
        );
        breath.addUltimateCharge(box.charged ? 7 : 4.5, modifiers.ultimateChargeMult);

        const kbForce = (box.charged ? 180 : 120) * (1 - e.knockbackResist);
        e.vx = box.facing * kbForce;

        if (e.kind === 'kage' && !postureBroke && e.aiState !== 'stunned') {
          e.aiState = 'stunned';
          e.stateTimer = 0.24;
        }
      }

      if (g.poisonDps && g.poisonDuration) {
        e.poisonDps = box.charged ? g.poisonDps * 1.4 : g.poisonDps;
        e.poisonTimer = g.poisonDuration;
      }

      this.incrementCombo(0.14);

      this.spawnHitParticles(
        spawnParticles,
        e.x,
        e.y - e.height * 0.55,
        box.facing,
        c.primary,
        c.bright,
        box.charged || executedFinisher
      );
    }

    if (hitAny && !executedFinisher) {
      emitAction({
        type: 'enemy_hit',
        x: hitX,
        y: player.y,
        facing: box.facing,
        characterId: box.characterId,
        charged: hitCharged,
        combo: this.combo,
      });

      const bonusShake = g.extraShake ?? 0;
      if (hitCharged) {
        this.callbacks.triggerHitStop(0.06);
        this.callbacks.triggerShake(2.8 + bonusShake * 0.5, 0.14);
      } else if (bonusShake > 0) {
        this.callbacks.triggerHitStop(0.032);
        this.callbacks.triggerShake(1.6 + bonusShake * 0.5, 0.12);
      } else {
        this.callbacks.triggerShake(1.1, 0.08);
      }
    }
  }

  private updateEnemyAI(
    e: Enemy,
    dt: number,
    player: Samurai,
    breath: BreathRhythmSystem,
    modifiers: RunModifiers,
    emitAction: UpdateContext['emitAction'],
    spawnParticles: (particles: Particle[]) => void
  ): void {
    const dx = player.x - e.x;
    const dist = Math.abs(dx);
    const dy = player.y - e.y;
    const dirToPlayer: Facing = dx >= 0 ? 1 : -1;

    if (e.aiState !== 'attack') {
      e.vx *= Math.pow(0.002, dt);
    }

    if (e.aiState === 'posture_broken') {
      e.stateTimer -= dt;
      e.x += e.vx * dt;
      if (e.stateTimer <= 0) {
        e.posture = Math.round(e.maxPosture * 0.35);
        e.aiState = 'chase';
      }
      return;
    }

    if (e.aiState === 'stunned') {
      e.stateTimer -= dt;
      e.x += e.vx * dt;
      if (e.stateTimer <= 0) {
        e.aiState = 'chase';
      }
      return;
    }

    if (e.aiState === 'chase') {
      e.facing = dirToPlayer;

      // Vertical platform jump pursuit for agile enemies & bosses if player is higher up
      if (e.grounded && dy < -24 && (e.kind === 'kage' || e.kind === 'boss') && dist < 120) {
        e.vy = -318;
        e.grounded = false;
      }

      const rangedPerilBoss =
        e.kind === 'boss' &&
        (e.bossId === 'rui' ||
          e.bossId === 'kyogai' ||
          e.bossId === 'enmu' ||
          e.bossId === 'gyutaro' ||
          e.bossId === 'hantengu' ||
          e.bossId === 'kokushibo' ||
          e.bossId === 'muzan' ||
          e.bossId === 'swamp_demon' ||
          e.bossId === 'demon_moon');

      const triggerRange =
        e.kind === 'boss' ? (rangedPerilBoss && e.bossAttackCount % 2 === 1 ? 190 : 122) : e.kind === 'oni' ? 38 : 34;

      if (dist <= triggerRange && Math.abs(dy) < (e.kind === 'boss' ? 88 : 36)) {
        const diff = breath.difficulty;
        e.aiState = 'telegraph';
        e.hasDealtAttackHit = false;
        e.unblockableMelee = false;

        if (e.kind === 'boss') {
          e.bossAttackCount += 1;
          const patternCycle: BossAttackPattern[] = ['dash', 'peril', 'slam', 'peril'];
          e.bossPattern = patternCycle[(e.bossAttackCount - 1) % patternCycle.length];
          e.bossNextPattern = patternCycle[e.bossAttackCount % patternCycle.length];

          if (e.bossPattern === 'peril') {
            e.stateTimer = 0.8 * diff.telegraphScale;
            emitAction({
              type: 'peril_warning',
              x: e.x,
              y: e.y,
              facing: e.facing,
            });
          } else {
            e.stateTimer = (e.bossPattern === 'dash' ? 0.65 : 0.72) * diff.telegraphScale;
          }
        } else if (e.kind === 'oni') {
          e.stateTimer = 0.6 * diff.telegraphScale;
        } else {
          e.stateTimer = 0.34 * diff.telegraphScale;
        }
        e.vx = 0;
      } else {
        e.vx = e.facing * e.speed;
        e.x += e.vx * dt;
      }
      return;
    }

    if (e.aiState === 'telegraph') {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.aiState = 'attack';
        e.hasDealtAttackHit = false;
        if (e.kind === 'boss') {
          if (e.bossPattern === 'dash') {
            e.stateTimer = 0.28;
            e.vx = e.facing * 320;
            this.callbacks.triggerShake(1.6, 0.12);
          } else if (e.bossPattern === 'slam') {
            e.stateTimer = 0.24;
            e.vx = 0;
            this.spawnBossShockwaves(e, spawnParticles, false);
          } else {
            // Execute unique Boss Unblockable Peril Pattern (危)
            this.executeBossPerilAttack(e, player, spawnParticles);
          }
        } else if (e.kind === 'oni') {
          e.stateTimer = 0.2;
          e.vx = e.facing * 38;
          this.callbacks.triggerShake(1.5, 0.1);
        } else {
          e.stateTimer = 0.18;
          e.vx = e.facing * 195;
        }
      }
      return;
    }

    if (e.aiState === 'attack') {
      e.stateTimer -= dt;
      e.x += e.vx * dt;

      if (!e.hasDealtAttackHit) {
        const reachX = e.kind === 'boss' ? 24 : e.kind === 'oni' ? 26 : 18;
        const reachY = e.kind === 'boss' ? 36 : e.kind === 'oni' ? 32 : 24;
        const hitX = e.facing === 1 ? e.x - 4 : e.x + 4 - reachX;
        const hitY = e.y - reachY;

        const playerW = 14;
        const playerH = 26;
        const px = player.x - playerW / 2;
        const py = player.y - playerH;

        const overlaps =
          hitX < px + playerW &&
          hitX + reachX > px &&
          hitY < py + playerH &&
          hitY + reachY > py;

        if (overlaps) {
          if (player.isParrying && !e.unblockableMelee) {
            // SEKIRO PERFECT PARRY!
            e.hasDealtAttackHit = true;
            e.aiState = 'stunned';
            e.stateTimer = 0.65;
            e.vx = -e.facing * 115 * (1 - e.knockbackResist * 0.5);
            e.hitFlashTimer = 0.1;

            const parryPostureDmg = Math.round(
              (e.kind === 'boss' ? 56 : 52) * modifiers.postureDamageMult
            );
            this.applyPostureDamage(e, parryPostureDmg, spawnParticles);

            this.incrementCombo(0.16);
            this.runParries += 1;
            if (this.runParries >= 5) {
              this.awardSecretTitle('parry_virtuoso');
            }
            breath.addUltimateCharge(18, modifiers.ultimateChargeMult);

            this.callouts.push({
              x: player.x,
              y: player.y - 30,
              text: 'PERFECT PARRY!',
              color: '#fef08a',
              life: 0.72,
              maxLife: 0.72,
            });

            this.callbacks.triggerSlowMo(0.25, 0.24);
            this.callbacks.triggerHitStop(0.045);
            this.callbacks.triggerShake(2.4, 0.14);
            emitAction({
              type: 'parry_success',
              x: player.x,
              y: player.y,
              facing: player.facing,
              characterId: player.characterId,
            });
            this.spawnParryParticles(
              spawnParticles,
              player.x + player.facing * 10,
              player.y - 16
            );
            return;
          } else if (!player.isInvulnerable) {
            e.hasDealtAttackHit = true;
            if (player.isParrying && e.unblockableMelee) {
              this.callouts.push({
                x: player.x,
                y: player.y - 32,
                text: 'UNBLOCKABLE!',
                color: '#ef4444',
                life: 0.75,
                maxLife: 0.75,
              });
            }
            this.hurtPlayer(player, breath, e.damage, e.facing, emitAction, spawnParticles);
          }
        }
      }

      if (e.stateTimer <= 0) {
        e.aiState = 'recover';
        e.unblockableMelee = false;
        e.vx = 0;
        e.stateTimer = e.kind === 'boss' ? 0.55 : e.kind === 'oni' ? 0.62 : 0.42;
      }
      return;
    }

    if (e.aiState === 'recover') {
      e.stateTimer -= dt;
      e.x += e.vx * dt;
      if (e.stateTimer <= 0) {
        e.aiState = 'chase';
      }
    }
  }

  private executeBossPerilAttack(
    boss: Enemy,
    player: Samurai,
    spawnParticles: (particles: Particle[]) => void
  ): void {
    const diff = this.callbacks.getBreathSystem().difficulty;
    const spdMult = diff.enemySpeedMult;
    const dmg = Math.round(boss.damage * 0.9);
    const dir: Facing = player.x >= boss.x ? 1 : -1;
    boss.facing = dir;

    switch (boss.bossId) {
      case 'hand_demon': {
        // Unblockable sweeping multi-arm grab lunge across the ground
        boss.unblockableMelee = true;
        boss.stateTimer = 0.34;
        boss.vx = dir * 290;
        this.callbacks.triggerShake(2.6, 0.18);
        break;
      }

      case 'swamp_demon': {
        // Unblockable swamp puddle ambush eruption beneath player
        boss.stateTimer = 0.28;
        boss.vx = 0;
        this.lightningPillars.push({
          x: Math.max(ARENA.minX + 20, Math.min(ARENA.maxX - 20, player.x)),
          timer: 0.52,
          strikeDuration: 0.26,
          width: 26,
          damage: dmg,
          struck: false,
          hitPlayer: false,
          color: '#0d9488',
          brightColor: '#5eead4',
          isWaterGeyser: true,
        });
        break;
      }

      case 'kyogai': {
        // 3 horizontal drum-room amber claw waves at staggered heights
        boss.stateTimer = 0.25;
        boss.vx = 0;
        for (const [idx, yOffset] of [12, 34].entries()) {
          this.bossProjectiles.push({
            x: boss.x + dir * 16,
            y: GROUND_Y - yOffset,
            vx: dir * (185 + idx * 25) * spdMult,
            vy: 0,
            width: 14,
            height: 10,
            kind: 'claw',
            color: '#d97706',
            brightColor: '#fde68a',
            damage: Math.round(dmg * 0.85),
            life: 2.2,
            maxLife: 2.2,
            hitPlayer: false,
            facing: dir,
            phase: idx,
            homing: false,
          });
        }
        this.callbacks.triggerShake(2.2, 0.14);
        break;
      }

      case 'rui': {
        // Horizontal red Blood-Art web projectiles to jump/platform over
        boss.stateTimer = 0.26;
        boss.vx = 0;
        const heights = [12, 38];
        heights.forEach((h, idx) => {
          this.bossProjectiles.push({
            x: boss.x + dir * 14,
            y: GROUND_Y - h,
            vx: dir * (195 + idx * 20) * spdMult,
            vy: 0,
            width: 18,
            height: 8,
            kind: 'web',
            color: '#dc2626',
            brightColor: '#fecdd3',
            damage: Math.round(dmg * 0.85),
            life: 2.4,
            maxLife: 2.4,
            hitPlayer: false,
            facing: dir,
            phase: idx * 0.7,
            homing: false,
          });
        });
        break;
      }

      case 'enmu': {
        // Floating purple sleep-eye orbs drifting toward the slayer
        boss.stateTimer = 0.26;
        boss.vx = 0;
        for (const yOff of [18, 44]) {
          const dx = player.x - boss.x;
          const dy = player.y - 14 - (GROUND_Y - yOff);
          const len = Math.max(1, Math.hypot(dx, dy));
          this.bossProjectiles.push({
            x: boss.x + dir * 14,
            y: GROUND_Y - yOff,
            vx: (dx / len) * 115 * spdMult,
            vy: (dy / len) * 115 * spdMult,
            width: 12,
            height: 12,
            kind: 'orb',
            color: '#9333ea',
            brightColor: '#f3e8ff',
            damage: Math.round(dmg * 0.82),
            life: 2.7,
            maxLife: 2.7,
            hitPlayer: false,
            facing: dir,
            phase: yOff,
            homing: true,
          });
        }
        break;
      }

      case 'akaza': {
        // Destructive Death Compass: unblockable ground shockwaves in both directions!
        boss.stateTimer = 0.3;
        boss.vx = 0;
        this.spawnBossShockwaves(boss, spawnParticles, true);
        break;
      }

      case 'gyutaro': {
        // Curving flying Blood Sickle arcs
        boss.stateTimer = 0.26;
        boss.vx = 0;
        for (const [idx, vy0] of [-65, 20].entries()) {
          this.bossProjectiles.push({
            x: boss.x + dir * 16,
            y: GROUND_Y - 20,
            vx: dir * 175 * spdMult,
            vy: vy0,
            width: 14,
            height: 12,
            kind: 'sickle',
            color: idx === 0 ? '#84cc16' : '#f43f5e',
            brightColor: '#fef08a',
            damage: Math.round(dmg * 0.88),
            life: 2.2,
            maxLife: 2.2,
            hitPlayer: false,
            facing: dir,
            phase: idx * 1.4,
            homing: false,
          });
        }
        break;
      }

      case 'hantengu': {
        // 3 vertical lightning strike columns marked across player's vicinity
        boss.stateTimer = 0.28;
        boss.vx = 0;
        for (const offset of [-52, 0, 52]) {
          const tx = Math.max(ARENA.minX + 18, Math.min(ARENA.maxX - 18, player.x + offset));
          this.lightningPillars.push({
            x: tx,
            timer: 0.62,
            strikeDuration: 0.25,
            width: 20,
            damage: Math.round(dmg * 0.9),
            struck: false,
            hitPlayer: false,
            color: '#eab308',
            brightColor: '#fef9c3',
          });
        }
        break;
      }

      case 'kokushibo': {
        // Wide sweeping Moon Breathing crescent moon blades
        boss.stateTimer = 0.28;
        boss.vx = 0;
        for (const [idx, vy] of [-42, 0, 32].entries()) {
          this.bossProjectiles.push({
            x: boss.x + dir * 18,
            y: GROUND_Y - 22,
            vx: dir * 205 * spdMult,
            vy,
            width: 14,
            height: 16,
            kind: 'crescent',
            color: '#a855f7',
            brightColor: '#f3e8ff',
            damage: Math.round(dmg * 0.92),
            life: 2.0,
            maxLife: 2.0,
            hitPlayer: false,
            facing: dir,
            phase: idx,
            homing: false,
          });
        }
        this.callbacks.triggerShake(2.6, 0.16);
        break;
      }

      case 'muzan': {
        // Fast crimson-black biokinesis blood whip sweep arcs
        boss.stateTimer = 0.3;
        boss.vx = dir * 130;
        boss.unblockableMelee = true;
        for (const [idx, yOff] of [12, 30, 52].entries()) {
          this.bossProjectiles.push({
            x: boss.x + dir * 18,
            y: GROUND_Y - yOff,
            vx: dir * (235 - idx * 15) * spdMult,
            vy: (idx - 1) * 18,
            width: 22,
            height: 8,
            kind: 'whip_arc',
            color: '#dc2626',
            brightColor: '#fecaca',
            damage: Math.round(dmg * 0.95),
            life: 1.8,
            maxLife: 1.8,
            hitPlayer: false,
            facing: dir,
            phase: idx,
            homing: false,
          });
        }
        this.callbacks.triggerShake(3.2, 0.2);
        break;
      }

      default: {
        // Endless Demon Moon crescent wave
        boss.stateTimer = 0.26;
        boss.vx = 0;
        for (const [idx, yOff] of [14, 38].entries()) {
          this.bossProjectiles.push({
            x: boss.x + dir * 16,
            y: GROUND_Y - yOff,
            vx: dir * 195 * spdMult,
            vy: 0,
            width: 14,
            height: 16,
            kind: 'crescent',
            color: '#f43f5e',
            brightColor: '#ffe4e6',
            damage: Math.round(dmg * 0.9),
            life: 2.1,
            maxLife: 2.1,
            hitPlayer: false,
            facing: dir,
            phase: idx,
            homing: false,
          });
        }
        break;
      }
    }
  }

  private spawnBossShockwaves(
    boss: Enemy,
    spawnParticles: (particles: Particle[]) => void,
    unblockable = false
  ): void {
    const diff = this.callbacks.getBreathSystem().difficulty;
    this.callbacks.triggerShake(unblockable ? 3.8 : 3.2, 0.22);

    for (const dir of [-1, 1] as const) {
      this.shockwaves.push({
        x: boss.x + dir * 14,
        y: boss.y,
        vx: dir * (unblockable ? 195 : 165) * diff.enemySpeedMult,
        facing: dir,
        damage: Math.round(boss.damage * (unblockable ? 0.9 : 0.78)),
        life: 1.5,
        hitPlayer: false,
        color: unblockable ? '#dc2626' : boss.bossColor,
        brightColor: unblockable ? '#fecaca' : boss.bossBrightColor,
        sourceEnemyId: boss.id,
        unblockable,
      });
    }

    const slamBurst: Particle[] = [];
    for (let i = 0; i < 18; i++) {
      slamBurst.push({
        x: boss.x + (Math.random() - 0.5) * 28,
        y: boss.y - 2,
        vx: (Math.random() - 0.5) * 140,
        vy: -35 - Math.random() * 85,
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.55,
        size: i % 3 === 0 ? 2 : 1,
        color: i % 2 === 0 ? boss.bossColor : boss.bossBrightColor,
        gravityFactor: 0.4,
      });
    }
    spawnParticles(slamBurst);
  }

  private updateShockwaves(
    dt: number,
    player: Samurai,
    breath: BreathRhythmSystem,
    modifiers: RunModifiers,
    emitAction: UpdateContext['emitAction'],
    spawnParticles: (particles: Particle[]) => void
  ): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      sw.x += sw.vx * dt;

      if (sw.life <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      if (!sw.hitPlayer) {
        const overlaps =
          Math.abs(player.x - sw.x) < 12 && Math.abs(player.y - sw.y) < (sw.unblockable ? 22 : 18);

        if (overlaps) {
          if (player.isParrying && !sw.unblockable) {
            // Perfect Parry a regular Boss shockwave -> deals posture damage to source boss!
            const srcBoss = this.enemies.find((en) => en.id === sw.sourceEnemyId);
            if (srcBoss) {
              this.applyPostureDamage(
                srcBoss,
                Math.round(35 * modifiers.postureDamageMult),
                spawnParticles
              );
            }
            breath.addUltimateCharge(14, modifiers.ultimateChargeMult);
            this.runParries += 1;
            if (this.runParries >= 5) {
              this.awardSecretTitle('parry_virtuoso');
            }
            this.callouts.push({
              x: sw.x,
              y: sw.y - 24,
              text: 'DEFLECT!',
              color: '#fef08a',
              life: 0.65,
              maxLife: 0.65,
            });
            this.callbacks.triggerSlowMo(0.3, 0.18);
            this.callbacks.triggerHitStop(0.045);
            this.callbacks.triggerShake(1.8, 0.1);
            emitAction({
              type: 'parry_success',
              x: sw.x,
              y: sw.y,
              facing: player.facing,
              characterId: player.characterId,
            });
            this.spawnParryParticles(spawnParticles, sw.x, sw.y - 10);
            this.shockwaves.splice(i, 1);
            continue;
          } else if (!player.isInvulnerable) {
            sw.hitPlayer = true;
            if (player.isParrying && sw.unblockable) {
              this.callouts.push({
                x: player.x,
                y: player.y - 32,
                text: 'UNBLOCKABLE!',
                color: '#ef4444',
                life: 0.75,
                maxLife: 0.75,
              });
            }
            this.hurtPlayer(player, breath, sw.damage, sw.facing, emitAction, spawnParticles);
          }
        }
      }
    }
  }

  private updateBossProjectiles(
    dt: number,
    player: Samurai,
    breath: BreathRhythmSystem,
    emitAction: UpdateContext['emitAction'],
    spawnParticles: (particles: Particle[]) => void
  ): void {
    const px = player.x - 6;
    const py = player.y - 24;
    const pw = 12;
    const ph = 24;

    for (let i = this.bossProjectiles.length - 1; i >= 0; i--) {
      const p = this.bossProjectiles[i];
      p.life -= dt;
      p.phase += dt * 7;

      if (p.homing) {
        const dx = player.x - p.x;
        const dy = player.y - 14 - p.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        p.vx += ((dx / dist) * 140 - p.vx) * Math.min(1, dt * 1.8);
        p.vy += ((dy / dist) * 140 - p.vy) * Math.min(1, dt * 1.8);
      } else if (p.kind === 'sickle') {
        p.vy = Math.sin(p.phase) * 95;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.life <= 0 || p.x < ARENA.minX - 60 || p.x > ARENA.maxX + 60) {
        this.bossProjectiles.splice(i, 1);
        continue;
      }

      if (!p.hitPlayer) {
        const bx = p.x - p.width / 2;
        const by = p.y - p.height / 2;
        const hit =
          bx < px + pw && bx + p.width > px && by < py + ph && by + p.height > py;
        if (hit && !player.isInvulnerable) {
          p.hitPlayer = true;
          if (player.isParrying) {
            this.callouts.push({
              x: player.x,
              y: player.y - 32,
              text: 'UNBLOCKABLE!',
              color: '#ef4444',
              life: 0.75,
              maxLife: 0.75,
            });
          }
          this.hurtPlayer(player, breath, p.damage, p.facing, emitAction, spawnParticles);
          this.bossProjectiles.splice(i, 1);
        }
      }
    }
  }

  private renderBossProjectiles(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    elapsed: number
  ): void {
    for (const p of this.bossProjectiles) {
      const sx = Math.round(p.x - cameraX);
      const sy = Math.round(p.y);

      if (p.kind === 'web') {
        // Horizontal red spider-web thread mesh
        ctx.fillStyle = p.color;
        ctx.fillRect(sx - 9, sy - 3, 18, 2);
        ctx.fillRect(sx - 9, sy + 1, 18, 2);
        ctx.fillRect(sx - 6, sy - 4, 2, 8);
        ctx.fillRect(sx + 4, sy - 4, 2, 8);
        ctx.fillStyle = p.brightColor;
        ctx.fillRect(sx - 8, sy - 1, 16, 2);
      } else if (p.kind === 'claw' || p.kind === 'whip_arc') {
        ctx.fillStyle = '#09060c';
        ctx.fillRect(sx - 10, sy - 4, 20, 8);
        ctx.fillStyle = p.color;
        ctx.fillRect(sx - 9, sy - 3, 18, 6);
        ctx.fillStyle = p.brightColor;
        ctx.fillRect(sx - 7 + p.facing * 2, sy - 1, 14, 2);
      } else if (p.kind === 'orb') {
        const pulse = Math.sin(elapsed * 18 + p.phase) > 0;
        ctx.fillStyle = p.color;
        ctx.fillRect(sx - 5, sy - 5, 10, 10);
        ctx.fillStyle = '#090412';
        ctx.fillRect(sx - 3, sy - 2, 6, 4);
        ctx.fillStyle = pulse ? p.brightColor : '#f43f5e';
        ctx.fillRect(sx - 1, sy - 1, 2, 2);
      } else if (p.kind === 'sickle') {
        const spin = Math.floor(elapsed * 20) % 2 === 0;
        ctx.fillStyle = p.color;
        ctx.fillRect(sx - 6, sy - 5, 12, 3);
        ctx.fillRect(sx + (spin ? -6 : 3), sy - 2, 3, 7);
        ctx.fillStyle = p.brightColor;
        ctx.fillRect(sx - 4, sy - 4, 8, 2);
      } else {
        // Crescent Moon blade
        ctx.fillStyle = p.color;
        ctx.fillRect(sx - 4, sy - 8, 7, 16);
        ctx.fillStyle = p.brightColor;
        ctx.fillRect(sx + p.facing * 1 - 2, sy - 6, 4, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + p.facing * 2, sy - 4, 2, 8);
      }
    }
  }

  private updateLightningPillars(
    dt: number,
    player: Samurai,
    breath: BreathRhythmSystem,
    emitAction: UpdateContext['emitAction'],
    spawnParticles: (particles: Particle[]) => void
  ): void {
    for (let i = this.lightningPillars.length - 1; i >= 0; i--) {
      const lp = this.lightningPillars[i];
      if (!lp.struck) {
        lp.timer -= dt;
        if (lp.timer <= 0) {
          lp.struck = true;
          lp.timer = lp.strikeDuration;
          this.callbacks.triggerShake(3.0, 0.16);

          const burst: Particle[] = [];
          for (let k = 0; k < 14; k++) {
            burst.push({
              x: lp.x + (Math.random() - 0.5) * lp.width,
              y: GROUND_Y - Math.random() * (lp.isWaterGeyser ? 54 : 95),
              vx: (Math.random() - 0.5) * 75,
              vy: -40 - Math.random() * 80,
              life: 0.3,
              maxLife: 0.3,
              size: 2,
              color: k % 2 === 0 ? lp.brightColor : lp.color,
              gravityFactor: 0.25,
            });
          }
          spawnParticles(burst);
        }
      } else {
        lp.timer -= dt;
        if (!lp.hitPlayer && Math.abs(player.x - lp.x) < lp.width * 0.5 + 4) {
          const hitHeight = lp.isWaterGeyser ? player.y >= GROUND_Y - 64 : true;
          if (hitHeight && !player.isInvulnerable) {
            lp.hitPlayer = true;
            if (player.isParrying) {
              this.callouts.push({
                x: player.x,
                y: player.y - 32,
                text: 'UNBLOCKABLE!',
                color: '#ef4444',
                life: 0.75,
                maxLife: 0.75,
              });
            }
            const pushDir: Facing = player.x >= lp.x ? 1 : -1;
            this.hurtPlayer(player, breath, lp.damage, pushDir, emitAction, spawnParticles);
          }
        }
        if (lp.timer <= 0) {
          this.lightningPillars.splice(i, 1);
        }
      }
    }
  }

  private renderLightningPillars(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    elapsed: number
  ): void {
    for (const lp of this.lightningPillars) {
      const sx = Math.round(lp.x - cameraX);
      const half = Math.round(lp.width / 2);

      if (!lp.struck) {
        const pulse = Math.sin(elapsed * 30) > 0;
        ctx.fillStyle = pulse ? '#ef4444' : lp.color;
        ctx.fillRect(sx - half, GROUND_Y - 3, lp.width, 3);
        ctx.fillStyle = lp.brightColor;
        ctx.fillRect(sx - 2, GROUND_Y - 5, 4, 5);
        // Thin vertical telegraph line
        if (!lp.isWaterGeyser) {
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(sx - 1, 20, 2, GROUND_Y - 20);
          ctx.globalAlpha = 1;
        }
      } else {
        const topY = lp.isWaterGeyser ? GROUND_Y - 66 : 0;
        const h = GROUND_Y - topY;
        ctx.fillStyle = lp.color;
        ctx.fillRect(sx - half, topY, lp.width, h);
        ctx.fillStyle = lp.brightColor;
        ctx.fillRect(sx - Math.max(2, Math.floor(half * 0.55)), topY, Math.max(4, half), h);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 1, topY, 2, h);
      }
    }
  }

  private spawnCrystalDrops(e: Enemy): void {
    const count = e.kind === 'boss' ? 6 : e.kind === 'oni' ? 2 : 1;
    const totalValue =
      e.kind === 'boss'
        ? 18 + this.stage * 5
        : e.kind === 'oni'
          ? 4
          : this.wave >= 4
            ? 2
            : 1;
    const baseVal = Math.floor(totalValue / count);
    const remainder = totalValue % count;

    for (let i = 0; i < count; i++) {
      this.crystalDrops.push({
        x: e.x + (Math.random() - 0.5) * 10,
        y: e.y - e.height * 0.5,
        vx: (Math.random() - 0.5) * (e.kind === 'boss' ? 140 : 70),
        vy: -95 - Math.random() * 75,
        value: baseVal + (i < remainder ? 1 : 0),
        age: 0,
        sparklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  private updateCrystalDrops(
    dt: number,
    player: Samurai,
    emitAction: UpdateContext['emitAction'],
    spawnParticles: (particles: Particle[]) => void
  ): void {
    for (let i = this.crystalDrops.length - 1; i >= 0; i--) {
      const c = this.crystalDrops[i];
      c.age += dt;
      c.sparklePhase += dt * 8;

      const dx = player.x - c.x;
      const dy = player.y - 12 - c.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 76 || c.age > 3.0) {
        // Magnetic pull to Demon Slayer
        const pullSpeed = c.age > 3.0 ? 280 : 210;
        const safeDist = Math.max(1, dist);
        c.vx = (dx / safeDist) * pullSpeed;
        c.vy = (dy / safeDist) * pullSpeed;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
      } else {
        const prevY = c.y;
        c.vy = Math.min(PHYSICS.maxFallSpeed, c.vy + PHYSICS.gravity * 0.55 * dt);
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.vx *= Math.pow(0.08, dt);

        if (c.vy >= 0) {
          for (const plat of ARENA_PLATFORMS) {
            if (
              c.x >= plat.x &&
              c.x <= plat.x + plat.width &&
              prevY <= plat.y + 3 &&
              c.y >= plat.y
            ) {
              c.y = plat.y;
              c.vy = c.vy > 55 ? -c.vy * 0.35 : 0;
              break;
            }
          }
        }
        if (c.y >= GROUND_Y) {
          c.y = GROUND_Y;
          c.vy = c.vy > 55 ? -c.vy * 0.35 : 0;
        }
        c.x = Math.max(ARENA.minX + 12, Math.min(ARENA.maxX - 12, c.x));
      }

      if (Math.hypot(player.x - c.x, player.y - 12 - c.y) < 15) {
        const updated = addBloodCrystals(c.value);
        this.crystalsEarned += c.value;
        this.totalSavedCrystals = updated.bloodCrystals;
        this.callbacks.onMetaUpdated?.(updated);

        emitAction({
          type: 'crystal_pickup',
          x: c.x,
          y: c.y,
          facing: player.facing,
        });

        spawnParticles([
          {
            x: c.x,
            y: c.y,
            vx: -18,
            vy: -24,
            life: 0.25,
            maxLife: 0.25,
            size: 2,
            color: '#fecdd3',
            gravityFactor: -0.05,
          },
          {
            x: c.x,
            y: c.y,
            vx: 18,
            vy: -24,
            life: 0.25,
            maxLife: 0.25,
            size: 2,
            color: '#f43f5e',
            gravityFactor: -0.05,
          },
        ]);

        this.crystalDrops.splice(i, 1);
      }
    }
  }

  private collectAllPendingCrystals(emitAction?: UpdateContext['emitAction']): void {
    if (this.crystalDrops.length === 0) return;
    let sum = 0;
    for (const c of this.crystalDrops) {
      sum += c.value;
    }
    this.crystalDrops = [];
    if (sum > 0) {
      const updated = addBloodCrystals(sum);
      this.crystalsEarned += sum;
      this.totalSavedCrystals = updated.bloodCrystals;
      this.callbacks.onMetaUpdated?.(updated);
      emitAction?.({
        type: 'crystal_pickup',
        x: 0,
        y: GROUND_Y,
        facing: 1,
      });
    }
  }

  private renderCrystalDrops(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    elapsed: number
  ): void {
    for (const c of this.crystalDrops) {
      const bob = Math.round(Math.sin(elapsed * 6 + c.sparklePhase) * 1.5);
      const sx = Math.round(c.x - cameraX);
      const sy = Math.round(c.y - 5 + bob);

      // Glowing crimson crystal diamond
      ctx.fillStyle = '#4c0519';
      ctx.fillRect(sx - 3, sy - 3, 6, 6);
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(sx - 2, sy - 2, 4, 4);
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(sx - 1, sy - 4, 2, 8);
      ctx.fillRect(sx - 3, sy - 1, 6, 2);
      ctx.fillStyle = '#fff1f2';
      ctx.fillRect(sx - 1, sy - 2, 1, 2);
    }
  }

  private hurtPlayer(
    player: Samurai,
    breath: BreathRhythmSystem,
    damage: number,
    dir: Facing,
    emitAction: UpdateContext['emitAction'],
    spawnParticles: (particles: Particle[]) => void
  ): void {
    this.combo = 0;
    this.comboTimer = 0;
    if (this.hasActiveBoss) {
      this.bossDamageTakenThisFight += 1;
    }
    breath.damagePlayer(damage);
    player.applyHurtKnockback(dir);
    this.callbacks.triggerShake(2.8, 0.16);
    emitAction({
      type: 'player_hurt',
      x: player.x,
      y: player.y,
      facing: player.facing,
    });

    const blood: Particle[] = [];
    for (let i = 0; i < 10; i++) {
      blood.push({
        x: player.x,
        y: player.y - 14,
        vx: dir * (30 + Math.random() * 65),
        vy: -25 - Math.random() * 55,
        life: 0.28 + Math.random() * 0.14,
        maxLife: 0.42,
        size: i % 3 === 0 ? 2 : 1,
        color: i % 2 === 0 ? '#ef4444' : '#fca5a5',
        gravityFactor: 0.45,
      });
    }
    spawnParticles(blood);
  }

  private handleEnemyDeath(
    e: Enemy,
    breath: BreathRhythmSystem,
    modifiers: RunModifiers,
    emitAction: UpdateContext['emitAction'],
    spawnParticles: (particles: Particle[]) => void
  ): void {
    this.kills += 1;
    let updatedMeta = addDemonsSlain(1);
    if (e.kind === 'boss') {
      updatedMeta = recordBossDefeated(e.bossId);
      if (this.bossDamageTakenThisFight === 0) {
        this.awardSecretTitle('untouchable_hashira');
      }
      if (this.stageTimer <= 45) {
        this.awardSecretTitle('lightning_flash');
      }
      if (this.mode === 'story' && this.stage >= 10) {
        this.awardSecretTitle('dawn_bringer');
      }
    }
    if (updatedMeta.totalDemonsSlain >= 600) {
      this.awardSecretTitle('corps_pillar');
    }
    this.callbacks.onMetaUpdated?.(updatedMeta);
    this.spawnCrystalDrops(e);

    breath.addUltimateCharge(e.kind === 'boss' ? 28 : 6, modifiers.ultimateChargeMult);

    // Vampiric Blade upgrade: +5% Max HP per stack on every kill
    if (modifiers.vampiricStacks > 0) {
      const heal = Math.max(1, Math.round(breath.maxHp * 0.05 * modifiers.vampiricStacks));
      breath.healPlayer(heal);
    }

    const diff = breath.difficulty;
    const diffMult = diff.id === 'hashira' ? 1.4 : diff.id === 'mizunoto' ? 0.8 : 1.0;
    const basePts =
      e.kind === 'boss' ? 1200 + this.stage * 250 : e.kind === 'oni' ? 250 : 100;
    const comboBonus = 1 + Math.min(2.0, this.combo * 0.08);
    this.score += Math.round(basePts * comboBonus * diffMult);
    if (this.mode === 'endless' && this.score > this.highScore) {
      this.highScore = saveEndlessHighScore(this.score);
    }

    emitAction({
      type: 'enemy_kill',
      x: e.x,
      y: e.y,
      facing: e.facing,
    });
    const count = e.kind === 'boss' ? 38 : e.kind === 'oni' ? 18 : 12;
    const burst: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 25 + Math.random() * (e.kind === 'boss' ? 115 : 75);
      burst.push({
        x: e.x + (Math.random() - 0.5) * e.width * 0.6,
        y: e.y - e.height * 0.5 + (Math.random() - 0.5) * e.height * 0.5,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 20,
        life: 0.34 + Math.random() * 0.25,
        maxLife: 0.59,
        size: i % 3 === 0 ? 2 : 1,
        color:
          e.kind === 'boss'
            ? i % 2 === 0
              ? e.bossColor
              : e.bossBrightColor
            : e.kind === 'oni'
              ? i % 2 === 0
                ? '#dc2626'
                : '#fbbf24'
              : i % 2 === 0
                ? '#7c3aed'
                : '#f43f5e',
        gravityFactor: 0.15,
      });
    }
    spawnParticles(burst);

    if (e.kind === 'boss') {
      this.callbacks.triggerHitStop(0.085);
      this.callbacks.triggerShake(3.6, 0.25);
    }
  }

  private renderEnemyTelegraph(
    ctx: CanvasRenderingContext2D,
    e: Enemy,
    cameraX: number,
    elapsed: number
  ): void {
    if (e.aiState !== 'telegraph') return;
    const sx = Math.round(e.x - cameraX);
    const sy = Math.round(e.y);
    const pulse = Math.sin(elapsed * 32) > 0;

    if (e.kind === 'boss') {
      if (e.bossPattern === 'peril') {
        ctx.fillStyle = pulse ? '#ef4444' : '#fca5a5';
        const lineStart = e.facing === 1 ? sx : sx - 160;
        ctx.fillRect(lineStart, sy - 12, 160, 2);
        ctx.fillRect(sx - 34, sy - 2, 68, 2);
      } else if (e.bossPattern === 'dash') {
        ctx.fillStyle = pulse ? e.bossColor : e.bossBrightColor;
        const startX = e.facing === 1 ? sx : sx - 110;
        ctx.fillRect(startX, sy - 14, 110, 2);
      } else {
        ctx.fillStyle = pulse ? e.bossBrightColor : e.bossColor;
        ctx.fillRect(sx - 28, sy - 2, 56, 3);
      }
    } else if (e.kind === 'oni') {
      ctx.fillStyle = pulse ? 'rgba(249, 115, 22, 0.55)' : 'rgba(220, 38, 38, 0.35)';
      const hitX = e.facing === 1 ? sx : sx - 26;
      ctx.fillRect(hitX, sy - 2, 26, 2);
    }
  }

  private renderEnemy(
    ctx: CanvasRenderingContext2D,
    e: Enemy,
    cameraX: number,
    elapsed: number
  ): void {
    const sx = Math.round(e.x - cameraX);
    const sy = Math.round(e.y);

    ctx.fillStyle = 'rgba(3, 5, 10, 0.45)';
    const halfW = Math.round(e.width * 0.45);
    ctx.fillRect(sx - halfW, sy - 1, halfW * 2, 2);

    let pair: EnemySpritePair;
    let anchorX: number;
    let anchorY: number;

    if (e.kind === 'kage') {
      const s = this.sprites.kage;
      anchorX = s.anchorX;
      anchorY = s.anchorY;
      if (e.aiState === 'telegraph') pair = s.telegraph;
      else if (e.aiState === 'attack') pair = s.attack;
      else pair = s.move[Math.floor(e.animTimer * 7) % s.move.length];
    } else if (e.kind === 'oni') {
      const s = this.sprites.oni;
      anchorX = s.anchorX;
      anchorY = s.anchorY;
      if (e.aiState === 'telegraph') pair = s.telegraph;
      else if (e.aiState === 'attack') pair = s.attack;
      else pair = s.move[Math.floor(e.animTimer * 4.5) % s.move.length];
    } else {
      const s = this.sprites.getBoss(e.bossId);
      anchorX = s.anchorX;
      anchorY = s.anchorY;
      if (e.aiState === 'telegraph') {
        pair = e.bossPattern === 'slam' ? s.slamWindup : s.telegraph;
      } else if (e.aiState === 'attack') {
        pair = s.attack;
      } else {
        pair = s.move[Math.floor(e.animTimer * 5) % s.move.length];
      }
    }

    const compiled = e.hitFlashTimer > 0 ? pair.flash : pair.normal;
    const img = e.facing === 1 ? compiled.right : compiled.left;
    const drawX = e.facing === 1 ? sx - anchorX : sx - (compiled.width - anchorX);
    const drawY = sy - anchorY;

    // Slight kneel/tremble when posture broken
    const brokenShiftY = e.aiState === 'posture_broken' ? 2 : 0;
    ctx.drawImage(img, Math.round(drawX), Math.round(drawY + brokenShiftY));

    // Telegraph warning: Flashing red danger kanji "危" for unblockable Boss peril attacks, else "!"
    if (e.aiState === 'telegraph') {
      const flash = Math.sin(elapsed * 30) > 0;
      if (e.kind === 'boss' && e.bossPattern === 'peril') {
        const gy = sy - e.height - 20;
        ctx.fillStyle = flash ? '#991b1b' : '#09040a';
        ctx.fillRect(sx - 9, gy, 18, 16);
        ctx.fillStyle = flash ? '#fecaca' : '#ef4444';
        ctx.fillRect(sx - 9, gy, 18, 1);
        ctx.fillRect(sx - 9, gy + 15, 18, 1);
        ctx.fillRect(sx - 9, gy, 1, 16);
        ctx.fillRect(sx + 8, gy, 1, 16);

        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        this.drawShadowText(ctx, '危', sx, gy + 2, flash ? '#ffffff' : '#ef4444');
        ctx.textAlign = 'left';
      } else {
        const gy = sy - e.height - 10;
        ctx.fillStyle = flash ? '#ffe4e6' : e.kind === 'boss' ? e.bossColor : '#f43f5e';
        ctx.fillRect(sx - 1, gy, 2, 4);
        ctx.fillRect(sx - 1, gy + 5, 2, 1);
      }
    }

    // Sekiro Red Deathblow Reticle on Posture-Broken enemy!
    if (e.aiState === 'posture_broken') {
      const cy = sy - Math.round(e.height * 0.55);
      const pulse = Math.sin(elapsed * 22) > 0;
      ctx.fillStyle = pulse ? '#ffffff' : '#ef4444';
      ctx.fillRect(sx - 4, cy - 1, 8, 2);
      ctx.fillRect(sx - 1, cy - 4, 2, 8);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(sx - 2, cy - 2, 4, 4);
    } else if (e.aiState === 'stunned') {
      const gy = sy - e.height - 9;
      const ox = Math.round(Math.sin(elapsed * 14) * 4);
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(sx + ox, gy, 2, 2);
      ctx.fillRect(sx - ox, gy + 1, 2, 2);
    }

    // Compact overhead HP + Yellow Posture Bar for Kage & Oni
    if (e.kind !== 'boss' && (e.hp < e.maxHp || e.posture > 0)) {
      const bw = e.kind === 'oni' ? 24 : 18;
      const bx = sx - Math.round(bw / 2);
      const by = sy - e.height - 7;

      // Red HP bar
      ctx.fillStyle = '#070a12';
      ctx.fillRect(bx, by, bw, 3);
      const hpFill = Math.max(1, Math.round((bw - 2) * (e.hp / e.maxHp)));
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bx + 1, by + 1, hpFill, 1);

      // Yellow Posture bar directly below HP bar
      ctx.fillStyle = '#070a12';
      ctx.fillRect(bx, by + 3, bw, 3);
      if (e.posture > 0) {
        const pFill = Math.max(1, Math.round((bw - 2) * (e.posture / e.maxPosture)));
        ctx.fillStyle = e.aiState === 'posture_broken' ? '#fef08a' : '#eab308';
        ctx.fillRect(bx + 1, by + 4, pFill, 1);
      }
    }
  }

  private spawnHitParticles(
    spawnParticles: (particles: Particle[]) => void,
    x: number,
    y: number,
    dir: Facing,
    styleColor: string,
    styleBright: string,
    charged: boolean
  ): void {
    const count = charged ? 16 : 9;
    const sparks: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const isFlash = i < 2;
      sparks.push({
        x,
        y,
        vx: dir * (40 + Math.random() * (charged ? 115 : 75)) + (Math.random() - 0.5) * 35,
        vy: (Math.random() - 0.5) * (charged ? 110 : 70) - 18,
        life: 0.18 + Math.random() * 0.16,
        maxLife: 0.34,
        size: isFlash || (charged && i % 3 === 0) ? 2 : 1,
        color: isFlash
          ? '#ffffff'
          : i % 3 === 0
            ? styleBright
            : i % 3 === 1
              ? styleColor
              : '#fb7185',
        gravityFactor: 0.3,
      });
    }
    spawnParticles(sparks);
  }

  private spawnParryParticles(
    spawnParticles: (particles: Particle[]) => void,
    x: number,
    y: number
  ): void {
    const burst: Particle[] = [];
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2;
      const spd = 55 + Math.random() * 70;
      burst.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.24 + Math.random() * 0.12,
        maxLife: 0.36,
        size: i % 2 === 0 ? 2 : 1,
        color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#fef08a' : '#f59e0b',
        gravityFactor: 0,
      });
    }
    spawnParticles(burst);
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
}
