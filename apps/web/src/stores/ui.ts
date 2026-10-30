import { create } from 'zustand';

export type Flight = { id: number; x: number; y: number };

type UiState = {
  bagOpen: boolean;
  setBagOpen: (open: boolean) => void;
  /** 'intro' auto-plays on a first visit; 'player' has full controls. */
  film: 'intro' | 'player' | null;
  setFilm: (f: UiState['film']) => void;
  /** Increments whenever something lands in the bag, to bump its badge. */
  bump: number;
  flights: Flight[];
  /** Launch a glowing diya from a screen point into the bag button. */
  fly: (x: number, y: number) => void;
  land: (id: number) => void;
};

let nextId = 1;

export const useUi = create<UiState>()((set) => ({
  bagOpen: false,
  setBagOpen: (bagOpen) => set({ bagOpen }),
  film: null,
  setFilm: (film) => set({ film }),
  bump: 0,
  flights: [],
  fly: (x, y) => set((s) => ({ flights: [...s.flights, { id: nextId++, x, y }] })),
  land: (id) => set((s) => ({ flights: s.flights.filter((f) => f.id !== id), bump: s.bump + 1 })),
}));

/** The bag button registers itself so flights know where to land. */
let bagTarget: HTMLElement | null = null;
export const setBagTarget = (el: HTMLElement | null) => {
  bagTarget = el;
};
export const getBagTarget = () => bagTarget;
