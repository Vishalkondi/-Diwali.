import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { play } from '../lib/sound';
import { celebrate, useFestive } from '../stores/festive';

function Switch({ label, on, onToggle, disabled }: { label: string; on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-6 rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-panel-2 disabled:opacity-50"
    >
      {label}
      <span className={`relative h-6 w-11 rounded-full transition-colors ${on && !disabled ? 'bg-marigold' : 'bg-line'}`}>
        <motion.span
          className="absolute top-1 h-4 w-4 rounded-full bg-cream shadow"
          animate={{ left: on && !disabled ? 24 : 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </span>
    </button>
  );
}

/** Floating switchboard: sparkles, petals, sound and a "Fireworks" button. */
export function FestiveToggles() {
  const [open, setOpen] = useState(false);
  const { sparkles, petals, sound, toggle } = useFestive();
  const reduced = useReducedMotion() ?? false;
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="fixed bottom-4 left-4 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            id={id}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="card mb-3 w-64 origin-bottom-left p-2 shadow-2xl"
          >
            <p className="px-3 pb-1 pt-2 font-display text-lg font-bold">Festive switchboard</p>
            {reduced && <p className="px-3 pb-2 text-xs text-muted">Animations are off because your device prefers reduced motion.</p>}
            <Switch label="Cursor sparkles" on={sparkles} onToggle={() => toggle('sparkles')} disabled={reduced} />
            <Switch label="Falling petals" on={petals} onToggle={() => toggle('petals')} disabled={reduced} />
            <Switch
              label="Sound"
              on={sound}
              onToggle={() => {
                toggle('sound');
                if (!sound) setTimeout(() => play('chime'), 50);
              }}
              disabled={reduced}
            />
            <button type="button" className="btn btn-primary mt-2 w-full" onClick={() => celebrate({ count: 6 })} disabled={reduced}>
              🎆 Fireworks
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        aria-label="Festive switchboard"
        className="grid h-12 w-12 place-items-center rounded-full border border-line bg-panel/90 text-xl shadow-lg backdrop-blur transition-transform hover:scale-105"
      >
        <span aria-hidden="true">✨</span>
      </button>
    </div>
  );
}
