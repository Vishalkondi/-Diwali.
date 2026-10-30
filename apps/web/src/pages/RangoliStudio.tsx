import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { RangoliThumb, paintFloor } from '../components/RangoliCanvas';
import { ShareButtons } from '../components/ShareButtons';
import { withCtx } from '../engine';
import { drawRangoli, pointCount, RANGOLI_COLOURS, surpriseStrokes, type Stroke } from '../engine/rangoli';
import { api, ApiError } from '../lib/api';
import { keys, useRangolis } from '../lib/queries';
import { play } from '../lib/sound';
import type { Rangoli } from '../lib/types';
import { celebrate } from '../stores/festive';

const SIZE = 800;
const LIMITS = { strokes: 300, perStroke: 600, total: 12000 };
const FOLDS = [6, 8, 12, 16] as const;
const COLOUR_NAMES = ['Rose', 'Saffron', 'Marigold', 'Haldi', 'Leaf', 'Teal', 'Sky', 'Indigo', 'Lavender', 'Pink', 'Cream', 'Sindoor'];

export default function RangoliStudio() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const live = useRef<Stroke | null>(null);
  const [folds, setFolds] = useState<(typeof FOLDS)[number]>(8);
  const [mirror, setMirror] = useState(true);
  const [colour, setColour] = useState(2);
  const [width, setWidth] = useState(14);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const gallery = useRangolis();
  const qc = useQueryClient();
  const total = pointCount(strokes);

  const paint = useCallback(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = c.width / SIZE;
    withCtx(ctx, () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintFloor(ctx, SIZE, folds);
      drawRangoli(live.current ? [...strokes, live.current] : strokes, folds, mirror, SIZE);
    });
  }, [strokes, folds, mirror]);

  useEffect(() => {
    const c = canvas.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = c.height = SIZE * dpr;
    paint();
  }, [paint]);

  const toSpace = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width - 0.5) * 2000);
    const y = Math.round(((e.clientY - r.top) / r.height - 0.5) * 2000);
    return [Math.max(-1000, Math.min(1000, x)), Math.max(-1000, Math.min(1000, y))] as const;
  };

  const raf = useRef(0);
  const schedule = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(paint);
  };

  const onDown = (e: React.PointerEvent) => {
    if (strokes.length >= LIMITS.strokes || total >= LIMITS.total) {
      setError('This rangoli is full! Save it or clear the floor.');
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = toSpace(e);
    live.current = { c: colour, w: width, p: [x, y] };
    setSaved(null);
    schedule();
  };
  const onMove = (e: React.PointerEvent) => {
    const s = live.current;
    if (!s) return;
    const [x, y] = toSpace(e);
    const lx = s.p[s.p.length - 2]!;
    const ly = s.p[s.p.length - 1]!;
    if (Math.hypot(x - lx, y - ly) < 8) return;
    if (s.p.length / 2 >= LIMITS.perStroke || total + s.p.length / 2 >= LIMITS.total) return;
    s.p.push(x, y);
    schedule();
  };
  const onUp = () => {
    const s = live.current;
    live.current = null;
    if (!s) return;
    if (s.p.length === 2) s.p.push(s.p[0]! + 1, s.p[1]!);
    setStrokes((prev) => [...prev, s]);
    play('tick');
  };

  const download = () => {
    canvas.current?.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${(name || 'my-rangoli').replace(/[^\w-]+/g, '-').toLowerCase()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api<{ rangoli: Rangoli }>('/rangolis', { method: 'POST', body: { name: name.trim() || 'My rangoli', folds, mirror, strokes } });
      setSaved(res.rangoli.slug);
      void qc.invalidateQueries({ queryKey: keys.rangolis });
      celebrate({ count: 4 });
      play('chime');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${on ? 'bg-marigold text-plum' : 'bg-panel-2 text-muted ring-1 ring-line hover:text-cream'}`;
  const shareUrl = saved ? `${window.location.origin}/rangoli/${saved}` : '';

  return (
    <div className="shell py-8">
      <h1 className="font-display text-4xl font-extrabold">Rangoli studio</h1>
      <p className="mt-1 text-muted">Draw anywhere: every stroke is repeated around the centre {folds} times{mirror ? ' and mirrored' : ''}.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,640px)_1fr]">
        <div>
          <canvas
            ref={canvas}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className="aspect-square w-full touch-none rounded-3xl border border-line"
            style={{ cursor: 'crosshair' }}
            role="img"
            aria-label={`Rangoli canvas with ${strokes.length} strokes`}
            data-testid="rangoli-canvas"
          />
          <p className="mt-2 text-xs text-muted">{strokes.length}/{LIMITS.strokes} strokes · {total.toLocaleString('en-IN')}/{LIMITS.total.toLocaleString('en-IN')} points</p>
        </div>

        <div className="space-y-5">
          <section className="card space-y-4 p-5" aria-label="Tools">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Folds</legend>
              <div className="flex flex-wrap gap-2">
                {FOLDS.map((f) => (
                  <button key={f} type="button" aria-pressed={folds === f} onClick={() => setFolds(f)} className={chip(folds === f)}>{f}</button>
                ))}
                <button type="button" role="switch" aria-checked={mirror} onClick={() => setMirror((m) => !m)} className={chip(mirror)}>
                  Mirror {mirror ? 'on' : 'off'}
                </button>
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Colour</legend>
              <div className="grid grid-cols-6 gap-2">
                {RANGOLI_COLOURS.map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={COLOUR_NAMES[i]}
                    aria-pressed={colour === i}
                    onClick={() => setColour(i)}
                    className={`h-9 rounded-full transition-transform ${colour === i ? 'scale-110 ring-2 ring-cream ring-offset-2 ring-offset-panel' : 'hover:scale-105'}`}
                    style={{ background: c, boxShadow: `0 0 14px ${c}88` }}
                  />
                ))}
              </div>
            </fieldset>
            <label className="block">
              <span className="mb-2 flex justify-between text-sm font-semibold">Brush size <span className="text-muted">{width}</span></span>
              <input type="range" min={4} max={40} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-full accent-marigold" />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setStrokes((s) => s.slice(0, -1))} disabled={!strokes.length}>↶ Undo</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setStrokes([]); setSaved(null); }} disabled={!strokes.length}>Clear</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setStrokes(surpriseStrokes(folds)); setSaved(null); play('chime'); }}>✨ Surprise me</button>
              <button type="button" className="btn btn-ghost" onClick={download} disabled={!strokes.length}>⬇ PNG</button>
            </div>
          </section>

          <section className="card space-y-3 p-5" aria-label="Save and share">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Name your rangoli</span>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Lotus for Lakshmi" />
            </label>
            <button type="button" className="btn btn-primary w-full" onClick={save} disabled={!strokes.length || busy} data-testid="save-rangoli">
              {busy ? 'Saving…' : 'Save & share'}
            </button>
            {error && <p className="text-sm text-rose" role="alert">{error}</p>}
            {saved && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                <p className="text-sm text-success">Saved! Anyone with the link can watch it being drawn.</p>
                <p className="truncate rounded-lg bg-panel-2 px-3 py-2 text-sm"><Link to={`/rangoli/${saved}`} className="underline">{shareUrl}</Link></p>
                <ShareButtons url={shareUrl} text="I drew a rangoli for Diwali. Watch it come to life:" />
              </motion.div>
            )}
          </section>
        </div>
      </div>

      <section className="mt-12" aria-labelledby="gallery">
        <h2 id="gallery" className="font-display text-3xl font-extrabold">Community gallery</h2>
        {gallery.isLoading ? (
          <p className="mt-3 text-muted">Loading…</p>
        ) : gallery.data?.length ? (
          <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {gallery.data.map((r) => (
              <li key={r.slug}>
                <Link to={`/rangoli/${r.slug}`} className="group block">
                  <RangoliThumb strokes={r.strokes} folds={r.folds} mirror={r.mirror} />
                  <p className="mt-2 truncate font-display font-bold group-hover:text-marigold">{r.name}</p>
                  <p className="text-xs text-muted">{r.folds} folds · {r.views} views</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-muted">No rangolis yet. Yours could be the first!</p>
        )}
      </section>
    </div>
  );
}
