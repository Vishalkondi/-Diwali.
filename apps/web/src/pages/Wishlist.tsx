import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ProductCard, ProductSkeleton } from '../components/ProductCard';
import { useProducts } from '../lib/queries';
import { play } from '../lib/sound';
import { useCart } from '../stores/cart';
import { useWishlist } from '../stores/wishlist';

export default function Wishlist() {
  const slugs = useWishlist((s) => s.slugs);
  const products = useProducts();
  const add = useCart((s) => s.add);
  // Newest saves first; slugs whose product no longer exists drop out quietly.
  const saved = slugs.flatMap((slug) => products.data?.find((p) => p.slug === slug) ?? []);
  const inStock = saved.filter((p) => p.stock > 0);

  return (
    <div className="shell py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold">Your wishlist</h1>
          <p className="mt-1 text-muted">
            {slugs.length ? `${slugs.length} saved for the festival. Saved on this device.` : 'Tap the ♡ on anything to save it here.'}
          </p>
        </div>
        {inStock.length > 1 && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              for (const p of inStock) add(p);
              play('chime');
            }}
          >
            Add all to bag
          </button>
        )}
      </div>

      <div className="mt-8">
        {products.isLoading && slugs.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {slugs.slice(0, 8).map((s) => <ProductSkeleton key={s} />)}
          </div>
        ) : saved.length === 0 ? (
          <div className="card grid place-items-center gap-3 px-6 py-16 text-center">
            <p className="text-5xl" aria-hidden="true">💛</p>
            <p className="font-display text-2xl font-bold">Nothing saved yet</p>
            <p className="max-w-sm text-muted">Browse the Diwali Store and tap the heart on diyas, mithai or lights you like.</p>
            <Link to="/#store" className="btn btn-primary mt-2">Browse the store</Link>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {saved.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
