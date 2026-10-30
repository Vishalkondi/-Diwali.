import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { drawIcon, withCtx } from '../engine';

/** A tiny engine canvas: drawn once, animated only while `active` (hover or focus). */
export function ProductIcon({ icon, size = 120, active = false, className }: { icon: string; size?: number; active?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion() ?? false;
  const t0 = useRef(0.8);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.height = Math.round(size * dpr);
    const draw = (t: number, animate: boolean) =>
      withCtx(ctx, () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const k = (size * dpr) / 120;
        ctx.setTransform(k, 0, 0, k, 0, 0);
        drawIcon(icon, 60, 62, 100, t, animate);
      });
    if (!active || reduced) {
      draw(t0.current, false);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      t0.current = 0.8 + (now - start) / 1000;
      draw(t0.current, true);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [icon, size, active, reduced]);

  return <canvas ref={ref} aria-hidden="true" className={className} style={{ width: size, aspectRatio: '1 / 1' }} />;
}
