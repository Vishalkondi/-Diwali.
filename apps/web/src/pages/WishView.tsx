import { Link, useParams, useSearchParams } from 'react-router';
import { ShareButtons } from '../components/ShareButtons';
import { WishCard } from '../components/WishCard';
import { useWish } from '../lib/queries';
import { WISH_TEXT } from '../lib/wishText';

export default function WishView() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const wish = useWish(slug);
  const url = `${window.location.origin}/w/${slug}`;

  if (wish.isLoading) return <div className="shell py-24 text-center text-muted">Lighting your card…</div>;
  if (wish.isError || !wish.data) {
    return (
      <div className="shell grid place-items-center gap-3 py-24 text-center">
        <p className="text-5xl" aria-hidden="true">🪔</p>
        <h1 className="font-display text-3xl font-extrabold">This wish has drifted away</h1>
        <p className="text-muted">The link may be mistyped. You can always send a new one.</p>
        <Link to="/wish" className="btn btn-primary">Send your own wish</Link>
      </div>
    );
  }
  const w = wish.data;
  return (
    <div className="shell py-8">
      {params.has('new') && <p className="mb-4 rounded-2xl bg-success/15 px-4 py-3 text-sm font-semibold text-success">Your card is ready. Share the link below!</p>}
      <WishCard theme={w.theme} lang={w.lang} toName={w.toName} fromName={w.fromName} message={w.message} />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <ShareButtons url={url} text={`${WISH_TEXT[w.lang].title}, ${w.toName}! A Diwali wish from ${w.fromName}:`} testId="copy-wish-link" />
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted" data-testid="wish-views">👀 Opened {w.views} {w.views === 1 ? 'time' : 'times'}</span>
          <Link to="/wish" className="btn btn-ghost">Send your own</Link>
        </div>
      </div>
    </div>
  );
}
