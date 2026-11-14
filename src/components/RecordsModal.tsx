import { useEffect, useMemo, useState } from 'react';
import {
  DEMON_BESTIARY,
  SECRET_TITLES,
  SLAYER_RANKS,
  getSlayerRankProgress,
  setEquippedTitle,
  type MetaProgressionState,
} from '../game/metaProgression';
import { getBossPreviewDataUrl } from '../game/sprites/enemySprites';
import type { BossId } from '../game/storyStages';

interface RecordsModalProps {
  metaState: MetaProgressionState;
  onMetaUpdated?: (meta: MetaProgressionState) => void;
  onClose: () => void;
}

type RecordsTab = 'bestiary' | 'titles';

export function RecordsModal({
  metaState,
  onMetaUpdated,
  onClose,
}: RecordsModalProps) {
  const [activeTab, setActiveTab] = useState<RecordsTab>('bestiary');

  const firstDefeated = useMemo(() => {
    const found = DEMON_BESTIARY.find(
      (entry) => (metaState.defeatedBosses[entry.bossId] ?? 0) > 0
    );
    return found?.bossId ?? 'hand_demon';
  }, [metaState.defeatedBosses]);

  const [selectedBossId, setSelectedBossId] = useState<BossId>(firstDefeated);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const rankProgress = useMemo(
    () => getSlayerRankProgress(metaState.totalDemonsSlain),
    [metaState.totalDemonsSlain]
  );

  const unlockedRankSet = useMemo(() => {
    const set = new Set(metaState.unlockedRankIds);
    for (const r of SLAYER_RANKS) {
      if (metaState.totalDemonsSlain >= r.minSlain) {
        set.add(r.id);
      }
    }
    return set;
  }, [metaState.unlockedRankIds, metaState.totalDemonsSlain]);

  const unlockedTitleSet = useMemo(
    () => new Set(metaState.unlockedTitles),
    [metaState.unlockedTitles]
  );

  const defeatedCount = useMemo(
    () =>
      DEMON_BESTIARY.filter((entry) => (metaState.defeatedBosses[entry.bossId] ?? 0) > 0)
        .length,
    [metaState.defeatedBosses]
  );

  const selectedEntry = useMemo(
    () =>
      DEMON_BESTIARY.find((entry) => entry.bossId === selectedBossId) ??
      DEMON_BESTIARY[0],
    [selectedBossId]
  );

  const selectedDefeatCount = metaState.defeatedBosses[selectedEntry.bossId] ?? 0;
  const selectedUnlocked = selectedDefeatCount > 0;
  const selectedPreviewUrl = getBossPreviewDataUrl(
    selectedEntry.bossId,
    !selectedUnlocked
  );

  const handleToggleEquip = (titleId: string) => {
    const next =
      metaState.equippedTitleId === titleId
        ? setEquippedTitle(null)
        : setEquippedTitle(titleId);
    onMetaUpdated?.(next);
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#04060d]/85 backdrop-blur-xs p-3 pb-10"
      role="dialog"
      aria-modal="true"
      aria-label="Demon Bestiary & Slayer Records"
    >
      <div className="relative w-full max-w-3xl max-h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden rounded-lg border-2 border-purple-400/45 bg-[#090d17]/96 p-3 sm:p-4 shadow-[0_0_45px_rgba(168,85,247,0.18)]">
        {/* Corner pixel rivets */}
        <span className="absolute top-1 left-1 h-1.5 w-1.5 bg-purple-400/80" />
        <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-purple-400/80" />
        <span className="absolute bottom-1 left-1 h-1.5 w-1.5 bg-purple-400/80" />
        <span className="absolute bottom-1 right-1 h-1.5 w-1.5 bg-purple-400/80" />

        {/* Header + Tab Switch */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2 shrink-0">
          <div className="min-w-0">
            <h2 className="font-display text-sm sm:text-lg font-bold text-purple-200 truncate">
              Slayer Records &amp; Mastery · سجل الشياطين والإنجازات
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
              Bestiary lore, Corps ranks, and Secret Mastery Titles
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="inline-flex rounded border border-white/10 bg-[#050811] p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('bestiary')}
                className={`rounded-xs px-2.5 py-1 text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'bestiary'
                    ? 'bg-purple-600/85 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Bestiary ({defeatedCount}/{DEMON_BESTIARY.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('titles')}
                className={`rounded-xs px-2.5 py-1 text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'titles'
                    ? 'bg-amber-600/90 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Titles ({unlockedTitleSet.size}/{SECRET_TITLES.length})
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-white/15 bg-slate-900/90 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Summary Records Row */}
        <div className="mt-2 grid grid-cols-4 gap-1.5 shrink-0">
          <div className="rounded border border-amber-400/30 bg-amber-950/25 px-2 py-1.5 text-center">
            <div className="text-[9px] uppercase tracking-wider text-amber-300/85">
              Highest Combo
            </div>
            <div className="font-mono-tech text-xs sm:text-sm font-bold text-amber-200 tabular-nums">
              x{metaState.highestCombo}
            </div>
          </div>
          <div className="rounded border border-cyan-400/25 bg-cyan-950/25 px-2 py-1.5 text-center">
            <div className="text-[9px] uppercase tracking-wider text-cyan-300/85">
              Demons Slain
            </div>
            <div className="font-mono-tech text-xs sm:text-sm font-bold text-cyan-100 tabular-nums">
              {metaState.totalDemonsSlain.toLocaleString()}
            </div>
          </div>
          <div className="rounded border border-purple-400/25 bg-purple-950/25 px-2 py-1.5 text-center">
            <div className="text-[9px] uppercase tracking-wider text-purple-300/85">
              Bosses Slain
            </div>
            <div className="font-mono-tech text-xs sm:text-sm font-bold text-purple-100 tabular-nums">
              {defeatedCount}/{DEMON_BESTIARY.length}
            </div>
          </div>
          <div className="rounded border border-rose-400/25 bg-rose-950/25 px-2 py-1.5 text-center">
            <div className="text-[9px] uppercase tracking-wider text-rose-300/85">
              Secret Titles
            </div>
            <div className="font-mono-tech text-xs sm:text-sm font-bold text-rose-200 tabular-nums">
              ★ {unlockedTitleSet.size}/{SECRET_TITLES.length}
            </div>
          </div>
        </div>

        {activeTab === 'bestiary' ? (
          <>
            {/* Unlocked Demon Slayer & Hashira Ranks Ribbon */}
            <div className="mt-2 rounded border border-white/10 bg-[#0d1220]/90 px-2.5 py-1.5 shrink-0">
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="font-semibold text-slate-300">
                  Corps Ranks · الرتب المفتوحة ({unlockedRankSet.size}/{SLAYER_RANKS.length})
                </span>
                <span
                  className="font-mono-tech font-bold"
                  style={{ color: rankProgress.current.brightColor }}
                >
                  Current: 階 {rankProgress.current.name} ({rankProgress.current.arabicName})
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {SLAYER_RANKS.map((rank) => {
                  const unlocked = unlockedRankSet.has(rank.id);
                  const isHashira = rank.id === 'hashira';
                  return (
                    <div
                      key={rank.id}
                      title={
                        unlocked
                          ? `${rank.name} (${rank.arabicName}) — Unlocked`
                          : `Requires ${rank.minSlain} demons slain`
                      }
                      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-mono-tech ${
                        unlocked
                          ? 'font-bold'
                          : 'border-white/10 bg-[#060912]/70 text-slate-500'
                      }`}
                      style={
                        unlocked
                          ? {
                              borderColor: isHashira ? '#facc15' : `${rank.color}88`,
                              backgroundColor: `${rank.darkColor}88`,
                              color: rank.brightColor,
                            }
                          : undefined
                      }
                    >
                      <span>{isHashira ? '★' : unlocked ? '✓' : '·'}</span>
                      <span>{rank.name}</span>
                      <span className="opacity-85">({rank.arabicName})</span>
                      {!unlocked && <span className="text-slate-600">{rank.minSlain}+</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bestiary Boss Grid (11 Bosses) */}
            <div className="mt-2 grid grid-cols-4 sm:grid-cols-6 gap-1.5 shrink-0">
              {DEMON_BESTIARY.map((entry) => {
                const count = metaState.defeatedBosses[entry.bossId] ?? 0;
                const unlocked = count > 0;
                const isSelected = entry.bossId === selectedBossId;
                const spriteUrl = getBossPreviewDataUrl(entry.bossId, !unlocked);

                return (
                  <button
                    key={entry.bossId}
                    type="button"
                    onClick={() => setSelectedBossId(entry.bossId)}
                    className={`group relative flex flex-col items-center rounded border px-1.5 py-1.5 text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#151c31] shadow-md'
                        : 'border-white/10 bg-[#0b101d]/85 hover:border-white/25'
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: unlocked ? entry.color : '#a855f7',
                            boxShadow: `0 0 12px ${unlocked ? entry.color : '#a855f7'}33`,
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-between w-full text-[8px] font-mono-tech text-slate-400">
                      <span>{entry.stageLabel}</span>
                      {unlocked ? (
                        <span style={{ color: entry.brightColor }}>x{count}</span>
                      ) : (
                        <span className="text-slate-600">LOCK</span>
                      )}
                    </div>
                    <div className="my-0.5 flex h-9 w-9 items-center justify-center rounded bg-[#050811] border border-white/5">
                      <img
                        src={spriteUrl}
                        alt={unlocked ? entry.name : 'Undefeated Boss Silhouette'}
                        className={`h-8 w-8 object-contain ${
                          unlocked ? '' : 'opacity-70'
                        }`}
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    <div
                      className="w-full truncate text-[9px] font-semibold"
                      style={{ color: unlocked ? entry.brightColor : '#64748b' }}
                    >
                      {unlocked ? entry.name : '???'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Boss Detail Inspector */}
            <div
              className="mt-2 flex flex-col sm:flex-row items-center sm:items-start gap-2.5 rounded border bg-[#0c111e]/95 p-2.5 shrink-0"
              style={{
                borderColor: selectedUnlocked
                  ? `${selectedEntry.color}66`
                  : 'rgba(255,255,255,0.12)',
              }}
            >
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded border bg-[#050811]"
                style={{
                  borderColor: selectedUnlocked
                    ? `${selectedEntry.color}88`
                    : 'rgba(255,255,255,0.1)',
                }}
              >
                <img
                  src={selectedPreviewUrl}
                  alt={selectedUnlocked ? selectedEntry.name : 'Locked Demon'}
                  className={`h-14 w-14 object-contain ${
                    selectedUnlocked ? '' : 'opacity-65'
                  }`}
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span
                    className="text-xs sm:text-sm font-bold"
                    style={{
                      color: selectedUnlocked ? selectedEntry.brightColor : '#94a3b8',
                    }}
                  >
                    {selectedUnlocked
                      ? `${selectedEntry.name} · ${selectedEntry.arabicName}`
                      : '??? · شيطان غير مكتشف'}
                  </span>
                  <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-mono-tech text-slate-300">
                    {selectedEntry.stageLabel}
                    {selectedUnlocked ? ` · ${selectedEntry.title}` : ' · Unvanquished'}
                  </span>
                  {selectedUnlocked && (
                    <span className="text-[10px] font-mono-tech text-emerald-300">
                      Slain {selectedDefeatCount}x
                    </span>
                  )}
                </div>

                {selectedUnlocked ? (
                  <>
                    <div className="mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[10px] font-mono-tech">
                      <span className="text-rose-300">
                        Base HP {selectedEntry.baseHp}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-amber-300">
                        ATK {selectedEntry.baseDamage}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-red-300">
                        危 {selectedEntry.perilArt}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] sm:text-[11px] leading-snug text-slate-200">
                      {selectedEntry.lore}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-slate-400">
                      {selectedEntry.arabicLore}
                    </p>
                  </>
                ) : (
                  <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
                    Vanquish this demon in {selectedEntry.stageLabel} to reveal its pixel form,
                    Blood Demon Art, and lore. · اهزم هذا الشيطان في المعركة لفتح سجله وقصته.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Secret Slayer Titles & Mastery Badges Grid */
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 min-h-0 flex-1 overflow-y-auto">
            {SECRET_TITLES.map((title) => {
              const unlocked = unlockedTitleSet.has(title.id);
              const equipped = metaState.equippedTitleId === title.id;
              return (
                <div
                  key={title.id}
                  className={`flex items-center gap-2.5 rounded border p-2 transition-colors ${
                    unlocked
                      ? 'bg-[#0e1424]/95'
                      : 'border-white/10 bg-[#070a13]/85 opacity-75'
                  }`}
                  style={
                    unlocked
                      ? {
                          borderColor: equipped ? '#fde047' : `${title.color}77`,
                          backgroundColor: `${title.darkColor}44`,
                        }
                      : undefined
                  }
                >
                  {/* Pixel Badge Crest */}
                  <div
                    className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded border-2 font-display text-base font-bold"
                    style={
                      unlocked
                        ? {
                            borderColor: title.brightColor,
                            backgroundColor: title.darkColor,
                            color: title.brightColor,
                            boxShadow: `0 0 10px ${title.color}44`,
                          }
                        : {
                            borderColor: '#1e293b',
                            backgroundColor: '#050811',
                            color: '#334155',
                          }
                    }
                  >
                    {unlocked ? title.badgeCode : '?'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className="text-xs font-bold truncate"
                        style={{ color: unlocked ? title.brightColor : '#94a3b8' }}
                      >
                        {title.name} · {title.arabicName}
                      </span>
                      {unlocked ? (
                        <button
                          type="button"
                          onClick={() => handleToggleEquip(title.id)}
                          className={`shrink-0 rounded border px-1.5 py-0.5 font-mono-tech text-[9px] font-bold transition-colors cursor-pointer ${
                            equipped
                              ? 'border-amber-300 bg-amber-500/90 text-slate-950'
                              : 'border-white/20 bg-white/5 text-slate-200 hover:bg-white/15'
                          }`}
                        >
                          {equipped ? 'EQUIPPED' : 'EQUIP'}
                        </button>
                      ) : (
                        <span className="shrink-0 font-mono-tech text-[9px] text-slate-500">
                          LOCKED
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] leading-tight text-slate-300">
                      {title.description}
                    </p>
                    <p className="text-[9px] leading-tight text-slate-400">
                      {title.arabicDescription}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
