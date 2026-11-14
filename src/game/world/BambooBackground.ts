import { ARENA, ARENA_PLATFORMS, GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../constants';
import type { StageTheme } from '../storyStages';
import type { CameraState } from '../types';

interface Star {
  x: number;
  y: number;
  phase: number;
  speed: number;
  bright: boolean;
}

interface FogWisp {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  alpha: number;
  parallax: number;
}

interface AmbientMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  warm: boolean;
}

interface BambooStalkDef {
  x: number;
  width: number;
  lean: number;
  nodeSpacing: number;
  hasLeaves: boolean;
  seed: number;
}

interface ThemeLayerSet {
  skyCanvas: HTMLCanvasElement;
  farLayerCanvas: HTMLCanvasElement;
  farLayerY: number;
  farParallax: number;
  nearLayerCanvas: HTMLCanvasElement;
  nearLayerY: number;
  nearParallax: number;
  farPropCanvas: HTMLCanvasElement;
  farPropParallax: number;
  midPropCanvas: HTMLCanvasElement;
  midPropParallax: number;
  groundCanvas: HTMLCanvasElement;
  fgCanvas: HTMLCanvasElement;
  fgParallax: number;
  showStars: boolean;
  showMoon: boolean;
  moonTint: string;
  fogTint: [number, number, number];
  fogAlphaScale: number;
  vignetteColor: string;
}

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export class BambooBackground {
  public currentTheme: StageTheme = 'bamboo_night';

  private themeCache = new Map<StageTheme, ThemeLayerSet>();
  private moonCanvas: HTMLCanvasElement;
  private dawnMoonCanvas: HTMLCanvasElement;

  private stars: Star[] = [];
  private fogWisps: FogWisp[] = [];
  private motes: AmbientMote[] = [];

  private readonly mountainTileW = 640;
  private readonly farBambooTileW = 480;
  private readonly midBambooTileW = 640;
  private readonly groundTileW = 320;
  private readonly fgBambooTileW = 720;

  constructor() {
    this.moonCanvas = this.buildMoonSprite('#c2e3f5', '#f2f9ff', 'rgba(155, 210, 240, 0.10)');
    this.dawnMoonCanvas = this.buildMoonSprite('#e9d5ff', '#faf5ff', 'rgba(192, 132, 252, 0.11)');
    this.getOrBuildTheme('bamboo_night');

    this.initStars();
    this.initFog();
    this.initMotes();
  }

  public setTheme(theme: StageTheme): void {
    this.currentTheme = theme;
    this.getOrBuildTheme(theme);
  }

  private getOrBuildTheme(theme: StageTheme): ThemeLayerSet {
    const existing = this.themeCache.get(theme);
    if (existing) return existing;

    const built = this.buildThemeLayers(theme);
    this.themeCache.set(theme, built);
    return built;
  }

  public renderBackground(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    elapsed: number
  ): void {
    const theme = this.currentTheme;
    const layers = this.getOrBuildTheme(theme);

    // 1. Stepped sky or indoor backdrop
    ctx.drawImage(layers.skyCanvas, 0, 0);

    // 2. Twinkling pixel stars (outdoor night themes)
    if (layers.showStars) {
      this.renderStars(ctx, camera, elapsed);
    }

    // 3. Crescent Moon + stepped halo + cloud wisps
    if (layers.showMoon) {
      this.renderMoon(ctx, camera, elapsed, theme === 'wisteria');
    }

    // Special train speed offset for Mugen Train
    const trainScroll = theme === 'mugen_train' ? elapsed * 240 : 0;

    // 4. Distant silhouettes / horizon architecture
    this.drawTiledLayer(
      ctx,
      layers.farLayerCanvas,
      camera.x * layers.farParallax + trainScroll * 0.16,
      layers.farLayerY
    );
    this.drawTiledLayer(
      ctx,
      layers.nearLayerCanvas,
      camera.x * layers.nearParallax + trainScroll * 0.35,
      layers.nearLayerY
    );

    // 5. Far props / grove / buildings / shoji walls
    const floatY =
      theme === 'infinity_gate'
        ? Math.round(Math.sin(elapsed * 0.85) * 6)
        : 0;
    this.drawTiledLayer(
      ctx,
      layers.farPropCanvas,
      camera.x * layers.farPropParallax + trainScroll * 0.65,
      floatY
    );

    // 6. Distant drifting fog
    if (layers.fogAlphaScale > 0) {
      this.renderFogLayer(ctx, camera, elapsed, 0, 4, layers.fogTint, layers.fogAlphaScale);
    }

    // 7. Midground props
    const midFloatY =
      theme === 'infinity_gate'
        ? Math.round(Math.cos(elapsed * 1.05) * 4)
        : 0;
    this.drawTiledLayer(
      ctx,
      layers.midPropCanvas,
      camera.x * layers.midPropParallax + trainScroll * 1.15,
      midFloatY
    );

    // 8. Low drifting forest mist
    if (layers.fogAlphaScale > 0) {
      this.renderFogLayer(
        ctx,
        camera,
        elapsed,
        4,
        this.fogWisps.length,
        layers.fogTint,
        layers.fogAlphaScale
      );
    }

    // 9. Playable floor (1.0x camera)
    this.drawTiledLayer(ctx, layers.groundCanvas, camera.x, GROUND_Y - 4);

    // 10. Multi-level elevated platforms & left/right wall-jump boundaries
    this.renderArenaPlatforms(ctx, camera.x, theme);
  }

  private renderArenaPlatforms(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    theme: StageTheme
  ): void {
    const isIron = theme === 'mugen_train' || theme === 'train_wreckage';
    const isCrimson = theme === 'infinity_throne' || theme === 'entertainment_district';
    const isWood = theme === 'tsuzumi_mansion' || theme === 'infinity_gate' || theme === 'swordsmith_village';
    const isWisteria = theme === 'wisteria';

    const topHighlight = isIron
      ? '#64748b'
      : isCrimson
        ? '#e11d48'
        : isWood
          ? '#b45309'
          : isWisteria
            ? '#a855f7'
            : '#3a6f75';
    const deckColor = isIron
      ? '#334155'
      : isCrimson
        ? '#4c0519'
        : isWood
          ? '#5c3419'
          : isWisteria
            ? '#2e1d52'
            : '#1d3c42';
    const undersideColor = isIron
      ? '#0f172a'
      : isCrimson
        ? '#1a040a'
        : isWood
          ? '#241309'
          : isWisteria
            ? '#130b26'
            : '#0b181f';
    const nodeColor = isIron
      ? '#94a3b8'
      : isCrimson
        ? '#fb7185'
        : isWood
          ? '#d97706'
          : isWisteria
            ? '#d8b4fe'
            : '#67b0b8';

    // Elevated one-way bamboo/wooden platforms
    for (const plat of ARENA_PLATFORMS) {
      const px = Math.round(plat.x - cameraX);
      const py = Math.round(plat.y);

      // Subtle drop shadow
      ctx.fillStyle = 'rgba(2, 4, 9, 0.48)';
      ctx.fillRect(px + 2, py + 5, plat.width - 4, 2);

      // Platform underside beam
      ctx.fillStyle = undersideColor;
      ctx.fillRect(px + 2, py + 3, plat.width - 4, 3);

      // Main bamboo/timber plank body
      ctx.fillStyle = deckColor;
      ctx.fillRect(px, py + 1, plat.width, 3);

      // Moonlit top surface edge
      ctx.fillStyle = topHighlight;
      ctx.fillRect(px, py, plat.width, 1);

      // Segmented bamboo joints / wooden bracket nodes
      ctx.fillStyle = nodeColor;
      for (let nx = px + 14; nx < px + plat.width - 8; nx += 22) {
        ctx.fillRect(nx, py, 2, 4);
      }

      // Left & right support bracket posts
      ctx.fillStyle = undersideColor;
      ctx.fillRect(px + 4, py + 5, 3, 5);
      ctx.fillRect(px + plat.width - 7, py + 5, 3, 5);
      ctx.fillStyle = topHighlight;
      ctx.fillRect(px + 5, py + 5, 1, 4);
      ctx.fillRect(px + plat.width - 6, py + 5, 1, 4);
    }

    // Left & right wall-jump boundary pillars
    for (const wx of [ARENA.minX - 6, ARENA.maxX]) {
      const sx = Math.round(wx - cameraX);
      ctx.fillStyle = undersideColor;
      ctx.fillRect(sx, 28, 6, GROUND_Y - 28);
      ctx.fillStyle = deckColor;
      ctx.fillRect(sx + 1, 28, 4, GROUND_Y - 28);
      ctx.fillStyle = topHighlight;
      ctx.fillRect(wx < 0 ? sx + 5 : sx, 28, 1, GROUND_Y - 28);
      // Bamboo/wood grip notches along wall
      ctx.fillStyle = nodeColor;
      for (let ny = 44; ny < GROUND_Y - 12; ny += 24) {
        ctx.fillRect(sx + 1, ny, 4, 2);
      }
    }
  }

  public renderForeground(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    elapsed: number
  ): void {
    const theme = this.currentTheme;
    const layers = this.getOrBuildTheme(theme);

    // Theme-specific atmospheric particles / wind streaks
    this.renderThemeAtmosphere(ctx, camera, elapsed, theme);

    // Foreground framing silhouettes (scroll fast on Mugen Train)
    const trainFg = theme === 'mugen_train' ? elapsed * 420 : 0;
    this.drawTiledLayer(
      ctx,
      layers.fgCanvas,
      camera.x * layers.fgParallax + trainFg,
      0
    );

    // Subtle top night vignette bands
    ctx.fillStyle = layers.vignetteColor;
    ctx.fillRect(0, 0, GAME_WIDTH, 10);
    ctx.fillRect(0, 10, GAME_WIDTH, 5);
  }

  public renderTitleAtmosphere(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    elapsed: number
  ): void {
    // Swaying lavender-moonlit mist bands across ground & mid-screen
    this.renderFogLayer(ctx, camera, elapsed, 0, this.fogWisps.length, [186, 152, 238], 1.15);

    // Falling purple wisteria petals across the living Title Screen
    for (let i = 0; i < 32; i++) {
      const sway = Math.sin(elapsed * 1.45 + i * 0.85) * 16;
      const px = mod(Math.round(i * 23 + sway - elapsed * 7), GAME_WIDTH);
      const py = mod(Math.round(elapsed * (13 + (i % 4) * 3) + i * 19), GROUND_Y + 6);
      const flutter = Math.sin(elapsed * 4.2 + i) > 0;
      ctx.fillStyle =
        i % 4 === 0
          ? 'rgba(243, 232, 255, 0.92)'
          : i % 2 === 0
            ? 'rgba(192, 132, 252, 0.85)'
            : 'rgba(168, 85, 247, 0.78)';
      ctx.fillRect(px, py, flutter ? 2 : 3, flutter ? 2 : 1);
      if (i % 3 === 0) {
        ctx.fillStyle = 'rgba(233, 213, 255, 0.65)';
        ctx.fillRect(px + 1, py + 1, 1, 1);
      }
    }
  }

  private renderThemeAtmosphere(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    elapsed: number,
    theme: StageTheme
  ): void {
    if (theme === 'swamp_town') {
      // Falling night rain streaks + ground puddle splashes
      for (let i = 0; i < 42; i++) {
        const speed = 215 + (i % 4) * 28;
        const rx = mod(Math.round(i * 19 - elapsed * 42 - camera.x * 0.9), GAME_WIDTH);
        const ry = mod(Math.round(elapsed * speed + i * 31), GROUND_Y);
        ctx.fillStyle =
          i % 3 === 0 ? 'rgba(186, 230, 253, 0.55)' : 'rgba(125, 211, 252, 0.35)';
        ctx.fillRect(rx, ry, 1, 5);
        ctx.fillRect(rx - 1, ry + 4, 1, 2);

        if (ry > GROUND_Y - 12 && i % 2 === 0) {
          ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
          ctx.fillRect(rx - 2, GROUND_Y - 1, 4, 1);
        }
      }
      return;
    }

    if (theme === 'natagumo') {
      // Drifting snow flakes & rolling chilly mountain fog
      for (let i = 0; i < 34; i++) {
        const drift = Math.sin(elapsed * 1.2 + i) * 10;
        const sx = mod(Math.round(i * 21 - elapsed * 18 + drift - camera.x * 0.85), GAME_WIDTH);
        const sy = mod(Math.round(elapsed * (22 + (i % 4) * 5) + i * 27), GROUND_Y);
        ctx.fillStyle =
          i % 3 === 0 ? 'rgba(236, 254, 255, 0.8)' : 'rgba(165, 243, 252, 0.52)';
        ctx.fillRect(sx, sy, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
      }
      return;
    }

    if (theme === 'mugen_train') {
      // High-speed wind streaks & locomotive steam sparks rushing left
      for (let i = 0; i < 18; i++) {
        const speed = 260 + (i % 4) * 55;
        const wx = GAME_WIDTH - mod(Math.round(elapsed * speed + i * 73), GAME_WIDTH + 90);
        const wy = 24 + ((i * 29) % (GROUND_Y - 36));
        const len = 14 + (i % 3) * 10;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(224, 242, 254, 0.35)' : 'rgba(148, 163, 184, 0.22)';
        ctx.fillRect(wx, wy, len, 1);
      }
      // Glowing cinders from steam engine chimney
      for (let i = 0; i < 10; i++) {
        const cx = GAME_WIDTH - mod(Math.round(elapsed * 190 + i * 97), GAME_WIDTH + 30);
        const cy = Math.round(70 + Math.sin(elapsed * 5 + i) * 16 + (i * 11) % 85);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(251, 146, 60, 0.75)' : 'rgba(253, 224, 71, 0.6)';
        ctx.fillRect(cx, cy, 2, 1);
      }
      return;
    }

    if (theme === 'entertainment_district' || theme === 'infinity_throne') {
      // Rising fire embers / crimson castle embers
      const isCrimson = theme === 'infinity_throne';
      for (const m of this.motes) {
        const mx = mod(
          Math.round(m.x + elapsed * (m.vx * 0.7) + Math.sin(elapsed * 2 + m.phase) * 5 - camera.x * 0.85),
          GAME_WIDTH
        );
        const my = mod(Math.round(m.y - elapsed * 28 - m.phase * 15), GROUND_Y);
        const pulse = 0.55 + 0.45 * Math.sin(elapsed * 4 + m.phase);
        ctx.fillStyle = isCrimson
          ? m.warm
            ? `rgba(248, 113, 113, ${(pulse * 0.85).toFixed(2)})`
            : `rgba(220, 38, 38, ${(pulse * 0.7).toFixed(2)})`
          : m.warm
            ? `rgba(253, 224, 71, ${(pulse * 0.92).toFixed(2)})`
            : `rgba(249, 115, 22, ${(pulse * 0.88).toFixed(2)})`;
        ctx.fillRect(mx, my, m.warm ? 2 : 1, m.warm ? 2 : 1);
      }
      return;
    }

    if (theme === 'wisteria') {
      // Gently falling luminous wisteria petals
      for (const m of this.motes) {
        const mx = mod(
          Math.round(m.x + Math.sin(elapsed * 1.5 + m.phase) * 14 - camera.x * 0.85),
          GAME_WIDTH
        );
        const my = mod(Math.round(m.y + elapsed * 14 + m.phase * 18), GROUND_Y);
        ctx.fillStyle = m.warm ? 'rgba(233, 213, 255, 0.85)' : 'rgba(192, 132, 252, 0.72)';
        ctx.fillRect(mx, my, 2, 1);
      }
      return;
    }

    // Floating dust in Infinity Gate / Tsuzumi Mansion, forge sparks, or bamboo motes
    this.renderMotes(ctx, camera, elapsed, theme);
  }

  private buildThemeLayers(theme: StageTheme): ThemeLayerSet {
    if (theme === 'bamboo_night') {
      return {
        skyCanvas: this.buildSteppedSky(['#050811', '#070c18', '#091121', '#0c172b', '#102036']),
        farLayerCanvas: this.buildMountainLayer(this.mountainTileW, 118, '#0b1424', '#132238', 42),
        farLayerY: GROUND_Y - 128,
        farParallax: 0.07,
        nearLayerCanvas: this.buildMountainLayer(this.mountainTileW, 96, '#0f1c30', '#1d3554', 137),
        nearLayerY: GROUND_Y - 94,
        nearParallax: 0.14,
        farPropCanvas: this.buildBambooTile(this.farBambooTileW, {
          count: 34,
          minWidth: 2,
          maxWidth: 3,
          bodyColor: '#0c1826',
          shadowColor: '#08111c',
          highlightColor: '#172b3d',
          nodeColor: '#132536',
          leafColor: '#0e1d2b',
          seed: 201,
          includeLanterns: false,
        }),
        farPropParallax: 0.27,
        midPropCanvas: this.buildBambooTile(this.midBambooTileW, {
          count: 22,
          minWidth: 3,
          maxWidth: 6,
          bodyColor: '#122733',
          shadowColor: '#09151d',
          highlightColor: '#29515e',
          nodeColor: '#1f404d',
          leafColor: '#16313d',
          seed: 409,
          includeLanterns: true,
        }),
        midPropParallax: 0.54,
        groundCanvas: this.buildGroundTile(this.groundTileW, 'moss'),
        fgCanvas: this.buildForegroundBambooTile(this.fgBambooTileW, '#04060b', '#0b141f'),
        fgParallax: 1.28,
        showStars: true,
        showMoon: true,
        moonTint: '#f2f9ff',
        fogTint: [148, 202, 214],
        fogAlphaScale: 1,
        vignetteColor: 'rgba(4, 7, 13, 0.30)',
      };
    }

    if (theme === 'wisteria') {
      return {
        skyCanvas: this.buildSteppedSky(['#090717', '#110c29', '#19133a', '#221a4d', '#2b205e']),
        farLayerCanvas: this.buildMountainLayer(this.mountainTileW, 114, '#130e2b', '#2d2259', 51),
        farLayerY: GROUND_Y - 122,
        farParallax: 0.08,
        nearLayerCanvas: this.buildMountainLayer(this.mountainTileW, 88, '#191236', '#3d2c75', 149),
        nearLayerY: GROUND_Y - 86,
        nearParallax: 0.16,
        farPropCanvas: this.buildWisteriaTile(this.farBambooTileW, 12, true, 303),
        farPropParallax: 0.28,
        midPropCanvas: this.buildWisteriaTile(this.midBambooTileW, 9, false, 419),
        midPropParallax: 0.54,
        groundCanvas: this.buildGroundTile(this.groundTileW, 'wisteria'),
        fgCanvas: this.buildWisteriaCanopyFg(this.fgBambooTileW),
        fgParallax: 1.25,
        showStars: true,
        showMoon: true,
        moonTint: '#faf5ff',
        fogTint: [192, 152, 235],
        fogAlphaScale: 0.85,
        vignetteColor: 'rgba(9, 6, 20, 0.32)',
      };
    }

    if (theme === 'swamp_town') {
      return {
        skyCanvas: this.buildSteppedSky(['#040711', '#070c1a', '#0c1326', '#111b33', '#18243d']),
        farLayerCanvas: this.buildTownSilhouettes(this.mountainTileW, '#0b101d', '#162033', false, 601),
        farLayerY: GROUND_Y - 108,
        farParallax: 0.15,
        nearLayerCanvas: this.buildTownSilhouettes(this.mountainTileW, '#111829', '#25334d', true, 709),
        nearLayerY: GROUND_Y - 98,
        nearParallax: 0.3,
        farPropCanvas: this.buildTownLanternPosts(this.farBambooTileW, false, 811),
        farPropParallax: 0.42,
        midPropCanvas: this.buildTownLanternPosts(this.midBambooTileW, true, 907),
        midPropParallax: 0.68,
        groundCanvas: this.buildGroundTile(this.groundTileW, 'cobble'),
        fgCanvas: this.buildForegroundPillars(this.fgBambooTileW, '#05070e', '#1a2436'),
        fgParallax: 1.24,
        showStars: true,
        showMoon: true,
        moonTint: '#e2e8f0',
        fogTint: [120, 150, 185],
        fogAlphaScale: 0.75,
        vignetteColor: 'rgba(4, 6, 12, 0.34)',
      };
    }

    if (theme === 'tsuzumi_mansion') {
      return {
        skyCanvas: this.buildSteppedSky(['#120a07', '#1a0f0a', '#24150e', '#2e1b12', '#382217']),
        farLayerCanvas: this.buildMansionShojiWall(this.mountainTileW, '#22140d', '#3a2216', '#5e432d', 111),
        farLayerY: 22,
        farParallax: 0.18,
        nearLayerCanvas: this.buildMansionShojiWall(this.mountainTileW, '#2b1910', '#4d2d1d', '#9e7e56', 222),
        nearLayerY: 48,
        nearParallax: 0.34,
        farPropCanvas: this.buildMansionPillars(this.farBambooTileW, false, 333),
        farPropParallax: 0.48,
        midPropCanvas: this.buildMansionPillars(this.midBambooTileW, true, 444),
        midPropParallax: 0.72,
        groundCanvas: this.buildGroundTile(this.groundTileW, 'tatami'),
        fgCanvas: this.buildForegroundPillars(this.fgBambooTileW, '#0d0704', '#3b2214'),
        fgParallax: 1.22,
        showStars: false,
        showMoon: false,
        moonTint: '#fde68a',
        fogTint: [214, 178, 130],
        fogAlphaScale: 0.25,
        vignetteColor: 'rgba(10, 5, 3, 0.42)',
      };
    }

    if (theme === 'natagumo') {
      return {
        skyCanvas: this.buildSteppedSky(['#040b0e', '#071318', '#0a1b22', '#0e252e', '#13313b']),
        farLayerCanvas: this.buildMountainLayer(this.mountainTileW, 120, '#09181e', '#163842', 173),
        farLayerY: GROUND_Y - 126,
        farParallax: 0.08,
        nearLayerCanvas: this.buildMountainLayer(this.mountainTileW, 96, '#0d2229', '#1e4b56', 251),
        nearLayerY: GROUND_Y - 94,
        nearParallax: 0.17,
        farPropCanvas: this.buildSpiderForestTile(this.farBambooTileW, false, 313),
        farPropParallax: 0.3,
        midPropCanvas: this.buildSpiderForestTile(this.midBambooTileW, true, 521),
        midPropParallax: 0.56,
        groundCanvas: this.buildGroundTile(this.groundTileW, 'moss'),
        fgCanvas: this.buildSpiderWebFg(this.fgBambooTileW),
        fgParallax: 1.25,
        showStars: true,
        showMoon: true,
        moonTint: '#cffafe',
        fogTint: [186, 224, 232],
        fogAlphaScale: 1.35,
        vignetteColor: 'rgba(3, 8, 12, 0.35)',
      };
    }

    if (theme === 'mugen_train') {
      return {
        skyCanvas: this.buildSteppedSky(['#040712', '#060c1f', '#0a1430', '#101e42', '#172954']),
        farLayerCanvas: this.buildMountainLayer(this.mountainTileW, 108, '#0b142b', '#1b2f59', 612),
        farLayerY: GROUND_Y - 118,
        farParallax: 0.08,
        nearLayerCanvas: this.buildMountainLayer(this.mountainTileW, 82, '#0f1c3a', '#264275', 731),
        nearLayerY: GROUND_Y - 82,
        nearParallax: 0.16,
        farPropCanvas: this.buildTrainSidePoles(this.farBambooTileW, '#0d1526', 6, 821),
        farPropParallax: 0.35,
        midPropCanvas: this.buildTrainCarsDetail(this.midBambooTileW),
        midPropParallax: 0.65,
        groundCanvas: this.buildGroundTile(this.groundTileW, 'train_roof'),
        fgCanvas: this.buildTrainSidePoles(this.fgBambooTileW, '#04060d', 11, 911),
        fgParallax: 1.35,
        showStars: true,
        showMoon: true,
        moonTint: '#e0f2fe',
        fogTint: [148, 180, 215],
        fogAlphaScale: 0.55,
        vignetteColor: 'rgba(4, 7, 16, 0.28)',
      };
    }

    if (theme === 'train_wreckage') {
      return {
        skyCanvas: this.buildSteppedSky(['#160d24', '#2d1633', '#5c243a', '#9c3c36', '#d97736']),
        farLayerCanvas: this.buildMountainLayer(this.mountainTileW, 106, '#241429', '#7c3aed', 411),
        farLayerY: GROUND_Y - 110,
        farParallax: 0.08,
        nearLayerCanvas: this.buildMountainLayer(this.mountainTileW, 84, '#2d1924', '#c2410c', 512),
        nearLayerY: GROUND_Y - 82,
        nearParallax: 0.16,
        farPropCanvas: this.buildWreckageSilhouettes(this.farBambooTileW, false, 613),
        farPropParallax: 0.28,
        midPropCanvas: this.buildWreckageSilhouettes(this.midBambooTileW, true, 719),
        midPropParallax: 0.55,
        groundCanvas: this.buildGroundTile(this.groundTileW, 'crater'),
        fgCanvas: this.buildForegroundPillars(this.fgBambooTileW, '#120b0d', '#451a12'),
        fgParallax: 1.25,
        showStars: false,
        showMoon: false,
        moonTint: '#fde68a',
        fogTint: [251, 146, 60],
        fogAlphaScale: 0.55,
        vignetteColor: 'rgba(18, 8, 12, 0.26)',
      };
    }

    if (theme === 'entertainment_district') {
      return {
        skyCanvas: this.buildSteppedSky(['#140609', '#260a0d', '#3f1111', '#611a14', '#8a2815']),
        farLayerCanvas: this.buildTownSilhouettes(this.mountainTileW, '#1c0b0e', '#7c2d12', false, 621),
        farLayerY: GROUND_Y - 114,
        farParallax: 0.14,
        nearLayerCanvas: this.buildTownSilhouettes(this.mountainTileW, '#240d10', '#ea580c', true, 729),
        nearLayerY: GROUND_Y - 102,
        nearParallax: 0.28,
        farPropCanvas: this.buildBurningLanterns(this.farBambooTileW, 811),
        farPropParallax: 0.42,
        midPropCanvas: this.buildBurningRooftops(this.midBambooTileW, 919),
        midPropParallax: 0.64,
        groundCanvas: this.buildGroundTile(this.groundTileW, 'roof'),
        fgCanvas: this.buildForegroundPillars(this.fgBambooTileW, '#0d0405', '#7c2d12'),
        fgParallax: 1.24,
        showStars: false,
        showMoon: true,
        moonTint: '#fecaca',
        fogTint: [249, 115, 22],
        fogAlphaScale: 0.7,
        vignetteColor: 'rgba(18, 4, 4, 0.34)',
      };
    }

    if (theme === 'swordsmith_village') {
      return {
        skyCanvas: this.buildSteppedSky(['#060b14', '#091220', '#0e1b2d', '#14273c', '#1c344a']),
        farLayerCanvas: this.buildMountainLayer(this.mountainTileW, 120, '#0d1926', '#1f3a4d', 311),
        farLayerY: GROUND_Y - 126,
        farParallax: 0.08,
        nearLayerCanvas: this.buildMountainLayer(this.mountainTileW, 92, '#122230', '#2d5163', 422),
        nearLayerY: GROUND_Y - 92,
        nearParallax: 0.17,
        farPropCanvas: this.buildBambooTile(this.farBambooTileW, {
          count: 24,
          minWidth: 2,
          maxWidth: 4,
          bodyColor: '#0e1b24',
          shadowColor: '#081017',
          highlightColor: '#1f3b4a',
          nodeColor: '#172e3b',
          leafColor: '#12242e',
          seed: 551,
          includeLanterns: false,
        }),
        farPropParallax: 0.28,
        midPropCanvas: this.buildVillageSmithyTile(this.midBambooTileW, 661),
        midPropParallax: 0.56,
        groundCanvas: this.buildGroundTile(this.groundTileW, 'cobble'),
        fgCanvas: this.buildForegroundBambooTile(this.fgBambooTileW, '#05080d', '#152533'),
        fgParallax: 1.25,
        showStars: true,
        showMoon: true,
        moonTint: '#f8fafc',
        fogTint: [164, 205, 218],
        fogAlphaScale: 0.8,
        vignetteColor: 'rgba(5, 9, 15, 0.30)',
      };
    }

    if (theme === 'infinity_gate') {
      return {
        skyCanvas: this.buildSteppedSky(['#120a05', '#1d1008', '#2b170b', '#3a1f0f', '#4a2812']),
        farLayerCanvas: this.buildInfinityCastleLayer(this.mountainTileW, '#1e1008', '#5e3418', '#f59e0b', 101),
        farLayerY: 10,
        farParallax: 0.16,
        nearLayerCanvas: this.buildInfinityCastleLayer(this.mountainTileW, '#29150a', '#7c451f', '#fbbf24', 202),
        nearLayerY: 28,
        nearParallax: 0.32,
        farPropCanvas: this.buildInfinityPillars(this.farBambooTileW, '#1a0e07', '#854d0e', 303),
        farPropParallax: 0.45,
        midPropCanvas: this.buildInfinityPillars(this.midBambooTileW, '#261409', '#b45309', 404),
        midPropParallax: 0.72,
        groundCanvas: this.buildGroundTile(this.groundTileW, 'tatami'),
        fgCanvas: this.buildForegroundPillars(this.fgBambooTileW, '#0c0603', '#78350f'),
        fgParallax: 1.28,
        showStars: false,
        showMoon: false,
        moonTint: '#fde68a',
        fogTint: [245, 158, 11],
        fogAlphaScale: 0.35,
        vignetteColor: 'rgba(12, 6, 2, 0.42)',
      };
    }

    // 'infinity_throne' (Stage 10 Final Boss: Muzan)
    return {
      skyCanvas: this.buildSteppedSky(['#120408', '#21060e', '#330816', '#4a0c1f', '#631029']),
      farLayerCanvas: this.buildInfinityCastleLayer(this.mountainTileW, '#1c060c', '#5c1125', '#fb7185', 801),
      farLayerY: 8,
      farParallax: 0.16,
      nearLayerCanvas: this.buildInfinityCastleLayer(this.mountainTileW, '#290812', '#881337', '#f43f5e', 902),
      nearLayerY: 22,
      nearParallax: 0.34,
      farPropCanvas: this.buildInfinityPillars(this.farBambooTileW, '#17040a', '#9f1239', 913),
      farPropParallax: 0.46,
      midPropCanvas: this.buildInfinityPillars(this.midBambooTileW, '#240710', '#e11d48', 924),
      midPropParallax: 0.72,
      groundCanvas: this.buildGroundTile(this.groundTileW, 'throne'),
      fgCanvas: this.buildForegroundPillars(this.fgBambooTileW, '#0b0205', '#881337'),
      fgParallax: 1.28,
      showStars: false,
      showMoon: false,
      moonTint: '#fecdd3',
      fogTint: [244, 63, 94],
      fogAlphaScale: 0.5,
      vignetteColor: 'rgba(15, 2, 6, 0.45)',
    };
  }

  private drawTiledLayer(
    ctx: CanvasRenderingContext2D,
    tile: HTMLCanvasElement,
    scrollX: number,
    y: number
  ): void {
    const w = tile.width;
    const offset = mod(Math.round(scrollX), w);
    const startX = -offset;
    for (let x = startX; x < GAME_WIDTH; x += w) {
      ctx.drawImage(tile, Math.round(x), Math.round(y));
    }
  }

  private buildSteppedSky(colors: [string, string, string, string, string]): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = GAME_WIDTH;
    c.height = GAME_HEIGHT;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const bands = [
      { y: 0, h: 42, color: colors[0] },
      { y: 42, h: 44, color: colors[1] },
      { y: 86, h: 46, color: colors[2] },
      { y: 132, h: 48, color: colors[3] },
      { y: 180, h: 90, color: colors[4] },
    ];

    for (let i = 0; i < bands.length; i++) {
      const b = bands[i];
      ctx.fillStyle = b.color;
      ctx.fillRect(0, b.y, GAME_WIDTH, b.h);

      if (i < bands.length - 1) {
        const nextColor = bands[i + 1].color;
        ctx.fillStyle = nextColor;
        const seamY = b.y + b.h - 4;
        for (let x = 0; x < GAME_WIDTH; x += 2) {
          ctx.fillRect(x, seamY, 1, 1);
          ctx.fillRect(x + 1, seamY + 2, 1, 1);
        }
      }
    }
    return c;
  }

  private buildMoonSprite(rim: string, core: string, haloBase: string): HTMLCanvasElement {
    const size = 96;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const cx = 48;
    const cy = 48;

    const halos = [
      { r: 44, color: haloBase },
      { r: 32, color: haloBase },
      { r: 22, color: haloBase },
    ];

    for (const halo of halos) {
      ctx.fillStyle = halo.color;
      for (let y = -halo.r; y <= halo.r; y++) {
        for (let x = -halo.r; x <= halo.r; x++) {
          if (x * x + y * y <= halo.r * halo.r) {
            ctx.fillRect(cx + x, cy + y, 1, 1);
          }
        }
      }
    }

    const r = 14;
    const cutX = -5;
    const cutY = -4;
    const cutR = 13;

    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const inMoon = x * x + y * y <= r * r;
        const inCut = (x - cutX) * (x - cutX) + (y - cutY) * (y - cutY) <= cutR * cutR;
        if (inMoon && !inCut) {
          const dist = Math.sqrt(x * x + y * y);
          ctx.fillStyle = dist > r - 2.2 ? rim : core;
          ctx.fillRect(cx + x, cy + y, 1, 1);
        }
      }
    }

    return c;
  }

  private renderMoon(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    elapsed: number,
    purpleTint: boolean
  ): void {
    const moonX = Math.round(356 - camera.x * 0.025);
    const moonY = 50;
    ctx.drawImage(purpleTint ? this.dawnMoonCanvas : this.moonCanvas, moonX - 48, moonY - 48);

    const cloudDrift = Math.round(mod(elapsed * 4 - camera.x * 0.04, 160));
    const wispX = moonX - 65 + cloudDrift * 0.6;
    ctx.fillStyle = 'rgba(13, 24, 42, 0.55)';
    ctx.fillRect(Math.round(wispX), moonY + 7, 26, 2);
    ctx.fillRect(Math.round(wispX + 5), moonY + 5, 16, 2);
  }

  private buildMountainLayer(
    width: number,
    height: number,
    fillColor: string,
    rimColor: string,
    seed: number
  ): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const heights = new Array<number>(width);
    const rand = seededRandom(seed);
    const p1 = rand() * Math.PI * 2;
    const p2 = rand() * Math.PI * 2;
    const p3 = rand() * Math.PI * 2;
    const p4 = rand() * Math.PI * 2;

    for (let x = 0; x < width; x++) {
      const t = (x / width) * Math.PI * 2;
      const ridge =
        Math.sin(t * 2 + p1) * 0.42 +
        Math.sin(t * 3 + p2) * 0.28 +
        Math.sin(t * 5 + p3) * 0.18 +
        Math.sin(t * 9 + p4) * 0.12;
      const normalized = (ridge + 1) * 0.5;
      heights[x] = Math.round(height * (0.28 + normalized * 0.58));
    }

    for (let x = 0; x < width; x++) {
      const topY = height - heights[x];
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, topY, 1, heights[x]);

      const prevH = heights[mod(x - 1, width)];
      if (heights[x] < prevH) {
        ctx.fillStyle = rimColor;
        ctx.fillRect(x, topY, 1, 2);
      }
    }

    return c;
  }

  private buildWisteriaTile(
    width: number,
    count: number,
    far: boolean,
    seed: number
  ): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = GROUND_Y;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const rand = seededRandom(seed);

    for (let i = 0; i < count; i++) {
      const tx = Math.floor((i / count) * width + rand() * 18);
      const trunkW = far ? 4 : 7;
      const trunkColor = far ? '#1b142d' : '#261a3d';
      const trunkHi = far ? '#30234d' : '#44306b';

      // Gnarled tree trunk
      for (let y = 26; y < GROUND_Y; y++) {
        const sway = Math.round(Math.sin(y * 0.06 + i) * 2);
        ctx.fillStyle = trunkColor;
        ctx.fillRect(tx + sway, y, trunkW, 1);
        ctx.fillStyle = trunkHi;
        ctx.fillRect(tx + sway + trunkW - 1, y, 1, 1);
      }

      // Canopy branches + hanging purple wisteria clusters
      const canopyY = 18 + Math.floor(rand() * 24);
      const span = far ? 22 : 34;
      ctx.fillStyle = far ? '#18102b' : '#241740';
      ctx.fillRect(tx - span / 2, canopyY, span, 8);

      for (let k = 0; k < (far ? 6 : 9); k++) {
        const bx = tx - span / 2 + Math.floor((k / (far ? 6 : 9)) * span);
        const drop = 14 + Math.floor(rand() * 26);
        for (let y = 0; y < drop; y++) {
          const w = Math.max(1, Math.round(3 - (y / drop) * 2));
          ctx.fillStyle =
            y > drop - 5
              ? '#e9d5ff'
              : y % 2 === 0
                ? far
                  ? '#7e22ce'
                  : '#a855f7'
                : far
                  ? '#6b21a8'
                  : '#c084fc';
          ctx.fillRect(bx, canopyY + 6 + y, w, 1);
        }
      }
    }
    return c;
  }

  private buildWisteriaCanopyFg(width: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = GAME_HEIGHT;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const rand = seededRandom(993);

    // Dark gnarled framing tree pillars
    for (const px of [38, 390]) {
      ctx.fillStyle = '#090612';
      ctx.fillRect(px, 0, 10, GAME_HEIGHT);
      ctx.fillStyle = '#1f1536';
      ctx.fillRect(px + 9, 0, 1, GAME_HEIGHT);
    }
    // Overhanging luminous wisteria vines along very top
    for (let x = 0; x < width; x += 14) {
      if (rand() > 0.35) {
        const len = 10 + Math.floor(rand() * 18);
        ctx.fillStyle = '#7e22ce';
        ctx.fillRect(x, 0, 3, len);
        ctx.fillStyle = '#d8b4fe';
        ctx.fillRect(x + 1, len - 4, 2, 4);
      }
    }
    return c;
  }

  private buildTownSilhouettes(
    width: number,
    wallColor: string,
    roofRimColor: string,
    withWindows: boolean,
    seed: number
  ): HTMLCanvasElement {
    const height = 120;
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const rand = seededRandom(seed);

    let x = 0;
    while (x < width) {
      const bw = 34 + Math.floor(rand() * 34);
      const bh = 46 + Math.floor(rand() * 54);
      const top = height - bh;

      // Machiya body
      ctx.fillStyle = wallColor;
      ctx.fillRect(x + 2, top + 10, bw - 4, bh - 10);

      // Sloped tiled Japanese gable roof
      ctx.fillStyle = '#06080f';
      ctx.fillRect(x, top + 6, bw, 5);
      ctx.fillRect(x + 4, top + 2, bw - 8, 4);
      ctx.fillStyle = roofRimColor;
      ctx.fillRect(x, top + 6, bw, 1);

      if (withWindows) {
        for (let wy = top + 18; wy < height - 18; wy += 16) {
          for (let wx = x + 7; wx < x + bw - 12; wx += 13) {
            if (rand() > 0.35) {
              ctx.fillStyle = rand() > 0.5 ? '#f59e0b' : '#fbbf24';
              ctx.fillRect(wx, wy, 7, 9);
              ctx.fillStyle = wallColor;
              ctx.fillRect(wx + 3, wy, 1, 9);
              ctx.fillRect(wx, wy + 4, 7, 1);
            }
          }
        }
      }
      x += bw - 2;
    }
    return c;
  }

  private buildTownLanternPosts(
    width: number,
    close: boolean,
    seed: number
  ): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = GROUND_Y;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const rand = seededRandom(seed);

    const step = close ? 95 : 70;
    for (let x = 24; x < width; x += step) {
      const px = x + Math.floor(rand() * 20);
      const postH = close ? 46 : 32;
      ctx.fillStyle = '#090c14';
      ctx.fillRect(px, GROUND_Y - postH, 3, postH);
      ctx.fillRect(px, GROUND_Y - postH, 9, 2);

      // Glowing red/amber paper chochin lantern
      const lx = px + 6;
      const ly = GROUND_Y - postH + 2;
      ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
      ctx.fillRect(lx - 4, ly - 2, 12, 13);
      ctx.fillStyle = close ? '#f59e0b' : '#b45309';
      ctx.fillRect(lx - 1, ly, 6, 8);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(lx, ly + 2, 4, 4);
    }
    return c;
  }

  private buildMansionShojiWall(
    width: number,
    woodDark: string,
    woodLight: string,
    paperColor: string,
    seed: number
  ): HTMLCanvasElement {
    const height = GROUND_Y - 12;
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const rand = seededRandom(seed);

    // Backdrop wood wall
    ctx.fillStyle = woodDark;
    ctx.fillRect(0, 0, width, height);

    // Shoji sliding screens across wall
    for (let x = 8; x < width; x += 64) {
      const pw = 48;
      const ph = height - 24;
      ctx.fillStyle = woodLight;
      ctx.fillRect(x - 2, 10, pw + 4, ph + 4);
      ctx.fillStyle = paperColor;
      ctx.fillRect(x, 12, pw, ph);

      // Shoji lattice grid
      ctx.fillStyle = woodLight;
      for (let gx = x + 12; gx < x + pw; gx += 12) {
        ctx.fillRect(gx, 12, 1, ph);
      }
      for (let gy = 24; gy < 12 + ph; gy += 14) {
        ctx.fillRect(x, gy, pw, 1);
      }

      // Warm candle shadow silhouette on occasional screen
      if (rand() > 0.5) {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
        ctx.fillRect(x + 8, 22, pw - 16, ph - 20);
      }
    }
    return c;
  }

  private buildMansionPillars(width: number, withTsuzumi: boolean, seed: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = GROUND_Y;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const rand = seededRandom(seed);

    // Top ceiling rafters
    ctx.fillStyle = '#140b06';
    ctx.fillRect(0, 0, width, 16);
    ctx.fillStyle = '#361d10';
    ctx.fillRect(0, 15, width, 2);

    for (let x = 30; x < width; x += 110) {
      // Wooden structural pillar
      ctx.fillStyle = '#1c0f08';
      ctx.fillRect(x, 0, 10, GROUND_Y);
      ctx.fillStyle = '#472817';
      ctx.fillRect(x + 8, 0, 2, GROUND_Y);

      if (withTsuzumi && rand() > 0.25) {
        // Wall candle sconce
        const sy = GROUND_Y - 64;
        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.fillRect(x + 12, sy - 6, 14, 14);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x + 16, sy - 2, 4, 6);
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(x + 17, sy - 4, 2, 3);
      }
    }
    return c;
  }

  private buildSpiderForestTile(width: number, withWebs: boolean, seed: number): HTMLCanvasElement {
    const c = this.buildBambooTile(width, {
      count: withWebs ? 18 : 28,
      minWidth: 3,
      maxWidth: withWebs ? 7 : 4,
      bodyColor: withWebs ? '#102129' : '#09141a',
      shadowColor: '#050c10',
      highlightColor: '#254a57',
      nodeColor: '#193540',
      leafColor: '#122830',
      seed,
      includeLanterns: false,
    });
    if (!withWebs) return c;

    const ctx = c.getContext('2d')!;
    const rand = seededRandom(seed + 77);
    ctx.fillStyle = 'rgba(226, 232, 240, 0.34)';

    for (let i = 0; i < 4; i++) {
      const cx = Math.floor((i / 4) * width + 40 + rand() * 40);
      const cy = 62 + Math.floor(rand() * 58);
      const r = 24 + Math.floor(rand() * 14);
      // Web spokes
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        for (let d = 2; d <= r; d++) {
          ctx.fillRect(
            Math.round(cx + Math.cos(ang) * d),
            Math.round(cy + Math.sin(ang) * d),
            1,
            1
          );
        }
      }
      // Web rings
      for (const ringR of [8, 16, r - 2]) {
        for (let a = 0; a < 36; a++) {
          const ang = (a / 36) * Math.PI * 2;
          ctx.fillRect(
            Math.round(cx + Math.cos(ang) * ringR),
            Math.round(cy + Math.sin(ang) * ringR),
            1,
            1
          );
        }
      }
    }
    return c;
  }

  private buildSpiderWebFg(width: number): HTMLCanvasElement {
    const c = this.buildForegroundBambooTile(width, '#04090c', '#10242c');
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(226, 232, 240, 0.25)';
    for (let i = 0; i < 18; i++) {
      ctx.fillRect(i * 40, 0, 1, 22 + (i % 3) * 10);
    }
    return c;
  }

  private buildTrainSidePoles(width: number, color: string, poleW: number, seed: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = GAME_HEIGHT;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    void seed;
    for (let x = 40; x < width; x += 220) {
      ctx.fillStyle = color;
      ctx.fillRect(x, 0, poleW, GAME_HEIGHT);
      ctx.fillRect(x - 10, 48, poleW + 20, 3);
    }
    return c;
  }

  private buildTrainCarsDetail(width: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = GROUND_Y;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Distant train car roof rails & vents below horizon
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, GROUND_Y - 12, width, 12);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, GROUND_Y - 12, width, 1);
    for (let x = 20; x < width; x += 48) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x, GROUND_Y - 16, 14, 4);
      ctx.fillStyle = '#475569';
      ctx.fillRect(x + 2, GROUND_Y - 17, 10, 1);
    }
    return c;
  }

  private buildWreckageSilhouettes(width: number, mid: boolean, seed: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = GROUND_Y;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const rand = seededRandom(seed);

    for (let x = 24; x < width; x += 140) {
      const cw = 64 + Math.floor(rand() * 24);
      const ch = mid ? 34 : 26;
      const baseY = GROUND_Y - ch;
      ctx.fillStyle = mid ? '#1c1218' : '#261522';
      ctx.fillRect(x, baseY, cw, ch);
      // Tilted wreckage roof line
      ctx.fillStyle = mid ? '#9a3412' : '#7c2d12';
      ctx.fillRect(x - 2, baseY, cw + 4, 2);
      // Broken windows
      ctx.fillStyle = '#451a03';
      for (let wx = x + 6; wx < x + cw - 10; wx += 12) {
        ctx.fillRect(wx, baseY + 7, 7, 8);
      }
    }
    return c;
  }

  private buildBurningLanterns(width: number, seed: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = GROUND_Y;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const rand = seededRandom(seed);

    for (let x = 20; x < width; x += 46) {
      const y = 78 + Math.floor(rand() * 44);
      ctx.fillStyle = 'rgba(249, 115, 22, 0.25)';
      ctx.fillRect(x - 4, y - 3, 14, 14);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x, y, 6, 8);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(x + 1, y + 2, 4, 4);
    }
    return c;
  }

  private buildBurningRooftops(width: number, seed: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = GROUND_Y;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const rand = seededRandom(seed);

    for (let x = 16; x < width; x += 128) {
      const w = 82;
      const h = 42 + Math.floor(rand() * 24);
      const top = GROUND_Y - h;
      ctx.fillStyle = '#1a090b';
      ctx.fillRect(x, top, w, h);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x - 4, top, w + 8, 2);
      // Burning eaves glow
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(x + 8, top + 8, 12, 10);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(x + 10, top + 10, 8, 6);
    }
    return c;
  }

  private buildVillageSmithyTile(width: number, seed: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = GROUND_Y;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const rand = seededRandom(seed);

    for (let x = 24; x < width; x += 160) {
      const w = 78;
      const h = 54 + Math.floor(rand() * 14);
      const top = GROUND_Y - h;
      ctx.fillStyle = '#141e29';
      ctx.fillRect(x, top + 10, w, h - 10);
      ctx.fillStyle = '#090f17';
      ctx.fillRect(x - 5, top + 6, w + 10, 6);
      ctx.fillStyle = '#334e68';
      ctx.fillRect(x - 5, top + 6, w + 10, 1);

      // Glowing orange blacksmith forge window
      ctx.fillStyle = 'rgba(249, 115, 22, 0.25)';
      ctx.fillRect(x + 12, top + 20, 26, 18);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(x + 15, top + 23, 20, 12);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(x + 18, top + 26, 12, 6);
    }
    return c;
  }

  private buildInfinityCastleLayer(
    width: number,
    darkWood: string,
    midWood: string,
    glowColor: string,
    seed: number
  ): HTMLCanvasElement {
    const height = GROUND_Y - 14;
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const rand = seededRandom(seed);

    // Floating geometric rooms, inverted beams & staircases
    for (let i = 0; i < 10; i++) {
      const rx = Math.floor((i / 10) * width + rand() * 20);
      const ry = Math.floor(rand() * (height - 70));
      const rw = 42 + Math.floor(rand() * 42);
      const rh = 38 + Math.floor(rand() * 44);

      ctx.fillStyle = darkWood;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.fillStyle = midWood;
      ctx.fillRect(rx, ry, rw, 2);
      ctx.fillRect(rx, ry + rh - 2, rw, 2);

      // Glowing shoji pane inside surreal floating room
      ctx.fillStyle = glowColor;
      ctx.globalAlpha = 0.26;
      ctx.fillRect(rx + 6, ry + 6, rw - 12, rh - 12);
      ctx.globalAlpha = 1;

      // Grid lines
      ctx.fillStyle = darkWood;
      for (let gx = rx + 14; gx < rx + rw - 6; gx += 10) {
        ctx.fillRect(gx, ry + 6, 1, rh - 12);
      }
      // Diagonal stair steps attached
      for (let s = 0; s < 6; s++) {
        ctx.fillStyle = midWood;
        ctx.fillRect(rx + rw + s * 4, ry + rh - s * 4, 5, 3);
      }
    }
    return c;
  }

  private buildInfinityPillars(
    width: number,
    darkColor: string,
    accentColor: string,
    seed: number
  ): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = GROUND_Y;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const rand = seededRandom(seed);

    for (let x = 18; x < width; x += 88) {
      const pw = 8 + Math.floor(rand() * 6);
      ctx.fillStyle = darkColor;
      ctx.fillRect(x, 0, pw, GROUND_Y);
      ctx.fillStyle = accentColor;
      ctx.fillRect(x + pw - 1, 0, 1, GROUND_Y);
      // Crossbeam / biwa frame bar
      const by = 36 + Math.floor(rand() * 90);
      ctx.fillStyle = darkColor;
      ctx.fillRect(x - 24, by, pw + 48, 5);
      ctx.fillStyle = accentColor;
      ctx.fillRect(x - 24, by, pw + 48, 1);
    }
    return c;
  }

  private buildBambooTile(
    width: number,
    opts: {
      count: number;
      minWidth: number;
      maxWidth: number;
      bodyColor: string;
      shadowColor: string;
      highlightColor: string;
      nodeColor: string;
      leafColor: string;
      seed: number;
      includeLanterns: boolean;
    }
  ): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = GROUND_Y;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const rand = seededRandom(opts.seed);
    const stalks: BambooStalkDef[] = [];

    for (let i = 0; i < opts.count; i++) {
      const x = Math.floor((i / opts.count) * width + rand() * (width / opts.count));
      const w = opts.minWidth + Math.floor(rand() * (opts.maxWidth - opts.minWidth + 1));
      const lean = (rand() - 0.5) * 0.08;
      const nodeSpacing = 18 + Math.floor(rand() * 14);
      stalks.push({
        x: mod(x, width),
        width: w,
        lean,
        nodeSpacing,
        hasLeaves: rand() > 0.28,
        seed: Math.floor(rand() * 10000),
      });
    }

    for (const stalk of stalks) {
      for (const offset of [-width, 0, width]) {
        const sx = stalk.x + offset;
        if (sx < -40 || sx > width + 40) continue;
        this.drawBambooStalk(ctx, sx, stalk, opts);
      }
    }

    if (opts.includeLanterns) {
      const lanternPositions = [Math.floor(width * 0.24), Math.floor(width * 0.74)];
      for (const lx of lanternPositions) {
        this.drawStoneLantern(ctx, lx, GROUND_Y - 2);
      }
    }

    return c;
  }

  private drawBambooStalk(
    ctx: CanvasRenderingContext2D,
    baseX: number,
    stalk: BambooStalkDef,
    opts: {
      bodyColor: string;
      shadowColor: string;
      highlightColor: string;
      nodeColor: string;
      leafColor: string;
    }
  ): void {
    const rand = seededRandom(stalk.seed);
    const bottomY = GROUND_Y;
    const nodePhase = Math.floor(rand() * stalk.nodeSpacing);

    for (let y = bottomY; y >= 0; y--) {
      const progress = (bottomY - y) / bottomY;
      const cx = Math.round(baseX + stalk.lean * (bottomY - y));
      const isNode = (y + nodePhase) % stalk.nodeSpacing === 0;
      const curW = progress > 0.85 && stalk.width > 2 ? stalk.width - 1 : stalk.width;

      ctx.fillStyle = opts.shadowColor;
      ctx.fillRect(cx, y, 1, 1);

      if (curW > 2) {
        ctx.fillStyle = opts.bodyColor;
        ctx.fillRect(cx + 1, y, curW - 2, 1);
      }

      if (curW >= 2) {
        ctx.fillStyle = opts.highlightColor;
        ctx.fillRect(cx + curW - 1, y, 1, 1);
      }

      if (isNode) {
        ctx.fillStyle = opts.nodeColor;
        ctx.fillRect(cx - 1, y, curW + 2, 1);

        if (stalk.hasLeaves && y > 18 && y < GROUND_Y - 58 && rand() > 0.48) {
          const dir = rand() > 0.5 ? 1 : -1;
          this.drawBambooLeafCluster(
            ctx,
            cx + (dir > 0 ? curW : 0),
            y,
            dir,
            opts.leafColor,
            opts.highlightColor,
            rand
          );
        }
      }
    }
  }

  private drawBambooLeafCluster(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    dir: number,
    leafColor: string,
    highlightColor: string,
    rand: () => number
  ): void {
    ctx.fillStyle = leafColor;
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(x + dir * i, y - Math.floor(i * 0.5), 1, 1);
    }

    const tipX = x + dir * 5;
    const tipY = y - 3;
    const leafAngles = [
      { dx: 1, dy: 0, len: 9 },
      { dx: 1, dy: 1, len: 11 },
      { dx: 0.7, dy: 1.2, len: 8 },
    ];

    for (const leaf of leafAngles) {
      const length = leaf.len + Math.floor(rand() * 3);
      for (let i = 0; i < length; i++) {
        const lx = Math.round(tipX + dir * i * leaf.dx);
        const ly = Math.round(tipY + i * leaf.dy);
        ctx.fillStyle = i < 3 ? highlightColor : leafColor;
        ctx.fillRect(lx, ly, 1, 1);
        if (i > 1 && i < length - 2) {
          ctx.fillStyle = leafColor;
          ctx.fillRect(lx, ly + 1, 1, 1);
        }
      }
    }
  }

  private drawStoneLantern(ctx: CanvasRenderingContext2D, cx: number, groundY: number): void {
    ctx.fillStyle = '#151e28';
    ctx.fillRect(cx - 5, groundY - 3, 10, 3);
    ctx.fillRect(cx - 3, groundY - 12, 6, 9);
    ctx.fillStyle = '#293b4d';
    ctx.fillRect(cx + 2, groundY - 12, 1, 9);
    ctx.fillRect(cx + 4, groundY - 3, 1, 3);
    ctx.fillStyle = '#192430';
    ctx.fillRect(cx - 5, groundY - 15, 10, 3);
    ctx.fillStyle = '#121a24';
    ctx.fillRect(cx - 4, groundY - 22, 8, 7);
    ctx.fillStyle = 'rgba(235, 160, 72, 0.22)';
    ctx.fillRect(cx - 6, groundY - 23, 12, 9);
    ctx.fillStyle = '#d98338';
    ctx.fillRect(cx - 2, groundY - 20, 4, 4);
    ctx.fillStyle = '#ffd584';
    ctx.fillRect(cx - 1, groundY - 19, 2, 2);
    ctx.fillStyle = '#16202b';
    ctx.fillRect(cx - 7, groundY - 24, 14, 2);
    ctx.fillRect(cx - 5, groundY - 26, 10, 2);
    ctx.fillRect(cx - 2, groundY - 28, 4, 2);
    ctx.fillStyle = '#2b4054';
    ctx.fillRect(cx - 1, groundY - 30, 2, 2);
    ctx.fillRect(cx + 2, groundY - 26, 3, 1);
  }

  private buildGroundTile(
    width: number,
    style: 'moss' | 'wisteria' | 'cobble' | 'tatami' | 'train_roof' | 'crater' | 'roof' | 'throne'
  ): HTMLCanvasElement {
    const height = GAME_HEIGHT - GROUND_Y + 4;
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const rand = seededRandom(881);

    if (style === 'train_roof') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 4, width, height - 4);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 4, width, 4);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, 4, width, 1);
      // Corrugated steel ridges & rivets
      for (let x = 0; x < width; x += 8) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, 4, 2, height - 4);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x + 4, 6, 1, 1);
      }
      return c;
    }

    if (style === 'tatami') {
      ctx.fillStyle = '#1c1008';
      ctx.fillRect(0, 4, width, height - 4);
      ctx.fillStyle = '#4a2e1a';
      ctx.fillRect(0, 4, width, 5);
      ctx.fillStyle = '#855836';
      ctx.fillRect(0, 4, width, 1);
      for (let x = 0; x < width; x += 32) {
        ctx.fillStyle = '#29170c';
        ctx.fillRect(x, 4, 2, height - 4);
      }
      return c;
    }

    if (style === 'throne') {
      ctx.fillStyle = '#120408';
      ctx.fillRect(0, 4, width, height - 4);
      ctx.fillStyle = '#3b0716';
      ctx.fillRect(0, 4, width, 5);
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(0, 4, width, 1);
      for (let x = 0; x < width; x += 24) {
        ctx.fillStyle = '#881337';
        ctx.fillRect(x, 5, 1, height - 5);
      }
      return c;
    }

    if (style === 'cobble' || style === 'roof') {
      ctx.fillStyle = style === 'roof' ? '#120809' : '#090d16';
      ctx.fillRect(0, 4, width, height - 4);
      ctx.fillStyle = style === 'roof' ? '#2e1416' : '#182233';
      ctx.fillRect(0, 4, width, 5);
      ctx.fillStyle = style === 'roof' ? '#7c2d12' : '#334155';
      ctx.fillRect(0, 4, width, 1);
      for (let x = 0; x < width; x += 14) {
        ctx.fillStyle = style === 'roof' ? '#451a14' : '#243247';
        ctx.fillRect(x + 1, 5, 11, 3);
      }
      return c;
    }

    // Natural earth/moss/wisteria/crater floor
    const baseSoil = style === 'crater' ? '#170f12' : style === 'wisteria' ? '#100c1f' : '#090d14';
    const subSoil = style === 'crater' ? '#24161a' : style === 'wisteria' ? '#191333' : '#0e1520';
    const topBand = style === 'crater' ? '#4a251d' : style === 'wisteria' ? '#2e2259' : '#182d33';
    const topHighlight = style === 'crater' ? '#9a3412' : style === 'wisteria' ? '#7e22ce' : '#25474d';
    const bladeA = style === 'crater' ? '#7c2d12' : style === 'wisteria' ? '#c084fc' : '#2b555c';
    const bladeB = style === 'crater' ? '#431407' : style === 'wisteria' ? '#6b21a8' : '#1b383f';

    ctx.fillStyle = baseSoil;
    ctx.fillRect(0, 4, width, height - 4);
    ctx.fillStyle = subSoil;
    ctx.fillRect(0, 4, width, 10);
    ctx.fillStyle = topBand;
    ctx.fillRect(0, 4, width, 3);
    ctx.fillStyle = topHighlight;
    ctx.fillRect(0, 4, width, 1);

    for (let x = 0; x < width; x += 3) {
      if (rand() > 0.35) {
        const h = 1 + Math.floor(rand() * 3);
        ctx.fillStyle = rand() > 0.4 ? bladeA : bladeB;
        ctx.fillRect(x, 4 - h, 1, h);
      }
      if (rand() > 0.72) {
        ctx.fillStyle = bladeA;
        ctx.fillRect(x, 6 + Math.floor(rand() * 3), 3, 1);
      }
    }

    for (let x = 8; x < width; x += 28) {
      const sx = x + Math.floor(rand() * 12);
      const sw = 8 + Math.floor(rand() * 8);
      ctx.fillStyle = subSoil;
      ctx.fillRect(sx, 5, sw, 3);
      ctx.fillStyle = topHighlight;
      ctx.fillRect(sx + 1, 5, sw - 2, 1);
    }

    return c;
  }

  private buildForegroundBambooTile(width: number, bodyColor: string, rimColor: string): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = GAME_HEIGHT;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const stalks = [
      { x: 42, w: 9, lean: -0.03 },
      { x: 265, w: 11, lean: 0.025 },
      { x: 510, w: 8, lean: -0.02 },
    ];

    for (const s of stalks) {
      for (let y = 0; y < GAME_HEIGHT; y++) {
        const cx = Math.round(s.x + s.lean * (GAME_HEIGHT - y));
        ctx.fillStyle = bodyColor;
        ctx.fillRect(cx, y, s.w, 1);
        ctx.fillStyle = rimColor;
        ctx.fillRect(cx + s.w - 1, y, 1, 1);

        if (y % 34 === 0) {
          ctx.fillStyle = bodyColor;
          ctx.fillRect(cx - 1, y, s.w + 2, 2);
        }
      }
    }

    const rand = seededRandom(992);
    for (let x = 0; x < width; x += 24) {
      if (rand() > 0.35) {
        const len = 10 + Math.floor(rand() * 14);
        for (let i = 0; i < len; i++) {
          ctx.fillStyle = bodyColor;
          ctx.fillRect(x + i, Math.floor(i * 0.45), 2, 2);
        }
      }
    }

    return c;
  }

  private buildForegroundPillars(width: number, bodyColor: string, rimColor: string): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = GAME_HEIGHT;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    for (const px of [28, 340, 610]) {
      ctx.fillStyle = bodyColor;
      ctx.fillRect(px, 0, 10, GAME_HEIGHT);
      ctx.fillStyle = rimColor;
      ctx.fillRect(px + 9, 0, 1, GAME_HEIGHT);
    }
    return c;
  }

  private initStars(): void {
    const rand = seededRandom(77);
    for (let i = 0; i < 42; i++) {
      this.stars.push({
        x: Math.floor(rand() * GAME_WIDTH),
        y: Math.floor(6 + rand() * 112),
        phase: rand() * Math.PI * 2,
        speed: 1.2 + rand() * 2.4,
        bright: rand() > 0.65,
      });
    }
  }

  private renderStars(ctx: CanvasRenderingContext2D, camera: CameraState, elapsed: number): void {
    for (const star of this.stars) {
      const twinkle = Math.sin(elapsed * star.speed + star.phase);
      if (twinkle < -0.55) continue;
      const sx = mod(Math.round(star.x - camera.x * 0.015), GAME_WIDTH);
      ctx.fillStyle =
        star.bright && twinkle > 0.25
          ? 'rgba(218, 240, 255, 0.85)'
          : 'rgba(130, 175, 210, 0.45)';
      ctx.fillRect(sx, star.y, 1, 1);
    }
  }

  private initFog(): void {
    this.fogWisps = [
      { x: 0, y: 152, width: 170, height: 14, speed: 6, alpha: 0.14, parallax: 0.24 },
      { x: 220, y: 162, width: 210, height: 16, speed: 4.5, alpha: 0.16, parallax: 0.24 },
      { x: 90, y: 176, width: 250, height: 18, speed: -5.5, alpha: 0.15, parallax: 0.34 },
      { x: 340, y: 168, width: 180, height: 15, speed: 7, alpha: 0.13, parallax: 0.34 },
      { x: 20, y: GROUND_Y - 18, width: 190, height: 14, speed: -10, alpha: 0.18, parallax: 0.68 },
      { x: 240, y: GROUND_Y - 12, width: 220, height: 12, speed: -13, alpha: 0.22, parallax: 0.78 },
      { x: 130, y: GROUND_Y - 24, width: 150, height: 10, speed: -8, alpha: 0.14, parallax: 0.65 },
    ];
  }

  private renderFogLayer(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    elapsed: number,
    startIdx: number,
    endIdx: number,
    tint: [number, number, number],
    alphaScale: number
  ): void {
    const span = GAME_WIDTH + 240;
    const [r, g, b] = tint;
    for (let i = startIdx; i < endIdx; i++) {
      const f = this.fogWisps[i];
      const wx = mod(Math.round(f.x + elapsed * f.speed - camera.x * f.parallax), span) - 220;
      const a = f.alpha * alphaScale;

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(a * 0.45).toFixed(3)})`;
      ctx.fillRect(wx, f.y + 3, f.width, f.height - 6);

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(a * 0.75).toFixed(3)})`;
      ctx.fillRect(
        wx + Math.round(f.width * 0.12),
        f.y + 1,
        Math.round(f.width * 0.76),
        f.height - 2
      );
    }
  }

  private initMotes(): void {
    const rand = seededRandom(551);
    for (let i = 0; i < 24; i++) {
      this.motes.push({
        x: rand() * GAME_WIDTH,
        y: 60 + rand() * (GROUND_Y - 70),
        vx: -8 - rand() * 10,
        vy: -3 + rand() * 6,
        phase: rand() * Math.PI * 2,
        warm: rand() > 0.78,
      });
    }
  }

  private renderMotes(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    elapsed: number,
    theme: StageTheme
  ): void {
    for (const m of this.motes) {
      const mx = mod(Math.round(m.x + elapsed * m.vx - camera.x * 0.85), GAME_WIDTH);
      const my = Math.round(m.y + Math.sin(elapsed * 1.4 + m.phase) * 8);
      const pulse = 0.45 + 0.55 * Math.sin(elapsed * 2.2 + m.phase);
      if (m.warm || theme === 'swordsmith_village' || theme === 'train_wreckage') {
        ctx.fillStyle = `rgba(245, 210, 130, ${(pulse * 0.7).toFixed(2)})`;
      } else if (theme === 'infinity_gate' || theme === 'tsuzumi_mansion') {
        ctx.fillStyle = `rgba(251, 191, 36, ${(pulse * 0.68).toFixed(2)})`;
      } else {
        ctx.fillStyle = `rgba(170, 230, 240, ${(pulse * 0.5).toFixed(2)})`;
      }
      ctx.fillRect(mx, my, 1, 1);
    }
  }
}
