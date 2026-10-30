import { useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { motion, useAnimationControls } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { keys, useMe } from '../lib/queries';
import { cartCount, useCart } from '../stores/cart';
import { celebrate } from '../stores/festive';
import { setBagTarget, useUi } from '../stores/ui';
import { StringLights } from './StringLights';
import { Wordmark } from './Wordmark';

const NAV = [
  { to: '/#store', label: 'Store' },
  { to: '/diwali', label: 'Festival' },
  { to: '/wall', label: 'Diya Wall' },
  { to: '/rangoli', label: 'Rangoli' },
  { to: '/wish', label: 'Send a wish' },
];

function BagButton() {
  const count = useCart(cartCount);
  const bump = useUi((s) => s.bump);
  const setBagOpen = useUi((s) => s.setBagOpen);
  const controls = useAnimationControls();
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setBagTarget(ref.current);
    return () => setBagTarget(null);
  }, []);
  useEffect(() => {
    if (bump) void controls.start({ scale: [1, 1.35, 1], transition: { type: 'spring', stiffness: 600, damping: 12 } });
  }, [bump, controls]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setBagOpen(true)}
      className="btn btn-primary relative min-h-11! px-4!"
      aria-label={`Open bag, ${count} item${count === 1 ? '' : 's'}`}
      data-testid="bag-button"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 8h14l-1 12H6z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      <span className="hidden sm:inline">Bag</span>
      <motion.span
        animate={controls}
        className="absolute -right-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-cream px-1.5 text-xs font-extrabold text-plum ring-2 ring-ink"
        aria-hidden="true"
      >
        {count}
      </motion.span>
    </button>
  );
}

export function Header() {
  const { data: user } = useMe();
  const setFilm = useUi((s) => s.setFilm);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const signOut = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    qc.setQueryData(keys.me, null);
    qc.removeQueries({ queryKey: keys.orders });
    navigate('/');
  };

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${isActive ? 'bg-panel-2 text-marigold' : 'text-muted hover:text-cream'}`;

  return (
    <header className="sticky top-0 z-40 bg-ink/85 backdrop-blur-md">
      <div className="shell flex h-16 items-center gap-3">
        <Link
          to="/"
          aria-label="Utsavly home"
          className="shrink-0"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            celebrate({ x: r.left + 24, y: r.top + 20, count: 3 });
          }}
        >
          <Wordmark size="sm" />
        </Link>
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={navLink} end>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="btn btn-ghost min-h-11! px-3! text-sm" onClick={() => setFilm('player')}>
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="hidden md:inline">Watch the film</span>
            <span className="sr-only md:hidden">Watch the film</span>
          </button>
          {user ? (
            <>
              <NavLink to="/orders" className={navLink}>
                Orders
              </NavLink>
              <button type="button" onClick={signOut} className="hidden text-sm font-semibold text-muted hover:text-cream sm:block">
                Sign out
              </button>
            </>
          ) : (
            <NavLink to="/login" className={navLink}>
              Sign in
            </NavLink>
          )}
          <BagButton />
        </div>
      </div>
      <nav aria-label="Sections" className="shell no-scrollbar flex gap-1 overflow-x-auto pb-1 lg:hidden">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={navLink} end>
            {n.label}
          </NavLink>
        ))}
        {user && (
          <button type="button" onClick={signOut} className="shrink-0 px-3 py-1.5 text-sm font-semibold text-muted sm:hidden">
            Sign out
          </button>
        )}
      </nav>
      <StringLights />
    </header>
  );
}
