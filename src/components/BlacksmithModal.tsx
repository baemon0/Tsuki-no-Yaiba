import { useMemo } from 'react';
import {
  BLACKSMITH_UPGRADES,
  buyBlacksmithUpgrade,
  getSlayerRankProgress,
  type BlacksmithUpgradeKey,
  type MetaProgressionState,
} from '../game/metaProgression';

interface BlacksmithModalProps {
  metaState: MetaProgressionState;
  onPurchase: (nextState: MetaProgressionState) => void;
  onClose: () => void;
}

function HaganezukaPixelMask() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-12 w-12 shrink-0"
      style={{ imageRendering: 'pixelated' }}
      aria-hidden="true"
    >
      {/* Straw conical hat / headband */}
      <rect x="2" y="1" width="12" height="2" fill="#d97706" />
      <rect x="1" y="3" width="14" height="1" fill="#92400e" />
      {/* Towel wrap around head */}
      <rect x="2" y="4" width="12" height="2" fill="#e2e8f0" />
      <rect x="4" y="4" width="3" height="1" fill="#38bdf8" />
      <rect x="9" y="5" width="3" height="1" fill="#38bdf8" />
      {/* Hyottoko Mask face */}
      <rect x="3" y="6" width="10" height="8" fill="#fef3c7" />
      <rect x="2" y="7" width="1" height="6" fill="#fde68a" />
      <rect x="13" y="7" width="1" height="6" fill="#fde68a" />
      {/* Rosy cheeks */}
      <rect x="3" y="10" width="2" height="2" fill="#fb7185" />
      <rect x="11" y="10" width="2" height="2" fill="#fb7185" />
      {/* Asymmetrical Hyottoko eyes */}
      <rect x="4" y="8" width="3" height="2" fill="#0f172a" />
      <rect x="5" y="8" width="1" height="1" fill="#ffffff" />
      <rect x="9" y="7" width="3" height="2" fill="#0f172a" />
      <rect x="10" y="8" width="1" height="1" fill="#ffffff" />
      {/* Puckered whistling mouth */}
      <rect x="7" y="11" width="2" height="2" fill="#be123c" />
      <rect x="7" y="11" width="1" height="1" fill="#fda4af" />
      {/* Dark robe collar */}
      <rect x="3" y="14" width="10" height="2" fill="#1e293b" />
      <rect x="6" y="14" width="4" height="2" fill="#f97316" />
    </svg>
  );
}

