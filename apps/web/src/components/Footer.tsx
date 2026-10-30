import { Link } from 'react-router';
import { Wordmark } from './Wordmark';

export function Footer() {
  return (
    <footer className="relative z-10 mt-24 border-t border-line bg-panel/60">
      <div className="shell grid gap-8 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark />
          <p className="mt-3 font-display text-lg text-marigold">Ghar ghar jagmag.</p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
            Utsavly is a fictional brand and a design concept. Orders are simulated: nothing is charged, packed or shipped,
            and no rider is coming (sorry).
          </p>
        </div>
        <nav aria-label="Explore" className="grid content-start gap-2 text-sm">
          <span className="font-display font-bold text-cream">Explore</span>
          <Link className="text-muted hover:text-cream" to="/#store">Diwali Store</Link>
          <Link className="text-muted hover:text-cream" to="/diwali">Festival countdown</Link>
          <Link className="text-muted hover:text-cream" to="/wall">Diya Wall</Link>
          <Link className="text-muted hover:text-cream" to="/rangoli">Rangoli studio</Link>
        </nav>
        <nav aria-label="You" className="grid content-start gap-2 text-sm">
          <span className="font-display font-bold text-cream">You</span>
          <Link className="text-muted hover:text-cream" to="/orders">Your orders</Link>
          <Link className="text-muted hover:text-cream" to="/wish">Send a Diwali wish</Link>
        </nav>
      </div>
      <p className="shell pb-8 text-xs text-muted/80">Concept project · Made with a little more light for every home.</p>
    </footer>
  );
}
