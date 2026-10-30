import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { burst, rnd, withCtx } from '../engine';
import { useFestive } from '../stores/festive';

function sizeCanvas(c: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.round(window.innerWidth * dpr);
  c.height = Math.round(window.innerHeight * dpr);
  return dpr;
}

/** Marigold and rose petals drifting down behind the page. A pure function of time. */
function Petals() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    let dpr = sizeCanvas(c);
    const onResize = () => (dpr = sizeCanvas(c));
    window.addEventListener('resize', onResize);
    let raf = 0;
    const start = performance.now();
    const N = 22;
    const loop = (now: number) => {
      if (document.hidden) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const t = (now - start) / 1000;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < N; i++) {
        const speed = 18 + rnd(i * 3.1) * 26;
        const y = ((rnd(i * 7.7) * (h + 80) + t * speed) % (h + 80)) - 40;
        const x = rnd(i * 1.9) * w + Math.sin(t * 0.6 + i) * 40;
        const rot = t * (0.6 + rnd(i) * 1.2) + i;
        const s = 5 + rnd(i * 5.3) * 6;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.scale(1, 0.55 + 0.45 * Math.sin(t * 2 + i));
        ctx.beginPath();
        ctx.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2);
        ctx.fillStyle = i % 3 === 0 ? 'rgba(255,61,129,0.32)' : i % 3 === 1 ? 'rgba(255,180,46,0.35)' : 'rgba(255,122,26,0.3)';
        ctx.fill();
        ctx.restore();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}

type Spark = { x: number; y: number; born: number; vx: number; vy: number; hue: number };

/** Cursor sparkles (mouse only) and full-screen firework bursts, on one overlay canvas. */
function Effects({ sparkles }: { sparkles: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sparks = useRef<Spark[]>([]);
  const wake = useRef<() => void>(() => undefined);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    let dpr = sizeCanvas(c);
    const onResize = () => (dpr = sizeCanvas(c));
    window.addEventListener('resize', onResize);
    let raf = 0;
    let running = false;

    const loop = (now: number) => {
      const { bursts, prune } = useFestive.getState();
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      withCtx(ctx, () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        for (const b of bursts) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.scale(b.size, b.size);
          burst(0, 0, (now - b.start) / 1000, b.seed, b.colour, 150, 48);
          ctx.restore();
        }
      });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      sparks.current = sparks.current.filter((s) => now - s.born < 700);
      for (const s of sparks.current) {
        const age = (now - s.born) / 700;
        const x = s.x + s.vx * age * 30;
        const y = s.y + s.vy * age * 30 + age * age * 20;
        ctx.fillStyle = `hsla(${s.hue}, 100%, 70%, ${1 - age})`;
        ctx.beginPath();
        ctx.arc(x, y, 2.2 * (1 - age) + 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      if (bursts.length) prune(now);
      if (bursts.length || sparks.current.length) {
        raf = requestAnimationFrame(loop);
      } else {
        running = false;
        ctx.clearRect(0, 0, w * dpr, h * dpr);
      }
    };
    wake.current = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };
    const unsub = useFestive.subscribe((s, prev) => {
      if (s.bursts.length > prev.bursts.length) wake.current();
    });
    return () => {
      cancelAnimationFrame(raf);
      unsub();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (!sparkles) return;
    let last = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const now = performance.now();
      if (now - last < 28) return;
      last = now;
      for (let i = 0; i < 2; i++) {
        sparks.current.push({
          x: e.clientX,
          y: e.clientY,
          born: now,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2 - 0.5,
          hue: 30 + Math.random() * 30 + (Math.random() > 0.7 ? 300 : 0),
        });
      }
      wake.current();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [sparkles]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-60 h-full w-full" />;
}

export function Ambience() {
  const reduced = useReducedMotion();
  const petals = useFestive((s) => s.petals);
  const sparkles = useFestive((s) => s.sparkles);
  if (reduced) return null;
  return (
    <>
      {petals && <Petals />}
      <Effects sparkles={sparkles} />
    </>
  );
}
