import { useEffect } from 'react';
import { motion } from 'motion/react';
import { play } from '../lib/sound';
import { prefersReducedMotion } from '../lib/storage';
import { getBagTarget, useUi, type Flight } from '../stores/ui';

function GlowDiya() {
  return (
    <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true" style={{ filter: 'drop-shadow(0 0 10px #ffb42e) drop-shadow(0 0 22px #ff7a1a)' }}>
      <path d="M8 36c2 12 12 16 24 16s22-4 24-16z" fill="#d06a35" />
      <ellipse cx="32" cy="36" rx="24" ry="5" fill="#ffd27a" />
      <path d="M32 33c-7-2-5-12 0-22 5 10 7 20 0 22z" fill="#fff3c2" />
    </svg>
  );
}

function FlyingDiya({ flight }: { flight: Flight }) {
  const land = useUi((s) => s.land);
  const target = getBagTarget()?.getBoundingClientRect();
  const tx = target ? target.left + target.width / 2 : window.innerWidth - 40;
  const ty = target ? target.top + target.height / 2 : 30;
  const done = () => {
    land(flight.id);
    play('ting');
  };
  const instant = prefersReducedMotion();
  useEffect(() => {
    if (instant) done();
  }, [instant]);
  if (instant) return null;
  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-70"
      initial={{ x: flight.x - 17, y: flight.y - 17, scale: 1.1, opacity: 1 }}
      // x eases out and y eases in, so it sweeps across first and then arcs up into the bag.
      animate={{ x: tx - 17, y: ty - 17, scale: 0.55, opacity: [1, 1, 0.9] }}
      transition={{
        x: { duration: 0.75, ease: [0.15, 0.85, 0.35, 1] },
        y: { duration: 0.75, ease: [0.65, 0, 0.95, 0.45] },
        scale: { duration: 0.75 },
        opacity: { duration: 0.75 },
      }}
      onAnimationComplete={done}
    >
      <GlowDiya />
    </motion.div>
  );
}

export function FlyLayer() {
  const flights = useUi((s) => s.flights);
  return (
    <>
      {flights.map((f) => (
        <FlyingDiya key={f.id} flight={f} />
      ))}
    </>
  );
}
