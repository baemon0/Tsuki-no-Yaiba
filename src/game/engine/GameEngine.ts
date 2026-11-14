import { CHARACTER_MAP, type CharacterId } from '../characters';
import { CAMERA, GAME_HEIGHT, GAME_WIDTH, GROUND_Y, PHYSICS } from '../constants';
import type { DifficultyId } from '../difficulty';
import { Samurai } from '../entities/Samurai';
import { InputManager } from '../input';
import {
  loadMetaProgression,
  type MetaProgressionState,
  type SecretTitleDef,
} from '../metaProgression';
import { STORY_STAGES, type GameMode } from '../storyStages';
import { AudioSystem } from '../systems/AudioSystem';
import { BreathRhythmSystem } from '../systems/BreathRhythmSystem';
import { CombatSystem, type CombatRunSummary } from '../systems/CombatSystem';
import type {
  CameraState,
  GamePhase,
  GameSystem,
  Particle,
  PlayerActionEvent,
  UpdateContext,
} from '../types';
import {
  computeRunModifiers,
  rollUpgradeChoices,
  type RunModifiers,
  type UpgradeCardDef,
  type UpgradeId,
} from '../upgrades';
import { BambooBackground } from '../world/BambooBackground';

export interface GameOverStats extends CombatRunSummary {
  characterId: CharacterId;
  difficultyId: DifficultyId;
}

export class GameEngine {
  public readonly input: InputManager;
  public readonly player: Samurai;
  public readonly background: BambooBackground;
  public readonly audioSystem: AudioSystem;
  public readonly breathSystem: BreathRhythmSystem;
  public readonly combatSystem: CombatSystem;
  public readonly camera: CameraState = { x: -GAME_WIDTH / 2, y: 0 };

  public phase: GamePhase = 'TITLE_MENU';
  public selectedCharacterId: CharacterId = 'tanjiro';
  public difficultyId: DifficultyId = 'kinoe';
  public mode: GameMode = 'endless';
  public pickedUpgrades: UpgradeId[] = [];
  public metaState: MetaProgressionState = loadMetaProgression();
  public modifiers: RunModifiers = computeRunModifiers([], this.metaState);

