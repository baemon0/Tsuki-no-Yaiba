import { useEffect, useRef, useState } from 'react';
import type { InputManager, VirtualControlKey } from '../game/input';

interface TouchControlsOverlayProps {
  input: InputManager | null;
  ultimateReady: boolean;
  onUnlockAudio: () => void;
}

type ActionButtonKey = 'jump' | 'slash' | 'dash' | 'breath' | 'ultimate';

interface StickVisualState {
  active: boolean;
  originX: number;
  originY: number;
  dx: number;
  dy: number;
}

const STICK_MAX_RADIUS = 44;
const STICK_DEADZONE_PX = 8;
const STICK_DROP_Y_PX = 24;

export function TouchControlsOverlay({
  input,
  ultimateReady,
  onUnlockAudio,
}: TouchControlsOverlayProps) {
  const leftZoneRef = useRef<HTMLDivElement | null>(null);
  const jumpBtnRef = useRef<HTMLButtonElement | null>(null);
  const slashBtnRef = useRef<HTMLButtonElement | null>(null);
  const dashBtnRef = useRef<HTMLButtonElement | null>(null);
  const breathBtnRef = useRef<HTMLButtonElement | null>(null);
  const ultBtnRef = useRef<HTMLButtonElement | null>(null);

  const [stick, setStick] = useState<StickVisualState>({
    active: false,
    originX: 0,
    originY: 0,
    dx: 0,
    dy: 0,
  });

  const [pressedActions, setPressedActions] = useState<Record<ActionButtonKey, boolean>>({
    jump: false,
    slash: false,
    dash: false,
    breath: false,
    ultimate: false,
  });

  // Explicit multi-touch identifier tracking
  const stickTouchIdRef = useRef<number | null>(null);
  const stickOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const stickMouseActiveRef = useRef(false);
  const dropTriggeredRef = useRef(false);

  const activeActionTouchesRef = useRef<Map<number, ActionButtonKey>>(new Map());
  const activeMouseActionRef = useRef<ActionButtonKey | null>(null);

  const inputRef = useRef(input);
  inputRef.current = input;
  const unlockAudioRef = useRef(onUnlockAudio);
  unlockAudioRef.current = onUnlockAudio;

  useEffect(() => {
    const applyStickVector = (rawX: number, rawY: number) => {
      const origin = stickOriginRef.current;
      const vx = rawX - origin.x;
      const vy = rawY - origin.y;
      const dist = Math.hypot(vx, vy);
      const scale = dist > STICK_MAX_RADIUS ? STICK_MAX_RADIUS / dist : 1;
      const dx = vx * scale;
      const dy = vy * scale;

      setStick({
        active: true,
        originX: origin.x,
        originY: origin.y,
        dx,
        dy,
      });

      const mgr = inputRef.current;
      if (!mgr) return;

      if (Math.abs(dx) < STICK_DEADZONE_PX) {
        mgr.setVirtualAxis(null);
      } else {
        const norm =
          (Math.sign(dx) * (Math.abs(dx) - STICK_DEADZONE_PX)) /
          (STICK_MAX_RADIUS - STICK_DEADZONE_PX);
        mgr.setVirtualAxis(Math.max(-1, Math.min(1, norm)));
      }

      // Dragging downward triggers platform drop-through
      if (dy > STICK_DROP_Y_PX && dy > Math.abs(dx) * 0.72) {
        mgr.setVirtualControl('down', true);
        if (!dropTriggeredRef.current) {
          dropTriggeredRef.current = true;
          mgr.triggerVirtualDrop();
        }
      } else if (dy < 16) {
        mgr.setVirtualControl('down', false);
        dropTriggeredRef.current = false;
      }
    };

    const releaseStick = () => {
      stickTouchIdRef.current = null;
      stickMouseActiveRef.current = false;
      dropTriggeredRef.current = false;
      setStick((prev) => ({ ...prev, active: false, dx: 0, dy: 0 }));
      inputRef.current?.setVirtualAxis(null);
      inputRef.current?.setVirtualControl('down', false);
    };

    const syncActionStates = () => {
      const counts: Record<ActionButtonKey, boolean> = {
        jump: false,
        slash: false,
        dash: false,
        breath: false,
        ultimate: false,
      };
      for (const k of activeActionTouchesRef.current.values()) {
        counts[k] = true;
      }
      if (activeMouseActionRef.current) {
        counts[activeMouseActionRef.current] = true;
      }
      setPressedActions(counts);

      const mgr = inputRef.current;
      if (!mgr) return;
      (Object.keys(counts) as ActionButtonKey[]).forEach((k) => {
        mgr.setVirtualControl(k as VirtualControlKey, counts[k]);
      });
    };

    // Left-half dynamic floating thumbstick touch handlers (using event.changedTouches)
    const leftZone = leftZoneRef.current;
    const onStickTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      unlockAudioRef.current();
      if (stickTouchIdRef.current !== null) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      stickTouchIdRef.current = touch.identifier;
      stickOriginRef.current = { x: touch.clientX, y: touch.clientY };
      dropTriggeredRef.current = false;
      applyStickVector(touch.clientX, touch.clientY);
    };

    const onStickTouchMove = (e: TouchEvent) => {
      if (stickTouchIdRef.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === stickTouchIdRef.current) {
          e.preventDefault();
          applyStickVector(touch.clientX, touch.clientY);
          break;
        }
      }
    };

    const onStickTouchEnd = (e: TouchEvent) => {
      if (stickTouchIdRef.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === stickTouchIdRef.current) {
          e.preventDefault();
          releaseStick();
          break;
        }
      }
    };

    // Desktop mouse fallback for floating thumbstick testing
    const onStickMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || stickTouchIdRef.current !== null) return;
      e.preventDefault();
      unlockAudioRef.current();
      stickMouseActiveRef.current = true;
      stickOriginRef.current = { x: e.clientX, y: e.clientY };
      dropTriggeredRef.current = false;
      applyStickVector(e.clientX, e.clientY);
    };

    const onWindowMouseMove = (e: MouseEvent) => {
      if (!stickMouseActiveRef.current) return;
      applyStickVector(e.clientX, e.clientY);
    };

    const onWindowMouseUp = () => {
      if (stickMouseActiveRef.current) {
        releaseStick();
      }
      if (activeMouseActionRef.current !== null) {
        activeMouseActionRef.current = null;
        syncActionStates();
      }
    };

    if (leftZone) {
      leftZone.addEventListener('touchstart', onStickTouchStart, { passive: false });
      leftZone.addEventListener('touchmove', onStickTouchMove, { passive: false });
      leftZone.addEventListener('touchend', onStickTouchEnd, { passive: false });
      leftZone.addEventListener('touchcancel', onStickTouchEnd, { passive: false });
      leftZone.addEventListener('mousedown', onStickMouseDown);
    }

    // Right-hand ergonomic action cluster touch handlers (using event.changedTouches)
    const buttons: Array<[HTMLButtonElement | null, ActionButtonKey]> = [
      [jumpBtnRef.current, 'jump'],
      [slashBtnRef.current, 'slash'],
      [dashBtnRef.current, 'dash'],
      [breathBtnRef.current, 'breath'],
      [ultBtnRef.current, 'ultimate'],
    ];

    const cleanups: Array<() => void> = [];

    for (const [el, key] of buttons) {
      if (!el) continue;

      const onBtnTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        unlockAudioRef.current();
        for (let i = 0; i < e.changedTouches.length; i++) {
          activeActionTouchesRef.current.set(e.changedTouches[i].identifier, key);
        }
        syncActionStates();
      };

      const onBtnTouchMove = (e: TouchEvent) => {
        e.preventDefault();
      };

      const onBtnTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        for (let i = 0; i < e.changedTouches.length; i++) {
          activeActionTouchesRef.current.delete(e.changedTouches[i].identifier);
        }
        syncActionStates();
      };

      const onBtnMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        unlockAudioRef.current();
        activeMouseActionRef.current = key;
        syncActionStates();
      };

      el.addEventListener('touchstart', onBtnTouchStart, { passive: false });
      el.addEventListener('touchmove', onBtnTouchMove, { passive: false });
      el.addEventListener('touchend', onBtnTouchEnd, { passive: false });
      el.addEventListener('touchcancel', onBtnTouchEnd, { passive: false });
      el.addEventListener('mousedown', onBtnMouseDown);

      cleanups.push(() => {
        el.removeEventListener('touchstart', onBtnTouchStart);
        el.removeEventListener('touchmove', onBtnTouchMove);
        el.removeEventListener('touchend', onBtnTouchEnd);
        el.removeEventListener('touchcancel', onBtnTouchEnd);
        el.removeEventListener('mousedown', onBtnMouseDown);
      });
    }

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);

    return () => {
      if (leftZone) {
        leftZone.removeEventListener('touchstart', onStickTouchStart);
        leftZone.removeEventListener('touchmove', onStickTouchMove);
        leftZone.removeEventListener('touchend', onStickTouchEnd);
        leftZone.removeEventListener('touchcancel', onStickTouchEnd);
        leftZone.removeEventListener('mousedown', onStickMouseDown);
      }
      cleanups.forEach((fn) => fn());
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      activeActionTouchesRef.current.clear();
      activeMouseActionRef.current = null;
      stickTouchIdRef.current = null;
      stickMouseActiveRef.current = false;
      inputRef.current?.clearVirtualControls();
    };
  }, []);

  return (
    <>
      {/* 1. Left Half of Screen: Completely empty dynamic floating thumbstick zone */}
      <div
        ref={leftZoneRef}
        className="fixed top-0 bottom-7 left-0 w-1/2 z-20 touch-none select-none"
        aria-label="Movement thumbstick touch area"
      >
        <div
          className={`pointer-events-none fixed -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150 ${
            stick.active ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
          style={{
            left: stick.originX,
            top: stick.originY,
          }}
        >
          {/* Minimalist translucent outer ring */}
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/25 bg-white/[0.04] backdrop-blur-[1px]">
            <span className="absolute top-1.5 h-1 w-1 rounded-full bg-white/25" />
            <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-white/25" />
            <span className="absolute left-1.5 h-1 w-1 rounded-full bg-white/25" />
            <span className="absolute right-1.5 h-1 w-1 rounded-full bg-white/25" />

            {/* Translucent inner knob */}
            <div
              className="h-10 w-10 rounded-full border border-white/50 bg-white/25 shadow-[0_0_12px_rgba(255,255,255,0.16)]"
              style={{
                transform: `translate(${stick.dx}px, ${stick.dy}px)`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 2. Bottom-Right Ergonomic Action & Jump Arc Cluster */}
      <div className="pointer-events-none fixed bottom-7 right-2.5 sm:right-4 z-20 h-[196px] w-[192px] touch-none select-none">
        {/* ULT: Center-top crown of the arc — illuminates & pulses when gauge is full */}
        <button
          ref={ultBtnRef}
          type="button"
          aria-label="Ultimate Technique"
          className={`pointer-events-auto absolute right-[44px] bottom-[138px] flex h-12 w-12 flex-col items-center justify-center rounded-full border transition-transform touch-none select-none ${
            ultimateReady
              ? pressedActions.ultimate
                ? 'scale-95 border-amber-200 bg-amber-400/55 text-white shadow-[0_0_18px_rgba(251,191,36,0.65)]'
                : 'animate-pulse border-amber-300/85 bg-amber-500/35 text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.45)] backdrop-blur-[2px]'
              : 'border-white/15 bg-white/[0.05] text-white/35 backdrop-blur-[1px]'
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
          </svg>
          <span className="mt-0.5 font-mono-tech text-[8px] font-bold tracking-wider">
            ULT
          </span>
        </button>

        {/* BREATH: Upper-right button with wind swirls — hold to charge */}
        <button
          ref={breathBtnRef}
          type="button"
          aria-label="Hold to Charge Breath"
          className={`pointer-events-auto absolute right-1 bottom-[82px] flex h-[54px] w-[54px] flex-col items-center justify-center rounded-full border backdrop-blur-[2px] transition-transform touch-none select-none ${
            pressedActions.breath
              ? 'scale-95 border-cyan-200/80 bg-cyan-400/35 text-white shadow-[0_0_14px_rgba(34,211,238,0.4)]'
              : 'border-cyan-200/30 bg-cyan-950/25 text-cyan-100/80'
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M3 9h11.5a2.5 2.5 0 1 0-2.5-2.5" strokeLinecap="round" />
            <path d="M4 13h14a2.5 2.5 0 1 1-2.5 2.5" strokeLinecap="round" />
            <path d="M6 17h6.5" strokeLinecap="round" />
          </svg>
          <span className="mt-0.5 font-mono-tech text-[7px] font-bold tracking-wider">
            BREATH
          </span>
        </button>

        {/* DASH: Above Slash/Jump with speed streaks */}
        <button
          ref={dashBtnRef}
          type="button"
          aria-label="Dash"
          className={`pointer-events-auto absolute right-[68px] bottom-[76px] flex h-[52px] w-[52px] flex-col items-center justify-center rounded-full border backdrop-blur-[2px] transition-transform touch-none select-none ${
            pressedActions.dash
              ? 'scale-95 border-amber-200/80 bg-amber-400/35 text-white'
              : 'border-amber-200/30 bg-amber-950/20 text-amber-100/80'
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 8h10M2 12h14M6 16h9" strokeLinecap="round" />
            <path d="M15 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="mt-0.5 font-mono-tech text-[8px] font-bold tracking-wider">
            DASH
          </span>
        </button>

        {/* SLASH: Left of Jump with katana icon */}
        <button
          ref={slashBtnRef}
          type="button"
          aria-label="Slash and Parry"
          className={`pointer-events-auto absolute right-[78px] bottom-2 flex h-[58px] w-[58px] flex-col items-center justify-center rounded-full border backdrop-blur-[2px] transition-transform touch-none select-none ${
            pressedActions.slash
              ? 'scale-95 border-rose-200/85 bg-rose-500/40 text-white shadow-[0_0_14px_rgba(244,63,94,0.35)]'
              : 'border-rose-200/35 bg-rose-950/25 text-rose-100/85'
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 4L9 14M7 12l5 5M6 15l-2 2 3 3 2-2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="mt-0.5 font-mono-tech text-[8px] font-bold tracking-wider">
            SLASH
          </span>
        </button>

        {/* JUMP: Large circular button at bottom-right corner */}
        <button
          ref={jumpBtnRef}
          type="button"
          aria-label="Jump"
          className={`pointer-events-auto absolute right-1 bottom-1 flex h-16 w-16 flex-col items-center justify-center rounded-full border backdrop-blur-[2px] transition-transform touch-none select-none ${
            pressedActions.jump
              ? 'scale-95 border-emerald-200/85 bg-emerald-500/40 text-white shadow-[0_0_16px_rgba(52,211,153,0.35)]'
              : 'border-white/30 bg-white/[0.10] text-white/90'
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.3">
            <path d="M12 18V6M6 12l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="mt-0.5 font-mono-tech text-[9px] font-bold tracking-wider">
            JUMP
          </span>
        </button>
      </div>
    </>
  );
}
