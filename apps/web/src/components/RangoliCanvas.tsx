import { useEffect, useRef } from 'react';
import { withCtx } from '../engine';
import { drawRangoli, type Stroke } from '../engine/rangoli';

/** Dark floor with a soft warm glow; optional faint wedge guides. */
export function paintFloor(ctx: CanvasRenderingContext2D, size: number, folds = 0) {
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.7);
  g.addColorStop(0, '#2a1145');
  g.addColorStop(1, '#0c0416');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  if (folds) {
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.strokeStyle = 'rgba(169,153,196,0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < folds; i++) {
      const a = (i / folds) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,243,214,0.4)';
    ctx.fill();
    ctx.restore();
  }
}

/** A static thumbnail of a saved rangoli. */
export function RangoliThumb({ strokes, folds, mirror, size = 200 }: { strokes: Stroke[]; folds: number; mirror: boolean; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = c.height = size * dpr;
    withCtx(ctx, () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintFloor(ctx, size);
      drawRangoli(strokes, folds, mirror, size, Infinity, false);
    });
  }, [strokes, folds, mirror, size]);
  return <canvas ref={ref} aria-hidden="true" className="aspect-square w-full rounded-2xl" />;
}
