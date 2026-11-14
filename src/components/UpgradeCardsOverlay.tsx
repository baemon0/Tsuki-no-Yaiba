import { useEffect } from 'react';
import type { UpgradeCardDef, UpgradeId } from '../game/upgrades';

interface UpgradeCardsOverlayProps {
  cards: UpgradeCardDef[];
  onPick: (id: UpgradeId) => void;
}

function PixelUpgradeIcon({ card }: { card: UpgradeCardDef }) {
  const c = card.color;
  const b = card.brightColor;

  return (
    <svg
      viewBox="0 0 16 16"
      className="h-9 w-9 mx-auto"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {card.icon === 'fang' && (
        <>
          <rect x="3" y="2" width="3" height="8" fill={b} />
          <rect x="4" y="10" width="2" height="3" fill={c} />
          <rect x="10" y="2" width="3" height="8" fill={b} />
          <rect x="10" y="10" width="2" height="3" fill={c} />
          <rect x="5" y="13" width="1" height="2" fill="#ef4444" />
          <rect x="11" y="13" width="1" height="2" fill="#ef4444" />
        </>
      )}
      {card.icon === 'bolt' && (
        <>
          <rect x="8" y="1" width="4" height="3" fill={b} />
          <rect x="6" y="4" width="4" height="3" fill={b} />
          <rect x="4" y="7" width="8" height="2" fill="#ffffff" />
          <rect x="7" y="9" width="4" height="3" fill={c} />
          <rect x="5" y="12" width="3" height="3" fill={c} />
        </>
      )}
      {card.icon === 'sun' && (
        <>
          <rect x="6" y="5" width="4" height="6" fill={b} />
          <rect x="5" y="6" width="6" height="4" fill={b} />
          <rect x="7" y="7" width="2" height="2" fill="#ffffff" />
          <rect x="7" y="1" width="2" height="3" fill={c} />
          <rect x="7" y="12" width="2" height="3" fill={c} />
          <rect x="1" y="7" width="3" height="2" fill={c} />
          <rect x="12" y="7" width="3" height="2" fill={c} />
          <rect x="3" y="3" width="2" height="2" fill={c} />
          <rect x="11" y="3" width="2" height="2" fill={c} />
          <rect x="3" y="11" width="2" height="2" fill={c} />
          <rect x="11" y="11" width="2" height="2" fill={c} />
        </>
      )}
      {card.icon === 'katana' && (
        <>
          <rect x="11" y="2" width="3" height="2" fill="#ffffff" />
          <rect x="9" y="4" width="3" height="2" fill={b} />
          <rect x="7" y="6" width="3" height="2" fill={b} />
          <rect x="5" y="8" width="3" height="2" fill={c} />
          <rect x="3" y="9" width="4" height="2" fill="#fbbf24" />
          <rect x="2" y="11" width="2" height="3" fill="#7c2d12" />
        </>
      )}
      {card.icon === 'flame' && (
        <>
          <rect x="7" y="1" width="2" height="3" fill="#fef08a" />
          <rect x="5" y="4" width="6" height="3" fill={b} />
          <rect x="4" y="7" width="8" height="5" fill={c} />
          <rect x="6" y="8" width="4" height="4" fill="#fef08a" />
          <rect x="5" y="12" width="6" height="2" fill={c} />
        </>
      )}
      {card.icon === 'wind' && (
        <>
          <rect x="2" y="4" width="9" height="2" fill={b} />
          <rect x="10" y="2" width="3" height="2" fill={b} />
          <rect x="3" y="8" width="11" height="2" fill={c} />
          <rect x="2" y="12" width="8" height="2" fill={b} />
          <rect x="9" y="11" width="3" height="2" fill={c} />
        </>
      )}
      {card.icon === 'shield' && (
        <>
          <rect x="3" y="2" width="10" height="3" fill={b} />
          <rect x="3" y="5" width="10" height="5" fill={c} />
          <rect x="5" y="10" width="6" height="3" fill={c} />
          <rect x="7" y="13" width="2" height="2" fill={b} />
          <rect x="7" y="4" width="2" height="7" fill="#ffffff" />
          <rect x="5" y="6" width="6" height="2" fill="#ffffff" />
        </>
      )}
      {card.icon === 'orb' && (
        <>
          <rect x="5" y="2" width="6" height="2" fill={c} />
          <rect x="3" y="4" width="10" height="8" fill={c} />
          <rect x="5" y="12" width="6" height="2" fill={c} />
          <rect x="5" y="5" width="6" height="6" fill={b} />
          <rect x="6" y="6" width="2" height="2" fill="#ffffff" />
        </>
      )}
      {card.icon === 'skull' && (
        <>
          <rect x="4" y="2" width="8" height="2" fill={b} />
          <rect x="3" y="4" width="10" height="6" fill={b} />
          <rect x="5" y="6" width="2" height="2" fill="#090a12" />
          <rect x="9" y="6" width="2" height="2" fill="#090a12" />
          <rect x="7" y="8" width="2" height="2" fill={c} />
          <rect x="5" y="10" width="6" height="4" fill={c} />
          <rect x="6" y="12" width="1" height="2" fill="#090a12" />
          <rect x="9" y="12" width="1" height="2" fill="#090a12" />
        </>
      )}
    </svg>
  );
}

