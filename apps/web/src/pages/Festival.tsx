import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { flyFrom } from '../components/ProductCard';
import { ProductIcon } from '../components/ProductIcon';
import { FIVE_DAYS, LAKSHMI_PUJA, PUJA_CHECKLIST, useCountdown } from '../lib/festival';
import { productIconKey } from '../engine';
import { inr } from '../lib/format';
import { useProducts } from '../lib/queries';
import { play } from '../lib/sound';
import { readJSON, writeLocal } from '../lib/storage';
import { useCart } from '../stores/cart';
import { celebrate } from '../stores/festive';

function FlipDigit({ value }: { value: string }) {
  return (
    <span className="relative inline-grid h-[1.25em] w-[0.72em] place-items-center overflow-hidden rounded-lg bg-panel-2 ring-1 ring-line [perspective:400px]">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 90, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.3, 0.7, 0.2, 1] }}
          className="block origin-center"
        >
          {value}
        </motion.span>
      </AnimatePresence>
      <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-ink/60" aria-hidden="true" />
    </span>
  );
}

function Unit({ n, label }: { n: number; label: string }) {
  const s = String(n).padStart(2, '0');
  return (
    <div className="text-center">
      <div className="flex gap-1 font-display text-5xl font-extrabold text-marigold sm:text-7xl" aria-hidden="true">
        {s.split('').map((d, i) => <FlipDigit key={i} value={d} />)}
      </div>
      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted">{label}</p>
    </div>
  );
}

const CHECK_KEY = 'diya-dash-puja-checklist';

function ProgressRing({ value, total }: { value: number; total: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#33204f" strokeWidth="10" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="url(#ring)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - value / total) }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
        />
        <defs>
          <linearGradient id="ring" x1="0" x2="1">
            <stop offset="0" stopColor="#ffb42e" />
            <stop offset="1" stopColor="#ff3d81" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <p className="font-display text-3xl font-extrabold leading-none">{value}<span className="text-lg text-muted">/{total}</span></p>
      </div>
    </div>
  );
}

function Checklist() {
  const products = useProducts();
  const add = useCart((s) => s.add);
  const inBag = useCart((s) => s.lines);
  const [checked, setChecked] = useState<string[]>(() => readJSON<string[]>(CHECK_KEY, []));
  const rows = useRef<Record<string, HTMLLIElement | null>>({});
  const items = useMemo(
    () => PUJA_CHECKLIST.map((slug) => products.data?.find((p) => p.slug === slug)).filter((p) => !!p),
    [products.data],
  );
  const done = checked.filter((s) => PUJA_CHECKLIST.includes(s as (typeof PUJA_CHECKLIST)[number])).length;
  const complete = done === PUJA_CHECKLIST.length;
  const wasComplete = useRef(complete);

  useEffect(() => writeLocal(CHECK_KEY, JSON.stringify(checked)), [checked]);
  useEffect(() => {
    if (complete && !wasComplete.current) {
      celebrate({ count: 7 });
      play('chime');
    }
    wasComplete.current = complete;
  }, [complete]);

  const toggle = (slug: string) => setChecked((c) => (c.includes(slug) ? c.filter((s) => s !== slug) : [...c, slug]));
  const missing = items.filter((p) => !checked.includes(p.slug));

  const addMissing = () => {
    missing.forEach((p, i) => {
      window.setTimeout(() => {
        if (!inBag.some((l) => l.productId === p.id)) add(p);
        flyFrom(rows.current[p.slug] ?? null);
        setChecked((c) => (c.includes(p.slug) ? c : [...c, p.slug]));
      }, i * 140);
    });
  };

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="checklist">
      <div className="flex flex-wrap items-center gap-5">
        <ProgressRing value={done} total={PUJA_CHECKLIST.length} />
        <div className="min-w-0 flex-1">
          <h2 id="checklist" className="font-display text-2xl font-bold">Lakshmi Puja checklist</h2>
          <p className="text-sm text-muted">Tick what you already have. We’ll remember it on this device.</p>
          {missing.length > 0 ? (
            <button type="button" className="btn btn-primary mt-3" onClick={addMissing} disabled={!items.length}>
              Add {missing.length} missing to bag
            </button>
          ) : (
            <p className="mt-3 font-display text-lg font-bold text-success">All set for puja! 🪔</p>
          )}
        </div>
      </div>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {items.map((p) => {
          const on = checked.includes(p.slug);
          return (
            <li key={p.slug} ref={(el) => { rows.current[p.slug] = el; }}>
              <label className={`flex cursor-pointer items-center gap-3 rounded-2xl p-2.5 ring-1 transition-colors ${on ? 'bg-success/10 ring-success/40' : 'bg-panel-2 ring-line hover:ring-marigold/50'}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(p.slug)} className="h-5 w-5 accent-[#2fbf6b]" />
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: p.category.tint }}>
                  <ProductIcon icon={productIconKey(p)} size={40} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate font-semibold ${on ? 'text-cream/60 line-through' : ''}`}>{p.name}</span>
                  <span className="text-xs text-muted">{inr(p.pricePaise)}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function Festival() {
  const left = useCountdown(LAKSHMI_PUJA);
  return (
    <div className="shell py-10">
      <section className="card relative overflow-hidden bg-linear-to-br from-panel via-plum/50 to-panel p-6 text-center sm:p-10" aria-labelledby="countdown">
        <p className="text-sm font-bold uppercase tracking-widest text-marigold">Diwali 2026</p>
        <h1 id="countdown" className="mt-2 font-display text-3xl font-extrabold sm:text-5xl">
          {left.done ? 'Shubh Deepavali!' : 'Countdown to Lakshmi Puja'}
        </h1>
        <p className="sr-only" aria-live="polite">{left.days} days, {left.hours} hours, {left.minutes} minutes to go</p>
        <div className="mt-6 flex flex-wrap items-start justify-center gap-3 sm:gap-6">
          <Unit n={left.days} label="Days" />
          <Unit n={left.hours} label="Hours" />
          <Unit n={left.minutes} label="Minutes" />
          <Unit n={left.seconds} label="Seconds" />
        </div>
        <p className="mt-6 text-sm text-muted">Sunday 8 November 2026 · counting down to 00:00 IST</p>
      </section>

      <section className="mt-10" aria-labelledby="five">
        <h2 id="five" className="font-display text-3xl font-extrabold">The five days</h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {FIVE_DAYS.map((d, i) => (
            <motion.li
              key={d.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, type: 'spring', stiffness: 160, damping: 20 }}
              className="card p-4"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-marigold">Day {i + 1} · {d.date}</p>
              <p className="mt-1 font-display text-xl font-bold">{d.name}</p>
              <p className="mt-1 text-sm text-muted">{d.note}</p>
            </motion.li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted">
          Dates vary by panchang and region, and some years two festivals share a day. Please check your local calendar or
          family pandit for exact dates and muhurat; we don’t list puja timings.
        </p>
      </section>

      <div className="mt-10">
        <Checklist />
      </div>
    </div>
  );
}
