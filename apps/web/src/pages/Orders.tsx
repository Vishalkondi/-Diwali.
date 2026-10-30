import { Link, Navigate } from 'react-router';
import { motion } from 'motion/react';
import { RewardCard } from '../components/RewardCard';
import { inr, shortDate, STATUS_LABEL } from '../lib/format';
import { useMe, useOrders, useRewards } from '../lib/queries';
import type { OrderStatus } from '../lib/types';

const PILL: Record<OrderStatus, string> = {
  placed: 'bg-panel-2 text-cream ring-line',
  packing: 'bg-marigold/15 text-marigold ring-marigold/40',
  on_the_way: 'bg-teal/15 text-teal ring-teal/40',
  delivered: 'bg-success/15 text-success ring-success/40',
};

export default function Orders() {
  const me = useMe();
  const orders = useOrders(!!me.data);
  const rewards = useRewards(!!me.data);

  if (me.isLoading) return <div className="shell py-24 text-center text-muted">Loading…</div>;
  if (!me.data) return <Navigate to="/login?next=/orders" replace />;

  return (
    <div className="shell py-10">
      <h1 className="font-display text-4xl font-extrabold">Your orders</h1>
      <p className="mt-1 text-muted">Namaste, {me.data.name.split(' ')[0]}. Here’s everything you’ve lit up.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="list">
          <h2 id="list" className="sr-only">Orders</h2>
          {orders.isLoading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-panel-2" />)}</div>
          ) : orders.isError ? (
            <div className="card p-6">
              <p>Couldn’t load your orders.</p>
              <button type="button" className="btn btn-ghost mt-3" onClick={() => orders.refetch()}>Retry</button>
            </div>
          ) : orders.data?.length === 0 ? (
            <div className="card grid place-items-center gap-3 px-6 py-14 text-center">
              <p className="font-display text-2xl font-bold">No orders yet</p>
              <p className="text-muted">Your first diya is a tap away.</p>
              <Link to="/#store" className="btn btn-primary">Shop the Diwali Store</Link>
            </div>
          ) : (
            <motion.ul className="space-y-3" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}>
              {orders.data?.map((o) => (
                <motion.li key={o.id} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 220, damping: 22 } } }}>
                  <Link to={`/orders/${o.id}`} className="card flex flex-wrap items-center gap-4 p-4 transition-colors hover:border-marigold/60 sm:p-5" data-testid="order-row">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-bold">
                        {o.items.slice(0, 2).map((i) => i.name).join(', ')}
                        {o.items.length > 2 && <span className="text-muted"> +{o.items.length - 2} more</span>}
                      </p>
                      <p className="text-sm text-muted">#{o.id.slice(0, 8).toUpperCase()} · {shortDate(o.createdAt)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${PILL[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                    <span className="w-20 text-right font-display text-lg font-extrabold">{inr(o.totalPaise)}</span>
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </section>

        <aside className="card h-fit p-5" aria-labelledby="rewards">
          <h2 id="rewards" className="font-display text-2xl font-bold">Lakshmi rewards</h2>
          <p className="mt-1 text-sm text-muted">Spin the wheel after each delivery. Rewards are single-use and last 30 days.</p>
          <div className="mt-4 space-y-3">
            {rewards.data?.rewards.length ? (
              rewards.data.rewards.map((r) => <RewardCard key={r.code} reward={r} compact />)
            ) : (
              <p className="rounded-2xl bg-panel-2 p-4 text-sm text-muted">No rewards yet. Wait for a delivery, then spin!</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
