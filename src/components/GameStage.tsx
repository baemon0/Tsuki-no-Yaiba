import { useEffect, useMemo, useRef } from 'react';
import { CHARACTER_MAP, type CharacterId } from '../game/characters';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/constants';
import { DIFFICULTIES, DIFFICULTY_MAP, type DifficultyId } from '../game/difficulty';
import { GameEngine, type GameOverStats } from '../game/engine/GameEngine';
import {
  SECRET_TITLE_MAP,
  getSlayerRankProgress,
  type MetaProgressionState,
  type SecretTitleDef,
} from '../game/metaProgression';
import { getCharacterPreviewDataUrl } from '../game/sprites/samuraiSprites';
import { STORY_STAGES, type GameMode } from '../game/storyStages';
import type { GamePhase } from '../game/types';
import type { UpgradeCardDef, UpgradeId } from '../game/upgrades';
import { CharacterSelectOverlay } from './CharacterSelectOverlay';
import { TouchControlsOverlay } from './TouchControlsOverlay';
import { UpgradeCardsOverlay } from './UpgradeCardsOverlay';

interface GameStageProps {
  phase: GamePhase;
  mode: GameMode;
  endlessHighScore: number;
  selectedCharacterId: CharacterId;
  difficultyId: DifficultyId;
  metaState: MetaProgressionState;
  showBlacksmith: boolean;
  showRecords: boolean;
  showTouchControls: boolean;
  gameOverStats: GameOverStats | null;
  victoryStats: GameOverStats | null;
  upgradeCards: UpgradeCardDef[];
  ultimateReady: boolean;
  onSelectMode: (mode: GameMode) => void;
  onSelectDifficulty: (id: DifficultyId) => void;
  onOpenCharacterSelect: () => void;
  onOpenBlacksmith: () => void;
  onOpenRecords: () => void;
  onMetaUpdated: (meta: MetaProgressionState) => void;
  onTitleUnlocked: (title: SecretTitleDef) => void;
  onSelectCharacter: (id: CharacterId) => void;
  onConfirmCharacter: (id: CharacterId) => void;
  onBackToTitle: () => void;
  onGameOver: (stats: GameOverStats) => void;
  onVictory: (stats: GameOverStats) => void;
  onUpgradeOffer: (cards: UpgradeCardDef[]) => void;
  onPickUpgrade: (id: UpgradeId) => void;
  onUltimateReadyChange: (ready: boolean) => void;
  onPlayAgain: () => void;
  onEngineReady?: (engine: GameEngine) => void;
}

