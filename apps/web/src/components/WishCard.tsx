import { useCallback } from 'react';
import { motion } from 'motion/react';
import { renderFireworks, renderScene } from '../engine';
import type { Lang, WishTheme } from '../lib/types';
import { WISH_TEXT } from '../lib/wishText';
import { StageCanvas } from './StageCanvas';

type Props = { theme: WishTheme; lang: Lang; toName: string; fromName: string; message: string; animateText?: boolean };

/** An engine scene behind live text, on a dark radial scrim so the words stay legible. */
export function WishCard({ theme, lang, toName, fromName, message, animateText = true }: Props) {
  const copy = WISH_TEXT[lang];
  const draw = useCallback(
    (t: number) => {
      if (theme === 'fireworks') renderFireworks(t);
      else if (theme === 'rangoli') renderScene(7, 1.2 + t * 0.6);
      else renderScene(0, 1.8 + t);
    },
    [theme],
  );
  const item = (delay: number) =>
    animateText
      ? { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay, type: 'spring' as const, stiffness: 120, damping: 18 } }
      : {};

  return (
    <div lang={lang} className="relative isolate aspect-[4/5] w-full overflow-hidden rounded-3xl border border-line bg-[#0a0314] sm:aspect-video" data-testid="wish-card">
      <StageCanvas key={theme} draw={draw} label={`${copy.title} card with a ${theme} background`} className="absolute inset-0 -z-10 h-full w-full object-cover" />
      <div className="scrim absolute inset-0 -z-10" aria-hidden="true" />
      <div className="flex h-full flex-col items-center justify-center px-6 py-8 text-center sm:px-12">
        <motion.p {...item(0.1)} className="font-display text-sm font-bold uppercase tracking-[0.2em] text-marigold">
          {copy.dear} {toName || '…'}
        </motion.p>
        <motion.h2
          {...item(0.25)}
          className="mt-2 bg-linear-to-r from-cream via-marigold to-cream bg-clip-text font-display text-5xl font-extrabold leading-tight text-transparent drop-shadow-[0_2px_20px_rgba(255,180,46,0.45)] sm:text-6xl"
        >
          {copy.title}
        </motion.h2>
        <motion.p {...item(0.4)} className="mt-4 max-w-xl whitespace-pre-line text-lg leading-relaxed text-cream sm:text-xl">
          {message.trim() || copy.fallback}
        </motion.p>
        <motion.p {...item(0.55)} className="mt-6 text-cream/80">
          {copy.signoff} <span className="font-display text-xl font-bold text-cream">{fromName || '…'}</span>
        </motion.p>
      </div>
    </div>
  );
}
