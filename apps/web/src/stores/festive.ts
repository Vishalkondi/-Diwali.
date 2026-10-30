import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { play } from '../lib/sound';
import { prefersReducedMotion, safeStorage } from '../lib/storage';

export type Burst = { id: number; x: number; y: number; start: number; seed: number; colour?: string; size: number };

type FestiveState = {
  sparkles: boolean;
  petals: boolean;
  sound: boolean;
  toggle: (k: 'sparkles' | 'petals' | 'sound') => void;
  bursts: Burst[];
  addBursts: (b: Omit<Burst, 'id' | 'start'>[]) => void;
  prune: (now: number) => void;
};

let id = 1;

export const useFestive = create<FestiveState>()(
  persist(
    (set) => ({
      sparkles: true,
      petals: true,
      // Sound is always off until someone turns it on.
      sound: false,
      toggle: (k) => set((s) => ({ [k]: !s[k] }) as Partial<FestiveState>),
      bursts: [],
      addBursts: (list) =>
        set((s) => ({
          bursts: [...s.bursts, ...list.map((b, i) => ({ ...b, id: id++, start: performance.now() + i * 220 }))].slice(-24),
        })),
      prune: (now) => set((s) => ({ bursts: s.bursts.filter((b) => now - b.start < 2200) })),
    }),
    {
      name: 'diya-dash-festive',
      storage: safeStorage,
      partialize: (s) => ({ sparkles: s.sparkles, petals: s.petals, sound: s.sound }),
    },
  ),
);

/**
 * Full-screen fireworks. With no origin, bursts are scattered across the top of the
 * viewport; with one (e.g. the logo), they pop around that point.
 */
export function celebrate(opts: { x?: number; y?: number; count?: number } = {}) {
  if (prefersReducedMotion()) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const count = opts.count ?? 5;
  const list = Array.from({ length: count }, (_, i) => {
    const near = opts.x !== undefined && opts.y !== undefined;
    return {
      x: near ? opts.x! + (Math.random() - 0.5) * 160 : w * (0.15 + Math.random() * 0.7),
      y: near ? opts.y! + 40 + Math.random() * 80 : h * (0.15 + Math.random() * 0.35),
      seed: Math.random() * 1000 + i,
      size: near ? 0.55 : 0.8 + Math.random() * 0.5,
    };
  });
  useFestive.getState().addBursts(list);
  play('pop');
}
