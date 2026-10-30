import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RewardCard } from '../components/RewardCard';
import { SpinWheel } from '../components/SpinWheel';
import { StageCanvas } from '../components/StageCanvas';
import { clamp, dim, renderScene, setRouteProgress, TRACKER_SCENES } from '../engine';
import { api, ApiError } from '../lib/api';
import { inr, mmss, shortDate } from '../lib/format';
import { keys, useMe } from '../lib/queries';
import type { Order, OrderStatus, Tracking } from '../lib/types';
import { celebrate } from '../stores/festive';

const STAGES: OrderStatus[] = ['placed', 'packing', 'on_the_way', 'delivered'];
const STAGE_COPY: Record<OrderStatus, { title: string; sub: string }> = {
  placed: { title: 'Order placed', sub: 'Your Diwali essentials are confirmed.' },
  packing: { title: 'Packing your order', sub: 'Diyas, packed with care.' },
  on_the_way: { title: 'On the way', sub: 'Your rider is crossing the city.' },
  delivered: { title: 'Delivered', sub: 'Waiting at your glowing doorstep.' },
};

/** Live tracking over SSE; returns null when the stream is down so polling takes over. */
function useLiveTracking(id: string, enabled: boolean) {
  const [live, setLive] = useState<Tracking | null>(null);
  const [connected, setConnected] = useState(false);
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const es = new EventSource(`/api/orders/${id}/stream`);
    let last: OrderStatus | null = null;
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      const t = JSON.parse(e.data) as Tracking;
      setLive(t);
      setConnected(true);
      if (t.status !== last) {
        last = t.status;
        void qc.invalidateQueries({ queryKey: keys.order(id) });
      }
    };
    es.addEventListener('end', () => es.close());
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, [id, enabled, qc]);
  return { live, connected };
}

function TrackerStage({ tracking }: { tracking: Tracking }) {
  // Each status change restarts its scene clock and dips to dark briefly.
  const state = useRef({ status: tracking.status, since: 0, prev: null as OrderStatus | null, progress: tracking.stageProgress, at: performance.now() });
  if (state.current.status !== tracking.status) {
    state.current.prev = state.current.status;
    state.current.status = tracking.status;
    state.current.since = -1;
  }
  state.current.progress = tracking.stageProgress;
  state.current.at = performance.now();

  const draw = useCallback((t: number) => {
    const s = state.current;
    if (s.since < 0) s.since = t;
    const local = t - s.since;
    const FADE = 0.45;
    const showPrev = s.prev && local < FADE / 2;
    const status = showPrev ? s.prev! : s.status;
    const lt = showPrev ? 99 : Math.max(0, local - FADE / 2) + (s.status === 'placed' ? 0 : 0.3);
    if (status === 'on_the_way') {
      // Interpolate between server ticks (one per second) for a smooth rider.
      const est = s.progress + (performance.now() - s.at) / 1000 / 18;
      setRouteProgress(clamp(showPrev ? 1 : est * 0.98));
    }
    renderScene(TRACKER_SCENES[status], status === 'delivered' ? lt + 0.2 : lt + 0.6);
    setRouteProgress(null);
    if (s.prev) dim(1 - Math.abs(local - FADE / 2) / (FADE / 2));
  }, []);

  return (
    <StageCanvas
      draw={draw}
      label={`${STAGE_COPY[tracking.status].title}: ${STAGE_COPY[tracking.status].sub}`}
      className="block aspect-video w-full"
    />
  );
}

