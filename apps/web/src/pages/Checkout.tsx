import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { Field } from '../components/Field';
import { ProductIcon } from '../components/ProductIcon';
import { api, ApiError } from '../lib/api';
import { deliveryFeeFor, inr } from '../lib/format';
import { keys, useCoupons, useMe, useRewards } from '../lib/queries';
import { play } from '../lib/sound';
import type { CouponCheck, Order } from '../lib/types';
import { cartSubtotal, useCart } from '../stores/cart';

type CouponState = { status: 'idle' } | { status: 'checking'; code: string } | { status: 'ok'; check: CouponCheck } | { status: 'error'; code: string; message: string };

export default function Checkout() {
  const me = useMe();
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const subtotal = useCart(cartSubtotal);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const coupons = useCoupons();
  const rewards = useRewards(!!me.data);

  const [address, setAddress] = useState({ flat: '', society: '', city: 'Pune', note: '' });
  const [gift, setGift] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [coupon, setCoupon] = useState<CouponState>({ status: 'idle' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const items = lines.map((l) => ({ productId: l.productId, qty: l.qty }));
  const itemsKey = JSON.stringify(items);

  const check = async (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) return setCoupon({ status: 'idle' });
    setCodeInput(code);
    setCoupon({ status: 'checking', code });
    try {
      const res = await api<CouponCheck>('/coupons/validate', { method: 'POST', body: { code, items } });
      setCoupon({ status: 'ok', check: res });
      play('chime');
    } catch (err) {
      setCoupon({ status: 'error', code, message: err instanceof ApiError ? err.message : 'Could not check that code.' });
    }
  };

  // Re-validate when the bag changes, so the discount is always the server's number.
  useEffect(() => {
    // (An empty bag means the order was just placed and the cart cleared.)
    if (coupon.status === 'ok' && items.length > 0) void check(coupon.check.code);
  }, [itemsKey]);

  if (me.isLoading) return <div className="shell py-24 text-center text-muted">Loading…</div>;
  if (!me.data) return <Navigate to="/login?next=/checkout" replace />;

  if (lines.length === 0) {
    return (
      <div className="shell grid place-items-center gap-3 py-24 text-center">
        <ProductIcon icon="diya" size={120} active />
        <h1 className="font-display text-3xl font-extrabold">Your bag is empty</h1>
        <Link to="/#store" className="btn btn-primary">Back to the Diwali Store</Link>
      </div>
    );
  }

  const fee = deliveryFeeFor(subtotal);
  const applied = coupon.status === 'ok' ? coupon.check : null;
  const discount = applied?.discountPaise ?? 0;
  const total = applied ? applied.totalPaise : subtotal + fee;
  const unusedRewards = (rewards.data?.rewards ?? []).filter((r) => !r.used && !r.expired);

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage('');
    try {
      const res = await api<{ order: Order }>('/orders', {
        method: 'POST',
        body: {
          items,
          address: { ...address, note: address.note || undefined },
          couponCode: applied?.code,
          giftMessage: gift || undefined,
        },
      });
      clear();
      qc.setQueryData(keys.order(res.order.id), res.order);
      void qc.invalidateQueries({ queryKey: keys.orders });
      void qc.invalidateQueries({ queryKey: keys.rewards });
      void qc.invalidateQueries({ queryKey: ['products'] });
      navigate(`/orders/${res.order.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const f = err.fields;
        setErrors(Object.fromEntries(Object.entries(f).map(([k, v]) => [k.replace('address.', ''), v])));
        setMessage(err.message);
        if (f.couponCode) setCoupon({ status: 'error', code: applied?.code ?? codeInput, message: f.couponCode });
        if (err.status === 409) void qc.invalidateQueries({ queryKey: ['products'] });
      } else setMessage('Could not place the order. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const setA = (k: keyof typeof address) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setAddress((a) => ({ ...a, [k]: e.target.value }));

  return (
    <div className="shell py-10">
      <h1 className="font-display text-4xl font-extrabold">Checkout</h1>
      <p className="mt-1 text-muted">A simulated order: nothing is charged and nothing ships.</p>
      <form onSubmit={placeOrder} className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]" noValidate>
        <div className="space-y-6">
          <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="addr">
            <h2 id="addr" className="font-display text-2xl font-bold">Where should we deliver?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Flat / house no." name="flat" value={address.flat} onChange={setA('flat')} error={errors.flat} autoComplete="address-line1" placeholder="402" />
              <Field label="Society / street" name="society" value={address.society} onChange={setA('society')} error={errors.society} autoComplete="address-line2" placeholder="Lotus Residency, Baner" />
            </div>
            <Field label="City" name="city" value={address.city} onChange={setA('city')} error={errors.city} autoComplete="address-level2" />
            <Field label="Note for the rider (optional)" name="note" value={address.note} onChange={setA('note')} error={errors.note} placeholder="Ring the bell twice, the diyas are lit!" maxLength={140} />
          </section>

          <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="offers">
            <h2 id="offers" className="font-display text-2xl font-bold">Offers & gifting</h2>
            <div>
              <label htmlFor="coupon" className="mb-1.5 block text-sm font-semibold">Coupon or reward code</label>
              <div className="flex gap-2">
                <input
                  id="coupon"
                  className="field uppercase"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void check(codeInput);
                    }
                  }}
                  placeholder="DIWALI10"
                  aria-describedby="coupon-status"
                  autoComplete="off"
                />
                {applied ? (
                  <button type="button" className="btn btn-ghost" onClick={() => { setCoupon({ status: 'idle' }); setCodeInput(''); }}>Remove</button>
                ) : (
                  <button type="button" className="btn btn-ghost" onClick={() => check(codeInput)} disabled={!codeInput.trim() || coupon.status === 'checking'}>Apply</button>
                )}
              </div>
              <div id="coupon-status" aria-live="polite" className="mt-1.5 min-h-5 text-sm">
                {coupon.status === 'checking' && <span className="text-muted">Checking {coupon.code}…</span>}
                {coupon.status === 'ok' && <span className="font-semibold text-success">✓ {coupon.check.code} applied: {coupon.check.description}. You save {inr(coupon.check.discountPaise)}.</span>}
                {coupon.status === 'error' && <span className="font-medium text-rose">{coupon.message}</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-2" aria-label="Available offers">
                {coupons.data?.map((c) => (
                  <button key={c.code} type="button" onClick={() => check(c.code)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${applied?.code === c.code ? 'border-marigold bg-marigold text-plum' : 'border-line bg-panel-2 hover:border-marigold'}`} title={c.description}>
                    {c.code}
                  </button>
                ))}
                {unusedRewards.map((r) => (
                  <button key={r.code} type="button" onClick={() => check(r.code)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${applied?.code === r.code ? 'border-rose bg-rose text-white' : 'border-rose/50 bg-rose/10 text-cream hover:border-rose'}`} title={r.description}>
                    🪔 {r.label} · {r.code}
                  </button>
                ))}
              </div>
            </div>
            <Field
              textarea
              label="Gift message (optional)"
              name="gift"
              value={gift}
              onChange={(e) => setGift(e.target.value)}
              maxLength={160}
              rows={2}
              placeholder="Happy Diwali, Nani! Love, Aarav"
              hint={`${gift.length}/160`}
              error={errors.giftMessage}
            />
          </section>
        </div>

        <aside className="card h-fit p-5 sm:p-6 lg:sticky lg:top-28" aria-labelledby="summary">
          <h2 id="summary" className="font-display text-2xl font-bold">Order summary</h2>
          <ul className="mt-4 space-y-3">
            {lines.map((l) => (
              <li key={l.productId} className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: l.tint }}>
                  <ProductIcon icon={l.icon} size={44} />
                </div>
                <span className="min-w-0 flex-1 truncate">{l.name} <span className="text-muted">× {l.qty}</span></span>
                <span className="font-semibold">{inr(l.pricePaise * l.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{inr(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{fee === 0 ? <span className="text-success">Free</span> : inr(fee)}</dd></div>
            <AnimatePresence>
              {discount > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex justify-between text-success">
                  <dt>Discount ({applied?.code})</dt>
                  <dd>−{inr(discount)}</dd>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex justify-between pt-2 font-display text-xl font-extrabold"><dt>Total</dt><dd>{inr(total)}</dd></div>
          </dl>
          {message && (
            <p className="mt-4 rounded-xl bg-rose/15 px-3 py-2 text-sm font-medium text-rose" role="alert">{message}</p>
          )}
          <button type="submit" className="btn btn-primary mt-5 w-full text-lg" disabled={busy || coupon.status === 'checking'} data-testid="place-order">
            {busy ? 'Placing order…' : `Place order · ${inr(total)}`}
          </button>
          <p className="mt-2 text-center text-xs text-muted">Simulated order. No payment is taken.</p>
        </aside>
      </form>
    </div>
  );
}
