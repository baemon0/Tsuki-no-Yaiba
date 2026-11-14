import { CHARACTER_MAP, type CharacterGameplay, type CharacterId } from '../characters';
import type { StageTheme } from '../storyStages';
import type { GamePhase, GameSystem, PlayerActionEvent } from '../types';

/**
 * Procedural retro sound effects & natural environmental ambience synthesizer
 * using the Web Audio API. Zero external files, zero music or instruments.
 */
export class AudioSystem implements GameSystem {
  public readonly id = 'audio';

  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private loopNoiseBuffer: AudioBuffer | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;

  // Ambient natural soundscape nodes (filtered noise only — no instruments)
  private ambientReady = false;
  private ambientGain: GainNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private lfoDepth: GainNode | null = null;
  private rumbleSource: AudioBufferSourceNode | null = null;
  private rumbleFilter: BiquadFilterNode | null = null;
  private rumbleGain: GainNode | null = null;
  private ambienceTimer: number | null = null;

  private activeTheme: StageTheme = 'bamboo_night';
  private bossActive = false;
  private activePhase: GamePhase = 'TITLE_MENU';

  public get isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.35, this.ctx.currentTime);
    }
    this.applyAmbienceProfile();
  }

  public setAmbienceContext(
    theme: StageTheme,
    bossActive: boolean,
    phase: GamePhase
  ): void {
    if (
      this.activeTheme === theme &&
      this.bossActive === bossActive &&
      this.activePhase === phase
    ) {
      return;
    }
    this.activeTheme = theme;
    this.bossActive = bossActive;
    this.activePhase = phase;
    this.applyAmbienceProfile();
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.35;
      this.masterGain.connect(this.ctx.destination);
      this.noiseBuffer = this.buildWhiteNoiseBuffer(this.ctx, 0.5);
      this.loopNoiseBuffer = this.buildPinkNoiseBuffer(this.ctx, 4.0);
      this.initAmbienceGraph();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().then(() => this.applyAmbienceProfile()).catch(() => {});
    } else {
      this.applyAmbienceProfile();
    }
  }

  public onPlayerAction(event: PlayerActionEvent): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;

    const charId: CharacterId = event.characterId ?? 'tanjiro';
    const flavor = CHARACTER_MAP[charId].gameplay.audioFlavor;

    switch (event.type) {
      case 'slash':
        this.playKatanaSlash(flavor, Boolean(event.charged));
        break;
      case 'dash':
        this.playDash(charId, Boolean(event.charged));
        break;
      case 'breath_charge':
        this.playPerfectBreathChime(flavor);
        break;
      case 'breath_fail':
        this.playExhaustionGasp();
        break;
      case 'enemy_hit':
        this.playEnemyHit(Boolean(event.charged), event.combo ?? 1);
        break;
      case 'enemy_kill':
        this.playEnemyKill();
        break;
      case 'parry_success':
        this.playParryClang();
        break;
      case 'deathblow':
        this.playDeathblowFinisher();
        break;
      case 'ultimate':
        this.playUltimateRoar(flavor);
        break;
      case 'player_hurt':
        this.playPlayerHurt();
        break;
      case 'jump':
        this.playJump();
        break;
      case 'wall_jump':
        this.playWallJump();
        break;
      case 'boss_spawn':
        this.playBossHorn();
        break;
      case 'crystal_pickup':
        this.playCrystalPickup();
        break;
      case 'peril_warning':
        this.playPerilWarning();
        break;
      case 'slayer_mark':
        this.playSlayerMarkAwakening(flavor);
        break;
      default:
        break;
    }
  }

  public dispose(): void {
    if (this.ambienceTimer !== null) {
      window.clearInterval(this.ambienceTimer);
      this.ambienceTimer = null;
    }
    try {
      this.windSource?.stop();
      this.rumbleSource?.stop();
      this.lfoOsc?.stop();
    } catch {
      // ignore already stopped nodes
    }
    this.windSource = null;
    this.rumbleSource = null;
    this.lfoOsc = null;
    this.ambientReady = false;

    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
      this.masterGain = null;
      this.noiseBuffer = null;
      this.loopNoiseBuffer = null;
    }
  }

  private playKatanaSlash(
    flavor: CharacterGameplay['audioFlavor'],
    charged: boolean
  ): void {
    const ctx = this.ctx!;
    const out = this.masterGain!;
    const now = ctx.currentTime;

    const isHeavy = flavor === 'flame' || flavor === 'heavy';

    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isHeavy ? 950 : flavor === 'sharp' ? 2700 : 2000, now);
      filter.frequency.exponentialRampToValueAtTime(
        isHeavy ? 300 : 640,
        now + (charged ? 0.19 : 0.13)
      );
      filter.Q.value = 1.6;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(charged ? 0.42 : 0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (charged ? 0.2 : 0.14));

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      noise.start(now);
      noise.stop(now + 0.22);
    }

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(
      charged ? 980 : flavor === 'sharp' ? 1100 : isHeavy ? 520 : 780,
      now
    );
    osc.frequency.exponentialRampToValueAtTime(isHeavy ? 120 : 190, now + 0.11);

    oscGain.gain.setValueAtTime(0.16, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(oscGain);
    oscGain.connect(out);
    osc.start(now);
    osc.stop(now + 0.13);

    if (charged || isHeavy) {
      this.playElementalAccent(flavor, charged);
    }
  }

  private playElementalAccent(
    flavor: CharacterGameplay['audioFlavor'],
    charged: boolean
  ): void {
    const ctx = this.ctx!;
    const out = this.masterGain!;
    const now = ctx.currentTime;

    if (flavor === 'water' || flavor === 'mystic') {
      const freqs = charged ? [523.25, 659.25, 987.77] : [440, 587.33];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        const t = now + idx * 0.028;
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * 1.25, t + 0.1);
        g.gain.setValueAtTime(0.11, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(g);
        g.connect(out);
        osc.start(t);
        osc.stop(t + 0.13);
      });
    } else if (flavor === 'thunder' || flavor === 'sharp') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1480, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
      osc.frequency.setValueAtTime(920, now + 0.085);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);
      g.gain.setValueAtTime(0.13, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
      osc.connect(g);
      g.connect(out);
      osc.start(now);
      osc.stop(now + 0.18);
    } else {
      // Flame / Wind / Heavy roaring burst
      if (this.noiseBuffer) {
        const n = ctx.createBufferSource();
        n.buffer = this.noiseBuffer;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(charged ? 950 : 650, now);
        lp.frequency.exponentialRampToValueAtTime(140, now + 0.24);
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(charged ? 0.45 : 0.3, now);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        n.connect(lp);
        lp.connect(ng);
        ng.connect(out);
        n.start(now);
        n.stop(now + 0.26);
      }

      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(flavor === 'heavy' ? 140 : 190, now);
      osc.frequency.exponentialRampToValueAtTime(58, now + 0.2);
      g.gain.setValueAtTime(0.14, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
      osc.connect(g);
      g.connect(out);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  }

  private playDash(charId: CharacterId, charged: boolean): void {
    const ctx = this.ctx!;
    const out = this.masterGain!;
    const now = ctx.currentTime;
    const dashStyle = CHARACTER_MAP[charId].gameplay.dashStyle;

    if (dashStyle === 'thunder_blink') {
      this.playElementalAccent('thunder', true);
      if (this.noiseBuffer) {
        const n = ctx.createBufferSource();
        n.buffer = this.noiseBuffer;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(1800, now);
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(charged ? 0.35 : 0.24, now);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        n.connect(hp);
        hp.connect(ng);
        ng.connect(out);
        n.start(now);
        n.stop(now + 0.15);
      }
      return;
    }

    if (this.noiseBuffer) {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(dashStyle === 'mist_evade' ? 1100 : 750, now);
      bp.frequency.exponentialRampToValueAtTime(1600, now + 0.1);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.2, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      n.connect(bp);
      bp.connect(ng);
      ng.connect(out);
      n.start(now);
      n.stop(now + 0.12);
    }
  }

  private playPerfectBreathChime(flavor: CharacterGameplay['audioFlavor']): void {
    const ctx = this.ctx!;
    const out = this.masterGain!;
    const now = ctx.currentTime;

    const root =
      flavor === 'thunder'
        ? 659.25
        : flavor === 'flame' || flavor === 'heavy'
          ? 523.25
          : 587.33;
    const notes = [root, root * 1.5, root * 2];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i === 2 ? 'triangle' : 'sine';
      const t = now + i * 0.045;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  private playExhaustionGasp(): void {
    const ctx = this.ctx!;
    const out = this.masterGain!;
    const now = ctx.currentTime;

    if (this.noiseBuffer) {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(900, now);
      bp.frequency.exponentialRampToValueAtTime(240, now + 0.32);
      bp.Q.value = 1.4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.32, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      n.connect(bp);
      bp.connect(g);
      g.connect(out);
      n.start(now);
      n.stop(now + 0.35);
    }

    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(82, now + 0.22);
    og.gain.setValueAtTime(0.14, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
    osc.connect(og);
    og.connect(out);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  private playEnemyHit(charged: boolean, combo: number): void {
    const ctx = this.ctx!;
    const out = this.masterGain!;
    const now = ctx.currentTime;

    const comboBoost = Math.min(1.4, 1 + (combo - 1) * 0.04);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime((charged ? 260 : 210) * comboBoost, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + (charged ? 0.14 : 0.09));
    g.gain.setValueAtTime(charged ? 0.28 : 0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + (charged ? 0.15 : 0.1));
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.16);

    if (this.noiseBuffer) {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(charged ? 1800 : 1400, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(charged ? 0.34 : 0.22, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      n.connect(bp);
      bp.connect(ng);
      ng.connect(out);
      n.start(now);
      n.stop(now + 0.09);
    }
  }

  private playEnemyKill(): void {
    const ctx = this.ctx!;
    const out = this.masterGain!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.16);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  private playParryClang(): void {
    const ctx = this.ctx!;
    const out = this.masterGain!;
    const now = ctx.currentTime;

    // Crisp Sekiro steel-on-steel deflect ring
    [1320, 1980, 2640].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.96, now + 0.36);
      g.gain.setValueAtTime(idx === 2 ? 0.14 : 0.24, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.connect(g);
      g.connect(out);
      osc.start(now);
      osc.stop(now + 0.38);
    });

    if (this.noiseBuffer) {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(2400, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.28, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      n.connect(hp);
      hp.connect(ng);
      ng.connect(out);
      n.start(now);
      n.stop(now + 0.07);
    }
  }

  private playDeathblowFinisher(): void {
    const ctx = this.ctx!;
    const out = this.masterGain!;
    const now = ctx.currentTime;

    // Sharp steel flash + heavy cinematic sub impact
    const sub = ctx.createOscillator();
    const sg = ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(170, now);
    sub.frequency.exponentialRampToValueAtTime(38, now + 0.38);
    sg.gain.setValueAtTime(0.36, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    sub.connect(sg);
    sg.connect(out);
    sub.start(now);
    sub.stop(now + 0.42);

    [1560, 2340].forEach((freq) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.24);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(g);
      g.connect(out);
      osc.start(now);
      osc.stop(now + 0.26);
    });
  }

  private playUltimateRoar(flavor: CharacterGameplay['audioFlavor']): void {
    const ctx = this.ctx!;
    const out = this.masterGain!;
    const now = ctx.currentTime;

    this.playElementalAccent(flavor, true);
    const notes = [329.63, 440, 659.25, 880];
    notes.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sawtooth';
      const t = now + idx * 0.05;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.12, t + 0.28);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }

  private playPlayerHurt(): void {
    const ctx = this.ctx!;
    const out = this.masterGain!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.18);
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private playJump(): void {
    const ctx = this.ctx!;
    const out = this.masterGain!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.08);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private playWallJump(): void {
    const ctx = this.ctx!;
    const out = this.masterGain!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.07);
    g.gain.setValueAtTime(0.1, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  private playBossHorn(): void {
    const ctx = this.ctx!;
    const out = this.masterGain!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(98, now + 0.45);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.22, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  private playCrystalPickup(): void {
    const ctx = this.ctx!;
    const out = this.masterGain!;
    const now = ctx.currentTime;

    [1046.5, 1567.98].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      const t = now + i * 0.042;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  private playPerilWarning(): void {
    const ctx = this.ctx!;
    const out = this.masterGain!;
    const now = ctx.currentTime;

    // Iconic sharp two-tone Sekiro peril chime (危)
    [880, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + i * 0.075;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.94, t + 0.14);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, t);
      filter.Q.value = 1.8;

      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.24, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.17);

      osc.connect(filter);
      filter.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  private playSlayerMarkAwakening(flavor: CharacterGameplay['audioFlavor']): void {
    const ctx = this.ctx!;
    const out = this.masterGain!;
    const now = ctx.currentTime;

    this.playElementalAccent(flavor, true);

    // Heartbeat thud + blazing rising surge
    const thud = ctx.createOscillator();
    const tg = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(115, now);
    thud.frequency.exponentialRampToValueAtTime(36, now + 0.34);
    tg.gain.setValueAtTime(0.42, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    thud.connect(tg);
    tg.connect(out);
    thud.start(now);
    thud.stop(now + 0.38);

    [440, 659.25, 880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      const t = now + 0.04 + i * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.06, t + 0.32);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  private initAmbienceGraph(): void {
    if (this.ambientReady || !this.ctx || !this.masterGain || !this.loopNoiseBuffer) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.0, now);
    this.ambientGain.connect(this.masterGain);

    // Primary wind / rain / hearth filtered noise chain
    this.windSource = ctx.createBufferSource();
    this.windSource.buffer = this.loopNoiseBuffer;
    this.windSource.loop = true;

    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(420, now);
    this.windFilter.Q.setValueAtTime(1.1, now);

    this.windGain = ctx.createGain();
    this.windGain.gain.setValueAtTime(0.22, now);

    // Sub-audio LFO modulating filter frequency (never routed to speakers)
    this.lfoOsc = ctx.createOscillator();
    this.lfoOsc.type = 'sine';
    this.lfoOsc.frequency.setValueAtTime(0.18, now);
    this.lfoDepth = ctx.createGain();
    this.lfoDepth.gain.setValueAtTime(140, now);
    this.lfoOsc.connect(this.lfoDepth);
    this.lfoDepth.connect(this.windFilter.frequency);

    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.ambientGain);

    // Secondary low ominous wind / rumble layer for Boss fights & stormy stages
    this.rumbleSource = ctx.createBufferSource();
    this.rumbleSource.buffer = this.loopNoiseBuffer;
    this.rumbleSource.loop = true;

    this.rumbleFilter = ctx.createBiquadFilter();
    this.rumbleFilter.type = 'lowpass';
    this.rumbleFilter.frequency.setValueAtTime(160, now);

    this.rumbleGain = ctx.createGain();
    this.rumbleGain.gain.setValueAtTime(0.04, now);

    this.rumbleSource.connect(this.rumbleFilter);
    this.rumbleFilter.connect(this.rumbleGain);
    this.rumbleGain.connect(this.ambientGain);

    this.windSource.start(now);
    this.rumbleSource.start(now);
    this.lfoOsc.start(now);

    this.ambientReady = true;
    this.applyAmbienceProfile();

    this.ambienceTimer = window.setInterval(() => {
      this.spawnAmbientMicroEvent();
    }, 150);
  }

  private applyAmbienceProfile(): void {
    if (
      !this.ambientReady ||
      !this.ctx ||
      !this.ambientGain ||
      !this.windFilter ||
      !this.windGain ||
      !this.lfoOsc ||
      !this.lfoDepth ||
      !this.rumbleFilter ||
      !this.rumbleGain
    ) {
      return;
    }

    const now = this.ctx.currentTime;
    const silent =
      this.muted ||
      this.ctx.state !== 'running' ||
      this.activePhase === 'GAME_OVER' ||
      this.activePhase === 'VICTORY';

    if (silent) {
      this.ambientGain.gain.setTargetAtTime(0, now, 0.2);
      return;
    }

    // Gentle on Title/Character Select/Upgrade, full immersion in battle
    const masterAmp =
      this.activePhase === 'PLAYING' ? 0.34 : 0.2;
    this.ambientGain.gain.setTargetAtTime(masterAmp, now, 0.45);

    const theme = this.activeTheme;

    if (theme === 'swamp_town') {
      // Gentle night rain hiss
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.setTargetAtTime(1650, now, 0.4);
      this.windFilter.Q.setTargetAtTime(0.55, now, 0.4);
      this.windGain.gain.setTargetAtTime(0.28, now, 0.4);
      this.lfoOsc.frequency.setTargetAtTime(0.12, now, 0.4);
      this.lfoDepth.gain.setTargetAtTime(90, now, 0.4);
    } else if (theme === 'natagumo' || theme === 'mugen_train' || theme === 'train_wreckage') {
      // Howling mountain / rushing wind
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.setTargetAtTime(theme === 'mugen_train' ? 520 : 390, now, 0.4);
      this.windFilter.Q.setTargetAtTime(3.2, now, 0.4);
      this.windGain.gain.setTargetAtTime(0.32, now, 0.4);
      this.lfoOsc.frequency.setTargetAtTime(0.24, now, 0.4);
      this.lfoDepth.gain.setTargetAtTime(210, now, 0.4);
    } else if (theme === 'entertainment_district') {
      // Warm roaring blaze base (crackles come from micro-events)
      this.windFilter.type = 'lowpass';
      this.windFilter.frequency.setTargetAtTime(420, now, 0.4);
      this.windFilter.Q.setTargetAtTime(0.8, now, 0.4);
      this.windGain.gain.setTargetAtTime(0.26, now, 0.4);
      this.lfoOsc.frequency.setTargetAtTime(0.35, now, 0.4);
      this.lfoDepth.gain.setTargetAtTime(110, now, 0.4);
    } else if (
      theme === 'tsuzumi_mansion' ||
      theme === 'infinity_gate' ||
      theme === 'infinity_throne'
    ) {
      // Hollow cavernous draft
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.setTargetAtTime(240, now, 0.4);
      this.windFilter.Q.setTargetAtTime(2.0, now, 0.4);
      this.windGain.gain.setTargetAtTime(0.22, now, 0.4);
      this.lfoOsc.frequency.setTargetAtTime(0.14, now, 0.4);
      this.lfoDepth.gain.setTargetAtTime(75, now, 0.4);
    } else {
      // Bamboo night / Wisteria / Swordsmith village gentle breeze
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.setTargetAtTime(480, now, 0.4);
      this.windFilter.Q.setTargetAtTime(1.1, now, 0.4);
      this.windGain.gain.setTargetAtTime(0.2, now, 0.4);
      this.lfoOsc.frequency.setTargetAtTime(0.16, now, 0.4);
      this.lfoDepth.gain.setTargetAtTime(150, now, 0.4);
    }

    // Ominous low wind surge whenever a Boss is active!
    if (this.bossActive && this.activePhase === 'PLAYING') {
      this.rumbleFilter.frequency.setTargetAtTime(215, now, 0.35);
      this.rumbleGain.gain.setTargetAtTime(0.42, now, 0.35);
    } else {
      this.rumbleFilter.frequency.setTargetAtTime(135, now, 0.45);
      this.rumbleGain.gain.setTargetAtTime(0.08, now, 0.45);
    }
  }

  private spawnAmbientMicroEvent(): void {
    if (
      this.muted ||
      !this.ctx ||
      !this.ambientGain ||
      !this.noiseBuffer ||
      this.ctx.state !== 'running' ||
      this.activePhase === 'GAME_OVER' ||
      this.activePhase === 'VICTORY'
    ) {
      return;
    }

    const ctx = this.ctx;
    const out = this.ambientGain;
    const now = ctx.currentTime;
    const theme = this.activeTheme;

    if (theme === 'swamp_town') {
      // Gentle raindrop / puddle drip bursts
      if (Math.random() < 0.72) {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1500 + Math.random() * 2100, now);
        bp.Q.value = 3.4;
        const g = ctx.createGain();
        const peak = 0.05 + Math.random() * 0.06;
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(peak, now + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.032);
        src.connect(bp);
        bp.connect(g);
        g.connect(out);
        src.start(now, Math.random() * 0.25, 0.04);
      }
      return;
    }

    if (theme === 'entertainment_district') {
      // Crackling fire embers & wood sparks
      if (Math.random() < 0.62) {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(2400 + Math.random() * 2400, now);
        const g = ctx.createGain();
        const peak = 0.09 + Math.random() * 0.1;
        g.gain.setValueAtTime(peak, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.014 + Math.random() * 0.014);
        src.connect(hp);
        hp.connect(g);
        g.connect(out);
        src.start(now, Math.random() * 0.2, 0.035);
      }
      return;
    }

    if (theme === 'natagumo') {
      // Occasional cold wind gust whistle over noise
      if (Math.random() < 0.16) {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        const f0 = 360 + Math.random() * 260;
        bp.frequency.setValueAtTime(f0, now);
        bp.frequency.exponentialRampToValueAtTime(f0 * 0.68, now + 0.42);
        bp.Q.value = 6.5;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.11, now + 0.14);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
        src.connect(bp);
        bp.connect(g);
        g.connect(out);
        src.start(now, 0, 0.45);
      }
      return;
    }

    // Bamboo night / Wisteria / Swordsmith: soft rustling leaves
    if (
      (theme === 'bamboo_night' || theme === 'wisteria' || theme === 'swordsmith_village') &&
      Math.random() < 0.22
    ) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2100 + Math.random() * 900, now);
      bp.Q.value = 1.6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.065, now + 0.11);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      src.connect(bp);
      bp.connect(g);
      g.connect(out);
      src.start(now, Math.random() * 0.1, 0.36);
    }
  }

  private buildWhiteNoiseBuffer(ctx: AudioContext, seconds = 0.5): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private buildPinkNoiseBuffer(ctx: AudioContext, seconds = 4.0): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }
    // Gentle crossfade seam over first/last 512 samples for seamless loop
    const seam = 512;
    for (let i = 0; i < seam; i++) {
      const t = i / seam;
      data[i] = data[i] * t + data[length - seam + i] * (1 - t);
    }
    return buffer;
  }
}