function Stepper({ status }: { status: OrderStatus }) {
  const idx = STAGES.indexOf(status);
  return (
    <div className="relative">
      <div className="absolute bottom-3 left-[17px] top-3 w-1 rounded-full bg-line" aria-hidden="true">
        <motion.div
          className="w-full rounded-full bg-linear-to-b from-marigold to-rose"
          initial={false}
          animate={{ height: `${(idx / (STAGES.length - 1)) * 100}%` }}
          transition={{ type: 'spring', stiffness: 90, damping: 16 }}
        />
      </div>
      <ol className="space-y-6 pl-1" aria-label="Order progress">
        {STAGES.map((s, i) => {
          const done = i <= idx;
          return (
            <li key={s} className="relative flex items-center gap-4" aria-current={i === idx ? 'step' : undefined}>
              <motion.span
                className={`relative z-10 grid h-8 w-8 place-items-center rounded-full border-2 text-sm font-bold ${done ? 'border-marigold bg-marigold text-plum' : 'border-line bg-panel text-muted'}`}
                animate={i === idx ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={{ duration: 0.6 }}
              >
                {done ? '✓' : i + 1}
              </motion.span>
              <div>
                <p className={`font-display text-lg font-bold ${done ? 'text-cream' : 'text-muted'}`}>{STAGE_COPY[s].title}</p>
                <p className="text-sm text-muted">{STAGE_COPY[s].sub}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function OrderPage() {
  const { id = '' } = useParams();
  const me = useMe();
  const [wheel, setWheel] = useState(false);
  const streaming = useRef(false);
  const order = useQuery({
    queryKey: keys.order(id),
    queryFn: () => api<{ order: Order }>(`/orders/${id}`).then((r) => r.order),
    enabled: !!me.data,
    retry: (n, err) => !(err instanceof ApiError && err.status === 404) && n < 2,
    // If the event stream drops, polling keeps the page correct.
    refetchInterval: (q) => (q.state.data?.status === 'delivered' || streaming.current ? false : 3000),
  });
  const delivered = order.data?.status === 'delivered';
  const { live, connected } = useLiveTracking(id, !!order.data && !delivered);
  streaming.current = connected;

  const tracking: Tracking | undefined = live && order.data && STAGES.indexOf(live.status) >= STAGES.indexOf(order.data.status) ? live : order.data?.tracking;
  const status = tracking?.status ?? 'placed';

  // A local second-by-second countdown between server ticks.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const tickAt = useRef({ at: Date.now(), eta: 0 });
  if (tracking && tickAt.current.eta !== tracking.etaSeconds) tickAt.current = { at: Date.now(), eta: tracking.etaSeconds };
  const eta = Math.max(0, tickAt.current.eta - (now - tickAt.current.at) / 1000);

  const celebrated = useRef(false);
  useEffect(() => {
    if (status === 'delivered' && !celebrated.current && order.data && !order.data.reward) {
      celebrated.current = true;
      celebrate({ count: 6 });
    }
  }, [status, order.data]);

  if (me.isLoading) return <div className="shell py-24 text-center text-muted">Loading…</div>;
  if (!me.data) return <Navigate to={`/login?next=/orders/${id}`} replace />;
  if (order.isError) {
    return (
      <div className="shell grid place-items-center gap-3 py-24 text-center">
        <h1 className="font-display text-3xl font-extrabold">We couldn’t find that order</h1>
        <p className="text-muted">It may belong to another account.</p>
        <Link to="/orders" className="btn btn-primary">Your orders</Link>
      </div>
    );
  }
  if (!order.data || !tracking) return <div className="shell py-24 text-center text-muted">Loading your order…</div>;
  const o = order.data;
  const isDelivered = status === 'delivered';

  return (
    <div className="shell py-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted">Order #{o.id.slice(0, 8).toUpperCase()} · {shortDate(o.createdAt)}</p>
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Live tracker</h1>
        </div>
        <span className="text-xs text-muted">{connected ? '● Live' : isDelivered ? '' : '○ Reconnecting…'}</span>
      </div>

      <div className="relative mt-5 overflow-hidden rounded-3xl border border-line bg-[#0a0314]">
        <TrackerStage tracking={tracking} />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 bg-linear-to-t from-ink/95 via-ink/70 to-transparent p-4 pt-12 sm:p-5 sm:pt-16" aria-live="polite">
          <div>
            <p className="font-display text-xl font-extrabold sm:text-2xl" data-testid="stage-title">{STAGE_COPY[status].title}</p>
            <p className="text-sm text-cream/80">{STAGE_COPY[status].sub}</p>
          </div>
          {!isDelivered && (
            <p className="rounded-full bg-ink/70 px-3 py-1.5 font-display text-lg font-bold tabular-nums ring-1 ring-line">
              ETA <span className="text-marigold">{mmss(eta)}</span>
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isDelivered && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16 }}
            className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-linear-to-r from-saffron via-rose to-[#a64dff] p-5 text-white shadow-[0_20px_60px_-20px_rgba(255,61,129,0.7)]"
            data-testid="delivered-banner"
          >
            <div>
              <p className="font-display text-2xl font-extrabold">Shubh Deepavali! Your order has arrived.</p>
              <p className="text-white/90">(In spirit. This was a simulated delivery.)</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!o.reward && (
                <button type="button" className="btn bg-white font-bold text-plum hover:bg-cream" onClick={() => setWheel(true)} data-testid="open-wheel">
                  🎡 Spin the wheel
                </button>
              )}
              <Link to="/wish" className="btn bg-plum/80 text-white hover:bg-plum">Send a Diwali wish</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="card p-5 sm:p-6" aria-labelledby="progress">
          <h2 id="progress" className="mb-5 font-display text-2xl font-bold">Progress</h2>
          <Stepper status={status} />
          {o.reward && (
            <div className="mt-6">
              <RewardCard reward={o.reward} />
            </div>
          )}
        </section>
        <section className="card p-5 sm:p-6" aria-labelledby="sum">
          <h2 id="sum" className="font-display text-2xl font-bold">Order summary</h2>
          <ul className="mt-4 space-y-2">
            {o.items.map((i) => (
              <li key={i.productId} className="flex justify-between gap-3">
                <span>{i.name} <span className="text-muted">× {i.qty}</span></span>
                <span>{inr(i.pricePaise * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{inr(o.subtotalPaise)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{o.deliveryFeePaise === 0 ? 'Free' : inr(o.deliveryFeePaise)}</dd></div>
            {o.discountPaise > 0 && (
              <div className="flex justify-between text-success"><dt>Discount ({o.couponCode})</dt><dd>−{inr(o.discountPaise)}</dd></div>
            )}
            <div className="flex justify-between pt-1 font-display text-lg font-extrabold"><dt>Total</dt><dd>{inr(o.totalPaise)}</dd></div>
          </dl>
          {o.giftMessage && (
            <div className="mt-4 rounded-2xl bg-plum/40 p-3 text-sm">
              <p className="font-bold text-marigold">🎁 Gift message</p>
              <p className="mt-1 text-cream/90">“{o.giftMessage}”</p>
            </div>
          )}
          <div className="mt-4 text-sm text-muted">
            <p className="font-semibold text-cream">Delivering to</p>
            <p>{o.address.flat}, {o.address.society}, {o.address.city}</p>
            {o.address.note && <p className="mt-1 italic">Note: {o.address.note}</p>}
          </div>
          <p className="mt-4 text-xs text-muted">Simulated order: nothing was charged or shipped.</p>
        </section>
      </div>
      <AnimatePresence>{wheel && <SpinWheel orderId={o.id} onClose={() => setWheel(false)} />}</AnimatePresence>
    </div>
  );
}


