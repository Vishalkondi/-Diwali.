import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { H, W, withCtx } from '../engine';

type Props = {
  /** Draws one frame in 1280×720 logical units. `t` is seconds the canvas has been running. */
  draw: (t: number, dt: number) => void;
  /** Frame shown (and held) when the visitor prefers reduced motion. */
  still?: number;
  paused?: boolean;
  /** Animate even under prefers-reduced-motion (for playback the visitor started and can pause). */
  ignoreReducedMotion?: boolean;
  className?: string;
  label: string;
  /** Logical size, for non-film canvases (e.g. the rangoli studio). */
  width?: number;
  height?: number;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
} & Omit<React.CanvasHTMLAttributes<HTMLCanvasElement>, 'width' | 'height'>;

/**
 * The one canvas loop the app uses. It only animates while it is on screen and the
 * tab is visible, and freezes on a still frame under prefers-reduced-motion.
 */
export function StageCanvas({ draw, still = 2.6, paused = false, ignoreReducedMotion = false, className, label, width = W, height = H, canvasRef, ...rest }: Props) {
  const localRef = useRef<HTMLCanvasElement>(null);
  const ref = canvasRef ?? localRef;
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const reduced = (useReducedMotion() ?? false) && !ignoreReducedMotion;
  const clock = useRef(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const frame = (t: number, dt: number) =>
      withCtx(ctx, () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawRef.current(t, dt);
      });

    if (reduced) {
      frame(still, 0);
      const redraw = () => frame(still, 0);
      document.fonts?.ready.then(redraw);
      return;
    }

    let raf = 0;
    let last = 0;
    let onScreen = true;
    let running = false;

    const tick = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      clock.current += dt;
      frame(clock.current, dt);
      raf = requestAnimationFrame(tick);
    };
    const update = () => {
      const should = onScreen && !document.hidden && !paused;
      if (should && !running) {
        running = true;
        last = 0;
        raf = requestAnimationFrame(tick);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    frame(clock.current, 0);
    document.fonts?.ready.then(() => frame(clock.current, 0));
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? true;
      update();
    });
    io.observe(canvas);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, [reduced, paused, still, width, height, ref]);

  return <canvas ref={ref} className={className} role="img" aria-label={label} {...rest} />;
}
