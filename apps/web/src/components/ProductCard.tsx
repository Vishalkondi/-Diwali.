import { forwardRef, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, type Variants } from 'motion/react';
import { productIconKey } from '../engine';
import { inr } from '../lib/format';
import { play } from '../lib/sound';
import type { Product } from '../lib/types';
import { qtyOf, useCart } from '../stores/cart';
import { useUi } from '../stores/ui';
import { ProductIcon } from './ProductIcon';
import { Stepper } from './Stepper';

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.94 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 22, delay: Math.min(i, 12) * 0.045 },
  }),
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.18 } },
};

/** Launches the glowing diya from an element's centre into the bag. */
export function flyFrom(el: Element | null) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  useUi.getState().fly(r.left + r.width / 2, r.top + r.height / 2);
}

export const ProductCard = forwardRef<HTMLElement, { product: Product; index: number }>(function ProductCard({ product, index }, ref) {
  const qty = useCart(qtyOf(product.id));
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const [active, setActive] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Tilt toward the pointer with a spring.
  const rx = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    if (reduced || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 12);
    rx.set(-py * 10);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
    setActive(false);
  };

  const soldOut = product.stock <= 0;
  const onAdd = () => {
    add(product);
    flyFrom(iconRef.current);
    play('pop');
  };

  return (
    <motion.article
      ref={ref}
      layout
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 800 }}
      onPointerMove={onMove}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={reset}
      onFocus={() => setActive(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setActive(false)}
      className="group relative flex flex-col rounded-3xl bg-cream p-2.5 text-ink shadow-[0_20px_40px_-24px_rgba(0,0,0,0.8)]"
      data-testid="product-card"
      aria-label={product.name}
    >
      <div ref={iconRef} className="relative grid aspect-[5/4] place-items-center overflow-hidden rounded-2xl" style={{ background: product.category.tint }}>
        <ProductIcon icon={productIconKey(product)} size={150} active={active} className="max-w-[78%] transition-transform duration-300 group-hover:scale-105" />
        {product.badge && (
          <span className="absolute left-2 top-2 rounded-full bg-plum px-2.5 py-1 text-[11px] font-bold tracking-wide text-cream">{product.badge}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
        <h3 className="font-display text-[17px] font-extrabold leading-tight">{product.name}</h3>
        <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-[#5b4a6e]">{product.subtitle}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <span className="font-display text-lg font-extrabold">{inr(product.pricePaise)}</span>
          {soldOut ? (
            <span className="rounded-xl bg-black/5 px-3 py-2 text-xs font-bold text-[#5b4a6e]">Sold out</span>
          ) : qty === 0 ? (
            <motion.button
              type="button"
              onClick={onAdd}
              whileTap={{ scale: 0.92 }}
              className="h-10 rounded-xl border-2 border-success bg-white px-5 font-display text-sm font-extrabold text-success shadow-sm transition-colors hover:bg-success hover:text-white"
              aria-label={`Add ${product.name} to bag`}
            >
              ADD
            </motion.button>
          ) : (
            <Stepper
              qty={qty}
              name={product.name}
              onChange={(n) => {
                if (n > qty) flyFrom(iconRef.current);
                setQty(product.id, n);
                play(n > qty ? 'pop' : 'tick');
              }}
            />
          )}
        </div>
      </div>
    </motion.article>
  );
});

export function ProductSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl bg-panel-2 p-2.5" aria-hidden="true">
      <div className="aspect-[5/4] rounded-2xl bg-line/60" />
      <div className="mt-3 h-4 w-2/3 rounded bg-line/60" />
      <div className="mt-2 h-3 w-1/2 rounded bg-line/40" />
      <div className="mt-5 flex justify-between">
        <div className="h-5 w-12 rounded bg-line/60" />
        <div className="h-9 w-16 rounded-xl bg-line/60" />
      </div>
    </div>
  );
}
