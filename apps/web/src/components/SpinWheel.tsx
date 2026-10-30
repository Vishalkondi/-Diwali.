import { useEffect, useRef, useState } from 'react';
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { keys, usePrizes } from '../lib/queries';
import { play } from '../lib/sound';
import type { Reward } from '../lib/types';
import { celebrate } from '../stores/festive';
import { RewardCard } from './RewardCard';

const SEG = 360 / 8;

function polar(r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [100 + r * Math.cos(a), 100 + r * Math.sin(a)] as const;
}

function slice(i: number) {
  const [x0, y0] = polar(96, i * SEG);
  const [x1, y1] = polar(96, (i + 1) * SEG);
  return `M100 100 L${x0} ${y0} A96 96 0 0 1 ${x1} ${y1} Z`;
}

/** An 8-segment SVG wheel that eases onto whatever prize the server picked. */
export function SpinWheel({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const prizes = usePrizes();
  const qc = useQueryClient();
  const rotation = useMotionValue(0);
  const reduced = useReducedMotion();
  const [state, setState] = useState<'ready' | 'spinning' | 'done' | 'error'>('ready');
  const [reward, setReward] = useState<Reward | null>(null);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && state !== 'spinning' && onClose();
    document.addEventListener('keydown', onKey);
    dialog.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [state, onClose]);

  const spin = async () => {
    setState('spinning');
    try {
      const res = await api<{ prizeIndex: number; reward: Reward }>(`/orders/${orderId}/spin`, { method: 'POST' });
      await land(res.prizeIndex);
      finish(res.reward);
    } catch (err) {
      const existing = err instanceof ApiError ? (err.details?.reward as Reward | undefined) : undefined;
      if (existing) {
        await land(existing.prizeIndex);
        finish(existing);
      } else {
        setError(err instanceof Error ? err.message : 'The wheel got stuck. Please try again.');
        setState('error');
      }
    }
  };

  const land = async (index: number) => {
    // Pointer is at the top: bring the centre of segment `index` there after 6 full turns.
    const jitter = (Math.random() - 0.5) * SEG * 0.6;
    const target = 360 * 6 + (360 - (index * SEG + SEG / 2)) + jitter;
    if (reduced) {
      rotation.set(target);
      return;
    }
    let lastSeg = 0;
    await animate(rotation, target, {
      duration: 5,
      ease: [0.12, 0.8, 0.18, 1],
      onUpdate: (v) => {
        const seg = Math.floor(v / SEG);
        if (seg !== lastSeg) {
          lastSeg = seg;
          play('tick');
        }
      },
    });
  };

  const finish = (r: Reward) => {
    setReward(r);
    setState('done');
    play('chime');
    celebrate({ count: 5 });
    void qc.invalidateQueries({ queryKey: keys.order(orderId) });
    void qc.invalidateQueries({ queryKey: keys.rewards });
  };

  return (
    <motion.div className="fixed inset-0 z-55 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-ink/70 backdrop-blur-sm" onClick={() => state !== 'spinning' && onClose()} aria-hidden="true" />
      <motion.div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wheel-title"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="card relative w-full max-w-md p-6 text-center"
        data-testid="spin-wheel"
      >
        <button type="button" onClick={onClose} disabled={state === 'spinning'} className="btn btn-ghost absolute right-3 top-3 min-h-9! px-3!" aria-label="Close" data-autofocus>
          ✕
        </button>
        <h2 id="wheel-title" className="font-display text-3xl font-extrabold">Lakshmi’s wheel</h2>
        <p className="mt-1 text-sm text-muted">One spin per delivered order. Everyone wins something.</p>
        <div className="relative mx-auto mt-5 w-full max-w-[300px]">
          <svg viewBox="0 0 200 200" className="w-full drop-shadow-[0_0_30px_rgba(255,180,46,0.35)]" aria-hidden="true">
            {/* Motion rotates SVG groups around their own box centre, which is the wheel centre. */}
            <motion.g style={{ rotate: rotation }} data-testid="wheel-rotor">
              {(prizes.data ?? []).map((p, i) => {
                const [tx, ty] = polar(60, i * SEG + SEG / 2);
                return (
                  <g key={p.index}>
                    <path d={slice(i)} fill={p.colour} stroke="#170a29" strokeWidth="1.5" />
                    <text
                      x={tx}
                      y={ty}
                      fill="#1b0a2a"
                      fontSize="11"
                      fontWeight="800"
                      fontFamily="Baloo 2, sans-serif"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${i * SEG + SEG / 2 - 90} ${tx} ${ty})`}
                    >
                      {p.label}
                    </text>
                  </g>
                );
              })}
              <circle cx="100" cy="100" r="96" fill="none" stroke="#ffe08a" strokeWidth="3" />
            </motion.g>
            <circle cx="100" cy="100" r="16" fill="#3a0b4d" stroke="#ffe08a" strokeWidth="3" />
            <path d="M93 98c0 6 3 8 7 8s7-2 7-8z" fill="#ffb42e" />
            <path d="M100 97c-3-1-2-5 0-9 2 4 3 8 0 9z" fill="#fff3d6" />
            <path d="M100 18 L91 2 L109 2 Z" fill="#fff3d6" stroke="#3a0b4d" strokeWidth="1.5" />
          </svg>
        </div>
        <ul className="sr-only">
          {prizes.data?.map((p) => <li key={p.index}>{p.label}: {p.description}</li>)}
        </ul>
        <AnimatePresence mode="wait">
          {state === 'done' && reward ? (
            <motion.div key="won" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
              <RewardCard reward={reward} />
            </motion.div>
          ) : (
            <motion.div key="spin" className="mt-5">
              {state === 'error' && <p className="mb-3 text-sm text-rose" role="alert">{error}</p>}
              <button type="button" className="btn btn-primary w-full text-lg" onClick={spin} disabled={state === 'spinning' || !prizes.data} data-testid="spin-button">
                {state === 'spinning' ? 'Spinning…' : 'Spin!'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
