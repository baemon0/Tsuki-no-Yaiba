import { useEffect, useMemo } from 'react';
import { CHARACTERS, CHARACTER_MAP, type CharacterId } from '../game/characters';
import { getCharacterPreviewDataUrl } from '../game/sprites/samuraiSprites';

interface CharacterSelectOverlayProps {
  selectedId: CharacterId;
  onSelect: (id: CharacterId) => void;
  onConfirm: (id: CharacterId) => void;
  onBack: () => void;
}

function StatBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px]">
      <span className="w-10 text-slate-400 font-medium">{label}</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((step) => (
          <span
            key={step}
            className="h-2 w-2.5 sm:w-3 rounded-[1px] transition-colors"
            style={{
              backgroundColor: step <= value ? color : 'rgba(148, 163, 184, 0.18)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function CharacterSelectOverlay({
  selectedId,
  onSelect,
  onConfirm,
  onBack,
}: CharacterSelectOverlayProps) {
  const selectedChar = CHARACTER_MAP[selectedId];

  // Precompute crisp pixelated sprite data URLs for all 15 characters
  const previews = useMemo(() => {
    const map = {} as Record<CharacterId, string>;
    for (const char of CHARACTERS) {
      map[char.id] = getCharacterPreviewDataUrl(char.id);
    }
    return map;
  }, []);

  // Keyboard navigation across the 5x3 grid + Enter to start battle
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const idx = CHARACTERS.findIndex((c) => c.id === selectedId);
      if (idx === -1) return;

      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        onSelect(CHARACTERS[(idx + 1) % CHARACTERS.length].id);
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        onSelect(CHARACTERS[(idx - 1 + CHARACTERS.length) % CHARACTERS.length].id);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        onSelect(CHARACTERS[(idx + 5) % CHARACTERS.length].id);
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        onSelect(CHARACTERS[(idx - 5 + CHARACTERS.length) % CHARACTERS.length].id);
      } else if (e.code === 'Enter') {
        e.preventDefault();
        onConfirm(selectedId);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedId, onSelect, onConfirm, onBack]);

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-between bg-[#050811]/82 backdrop-blur-[2px] px-3 sm:px-6 pt-2.5 pb-9 overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-2 min-h-0">
        {/* Compact Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-baseline gap-2.5">
            <h2 className="font-display text-base sm:text-xl font-bold tracking-wide text-slate-100">
              Select Demon Slayer
            </h2>
            <span className="text-xs sm:text-sm font-medium text-slate-400">
              اختر قاتل الشياطين
            </span>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded border border-white/15 bg-slate-900/75 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Back
          </button>
        </div>

        {/* Selected Character Detail & Confirm Strip */}
        <div
          className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 rounded-md border bg-[#090e1a]/90 px-3 sm:px-4 py-2 shrink-0"
          style={{ borderColor: `${selectedChar.colors.primary}66` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded border bg-[#050811]"
              style={{ borderColor: `${selectedChar.colors.primary}55` }}
            >
              <img
                src={previews[selectedChar.id]}
                alt={selectedChar.name}
                className="pixel-canvas h-10 w-10 sm:h-12 sm:w-12 object-contain"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-display text-sm sm:text-base font-bold text-white truncate">
                  {selectedChar.name}
                </span>
                <span className="text-xs text-slate-400 truncate">
                  {selectedChar.arabicName}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] sm:text-xs">
                <span
                  className="font-semibold"
                  style={{ color: selectedChar.colors.bright }}
                >
                  {selectedChar.styleName} · {selectedChar.arabicStyleName}
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-slate-300 truncate">{selectedChar.trait}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden md:flex flex-col gap-0.5">
              <StatBar
                label="Speed"
                value={selectedChar.stats.speed}
                color={selectedChar.colors.primary}
              />
              <StatBar
                label="Power"
                value={selectedChar.stats.power}
                color={selectedChar.colors.primary}
              />
              <StatBar
                label="Range"
                value={selectedChar.stats.range}
                color={selectedChar.colors.primary}
              />
            </div>

            <button
              type="button"
              onClick={() => onConfirm(selectedChar.id)}
              className="rounded-md px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-slate-950 shadow-md transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
              style={{
                backgroundColor: selectedChar.colors.primary,
              }}
            >
              Begin Battle / ابدأ القتال
            </button>
          </div>
        </div>

        {/* 5x3 Character Grid strictly fitting remaining viewport height */}
        <div className="grid grid-cols-5 grid-rows-3 gap-1.5 sm:gap-2 flex-1 min-h-0">
          {CHARACTERS.map((char) => {
            const isSelected = char.id === selectedId;
            return (
              <button
                key={char.id}
                type="button"
                onClick={() => onSelect(char.id)}
                onDoubleClick={() => onConfirm(char.id)}
                className={`group relative flex flex-col items-center justify-between rounded-md border px-1.5 py-1.5 text-center transition-all cursor-pointer min-h-0 overflow-hidden ${
                  isSelected
                    ? 'bg-[#0f172a]/95 shadow-lg'
                    : 'border-white/10 bg-[#080d18]/80 hover:border-white/25 hover:bg-[#0d1424]/90'
                }`}
                style={
                  isSelected
                    ? {
                        borderColor: char.colors.primary,
                        boxShadow: `0 0 0 1px ${char.colors.primary}55`,
                      }
                    : undefined
                }
              >
                <div className="flex flex-1 items-center justify-center min-h-0 w-full">
                  <img
                    src={previews[char.id]}
                    alt={char.name}
                    className="pixel-canvas max-h-11 sm:max-h-14 w-auto object-contain transition-transform duration-150 group-hover:scale-105"
                  />
                </div>

                <div className="w-full shrink-0 pt-0.5 leading-tight">
                  <div className="truncate text-[10px] sm:text-xs font-semibold text-slate-100">
                    {char.shortName}
                  </div>
                  <div
                    className="truncate text-[9px] sm:text-[10px] font-medium"
                    style={{ color: char.colors.bright }}
                  >
                    {char.arabicStyleName}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
