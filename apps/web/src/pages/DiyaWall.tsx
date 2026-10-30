import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { CountUp } from '../components/AnimatedNumber';
import { Field } from '../components/Field';
import { StageCanvas } from '../components/StageCanvas';
import { flamePoint, renderWall } from '../engine/wall';
import { api, ApiError } from '../lib/api';
import { keys, useDiyas, useMe } from '../lib/queries';
import { play } from '../lib/sound';
import type { Diya } from '../lib/types';
import { celebrate } from '../stores/festive';

function LightDialog({ onClose, onLit }: { onClose: () => void; onLit: (d: Diya) => void }) {
  const me = useMe();
  const [name, setName] = useState(me.data?.name.split(' ')[0] ?? '');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    form.current?.querySelector('input')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const res = await api<{ diya: Diya }>('/diyas', { method: 'POST', body: { name, message } });
      onLit(res.diya);
    } catch (err) {
      setErrors(err instanceof ApiError ? { ...err.fields, _: err.message } : { _: 'Could not light your diya.' });
      setBusy(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-55 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-ink/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <motion.form
        ref={form}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="light-title"
        initial={{ y: 30, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 30, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="card relative w-full max-w-md space-y-4 p-6"
        noValidate
      >
        <h2 id="light-title" className="font-display text-3xl font-extrabold">Light a diya</h2>
        <p className="text-sm text-muted">It will float on the river with everyone else’s. Be kind: everyone can read it.</p>
        <Field label="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} error={errors.name} hint={`${name.length}/30`} />
        <Field label="Your wish" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={80} error={errors.message} hint={`${message.length}/80`} placeholder="Light and laughter for every home" />
        {errors._ && !errors.name && !errors.message && <p className="text-sm text-rose" role="alert">{errors._}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary flex-1" disabled={busy}>{busy ? 'Lighting…' : '🪔 Light it'}</button>
        </div>
      </motion.form>
    </motion.div>
  );
}

export default function DiyaWall() {
  const diyas = useDiyas();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [hover, setHover] = useState<{ diya: Diya; x: number; y: number } | null>(null);
  const hoverId = useRef<number | null>(null);
  const fresh = useRef<{ id: number; at: number } | null>(null);
  const list = useRef<Diya[]>([]);
  list.current = diyas.data?.diyas ?? [];
  const wrap = useRef<HTMLDivElement>(null);

  const draw = useCallback((t: number) => {
    const now = performance.now();
    renderWall(
      t,
      list.current.map((d) => ({ id: d.id, age: fresh.current?.id === d.id ? (now - fresh.current.at) / 1000 : undefined })),
      hoverId.current,
    );
  }, []);

  const pick = (clientX: number, clientY: number) => {
    const rect = wrap.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = ((clientX - rect.left) / rect.width) * 1280;
    const y = ((clientY - rect.top) / rect.height) * 720;
    let best: { d: Diya; dist: number } | null = null;
    for (const d of list.current) {
      const f = flamePoint(d.id);
      const dist = Math.hypot(f.x - x, f.y - y);
      if (dist < f.r && (!best || dist < best.dist)) best = { d, dist };
    }
    if (!best) return null;
    const f = flamePoint(best.d.id);
    return { diya: best.d, x: (f.x / 1280) * rect.width, y: (f.y / 720) * rect.height };
  };
  const onPointer = (e: React.PointerEvent) => {
    const hit = pick(e.clientX, e.clientY);
    hoverId.current = hit?.diya.id ?? null;
    setHover(hit);
  };

  const onLit = (d: Diya) => {
    setDialog(false);
    fresh.current = { id: d.id, at: performance.now() };
    qc.setQueryData(keys.diyas, (old: { count: number; diyas: Diya[] } | undefined) =>
      old ? { count: old.count + 1, diyas: [d, ...old.diyas] } : { count: 1, diyas: [d] },
    );
    play('ting');
    window.setTimeout(() => celebrate({ count: 6 }), 900);
  };

  return (
    <div className="shell py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold">Diya Wall</h1>
          <p className="mt-1 text-muted">
            <CountUp value={diyas.data?.count ?? 0} className="font-display text-2xl font-extrabold text-marigold" /> {diyas.data?.count === 1 ? 'diya' : 'diyas'} lit by visitors so far. Hover or tap a flame to read its wish.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setDialog(true)} data-testid="light-diya">🪔 Light a diya</button>
      </div>

      <div
        ref={wrap}
        className="relative mt-6 overflow-hidden rounded-3xl border border-line"
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={() => {
          hoverId.current = null;
          setHover(null);
        }}
      >
        <StageCanvas draw={draw} label={`A river at night with ${diyas.data?.count ?? 0} floating diyas`} className="block aspect-video w-full" />
        <AnimatePresence>
          {hover && (
            <motion.div
              key={hover.diya.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 -translate-y-full rounded-2xl bg-ink/90 p-3 text-sm shadow-xl ring-1 ring-marigold/40 backdrop-blur"
              style={{ left: Math.min(Math.max(hover.x, 116), (wrap.current?.clientWidth ?? 0) - 116), top: hover.y - 14 }}
              role="status"
            >
              <p className="font-display font-bold text-marigold">{hover.diya.name}</p>
              <p className="text-cream/90">{hover.diya.message}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <section className="mt-8" aria-labelledby="latest">
        <h2 id="latest" className="font-display text-2xl font-bold">Latest wishes</h2>
        {diyas.isError && <p className="mt-2 text-rose">Couldn’t reach the river. Retrying…</p>}
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {(diyas.data?.diyas ?? []).slice(0, 12).map((d) => (
              <motion.li key={d.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card p-4">
                <p className="font-display font-bold text-marigold">🪔 {d.name}</p>
                <p className="mt-1 text-sm text-cream/90">{d.message}</p>
              </motion.li>
            ))}
          </AnimatePresence>
          {diyas.data?.diyas.length === 0 && <li className="text-muted">No diyas yet. Be the first to light one!</li>}
        </ul>
      </section>
      <AnimatePresence>{dialog && <LightDialog onClose={() => setDialog(false)} onLit={onLit} />}</AnimatePresence>
    </div>
  );
}