  private ctx: CanvasRenderingContext2D;
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private elapsed = 0;
  private particles: Particle[] = [];
  private systems: GameSystem[] = [];
  private paused = false;
  private shakeTimer = 0;
  private shakeIntensity = 0;
  private hitStopTimer = 0;
  private slowMoTimer = 0;
  private slowMoScale = 1;
  private lastUltReady = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private onGameOverCallback?: (stats: GameOverStats) => void,
    private onVictoryCallback?: (stats: GameOverStats) => void,
    private onUpgradeOfferCallback?: (cards: UpgradeCardDef[]) => void,
    private onUltimateReadyChange?: (ready: boolean) => void,
    private onMetaUpdatedCallback?: (meta: MetaProgressionState) => void,
    private onTitleUnlockedCallback?: (title: SecretTitleDef) => void
  ) {
    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;

    const context = this.canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Could not initialize 2D canvas context');
    }
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;

    this.input = new InputManager(window);
    this.player = new Samurai(0, GROUND_Y, this.selectedCharacterId);
    this.background = new BambooBackground();
    this.audioSystem = new AudioSystem();
    this.breathSystem = new BreathRhythmSystem(() => ({
      x: this.player.x,
      y: this.player.y,
      facing: this.player.facing,
    }));
    this.combatSystem = new CombatSystem({
      getPlayer: () => this.player,
      getBreathSystem: () => this.breathSystem,
      triggerHitStop: (duration) => this.triggerHitStop(duration),
      triggerShake: (intensity, duration) => this.triggerShake(intensity, duration),
      triggerSlowMo: (scale, duration) => this.triggerSlowMo(scale, duration),
      onStageChange: (theme) => this.background.setTheme(theme),
      onOfferUpgrades: () => {
        this.phase = 'UPGRADE_SELECT';
        const cards = rollUpgradeChoices(this.pickedUpgrades, 3);
        this.onUpgradeOfferCallback?.(cards);
      },
      onGameOver: (stats) => {
        this.phase = 'GAME_OVER';
        this.onGameOverCallback?.({
          ...stats,
          characterId: this.selectedCharacterId,
          difficultyId: this.difficultyId,
        });
      },
      onVictory: (stats) => {
        this.phase = 'VICTORY';
        this.onVictoryCallback?.({
          ...stats,
          characterId: this.selectedCharacterId,
          difficultyId: this.difficultyId,
        });
      },
      onMetaUpdated: (meta) => {
        this.metaState = meta;
        this.onMetaUpdatedCallback?.(meta);
      },
      onTitleUnlocked: (title) => {
        this.onTitleUnlockedCallback?.(title);
      },
    });

    this.registerSystem(this.audioSystem);
    this.registerSystem(this.breathSystem);
    this.registerSystem(this.combatSystem);
  }

  public registerSystem(system: GameSystem): void {
    if (this.systems.some((s) => s.id === system.id)) return;
    this.systems.push(system);
  }

  public unregisterSystem(id: string): void {
    const idx = this.systems.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.systems[idx].dispose?.();
      this.systems.splice(idx, 1);
    }
  }

  public start(): void {
    if (this.rafId !== null) return;
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  public unlockAudio(): void {
    this.audioSystem.unlock();
  }

  public setPhase(phase: GamePhase): void {
    this.phase = phase;
    if (phase === 'TITLE_MENU') {
      this.background.setTheme(
        this.mode === 'story' ? STORY_STAGES[0].theme : 'bamboo_night'
      );
    }
    this.audioSystem.setAmbienceContext(
      this.background.currentTheme,
      this.combatSystem.hasActiveBoss,
      this.phase
    );
  }

  public setSelectedCharacter(characterId: CharacterId): void {
    this.selectedCharacterId = characterId;
    if (this.phase === 'TITLE_MENU' || this.phase === 'CHARACTER_SELECT') {
      this.player.setCharacter(characterId);
      this.breathSystem.setCharacter(characterId);
    }
  }

  public setDifficulty(difficultyId: DifficultyId): void {
    this.difficultyId = difficultyId;
    this.breathSystem.setDifficulty(difficultyId);
  }

  public setMode(mode: GameMode): void {
    this.mode = mode;
    if (this.phase === 'TITLE_MENU' || this.phase === 'CHARACTER_SELECT') {
      this.background.setTheme(mode === 'story' ? STORY_STAGES[0].theme : 'bamboo_night');
    }
    this.audioSystem.setAmbienceContext(
      this.background.currentTheme,
      this.combatSystem.hasActiveBoss,
      this.phase
    );
  }

  public refreshMeta(): void {
    this.metaState = loadMetaProgression();
    this.modifiers = computeRunModifiers(this.pickedUpgrades, this.metaState);
    this.breathSystem.syncModifiers(this.modifiers);
    this.combatSystem.refreshMetaDisplay(this.metaState);
    this.onMetaUpdatedCallback?.(this.metaState);
  }

  public applyUpgrade(upgradeId: UpgradeId): void {
    this.pickedUpgrades.push(upgradeId);
    this.modifiers = computeRunModifiers(this.pickedUpgrades, this.metaState);
    this.breathSystem.syncModifiers(this.modifiers);
    this.combatSystem.finishPostBossTransition(this.spawnParticles);
    this.phase = 'PLAYING';
  }

  public startHunt(
    characterId?: CharacterId,
    difficultyId?: DifficultyId,
    mode?: GameMode
  ): void {
    if (characterId) {
      this.selectedCharacterId = characterId;
    }
    if (difficultyId) {
      this.difficultyId = difficultyId;
    }
    if (mode) {
      this.mode = mode;
    }
    this.audioSystem.unlock();
    this.reset();
    this.phase = 'PLAYING';
  }

  public setMuted(muted: boolean): void {
    this.audioSystem.setMuted(muted);
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
  }

  public triggerShake(intensity: number, duration: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  public triggerHitStop(duration: number): void {
    this.hitStopTimer = Math.max(this.hitStopTimer, duration);
  }

  public triggerSlowMo(scale: number, duration: number): void {
    this.slowMoScale = Math.min(this.slowMoScale, scale);
    this.slowMoTimer = Math.max(this.slowMoTimer, duration);
  }

  public reset(): void {
    this.pickedUpgrades = [];
    this.metaState = loadMetaProgression();
    this.modifiers = computeRunModifiers([], this.metaState);
    this.player.reset(0, GROUND_Y, this.selectedCharacterId);
    this.breathSystem.reset(this.selectedCharacterId, this.difficultyId);
    this.breathSystem.syncModifiers(this.modifiers);
    this.combatSystem.reset(this.mode);
    this.camera.x = -GAME_WIDTH / 2;
    this.camera.y = 0;
    this.particles = [];
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.hitStopTimer = 0;
    this.slowMoTimer = 0;
    this.slowMoScale = 1;
    this.lastUltReady = false;
    this.onUltimateReadyChange?.(false);
    if (
      this.phase === 'GAME_OVER' ||
      this.phase === 'VICTORY' ||
      this.phase === 'UPGRADE_SELECT'
    ) {
      this.phase = 'PLAYING';
    }
  }

  public dispose(): void {
    this.stop();
    this.input.dispose();
    for (const sys of this.systems) {
      sys.dispose?.();
    }
    this.systems = [];
  }

  private loop = (timestamp: number): void => {
    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    const clampedDt = Math.min(0.05, Math.max(0, rawDt));

    if (!this.paused) {
      this.update(clampedDt);
    }
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(rawDt: number): void {
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - rawDt);
      if (this.shakeTimer === 0) this.shakeIntensity = 0;
    }

    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - rawDt);
      return;
    }

    let dt = rawDt;
    if (this.slowMoTimer > 0) {
      this.slowMoTimer = Math.max(0, this.slowMoTimer - rawDt);
      dt = rawDt * this.slowMoScale;
      if (this.slowMoTimer <= 0) {
        this.slowMoScale = 1;
      }
    }

    this.elapsed += dt;
    this.audioSystem.setAmbienceContext(
      this.background.currentTheme,
      this.combatSystem.hasActiveBoss,
      this.phase
    );

    // On Title Screen & Character Select, animate ambient idle Samurai & backdrop
    if (this.phase === 'TITLE_MENU' || this.phase === 'CHARACTER_SELECT') {
      this.input.sample();
      this.player.update(
        dt,
        {
          left: false,
          right: false,
          downHeld: false,
          jumpHeld: false,
          jumpPressed: false,
          slashPressed: false,
          dashPressed: false,
          breathPressed: false,
          ultimatePressed: false,
        },
        {
          characterId: this.selectedCharacterId,
          isCharged: false,
          isExhausted: false,
          isMarkActive: false,
          modifiers: this.modifiers,
        },
        () => {},
        this.spawnParticles
      );
      this.camera.x = -GAME_WIDTH / 2;
      return;
    }

    if (this.phase === 'UPGRADE_SELECT') {
      this.input.sample();
      this.updateParticles(dt * 0.4);
      return;
    }

    const input = this.input.sample();

    if (
      this.phase === 'GAME_OVER' ||
      this.phase === 'VICTORY' ||
      this.combatSystem.isGameOver ||
      this.combatSystem.isVictory
    ) {
      if (this.phase === 'VICTORY') {
        this.player.update(
          dt,
          {
            left: false,
            right: false,
            downHeld: false,
            jumpHeld: false,
            jumpPressed: false,
            slashPressed: false,
            dashPressed: false,
            breathPressed: false,
            ultimatePressed: false,
          },
          {
            characterId: this.breathSystem.characterId,
            isCharged: false,
            isExhausted: false,
            isMarkActive: false,
            modifiers: this.modifiers,
          },
          () => {},
          this.spawnParticles
        );
      }
      this.updateParticles(dt);
      return;
    }

    const ctx: UpdateContext = {
      dt,
      elapsed: this.elapsed,
      input,
      camera: this.camera,
      modifiers: this.modifiers,
      emitAction: this.emitAction,
      spawnParticles: this.spawnParticles,
    };

    this.breathSystem.update(ctx);

    const ultReady = this.breathSystem.isUltimateReady;
    if (ultReady !== this.lastUltReady) {
      this.lastUltReady = ultReady;
      this.onUltimateReadyChange?.(ultReady);
    }

    this.player.update(
      dt,
      input,
      {
        characterId: this.breathSystem.characterId,
        isCharged: this.breathSystem.isCharged,
        isExhausted: this.breathSystem.isExhausted,
        isMarkActive: this.breathSystem.isMarkActive,
        modifiers: this.modifiers,
      },
      this.emitAction,
      this.spawnParticles
    );

    for (const sys of this.systems) {
      if (sys.id === this.breathSystem.id) continue;
      sys.update?.(ctx);
    }

    // Check Demon Slayer Mark Awakening (< 30% HP during a Boss fight, once per run)
    if (
      this.combatSystem.hasActiveBoss &&
      !this.combatSystem.isGameOver &&
      !this.combatSystem.isVictory &&
      this.breathSystem.tryTriggerSlayerMark(
        this.combatSystem.hasActiveBoss,
        this.emitAction,
        this.spawnParticles
      )
    ) {
      this.player.triggerMarkAwakeningPose(0.65);
      this.triggerSlowMo(0.2, 0.36);
      this.triggerShake(3.8, 0.28);
      this.combatSystem.onSlayerMarkAwakened(
        this.player.x,
        this.player.y,
        this.breathSystem.characterId
      );
    }

    // Subtle bounded parallax camera centered on the platforming arena
    const targetCamX = this.player.x * 0.14 - GAME_WIDTH / 2;
    const factorX = 1 - Math.exp(-CAMERA.followLerpX * dt);
    this.camera.x += (targetCamX - this.camera.x) * factorX;

    this.updateParticles(dt);
  }

  private render(): void {
    this.ctx.imageSmoothingEnabled = false;

    const shakeOffsetX =
      this.shakeTimer > 0
        ? Math.round((Math.random() - 0.5) * 2 * this.shakeIntensity)
        : 0;
    const shakeOffsetY =
      this.shakeTimer > 0
        ? Math.round((Math.random() - 0.5) * 2 * this.shakeIntensity)
        : 0;

    const camSnap: CameraState = {
      x: Math.round(this.camera.x) + shakeOffsetX,
      y: Math.round(this.camera.y) + shakeOffsetY,
    };

    this.background.renderBackground(this.ctx, camSnap, this.elapsed);

    this.player.render(
      this.ctx,
      camSnap.x,
      {
        characterId: this.breathSystem.characterId,
        isCharged: this.breathSystem.isCharged,
        isExhausted: this.breathSystem.isExhausted,
        isMarkActive: this.breathSystem.isMarkActive,
        modifiers: this.modifiers,
      },
      this.elapsed
    );

    this.renderParticles(camSnap.x);

    if (
      this.phase !== 'TITLE_MENU' &&
      this.phase !== 'CHARACTER_SELECT' &&
      this.phase !== 'VICTORY'
    ) {
      for (const sys of this.systems) {
        sys.render?.(this.ctx, camSnap, this.elapsed);
      }
    }

    this.background.renderForeground(this.ctx, camSnap, this.elapsed);

    if (this.phase === 'TITLE_MENU') {
      this.background.renderTitleAtmosphere(this.ctx, camSnap, this.elapsed);
    }

    if (this.phase === 'PLAYING' || this.phase === 'UPGRADE_SELECT') {
      for (const sys of this.systems) {
        sys.renderHUD?.(this.ctx, this.elapsed);
      }
    }
  }

  private emitAction = (event: PlayerActionEvent): void => {
    if (event.type === 'breath_charge') {
      this.triggerShake(1.5, 0.12);
    } else if (event.type === 'slash') {
      const char = CHARACTER_MAP[event.characterId ?? this.selectedCharacterId];
      const extra = char.gameplay.extraShake ?? 0;
      if (extra > 0 || this.breathSystem.isCharged) {
        this.triggerShake(extra > 0 ? 1.4 + extra * 0.35 : 1.2, 0.1);
      }
    }

    for (const sys of this.systems) {
      sys.onPlayerAction?.(event);
    }
  };

  private spawnParticles = (newParticles: Particle[]): void => {
    for (const p of newParticles) {
      this.particles.push(p);
    }
  };

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      const gFactor = p.gravityFactor ?? 0;
      p.vy += PHYSICS.gravity * gFactor * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  private renderParticles(cameraX: number): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(
        Math.round(p.x - cameraX),
        Math.round(p.y),
        p.size,
        p.size
      );
    }
    this.ctx.globalAlpha = 1;
  }
}
