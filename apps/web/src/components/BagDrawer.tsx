import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { deliveryFeeFor, FREE_DELIVERY_FROM, inr } from '../lib/format';
import { useMe } from '../lib/queries';
import { play } from '../lib/sound';
import { cartSubtotal, useCart } from '../stores/cart';
import { useUi } from '../stores/ui';
import { ProductIcon } from './ProductIcon';
import { Stepper } from './Stepper';

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function BagDrawer() {
  const open = useUi((s) => s.bagOpen);
  const setOpen = useUi((s) => s.setBagOpen);
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const subtotal = useCart(cartSubtotal);
  const { data: user } = useMe();
  const panel = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);

  const fee = deliveryFeeFor(subtotal);
  const toFree = Math.max(0, FREE_DELIVERY_FROM - subtotal);
  const pct = Math.min(100, (subtotal / FREE_DELIVERY_FROM) * 100);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    restore.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFirst = window.setTimeout(() => panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
      if (e.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(focusFirst);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      restore.current?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            aria-hidden="true"
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bag-title"
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-panel shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            data-testid="bag-drawer"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 id="bag-title" className="font-display text-2xl font-extrabold">Your bag</h2>
              <button type="button" onClick={close} className="btn btn-ghost min-h-10! px-3!" aria-label="Close bag" data-autofocus>
                ✕
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
                  <ProductIcon icon="diya" size={140} active />
                </motion.div>
                <p className="font-display text-2xl font-bold">Your bag is waiting for its first diya</p>
                <p className="text-sm text-muted">Add a few things and we’ll “deliver” them in minutes.</p>
                <Link to="/#store" onClick={close} className="btn btn-primary mt-2">
                  Start shopping
                </Link>
              </div>
            ) : (
              <>
                <div className="px-5 pt-4">
                  <p className="text-sm font-semibold text-cream">
                    {toFree > 0 ? (
                      <>Add <span className="text-marigold">{inr(toFree)}</span> more for free delivery</>
                    ) : (
                      <>🎉 You’ve unlocked free delivery</>
                    )}
                  </p>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-panel-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Progress to free delivery">
                    <motion.div
                      className="h-full rounded-full bg-linear-to-r from-marigold via-saffron to-rose"
                      initial={false}
                      animate={{ width: `${pct}%` }}
                      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    />
                  </div>
                </div>
                <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => (
                      <motion.li
                        key={l.productId}
                        layout
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 60, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        className="flex items-center gap-3 overflow-hidden rounded-2xl bg-panel-2 p-2.5"
                      >
                        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl" style={{ background: l.tint }}>
                          <ProductIcon icon={l.icon} size={58} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display font-bold leading-tight">{l.name}</p>
                          <p className="text-sm text-muted">{inr(l.pricePaise)}</p>
                        </div>
                        <Stepper
                          qty={l.qty}
                          name={l.name}
                          tone="dark"
                          size="sm"
                          onChange={(n) => {
                            setQty(l.productId, n);
                            play('tick');
                          }}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                <div className="border-t border-line px-5 py-4">
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{inr(subtotal)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{fee === 0 ? <span className="text-success">Free</span> : inr(fee)}</dd></div>
                    <div className="flex justify-between pt-1 font-display text-lg font-extrabold"><dt>Total</dt><dd>{inr(subtotal + fee)}</dd></div>
                  </dl>
                  <Link
                    to={user ? '/checkout' : '/login?next=/checkout'}
                    onClick={close}
                    className="btn btn-primary mt-4 w-full"
                    data-testid="checkout-link"
                  >
                    {user ? `Checkout · ${inr(subtotal + fee)}` : 'Sign in to checkout'}
                  </Link>
                  <p className="mt-2 text-center text-xs text-muted">Simulated checkout. Nothing is charged.</p>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