export function GameStage({
  phase,
  mode,
  endlessHighScore,
  selectedCharacterId,
  difficultyId,
  metaState,
  showBlacksmith,
  showRecords,
  showTouchControls,
  gameOverStats,
  victoryStats,
  upgradeCards,
  ultimateReady,
  onSelectMode,
  onSelectDifficulty,
  onOpenCharacterSelect,
  onOpenBlacksmith,
  onOpenRecords,
  onMetaUpdated,
  onTitleUnlocked,
  onSelectCharacter,
  onConfirmCharacter,
  onBackToTitle,
  onGameOver,
  onVictory,
  onUpgradeOffer,
  onPickUpgrade,
  onUltimateReadyChange,
  onPlayAgain,
  onEngineReady,
}: GameStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(
      canvas,
      onGameOver,
      onVictory,
      onUpgradeOffer,
      onUltimateReadyChange,
      onMetaUpdated,
      onTitleUnlocked
    );
    engineRef.current = engine;
    engine.start();
    onEngineReady?.(engine);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [
    onEngineReady,
    onGameOver,
    onVictory,
    onUpgradeOffer,
    onUltimateReadyChange,
    onMetaUpdated,
    onTitleUnlocked,
  ]);

  // Keyboard shortcuts on Title Screen (Enter) and Game Over / Victory (Enter / R)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showBlacksmith || showRecords) return;
      if (phase === 'TITLE_MENU' && e.code === 'Enter') {
        e.preventDefault();
        onOpenCharacterSelect();
      } else if (
        (phase === 'GAME_OVER' || phase === 'VICTORY') &&
        (e.code === 'Enter' || e.code === 'KeyR')
      ) {
        e.preventDefault();
        onPlayAgain();
        canvasRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, showBlacksmith, showRecords, onOpenCharacterSelect, onPlayAgain]);

  const victoryPreviewUrl = useMemo(() => {
    if (phase !== 'VICTORY' || !victoryStats) return '';
    return getCharacterPreviewDataUrl(victoryStats.characterId);
  }, [phase, victoryStats]);

  const handleConfirm = (id: CharacterId) => {
    onConfirmCharacter(id);
    canvasRef.current?.focus();
  };

  const handlePlayAgainClick = () => {
    onPlayAgain();
    canvasRef.current?.focus();
  };

  const rankInfo = useMemo(
    () => getSlayerRankProgress(metaState.totalDemonsSlain),
    [metaState.totalDemonsSlain]
  );

  const equippedTitle = metaState.equippedTitleId
    ? SECRET_TITLE_MAP[metaState.equippedTitleId] ?? null
    : null;

  const activeDifficulty = DIFFICULTY_MAP[difficultyId];
  const defeatedChar = gameOverStats
    ? CHARACTER_MAP[gameOverStats.characterId]
    : CHARACTER_MAP[selectedCharacterId];
  const defeatedDiff = gameOverStats
    ? DIFFICULTY_MAP[gameOverStats.difficultyId]
    : activeDifficulty;
  const victoryChar = victoryStats
    ? CHARACTER_MAP[victoryStats.characterId]
    : CHARACTER_MAP[selectedCharacterId];
  const victoryDiff = victoryStats
    ? DIFFICULTY_MAP[victoryStats.difficultyId]
    : activeDifficulty;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050811] touch-none select-none">
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        tabIndex={0}
        aria-label="Tsuki no Yaiba game canvas"
        className="pixel-canvas block w-screen h-screen object-cover outline-none touch-none"
      />

      {phase === 'TITLE_MENU' && (
        <div className="absolute inset-0 bg-gradient-to-t from-[#050811]/90 via-[#050811]/55 to-[#050811]/45 flex items-center justify-center p-3 pb-10">
          <div className="w-full max-w-xl text-center">
            <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-wide text-slate-100 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              Tsuki no Yaiba - نصل القمر
            </h2>

            {/* Compact Demon Slayer Rank Badge, Equipped Title & Saved Blood Crystals */}
            <div className="mt-2 inline-flex flex-wrap items-center justify-center gap-2 rounded-md border border-white/10 bg-[#070b14]/85 px-2.5 py-1 backdrop-blur-xs">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span
                  className="font-mono-tech font-bold"
                  style={{ color: rankInfo.current.brightColor }}
                >
                  階 {rankInfo.current.name} ({rankInfo.current.arabicName})
                </span>
                <span className="text-slate-500">·</span>
                <span className="font-mono-tech text-slate-300 tabular-nums">
                  {metaState.totalDemonsSlain} Slain
                </span>
              </div>
              {equippedTitle && (
                <>
                  <span aria-hidden="true" className="text-slate-600">|</span>
                  <span
                    className="font-mono-tech text-[11px] font-bold"
                    style={{ color: equippedTitle.brightColor }}
                  >
                    ★ {equippedTitle.badgeCode} {equippedTitle.name}
                  </span>
                </>
              )}
              <span aria-hidden="true" className="text-slate-600">|</span>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-rose-400 leading-none">◆</span>
                <span className="font-mono-tech font-bold text-rose-200 tabular-nums">
                  {metaState.bloodCrystals.toLocaleString()}
                </span>
                <span className="text-rose-300/85">Crystals</span>
              </div>
            </div>

            <p className="mt-1.5 text-[11px] sm:text-xs text-slate-300/90 max-w-md mx-auto leading-snug">
              Select your campaign mode and difficulty, forge permanent upgrades, then enter the night.
            </p>

            {/* Game Mode Selector: Endless Survival vs Story Campaign (10 Stages) */}
            <div className="mt-3.5 mx-auto max-w-lg">
              <div
                role="radiogroup"
                aria-label="Game Mode"
                className="grid grid-cols-2 gap-1.5 rounded-lg border border-white/10 bg-[#070b14]/85 p-1 backdrop-blur-xs"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === 'endless'}
                  onClick={() => onSelectMode('endless')}
                  className={`rounded-md px-2.5 py-2 text-left transition-all cursor-pointer border ${
                    mode === 'endless'
                      ? 'border-cyan-400/60 bg-cyan-950/55 shadow-sm'
                      : 'border-transparent bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${
                        mode === 'endless' ? 'text-cyan-200' : 'text-slate-300'
                      }`}
                    >
                      Endless Survival
                    </span>
                    <span className="text-[10px] font-mono-tech text-cyan-300/90 whitespace-nowrap">
                      HI {endlessHighScore.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400 truncate">
                    البقاء اللانهائي · Endless waves &amp; Demon Moon
                  </div>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === 'story'}
                  onClick={() => onSelectMode('story')}
                  className={`rounded-md px-2.5 py-2 text-left transition-all cursor-pointer border ${
                    mode === 'story'
                      ? 'border-rose-400/65 bg-rose-950/55 shadow-sm'
                      : 'border-transparent bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${
                        mode === 'story' ? 'text-rose-200' : 'text-slate-300'
                      }`}
                    >
                      Story Campaign
                    </span>
                    <span className="text-[10px] font-mono-tech text-rose-300/90 whitespace-nowrap">
                      10 STAGES
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400 truncate">
                    وضع القصة - 10 مراحل · Final Selection to Muzan
                  </div>
                </button>
              </div>
            </div>

            {/* 3-Tier Demon Slayer Rank Difficulty Selector */}
            <div className="mt-2.5 mx-auto max-w-lg">
              <div
                role="radiogroup"
                aria-label="Difficulty Rank"
                className="grid grid-cols-3 gap-1.5 rounded-lg border border-white/10 bg-[#070b14]/85 p-1 backdrop-blur-xs"
              >
                {DIFFICULTIES.map((tier) => {
                  const selected = tier.id === difficultyId;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onSelectDifficulty(tier.id)}
                      className={`rounded-md px-2 py-1.5 text-center transition-all cursor-pointer border ${
                        selected
                          ? 'bg-slate-900/95 shadow-sm'
                          : 'border-transparent bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                      }`}
                      style={
                        selected
                          ? {
                              borderColor: `${tier.color}99`,
                              backgroundColor: `${tier.darkColor}55`,
                            }
                          : undefined
                      }
                    >
                      <div
                        className="text-xs sm:text-sm font-semibold whitespace-nowrap"
                        style={{ color: selected ? tier.brightColor : undefined }}
                      >
                        {tier.name}
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-400 whitespace-nowrap">
                        {tier.arabicName} · {tier.tierLabel}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p
                className="mt-1.5 text-[11px] font-medium"
                style={{ color: activeDifficulty.brightColor }}
              >
                {activeDifficulty.summary}
                {mode === 'story' ? ' · +30% HP healed after each Stage Boss' : ''}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={onOpenCharacterSelect}
                className="inline-flex items-center justify-center rounded-md border border-teal-300/35 bg-teal-600/90 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg hover:bg-teal-500 transition-colors cursor-pointer whitespace-nowrap"
              >
                Start Hunt / ابدأ الصيد
              </button>
              <button
                type="button"
                onClick={onOpenBlacksmith}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-amber-400/45 bg-amber-950/85 px-3.5 py-2 text-xs sm:text-sm font-semibold text-amber-100 shadow-lg hover:bg-amber-900/90 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Blacksmith / ورشة الحداد</span>
              </button>
              <button
                type="button"
                onClick={onOpenRecords}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-purple-400/45 bg-purple-950/85 px-3.5 py-2 text-xs sm:text-sm font-semibold text-purple-100 shadow-lg hover:bg-purple-900/90 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Records / السجل</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'CHARACTER_SELECT' && (
        <CharacterSelectOverlay
          selectedId={selectedCharacterId}
          onSelect={onSelectCharacter}
          onConfirm={handleConfirm}
          onBack={onBackToTitle}
        />
      )}

      {phase === 'GAME_OVER' && gameOverStats && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-6">
          <div className="w-full max-w-xs rounded-lg border border-white/15 bg-[#0b101b]/95 p-5 text-center shadow-2xl">
            <h2 className="font-display text-2xl font-bold tracking-wide text-rose-400">
              Defeated · هُزمت
            </h2>
            <div className="mt-1 text-xs font-medium" style={{ color: defeatedChar.colors.bright }}>
              {defeatedChar.name} · {defeatedChar.arabicStyleName}
            </div>
            <div className="mt-0.5 text-[11px] font-medium" style={{ color: defeatedDiff.brightColor }}>
              {defeatedDiff.name} ({defeatedDiff.arabicName}) ·{' '}
              {gameOverStats.mode === 'story' ? 'Story Campaign' : 'Endless Survival'}
            </div>

            {gameOverStats.mode === 'story' && (
              <div className="mt-2 text-xs text-rose-200/90 font-medium">
                Stage {gameOverStats.stage}/10:{' '}
                {STORY_STAGES[Math.max(0, gameOverStats.stage - 1)].name} (Wave{' '}
                {gameOverStats.stageWave}/3)
              </div>
            )}

            <div className="mt-2.5 flex items-center justify-center gap-2.5 text-xs text-slate-300 tabular-nums">
              <span>Score {gameOverStats.score.toLocaleString()}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>{gameOverStats.kills} Slain</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>Max x{gameOverStats.maxCombo}</span>
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 text-[11px] font-mono-tech">
              <span className="text-rose-300">
                ◆ +{gameOverStats.crystalsEarned} Crystals
              </span>
              <span className="text-slate-600">·</span>
              <span style={{ color: rankInfo.current.brightColor }}>
                {rankInfo.current.name}
              </span>
            </div>
            {gameOverStats.mode === 'endless' && (
              <div className="mt-0.5 text-[11px] font-mono-tech text-cyan-300">
                Wave {gameOverStats.wave} · High Score {gameOverStats.highScore.toLocaleString()}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handlePlayAgainClick}
                className="w-full rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 transition-colors cursor-pointer whitespace-nowrap"
              >
                Play Again / أعد المحاولة
              </button>
              <button
                type="button"
                onClick={onOpenCharacterSelect}
                className="w-full rounded-md border border-white/15 bg-slate-900/80 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
              >
                Change Slayer / تغيير الشخصية
              </button>
              <button
                type="button"
                onClick={onBackToTitle}
                className="w-full rounded-md border border-white/10 bg-transparent px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer whitespace-nowrap"
              >
                Title Screen / القائمة الرئيسية
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'VICTORY' && victoryStats && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#16050b]/82 via-[#090814]/86 to-[#050811]/92 backdrop-blur-[2px] flex items-center justify-center p-4 pb-10">
          <div className="relative w-full max-w-md border-2 border-amber-400/60 bg-[#0b0a14]/95 p-5 sm:p-6 text-center shadow-[0_0_50px_rgba(245,158,11,0.22)]">
            {/* Pixel-art corner flourishes */}
            <span className="absolute top-1 left-1 h-2 w-2 bg-amber-300" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-amber-300" />
            <span className="absolute bottom-1 left-1 h-2 w-2 bg-amber-300" />
            <span className="absolute bottom-1 right-1 h-2 w-2 bg-amber-300" />

            <div className="text-[11px] font-mono-tech uppercase tracking-[0.22em] text-amber-300">
              Story Campaign Complete · 10/10 Stages
            </div>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-wide text-amber-200 drop-shadow-[0_2px_10px_rgba(245,158,11,0.4)]">
              Muzan Vanquished · انتصار أسطوري
            </h2>
            <p className="mt-1 text-xs text-rose-200/85">
              Demon King Muzan has fallen — dawn rises over the Demon Slayer Corps.
            </p>

            {/* Chosen Slayer Pixel-Art Showcase */}
            <div className="mt-4 flex items-center justify-center gap-4 rounded border border-amber-400/25 bg-[#12101f]/85 px-4 py-3">
              {victoryPreviewUrl && (
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-white/15 bg-[#070912]"
                  style={{ borderColor: `${victoryChar.colors.primary}88` }}
                >
                  <img
                    src={victoryPreviewUrl}
                    alt={victoryChar.name}
                    className="h-14 w-14 object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              )}
              <div className="text-left">
                <div className="text-sm sm:text-base font-bold text-white">
                  {victoryChar.name}
                </div>
                <div
                  className="text-xs font-medium"
                  style={{ color: victoryChar.colors.bright }}
                >
                  {victoryChar.styleName} · {victoryChar.arabicStyleName}
                </div>
                <div
                  className="mt-1 text-[11px] font-mono-tech font-semibold"
                  style={{ color: victoryDiff.brightColor }}
                >
                  Rank: {victoryDiff.name} ({victoryDiff.arabicName})
                </div>
              </div>
            </div>

            {/* Final Score & Stats */}
            <div className="mt-3.5 grid grid-cols-4 gap-1.5 text-center">
              <div className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-2">
                <div className="text-[9px] uppercase tracking-wider text-slate-400">
                  Final Score
                </div>
                <div className="mt-0.5 text-xs sm:text-sm font-bold font-mono-tech text-amber-300 tabular-nums">
                  {victoryStats.score.toLocaleString()}
                </div>
              </div>
              <div className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-2">
                <div className="text-[9px] uppercase tracking-wider text-slate-400">
                  Demons Slain
                </div>
                <div className="mt-0.5 text-xs sm:text-sm font-bold font-mono-tech text-slate-100 tabular-nums">
                  {victoryStats.kills}
                </div>
              </div>
              <div className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-2">
                <div className="text-[9px] uppercase tracking-wider text-slate-400">
                  Max Combo
                </div>
                <div className="mt-0.5 text-xs sm:text-sm font-bold font-mono-tech text-cyan-300 tabular-nums">
                  x{victoryStats.maxCombo}
                </div>
              </div>
              <div className="rounded border border-rose-400/25 bg-rose-950/25 px-1.5 py-2">
                <div className="text-[9px] uppercase tracking-wider text-rose-300/85">
                  Crystals
                </div>
                <div className="mt-0.5 text-xs sm:text-sm font-bold font-mono-tech text-rose-200 tabular-nums">
                  ◆ +{victoryStats.crystalsEarned}
                </div>
              </div>
            </div>
            <div className="mt-2 text-[11px] font-mono-tech text-slate-300">
              Corps Rank:{' '}
              <span className="font-bold" style={{ color: rankInfo.current.brightColor }}>
                {rankInfo.current.name} ({rankInfo.current.arabicName})
              </span>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handlePlayAgainClick}
                className="flex-1 rounded-md border border-amber-300/40 bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 transition-colors cursor-pointer whitespace-nowrap"
              >
                Play Again / العب مجدداً
              </button>
              <button
                type="button"
                onClick={onBackToTitle}
                className="flex-1 rounded-md border border-white/15 bg-slate-900/90 px-4 py-2 text-xs sm:text-sm font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
              >
                Title Screen / القائمة الرئيسية
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'UPGRADE_SELECT' && upgradeCards.length > 0 && (
        <UpgradeCardsOverlay
          cards={upgradeCards}
          onPick={(id) => {
            onPickUpgrade(id);
            canvasRef.current?.focus();
          }}
        />
      )}

      {/* Roblox-style Dynamic Floating Thumbstick + Ergonomic Bottom-Right Action Arc */}
      {phase === 'PLAYING' && showTouchControls && (
        <TouchControlsOverlay
          input={engineRef.current?.input ?? null}
          ultimateReady={ultimateReady}
          onUnlockAudio={() => engineRef.current?.unlockAudio()}
        />
      )}
    </div>
  );
}
