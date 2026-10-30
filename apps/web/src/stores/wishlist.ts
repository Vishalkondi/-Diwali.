import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from '../lib/storage';

/** Saved product slugs, newest first. Kept in the browser, so it works before signing in. */
type WishlistState = {
  slugs: string[];
  toggle: (slug: string) => boolean;
  remove: (slug: string) => void;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      slugs: [],
      toggle: (slug) => {
        const saved = get().slugs.includes(slug);
        set((s) => ({ slugs: saved ? s.slugs.filter((x) => x !== slug) : [slug, ...s.slugs] }));
        return !saved;
      },
      remove: (slug) => set((s) => ({ slugs: s.slugs.filter((x) => x !== slug) })),
    }),
    { name: 'utsavly-wishlist', storage: safeStorage, version: 1 },
  ),
);

export const isSaved = (slug: string) => (s: WishlistState) => s.slugs.includes(slug);