export function UpgradeCardsOverlay({ cards, onPick }: UpgradeCardsOverlayProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Digit1' && cards[0]) {
        e.preventDefault();
        onPick(cards[0].id);
      } else if (e.code === 'Digit2' && cards[1]) {
        e.preventDefault();
        onPick(cards[1].id);
      } else if (e.code === 'Digit3' && cards[2]) {
        e.preventDefault();
        onPick(cards[2].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cards, onPick]);

  return (
    <div className="absolute inset-0 z-30 bg-[#04060e]/82 backdrop-blur-[2px] flex items-center justify-center p-4 pb-10">
      <div className="w-full max-w-2xl text-center">
        <div className="text-[11px] font-mono-tech uppercase tracking-[0.2em] text-amber-300">
          Boss Vanquished · Choose Your Blessing
        </div>
        <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold tracking-wide text-slate-100">
          Select 1 Upgrade Card · اختر بطاقة تطوير
        </h2>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {cards.map((card, idx) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onPick(card.id)}
              className="group relative flex flex-col justify-between rounded-md border-2 p-4 text-center transition-transform hover:-translate-y-1 cursor-pointer"
              style={{
                borderColor: `${card.color}aa`,
                backgroundColor: card.bgTint,
                boxShadow: `0 0 24px ${card.color}22`,
              }}
            >
              {/* Pixel corner ticks */}
              <span
                className="absolute top-1 left-1 h-1.5 w-1.5"
                style={{ backgroundColor: card.brightColor }}
              />
              <span
                className="absolute top-1 right-1 h-1.5 w-1.5"
                style={{ backgroundColor: card.brightColor }}
              />
              <span
                className="absolute bottom-1 left-1 h-1.5 w-1.5"
                style={{ backgroundColor: card.brightColor }}
              />
              <span
                className="absolute bottom-1 right-1 h-1.5 w-1.5"
                style={{ backgroundColor: card.brightColor }}
              />

              <div>
                <div className="mb-2 flex items-center justify-between text-[10px] font-mono-tech text-slate-300/80">
                  <span>[{idx + 1}]</span>
                  <span style={{ color: card.brightColor }}>BLESSING</span>
                </div>

                <div className="my-2 flex h-14 w-14 mx-auto items-center justify-center rounded border border-white/15 bg-[#070912]/80">
                  <PixelUpgradeIcon card={card} />
                </div>

                <div
                  className="mt-2.5 font-display text-sm sm:text-base font-bold"
                  style={{ color: card.brightColor }}
                >
                  {card.name}
                </div>
                <div className="text-[11px] font-medium text-slate-300/90">
                  {card.arabicName}
                </div>

                <p className="mt-2 text-xs text-slate-100 leading-snug">
                  {card.summary}
                </p>
                <p className="mt-1 text-[10px] text-slate-300/80">
                  {card.arabicSummary}
                </p>
              </div>

              <div
                className="mt-3 rounded border border-white/15 bg-black/35 py-1 text-[11px] font-semibold text-white group-hover:bg-white/15 transition-colors"
              >
                Equip / اختيار
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
