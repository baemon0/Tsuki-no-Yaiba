import { Gamepad2, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BlacksmithModal } from './components/BlacksmithModal';
import { GameStage } from './components/GameStage';
import { RecordsModal } from './components/RecordsModal';
import { CHARACTER_MAP, type CharacterId } from './game/characters';
import type { DifficultyId } from './game/difficulty';
import type { GameEngine, GameOverStats } from './game/engine/GameEngine';
import {
  SECRET_TITLE_MAP,
  loadMetaProgression,
  type MetaProgressionState,
  type SecretTitleDef,
} from './game/metaProgression';
import type { GameMode } from './game/storyStages';
import { loadEndlessHighScore } from './game/systems/CombatSystem';
import type { GamePhase } from './game/types';
import type { UpgradeCardDef, UpgradeId } from './game/upgrades';

function detectTouchCapable(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  );
}

export default function App() {
  const engineRef = useRef<GameEngine | null>(null);
  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [mode, setMode] = useState<GameMode>('endless');
  const [endlessHighScore, setEndlessHighScore] = useState<number>(() => loadEndlessHighScore());
  const [metaState, setMetaState] = useState<MetaProgressionState>(() => loadMetaProgression());
  const [showBlacksmith, setShowBlacksmith] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(() =>
    detectTouchCapable()
  );
  const [unlockedToast, setUnlockedToast] = useState<SecretTitleDef | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<CharacterId>('tanjiro');
  const [difficultyId, setDifficultyId] = useState<DifficultyId>('kinoe');
  const [muted, setMuted] = useState(false);
  const [gameOverStats, setGameOverStats] = useState<GameOverStats | null>(null);
  const [victoryStats, setVictoryStats] = useState<GameOverStats | null>(null);
  const [upgradeCards, setUpgradeCards] = useState<UpgradeCardDef[]>([]);
  const [ultimateReady, setUltimateReady] = useState(false);

  const handleTitleUnlocked = useCallback((title: SecretTitleDef) => {
    setUnlockedToast(title);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setUnlockedToast(null);
      toastTimerRef.current = null;
    }, 3600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleEngineReady = useCallback((engine: GameEngine) => {
    engineRef.current = engine;
  }, []);

  const handleSelectMode = useCallback((nextMode: GameMode) => {
    engineRef.current?.unlockAudio();
    setMode(nextMode);
    engineRef.current?.setMode(nextMode);
  }, []);

  const handleSelectDifficulty = useCallback((id: DifficultyId) => {
    engineRef.current?.unlockAudio();
    setDifficultyId(id);
    engineRef.current?.setDifficulty(id);
  }, []);

  const handleOpenCharacterSelect = useCallback(() => {
    engineRef.current?.unlockAudio();
    setShowBlacksmith(false);
    setShowRecords(false);
    setGameOverStats(null);
    setVictoryStats(null);
    setUpgradeCards([]);
    setPhase('CHARACTER_SELECT');
    engineRef.current?.setPhase('CHARACTER_SELECT');
    engineRef.current?.setSelectedCharacter(selectedCharacterId);
  }, [selectedCharacterId]);

  const handleOpenBlacksmith = useCallback(() => {
    engineRef.current?.unlockAudio();
    setShowRecords(false);
    setMetaState(loadMetaProgression());
    setShowBlacksmith(true);
  }, []);

  const handleOpenRecords = useCallback(() => {
    engineRef.current?.unlockAudio();
    setShowBlacksmith(false);
    setMetaState(loadMetaProgression());
    setShowRecords(true);
  }, []);

  const handleBlacksmithPurchase = useCallback(
    (nextState: MetaProgressionState) => {
      const hadMaster = metaState.unlockedTitles.includes('master_blacksmith');
      setMetaState(nextState);
      engineRef.current?.refreshMeta();
      if (!hadMaster && nextState.unlockedTitles.includes('master_blacksmith')) {
        const def = SECRET_TITLE_MAP.master_blacksmith;
        if (def) handleTitleUnlocked(def);
      }
    },
    [metaState.unlockedTitles, handleTitleUnlocked]
  );

  const handleSelectCharacter = useCallback((id: CharacterId) => {
    setSelectedCharacterId(id);
    engineRef.current?.setSelectedCharacter(id);
  }, []);

  const handleConfirmCharacter = useCallback(
    (id: CharacterId) => {
      setSelectedCharacterId(id);
      setGameOverStats(null);
      setVictoryStats(null);
      setUpgradeCards([]);
      setPhase('PLAYING');
      engineRef.current?.startHunt(id, difficultyId, mode);
    },
    [difficultyId, mode]
  );

  const handleBackToTitle = useCallback(() => {
    setGameOverStats(null);
    setVictoryStats(null);
    setUpgradeCards([]);
    setEndlessHighScore(loadEndlessHighScore());
    setMetaState(loadMetaProgression());
    setPhase('TITLE_MENU');
    engineRef.current?.setPhase('TITLE_MENU');
  }, []);

  const handleUpgradeOffer = useCallback((cards: UpgradeCardDef[]) => {
    setUpgradeCards(cards);
    setPhase('UPGRADE_SELECT');
  }, []);

  const handlePickUpgrade = useCallback((id: UpgradeId) => {
    setUpgradeCards([]);
    setPhase('PLAYING');
    engineRef.current?.applyUpgrade(id);
  }, []);

  const handleGameOver = useCallback((stats: GameOverStats) => {
    setEndlessHighScore(loadEndlessHighScore());
    setMetaState(loadMetaProgression());
    setGameOverStats(stats);
    setPhase('GAME_OVER');
  }, []);

  const handleVictory = useCallback((stats: GameOverStats) => {
    setEndlessHighScore(loadEndlessHighScore());
    setMetaState(loadMetaProgression());
    setVictoryStats(stats);
    setPhase('VICTORY');
  }, []);

  const handleReset = useCallback(() => {
    setGameOverStats(null);
    setVictoryStats(null);
    setUpgradeCards([]);
    setPhase('PLAYING');
    engineRef.current?.startHunt(selectedCharacterId, difficultyId, mode);
  }, [selectedCharacterId, difficultyId, mode]);

  const handleToggleMute = () => {
    engineRef.current?.unlockAudio();
    const next = !muted;
    setMuted(next);
    engineRef.current?.setMuted(next);
  };

  const activeChar = CHARACTER_MAP[selectedCharacterId];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050811] text-slate-100">
      {/* Full-screen game canvas */}
      <GameStage
        phase={phase}
        mode={mode}
        endlessHighScore={endlessHighScore}
        selectedCharacterId={selectedCharacterId}
        difficultyId={difficultyId}
        metaState={metaState}
        showBlacksmith={showBlacksmith}
        showRecords={showRecords}
        showTouchControls={showTouchControls}
        gameOverStats={gameOverStats}
        victoryStats={victoryStats}
        upgradeCards={upgradeCards}
        ultimateReady={ultimateReady}
        onSelectMode={handleSelectMode}
        onSelectDifficulty={handleSelectDifficulty}
        onOpenCharacterSelect={handleOpenCharacterSelect}
        onOpenBlacksmith={handleOpenBlacksmith}
        onOpenRecords={handleOpenRecords}
        onMetaUpdated={setMetaState}
        onTitleUnlocked={handleTitleUnlocked}
        onSelectCharacter={handleSelectCharacter}
        onConfirmCharacter={handleConfirmCharacter}
        onBackToTitle={handleBackToTitle}
        onGameOver={handleGameOver}
        onVictory={handleVictory}
        onUpgradeOffer={handleUpgradeOffer}
        onPickUpgrade={handlePickUpgrade}
        onUltimateReadyChange={setUltimateReady}
        onPlayAgain={handleReset}
        onEngineReady={handleEngineReady}
      />

      {showBlacksmith && (
        <BlacksmithModal
          metaState={metaState}
          onPurchase={handleBlacksmithPurchase}
          onClose={() => setShowBlacksmith(false)}
        />
      )}

      {showRecords && (
        <RecordsModal
          metaState={metaState}
          onMetaUpdated={setMetaState}
          onClose={() => setShowRecords(false)}
        />
      )}

      {/* Secret Slayer Title Unlock Banner Toast */}
      {unlockedToast && (
        <div
          className="pointer-events-none fixed top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 rounded border-2 px-3.5 py-2 shadow-2xl backdrop-blur-xs"
          style={{
            borderColor: unlockedToast.brightColor,
            backgroundColor: `${unlockedToast.darkColor}ee`,
          }}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded border font-display text-sm font-bold"
            style={{
              borderColor: unlockedToast.color,
              backgroundColor: '#050811',
              color: unlockedToast.brightColor,
            }}
          >
            {unlockedToast.badgeCode}
          </span>
          <div>
            <div className="font-mono-tech text-[9px] font-bold uppercase tracking-widest text-amber-300">
              Secret Title Unlocked · لقب سري جديد
            </div>
            <div
              className="text-xs sm:text-sm font-bold"
              style={{ color: unlockedToast.brightColor }}
            >
              {unlockedToast.name} · {unlockedToast.arabicName}
            </div>
          </div>
        </div>
      )}

      {/* Minimal icon-only Touch Toggle, Sound and Restart buttons in top-right below HUD */}
      {phase !== 'CHARACTER_SELECT' && !showBlacksmith && !showRecords && (
        <div
          className={`fixed right-[2.2%] z-20 flex items-center gap-1.5 ${
            phase === 'PLAYING' || phase === 'UPGRADE_SELECT' ? 'top-[13.8%]' : 'top-3'
          }`}
        >
          {phase === 'PLAYING' && (
            <button
              type="button"
              onClick={() => setShowTouchControls((prev) => !prev)}
              title={showTouchControls ? 'Hide Touch Controls' : 'Show Touch Controls'}
              aria-label={showTouchControls ? 'Hide Touch Controls' : 'Show Touch Controls'}
              aria-pressed={showTouchControls}
              className={`flex h-7 w-7 items-center justify-center rounded border backdrop-blur-xs transition-colors cursor-pointer ${
                showTouchControls
                  ? 'border-cyan-300/60 bg-cyan-950/75 text-cyan-200'
                  : 'border-white/15 bg-[#060912]/70 text-slate-400 hover:bg-white/15 hover:text-slate-200'
              }`}
            >
              <Gamepad2 className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleMute}
            title={muted ? 'Unmute Sound' : 'Mute Sound'}
            aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
            className="flex h-7 w-7 items-center justify-center rounded border border-white/15 bg-[#060912]/70 text-slate-200 backdrop-blur-xs hover:bg-white/15 transition-colors cursor-pointer"
          >
            {muted ? (
              <VolumeX className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-teal-300" />
            )}
          </button>

          {(phase === 'PLAYING' ||
            phase === 'UPGRADE_SELECT' ||
            phase === 'GAME_OVER' ||
            phase === 'VICTORY') && (
            <button
              type="button"
              onClick={handleReset}
              title="Restart Run"
              aria-label="Restart Run"
              className="flex h-7 w-7 items-center justify-center rounded border border-white/15 bg-[#060912]/70 text-slate-200 backdrop-blur-xs hover:bg-white/15 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Single thin horizontal controls bar along the very bottom edge */}
      <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.06] bg-[#050811]/75 px-3 py-1 backdrop-blur-xs">
        <div className="mx-auto flex items-center justify-center gap-x-2 sm:gap-x-3 overflow-hidden text-[10px] sm:text-[11px] leading-tight text-slate-300 whitespace-nowrap">
          <span className="font-semibold truncate" style={{ color: activeChar.colors.bright }}>
            {activeChar.shortName} · {activeChar.arabicStyleName}
          </span>
          <span aria-hidden="true" className="text-slate-600">|</span>
          <span>
            <strong className="font-mono-tech font-medium text-white">A/D</strong> Move
          </span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span>
            <strong className="font-mono-tech font-medium text-white">W/↑</strong> Jump/Wall
          </span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span>
            <strong className="font-mono-tech font-medium text-white">S/↓+W</strong> Drop
          </span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span>
            <strong className="font-mono-tech font-medium text-white">J/Z</strong> Slash/Parry
          </span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span>
            <strong className="font-mono-tech font-medium text-white">K/X</strong> Dash
          </span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span>
            <strong className="font-mono-tech font-medium text-white">Space</strong> Breath
          </span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span>
            <strong className="font-mono-tech font-medium text-amber-300">C/L</strong> Ult
          </span>
        </div>
      </footer>
    </div>
  );
}
