import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AnimatePresence, LayoutGroup, motion, type Variants } from 'motion/react';
import { ProductCard, ProductSkeleton } from '../components/ProductCard';
import { StageCanvas } from '../components/StageCanvas';
import { currentCtx, renderScene } from '../engine';
import { LAKSHMI_PUJA, useCountdown, useDebounced } from '../lib/festival';
import { useCategories, useProducts } from '../lib/queries';
import { useUi } from '../stores/ui';

const heroList: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } };
const heroItem: Variants = {
  hidden: { opacity: 0, y: 26, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 120, damping: 18 } },
};

/** The diya scene, nudged right on wide screens so it sits beside the headline, not behind it. */
function drawHeroDiya(t: number) {
  const ctx = currentCtx();
  const wide = ctx.canvas.clientWidth / Math.max(1, ctx.canvas.clientHeight) > 1.25;
  if (wide) {
    ctx.fillStyle = '#1b0614';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.translate(250, 10);
    ctx.scale(0.92, 0.92);
  }
  renderScene(0, 1.6 + t);
}

function Hero() {
  const setFilm = useUi((s) => s.setFilm);
  return (
    <section className="relative isolate overflow-hidden">
      <StageCanvas
        draw={drawHeroDiya}
        still={2.6}
        label="A clay diya glowing inside a ring of light"
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      {/* Scrims keep the headline readable over the bright flame (stronger on phones, where they overlap). */}
      <div className="absolute inset-0 -z-10 bg-ink/60 md:bg-transparent" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-ink from-10% via-ink/60 via-40% to-transparent to-65%" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-linear-to-t from-ink to-transparent" aria-hidden="true" />
      <motion.div variants={heroList} initial="hidden" animate="show" className="shell flex min-h-[78svh] flex-col justify-center py-20 md:min-h-[640px]">
        <motion.p variants={heroItem} className="w-fit rounded-full border border-marigold/40 bg-ink/50 px-3 py-1 text-sm font-semibold text-marigold backdrop-blur">
          🪔 Diwali delivered in minutes
        </motion.p>
        <motion.h1 variants={heroItem} className="mt-5 max-w-2xl font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
          Light up every <span className="text-gradient">doorstep</span> this Diwali.
        </motion.h1>
        <motion.p variants={heroItem} className="mt-5 max-w-lg text-lg leading-relaxed text-cream/85">
          Diyas, mithai, rangoli and lights at your door before the first lamp is lit. Ghar ghar jagmag.
        </motion.p>
        <motion.div variants={heroItem} className="mt-8 flex flex-wrap gap-3">
          <a href="#store" className="btn btn-primary">Shop the Diwali Store</a>
          <button type="button" className="btn btn-ghost bg-ink/40 backdrop-blur" onClick={() => setFilm('player')}>
            ▶ Watch the film
          </button>
          <Link to="/wish" className="btn btn-ghost bg-ink/40 backdrop-blur">Send a wish</Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

const OFFERS = [
  'DIWALI10 · 10% off on ₹299+',
  'DIYA50 · ₹50 off on ₹249+',
  'FREEDEL · free delivery on any order',
  'LAKSHMI100 · ₹100 off on ₹799+',
  'Free delivery above ₹499',
  'Spin the wheel after every delivery',
];

function Marquee() {
  const items = [...OFFERS, ...OFFERS];
  return (
    <div className="relative overflow-hidden border-y border-line bg-plum/50 py-3" aria-label="Offers">
      <div className="flex w-max animate-marquee gap-10 motion-reduce:animate-none">
        {items.map((o, i) => (
          <span key={i} className="flex items-center gap-10 whitespace-nowrap font-display text-sm font-bold text-cream/90" aria-hidden={i >= OFFERS.length}>
            {o}
            <span className="text-marigold">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function CountdownStrip() {
  const left = useCountdown(LAKSHMI_PUJA);
  return (
    <Link to="/diwali" className="shell mt-8 block">
      <div className="card flex flex-wrap items-center justify-between gap-4 bg-linear-to-r from-panel to-plum/60 px-5 py-4 transition-colors hover:border-marigold/50">
        <div>
          <p className="text-sm font-semibold text-muted">Countdown to Lakshmi Puja</p>
          <p className="font-display text-2xl font-extrabold">
            {left.done ? 'Shubh Deepavali!' : `${left.days}d ${left.hours}h ${left.minutes}m ${String(left.seconds).padStart(2, '0')}s`}
          </p>
        </div>
        <span className="font-semibold text-marigold">Plan your five days →</span>
      </div>
    </Link>
  );
}

function Store() {
  const [params, setParams] = useSearchParams();
  const cat = params.get('cat') ?? '';
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim(), 250);
  const cats = useCategories();
  const products = useProducts(cat, q);

  const setCat = (slug: string) => {
    const next = new URLSearchParams(params);
    if (slug) next.set('cat', slug);
    else next.delete('cat');
    setParams(next, { replace: true, preventScrollReset: true });
  };

  const tabs = [{ slug: '', name: 'All' }, ...(cats.data ?? [])];

  return (
    <section id="store" className="shell scroll-mt-28 pt-16" aria-labelledby="store-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="store-title" className="font-display text-4xl font-extrabold">Diwali Store</h2>
          <p className="mt-1 text-muted">Everything for the five days, delivered in about 10 minutes.</p>
        </div>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search the store</span>
          <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search diyas, sweets, lights…"
            className="field rounded-full! pl-10"
            data-testid="search"
          />
        </label>
      </div>

      <LayoutGroup id="cats">
        <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2" role="tablist" aria-label="Categories">
          {tabs.map((c) => {
            const active = c.slug === cat;
            return (
              <button
                key={c.slug || 'all'}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCat(c.slug)}
                className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${active ? 'text-plum' : 'text-muted hover:text-cream'}`}
              >
                {active && (
                  <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-full bg-marigold" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />
                )}
                <span className="relative">{c.name}</span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>

      <div className="mt-6" aria-live="polite" aria-busy={products.isLoading}>
        {products.isError ? (
          <div className="card grid place-items-center gap-3 px-6 py-14 text-center">
            <p className="font-display text-2xl font-bold">The store’s lights flickered.</p>
            <p className="text-muted">{(products.error as Error).message}</p>
            <button type="button" className="btn btn-primary" onClick={() => products.refetch()}>Try again</button>
          </div>
        ) : products.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : products.data && products.data.length === 0 ? (
          <div className="card grid place-items-center gap-2 px-6 py-14 text-center">
            <p className="text-4xl" aria-hidden="true">🪔</p>
            <p className="font-display text-2xl font-bold">Nothing matches “{q}”</p>
            <p className="text-muted">Try “diya”, “laddoo” or “lights”.</p>
            <button type="button" className="btn btn-ghost mt-2" onClick={() => { setQuery(''); setCat(''); }}>Clear filters</button>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {products.data?.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
}

const STEPS = [
  { icon: '🛍️', title: 'Fill your bag', body: 'Diyas, mithai, rangoli and lights from the Diwali Store.' },
  { icon: '📦', title: 'We pack it with care', body: 'Watch your order get packed, live, in the tracker.' },
  { icon: '🛵', title: 'At your door in minutes', body: 'Follow the rider across the city to your doorstep.' },
];

function HowItWorks() {
  return (
    <section className="shell pt-24" aria-labelledby="how-title">
      <h2 id="how-title" className="font-display text-3xl font-extrabold">How it works</h2>
      <ol className="mt-6 grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 140, damping: 20, delay: i * 0.12 }}
            className="card relative overflow-hidden p-6"
          >
            <span className="absolute right-4 top-2 font-display text-6xl font-extrabold text-line" aria-hidden="true">{i + 1}</span>
            <span className="text-3xl" aria-hidden="true">{s.icon}</span>
            <h3 className="mt-3 font-display text-xl font-bold">{s.title}</h3>
            <p className="mt-1 text-sm text-muted">{s.body}</p>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

const TOOLS = [
  { to: '/diwali', title: 'Festival planner', body: 'Countdown, the five days and a puja checklist.', emoji: '📿' },
  { to: '/wall', title: 'Diya Wall', body: 'Float a diya on the river with your wish.', emoji: '🪔' },
  { to: '/rangoli', title: 'Rangoli studio', body: 'Draw a mirrored rangoli and share it.', emoji: '🌸' },
  { to: '/wish', title: 'Diwali wishes', body: 'A glowing card in English, हिन्दी or मराठी.', emoji: '💌' },
];

function Tools() {
  return (
    <section className="shell pt-24" aria-labelledby="tools-title">
      <h2 id="tools-title" className="font-display text-3xl font-extrabold">More ways to celebrate</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TOOLS.map((t, i) => (
          <motion.div
            key={t.to}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 150, damping: 20 }}
          >
            <Link to={t.to} className="card group block h-full p-5 transition-colors hover:border-marigold/60">
              <span className="text-3xl" aria-hidden="true">{t.emoji}</span>
              <h3 className="mt-3 font-display text-xl font-bold group-hover:text-marigold">{t.title}</h3>
              <p className="mt-1 text-sm text-muted">{t.body}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee />
      <CountdownStrip />
      <Store />
      <HowItWorks />
      <Tools />
    </>
  );
}
