import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DURATION, render, sceneAt, SCENES } from '../engine';
import { writeLocal } from '../lib/storage';
import { useUi } from '../stores/ui';
import { StageCanvas } from './StageCanvas';

export const INTRO_SEEN_KEY = 'diya-dash-intro-seen';

/** Hold the last frame this long before the intro closes itself. */
const OUTRO_HOLD = 1.4;

function Film({ mode, onClose }: { mode: 'intro' | 'player'; onClose: () => void }) {
  const time = useRef(0);
  const [playing, setPlaying] = useState(true);
  const playingRef = useRef(true);
  playingRef.current = playing;
  const [scene, setScene] = useState(0);
  const scrub = useRef<HTMLInputElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const ended = useRef(false);

  const draw = useCallback(
    (_t: number, dt: number) => {
      if (playingRef.current) time.current += dt;
      const t = Math.min(time.current, DURATION);
      render(t);
      if (scrub.current && document.activeElement !== scrub.current) scrub.current.value = String(t);
      if (clock.current) clock.current.textContent = `${t.toFixed(1)}s`;
      const s = sceneAt(t);
      setScene((prev) => (prev === s ? prev : s));
      if (time.current >= DURATION) {
        if (mode === 'intro' && time.current >= DURATION + OUTRO_HOLD && !ended.current) {
          ended.current = true;
          onClose();
        } else if (mode === 'player' && playingRef.current) {
          setPlaying(false);
        }
      }
    },
    [mode, onClose],
  );

  const seek = (t: number) => {
    time.current = Math.max(0, Math.min(DURATION, t));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (mode === 'player' && e.key === ' ' && (e.target as HTMLElement).tagName !== 'BUTTON') {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mode, onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Utsavly concept film"
      className="fixed inset-0 z-80 flex flex-col items-center justify-center bg-[#0a0314]"
      initial={{ opacity: mode === 'intro' ? 1 : 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6 } }}
      data-testid={mode === 'intro' ? 'intro' : 'film-player'}
    >
      <div className="relative w-full max-w-[min(100vw,calc((100dvh-120px)*16/9))]">
        <StageCanvas draw={draw} label="Concept film: a diya is lit, Diwali essentials are ordered in an app and delivered to a glowing doorstep." className="block aspect-video w-full" still={0.5} ignoreReducedMotion={mode === 'player'} />
      </div>

      {mode === 'intro' ? (
        <button type="button" onClick={onClose} className="btn btn-ghost absolute bottom-6 right-4 bg-ink/60 backdrop-blur sm:bottom-8 sm:right-8" autoFocus data-testid="skip-intro">
          Skip intro →
        </button>
      ) : (
        <div className="w-full max-w-4xl px-4 pt-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn btn-primary min-h-11! w-11! p-0!"
              onClick={() => {
                if (!playing && time.current >= DURATION) seek(0);
                setPlaying((p) => !p);
              }}
              aria-label={playing ? 'Pause' : 'Play'}
              autoFocus
            >
              {playing ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
            <input
              ref={scrub}
              type="range"
              min={0}
              max={DURATION}
              step={0.01}
              defaultValue={0}
              onInput={(e) => seek(Number(e.currentTarget.value))}
              className="h-2 flex-1 cursor-pointer accent-marigold"
              aria-label="Scrub the film"
            />
            <span ref={clock} className="w-12 text-right text-sm tabular-nums text-muted">0.0s</span>
            <button type="button" onClick={onClose} className="btn btn-ghost min-h-11! px-3!" aria-label="Close film">
              ✕
            </button>
          </div>
          <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center" role="group" aria-label="Jump to scene">
            {SCENES.map((s, i) => (
              <button
                key={s.name}
                type="button"
                onClick={() => seek(s.start + 0.25)}
                aria-current={scene === i ? 'step' : undefined}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${scene === i ? 'bg-marigold text-plum' : 'bg-panel-2 text-muted hover:text-cream'}`}
              >
                {i + 1}. {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function FilmOverlay() {
  const film = useUi((s) => s.film);
  const setFilm = useUi((s) => s.setFilm);
  const close = useCallback(() => {
    writeLocal(INTRO_SEEN_KEY, '1');
    setFilm(null);
  }, [setFilm]);
  return <AnimatePresence>{film && <Film key={film} mode={film} onClose={close} />}</AnimatePresence>;
}
