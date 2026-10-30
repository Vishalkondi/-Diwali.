import { motion } from 'motion/react';
import { play } from '../lib/sound';
import { isSaved, useWishlist } from '../stores/wishlist';

/** The heart that adds a product to the wishlist (or takes it off). */
export function SaveButton({ slug, name, className = '', size = 18 }: { slug: string; name: string; className?: string; size?: number }) {
  const saved = useWishlist(isSaved(slug));
  const toggle = useWishlist((s) => s.toggle);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.8 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        play(toggle(slug) ? 'pop' : 'tick');
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      className={`grid place-items-center rounded-full bg-white/85 text-rose shadow-sm backdrop-blur transition-colors hover:bg-white ${className}`}
      data-testid="save-button"
    >
      <motion.svg
        key={String(saved)}
        initial={{ scale: saved ? 0.4 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 14 }}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" />
      </motion.svg>
    </motion.button>
  );
}
