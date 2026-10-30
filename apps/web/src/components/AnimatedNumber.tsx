import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react';

/** A number that slides up when it grows and down when it shrinks. */
export function SlideNumber({ value, className = '' }: { value: number; className?: string }) {
  const prev = useRef(value);
  const dir = value >= prev.current ? 1 : -1;
  useEffect(() => {
    prev.current = value;
  }, [value]);
  return (
    <span className={`relative inline-flex h-[1.2em] min-w-[1ch] justify-center overflow-hidden tabular-nums ${className}`}>
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.span
          key={value}
          custom={dir}
          initial={{ y: `${dir * 100}%`, opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: `${-dir * 100}%`, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Counts up (or down) to `value`. */
export function CountUp({ value, format = (n: number) => Math.round(n).toLocaleString('en-IN'), className }: { value: number; format?: (n: number) => string; className?: string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  const from = useRef(reduced ? value : 0);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const controls = animate(from.current, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        from.current = v;
        setShown(v);
      },
    });
    return () => controls.stop();
  }, [value, reduced]);
  return <span className={className}>{format(shown)}</span>;
}
