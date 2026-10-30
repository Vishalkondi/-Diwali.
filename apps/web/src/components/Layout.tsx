import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { prefersReducedMotion, readLocal } from '../lib/storage';
import { useUi } from '../stores/ui';
import { Ambience } from './Ambience';
import { BagDrawer } from './BagDrawer';
import { FestiveToggles } from './FestiveToggles';
import { FilmOverlay, INTRO_SEEN_KEY } from './FilmOverlay';
import { FlyLayer } from './FlyLayer';
import { Footer } from './Footer';
import { Header } from './Header';

function useFirstVisitIntro() {
  const { pathname } = useLocation();
  const setFilm = useUi((s) => s.setFilm);
  useEffect(() => {
    // Wish and rangoli links open straight onto the card someone sent.
    const sharedLink = pathname.startsWith('/w/') || pathname.startsWith('/rangoli/');
    if (sharedLink || prefersReducedMotion() || readLocal(INTRO_SEEN_KEY)) return;
    setFilm('intro');
  }, []);
}

function useScrollToHash() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
}

export function Layout() {
  useFirstVisitIntro();
  useScrollToHash();
  return (
    <div className="relative flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-50 rounded-full bg-marigold px-4 py-2 font-bold text-plum focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Ambience />
      <Header />
      <main id="main" className="relative z-10 flex-1">
        <Outlet />
      </main>
      <Footer />
      <BagDrawer />
      <FlyLayer />
      <FestiveToggles />
      <FilmOverlay />
    </div>
  );
}
