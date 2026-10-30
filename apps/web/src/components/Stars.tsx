import { useState } from 'react';

const STAR = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z';

/** Read-only stars, filled to the nearest half. */
export function Stars({ value, size = 14, className = '' }: { value: number; size?: number; className?: string }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={`inline-flex items-center gap-px ${className}`} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = rounded >= i ? 1 : rounded >= i - 0.5 ? 0.5 : 0;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24">
            <defs>
              <linearGradient id={`half-${i}-${size}`}>
                <stop offset="50%" stopColor="#ffb42e" />
                <stop offset="50%" stopColor="currentColor" stopOpacity="0.25" />
              </linearGradient>
            </defs>
            <path d={STAR} fill={fill === 1 ? '#ffb42e' : fill === 0.5 ? `url(#half-${i}-${size})` : 'currentColor'} fillOpacity={fill === 0 ? 0.25 : 1} />
          </svg>
        );
      })}
    </span>
  );
}

/** "★ 4.7 (3)" on product cards; nothing before the first review. */
export function RatingBadge({ rating, count }: { rating: number | null; count: number }) {
  if (rating === null || count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-bold" aria-label={`Rated ${rating} out of 5 from ${count} review${count === 1 ? '' : 's'}`}>
      <Stars value={rating} size={12} />
      <span>{rating.toFixed(1)}</span>
      <span className="font-semibold opacity-60">({count})</span>
    </span>
  );
}

/** A 1–5 star picker that works with the keyboard as a radio group. */
export function StarInput({ value, onChange, invalid }: { value: number; onChange: (v: number) => void; invalid?: boolean }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const labels = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" aria-label="Your rating" aria-invalid={invalid || undefined} className="flex" onPointerLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i === 1 ? '' : 's'}, ${labels[i - 1]}`}
            tabIndex={value === i || (value === 0 && i === 1) ? 0 : -1}
            onPointerEnter={() => setHover(i)}
            onClick={() => onChange(i)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                onChange(Math.min(5, value + 1));
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault();
                onChange(Math.max(1, value - 1));
              }
            }}
            className="grid h-10 w-10 place-items-center rounded-lg text-muted transition-transform hover:scale-110"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
              <path d={STAR} fill={shown >= i ? '#ffb42e' : 'currentColor'} fillOpacity={shown >= i ? 1 : 0.35} />
            </svg>
          </button>
        ))}
      </div>
      <span className="text-sm font-semibold text-muted">{shown ? labels[shown - 1] : 'Tap a star'}</span>
    </div>
  );
}
