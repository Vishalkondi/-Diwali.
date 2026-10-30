import { SlideNumber } from './AnimatedNumber';
import { MAX_QTY } from '../stores/cart';

type Props = { qty: number; name: string; onChange: (qty: number) => void; tone?: 'light' | 'dark'; size?: 'sm' | 'md' };

export function Stepper({ qty, name, onChange, tone = 'light', size = 'md' }: Props) {
  const base =
    tone === 'light'
      ? 'bg-success text-white'
      : 'bg-panel-2 text-cream ring-1 ring-line';
  const h = size === 'sm' ? 'h-9' : 'h-10';
  return (
    <div className={`inline-flex items-center rounded-xl ${base} ${h} font-display font-extrabold`} role="group" aria-label={`Quantity of ${name}`}>
      <button type="button" className={`grid ${h} w-9 place-items-center rounded-l-xl text-lg hover:bg-black/10`} onClick={() => onChange(qty - 1)} aria-label={`Remove one ${name}`}>
        −
      </button>
      <span aria-live="polite" className="min-w-6 text-center">
        <SlideNumber value={qty} />
      </span>
      <button
        type="button"
        className={`grid ${h} w-9 place-items-center rounded-r-xl text-lg hover:bg-black/10 disabled:opacity-40`}
        onClick={() => onChange(qty + 1)}
        disabled={qty >= MAX_QTY}
        aria-label={`Add one more ${name}`}
      >
        +
      </button>
    </div>
  );
}