export function BlacksmithModal({
  metaState,
  onPurchase,
  onClose,
}: BlacksmithModalProps) {
  const rankProgress = useMemo(
    () => getSlayerRankProgress(metaState.totalDemonsSlain),
    [metaState.totalDemonsSlain]
  );

  const handleForge = (key: BlacksmithUpgradeKey) => {
    const result = buyBlacksmithUpgrade(key);
    if (result.ok) {
      onPurchase(result.state);
    }
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#04060d]/85 backdrop-blur-xs p-3 pb-10"
      role="dialog"
      aria-modal="true"
      aria-label="Haganezuka's Blacksmith Shop"
    >
      <div className="relative w-full max-w-2xl rounded-lg border-2 border-amber-500/45 bg-[#090d17]/95 p-3.5 sm:p-4 shadow-[0_0_45px_rgba(245,158,11,0.18)]">
        {/* Corner pixel rivets */}
        <span className="absolute top-1 left-1 h-1.5 w-1.5 bg-amber-400/80" />
        <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-amber-400/80" />
        <span className="absolute bottom-1 left-1 h-1.5 w-1.5 bg-amber-400/80" />
        <span className="absolute bottom-1 right-1 h-1.5 w-1.5 bg-amber-400/80" />

        {/* Header with Haganezuka Pixel Avatar & Crystal Balance */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded border border-amber-500/40 bg-[#121625]">
              <HaganezukaPixelMask />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-bold text-amber-200 truncate">
                Haganezuka&apos;s Forge · ورشة الحداد
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Permanent Swordsmith Village upgrades saved across every hunt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 rounded border border-rose-400/45 bg-rose-950/55 px-2.5 py-1">
              <span className="text-rose-400 text-xs leading-none">◆</span>
              <span className="font-mono-tech text-xs sm:text-sm font-bold text-rose-100 tabular-nums">
                {metaState.bloodCrystals.toLocaleString()}
              </span>
              <span className="hidden sm:inline text-[10px] text-rose-300/90">
                Crystals
              </span>
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

        {/* Demon Slayer Corps Rank Badge */}
        <div
          className="mt-2.5 rounded border px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
          style={{
            borderColor: `${rankProgress.current.color}66`,
            backgroundColor: `${rankProgress.current.darkColor}55`,
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded border font-display text-xs font-bold"
              style={{
                borderColor: rankProgress.current.brightColor,
                backgroundColor: '#070a12',
                color: rankProgress.current.brightColor,
              }}
            >
              階
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs sm:text-sm font-bold"
                  style={{ color: rankProgress.current.brightColor }}
                >
                  Rank: {rankProgress.current.name} ({rankProgress.current.arabicName})
                </span>
                <span className="text-[10px] font-mono-tech text-slate-300">
                  {metaState.totalDemonsSlain} Demons Slain
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                {rankProgress.next
                  ? `${rankProgress.next.minSlain - metaState.totalDemonsSlain} more kills to promote to ${rankProgress.next.name} (${rankProgress.next.arabicName})`
                  : 'Highest Demon Slayer Corps Rank achieved!'}
              </div>
            </div>
          </div>

          <div className="w-full sm:w-40">
            <div className="h-2 w-full rounded-xs bg-[#060911] border border-white/10 overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${rankProgress.progressPct}%`,
                  backgroundColor: rankProgress.current.color,
                }}
              />
            </div>
          </div>
        </div>

        {/* 3 Permanent Upgrade Rows */}
        <div className="mt-2.5 grid grid-cols-1 gap-2">
          {BLACKSMITH_UPGRADES.map((up) => {
            const level = metaState.upgrades[up.key];
            const isMax = level >= up.maxLevel;
            const cost = isMax ? 0 : up.costs[level];
            const canAfford = !isMax && metaState.bloodCrystals >= cost;

            return (
              <div
                key={up.key}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded border border-white/10 bg-[#0d1220]/90 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-xs sm:text-sm font-bold"
                      style={{ color: up.brightColor }}
                    >
                      {up.name}
                    </span>
                    <span className="text-[11px] text-slate-300">
                      · {up.arabicName}
                    </span>
                    <span className="font-mono-tech text-[10px] text-slate-400">
                      Lv {level}/{up.maxLevel}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-300/90">
                    {up.effectPerLevel}{' '}
                    <span className="text-slate-400">({up.arabicEffect})</span>
                  </div>

                  {/* 5 Level Pips */}
                  <div className="mt-1.5 flex items-center gap-1">
                    {Array.from({ length: up.maxLevel }).map((_, idx) => (
                      <span
                        key={idx}
                        className="h-1.5 w-6 rounded-xs border"
                        style={{
                          borderColor:
                            idx < level ? up.brightColor : 'rgba(255,255,255,0.12)',
                          backgroundColor: idx < level ? up.color : '#070a12',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-end">
                  {isMax ? (
                    <span className="rounded border border-amber-400/40 bg-amber-950/50 px-3 py-1.5 font-mono-tech text-[11px] font-bold text-amber-200">
                      MAXED
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => handleForge(up.key)}
                      className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        canAfford
                          ? 'border-rose-300/50 bg-rose-600/90 text-white hover:bg-rose-500 cursor-pointer'
                          : 'border-white/10 bg-slate-900/70 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <span>Forge / تطوير</span>
                      <span className="font-mono-tech text-[11px] text-rose-100">
                        ◆ {cost}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
