import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { productIconKey } from '../engine';
import type { Product } from '../lib/types';
import { safeStorage } from '../lib/storage';

export type CartLine = {
  productId: number;
  slug: string;
  name: string;
  subtitle: string;
  pricePaise: number;
  icon: string;
  tint: string;
  qty: number;
};

type CartState = {
  lines: CartLine[];
  add: (p: Product, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  clear: () => void;
};

export const MAX_QTY = 20;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (p, qty = 1) =>
        set((s) => {
          const existing = s.lines.find((l) => l.productId === p.id);
          if (existing) {
            return {
              lines: s.lines.map((l) => (l.productId === p.id ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l)),
            };
          }
          return {
            lines: [
              ...s.lines,
              {
                productId: p.id,
                slug: p.slug,
                name: p.name,
                subtitle: p.subtitle,
                pricePaise: p.pricePaise,
                icon: productIconKey(p),
                tint: p.category.tint,
                qty: Math.min(MAX_QTY, qty),
              },
            ],
          };
        }),
      setQty: (productId, qty) =>
        set((s) => ({
          lines:
            qty <= 0
              ? s.lines.filter((l) => l.productId !== productId)
              : s.lines.map((l) => (l.productId === productId ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)),
        })),
      clear: () => set({ lines: [] }),
    }),
    { name: 'diya-dash-cart', storage: safeStorage, version: 1 },
  ),
);

export const cartCount = (s: CartState) => s.lines.reduce((n, l) => n + l.qty, 0);
export const cartSubtotal = (s: CartState) => s.lines.reduce((n, l) => n + l.qty * l.pricePaise, 0);
export const qtyOf = (productId: number) => (s: CartState) => s.lines.find((l) => l.productId === productId)?.qty ?? 0;
