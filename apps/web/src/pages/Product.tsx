import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { motion } from 'motion/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { flyFrom, ProductCard } from '../components/ProductCard';
import { ProductIcon } from '../components/ProductIcon';
import { SaveButton } from '../components/SaveButton';
import { Stars, StarInput } from '../components/Stars';
import { Stepper } from '../components/Stepper';
import { productIconKey } from '../engine';
import { api, ApiError, errorMessage } from '../lib/api';
import { FREE_DELIVERY_FROM, inr, shortDate } from '../lib/format';
import { useMe, useProduct, useReviews } from '../lib/queries';
import { play } from '../lib/sound';
import type { ProductDetail, Review } from '../lib/types';
import { qtyOf, useCart } from '../stores/cart';
import NotFound from './NotFound';

function BuyBox({ product }: { product: ProductDetail }) {
  const qty = useCart(qtyOf(product.id));
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const ref = useRef<HTMLDivElement>(null);
  const soldOut = product.stock <= 0;
  return (
    <div ref={ref} className="mt-6 flex flex-wrap items-center gap-4">
      <span className="font-display text-4xl font-extrabold">{inr(product.pricePaise)}</span>
      {soldOut ? (
        <span className="rounded-xl bg-panel-2 px-4 py-2 font-bold text-muted">Sold out</span>
      ) : qty === 0 ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            add(product);
            flyFrom(ref.current);
            play('pop');
          }}
        >
          Add to bag
        </button>
      ) : (
        <Stepper
          qty={qty}
          name={product.name}
          onChange={(n) => {
            if (n > qty) flyFrom(ref.current);
            setQty(product.id, n);
            play(n > qty ? 'pop' : 'tick');
          }}
        />
      )}
    </div>
  );
}

function Histogram({ histogram, count }: { histogram: number[]; count: number }) {
  return (
    <ul className="space-y-1.5" aria-label="Ratings breakdown">
      {[5, 4, 3, 2, 1].map((star) => {
        const n = histogram[star - 1] ?? 0;
        const pct = count ? (n / count) * 100 : 0;
        return (
          <li key={star} className="flex items-center gap-2 text-sm">
            <span className="w-8 shrink-0 text-muted">{star} ★</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-panel-2">
              <motion.span
                className="block h-full rounded-full bg-marigold"
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 80, damping: 18 }}
              />
            </span>
            <span className="w-6 shrink-0 text-right tabular-nums text-muted">{n}</span>
          </li>
        );
      })}
    </ul>
  );
}

function ReviewForm({ slug, mine }: { slug: string; mine?: Review }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [body, setBody] = useState(mine?.body ?? '');
  const [editing, setEditing] = useState(!mine);
  useEffect(() => {
    setRating(mine?.rating ?? 0);
    setBody(mine?.body ?? '');
    setEditing(!mine);
  }, [mine]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['reviews', slug] });
    void qc.invalidateQueries({ queryKey: ['product', slug] });
    void qc.invalidateQueries({ queryKey: ['products'] });
  };
  const save = useMutation({
    mutationFn: () => api(`/products/${slug}/reviews/mine`, { method: 'PUT', body: { rating, body } }),
    onSuccess: () => {
      play('chime');
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: () => api(`/products/${slug}/reviews/mine`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  if (mine && !editing) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted">You rated this {mine.rating} star{mine.rating === 1 ? '' : 's'}.</span>
        <button type="button" className="font-bold text-marigold hover:underline" onClick={() => setEditing(true)}>Edit your review</button>
        <button type="button" className="font-bold text-muted hover:text-rose" onClick={() => remove.mutate()} disabled={remove.isPending}>
          Delete
        </button>
      </div>
    );
  }

  const fieldErrors = save.error instanceof ApiError ? save.error.fields : {};
  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      noValidate
    >
      <h3 className="font-display text-xl font-bold">{mine ? 'Edit your review' : 'Write a review'}</h3>
      <StarInput value={rating} onChange={setRating} invalid={!!fieldErrors.rating} />
      {fieldErrors.rating && <p className="text-sm text-rose">{fieldErrors.rating}</p>}
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Your review <span className="font-normal text-muted">(optional)</span></span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={400}
          rows={3}
          className="field resize-y"
          placeholder="How did it look, taste or last?"
          aria-invalid={!!fieldErrors.body || undefined}
        />
        <span className="mt-1 block text-right text-xs text-muted">{body.length}/400</span>
      </label>
      {save.isError && !Object.keys(fieldErrors).length && <p className="text-sm text-rose">{errorMessage(save.error)}</p>}
      <div className="flex gap-3">
        <button type="submit" className="btn btn-primary" disabled={save.isPending || rating === 0}>
          {save.isPending ? 'Saving…' : mine ? 'Update review' : 'Post review'}
        </button>
        {mine && (
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
        )}
      </div>
    </form>
  );
}

function Reviews({ slug }: { slug: string }) {
  const reviews = useReviews(slug);
  const me = useMe();
  const { pathname } = useLocation();
  const summary = reviews.data?.summary;
  const list = reviews.data?.reviews ?? [];
  const mine = list.find((r) => r.mine);

  return (
    <section className="pt-16" aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="font-display text-3xl font-extrabold">Reviews</h2>
      {reviews.isError ? (
        <p className="mt-4 text-muted">Reviews didn’t load. {errorMessage(reviews.error)}</p>
      ) : !summary ? (
        <div className="mt-6 h-32 animate-pulse rounded-3xl bg-panel" />
      ) : (
        <div className="mt-6 grid gap-8 md:grid-cols-[260px_1fr]">
          <div>
            {summary.count ? (
              <>
                <p className="font-display text-5xl font-extrabold">{summary.avg?.toFixed(1)}</p>
                <Stars value={summary.avg ?? 0} size={20} className="mt-1 text-muted" />
                <p className="mt-1 text-sm text-muted">{summary.count} review{summary.count === 1 ? '' : 's'}</p>
                <div className="mt-4">
                  <Histogram histogram={summary.histogram} count={summary.count} />
                </div>
              </>
            ) : (
              <p className="text-muted">No reviews yet. Be the first to share how it lit up your Diwali.</p>
            )}
          </div>
          <div className="space-y-6">
            {me.data ? (
              <ReviewForm slug={slug} mine={mine} />
            ) : (
              <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
                <p className="text-muted">Sign in to rate this and write a review.</p>
                <Link to={`/login?next=${encodeURIComponent(pathname)}`} className="btn btn-ghost">Sign in</Link>
              </div>
            )}
            <ul className="space-y-4">
              {list.map((r) => (
                <li key={r.id} className="border-b border-line pb-4 last:border-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars value={r.rating} className="text-muted" />
                    <span className="font-bold">{r.name}{r.mine && <span className="font-normal text-muted"> (you)</span>}</span>
                    {r.verified && <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-bold text-success">Verified purchase</span>}
                    <span className="text-sm text-muted">{shortDate(r.updatedAt)}</span>
                  </div>
                  {r.body && <p className="mt-1.5 leading-relaxed text-cream/90">{r.body}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

export default function Product() {
  const { slug = '' } = useParams();
  const query = useProduct(slug);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (query.data) document.title = `${query.data.product.name} · Utsavly`;
    return () => {
      document.title = 'Utsavly · Ghar ghar jagmag.';
    };
  }, [query.data]);

  if (query.error instanceof ApiError && query.error.status === 404) return <NotFound />;
  if (query.isError) {
    return (
      <div className="shell py-24 text-center">
        <p className="font-display text-2xl font-bold">This product didn’t load.</p>
        <p className="mt-2 text-muted">{errorMessage(query.error)}</p>
        <button type="button" className="btn btn-primary mt-4" onClick={() => query.refetch()}>Try again</button>
      </div>
    );
  }
  if (!query.data) {
    return (
      <div className="shell grid gap-8 py-10 md:grid-cols-2" aria-busy="true">
        <div className="aspect-square animate-pulse rounded-3xl bg-panel" />
        <div className="space-y-4 pt-6">
          <div className="h-10 w-2/3 animate-pulse rounded bg-panel" />
          <div className="h-5 w-1/2 animate-pulse rounded bg-panel" />
        </div>
      </div>
    );
  }

  const { product, related } = query.data;
  return (
    <div className="shell py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link to="/#store" className="hover:text-cream">Store</Link>
        <span aria-hidden="true"> / </span>
        <Link to={`/?cat=${product.category.slug}#store`} className="hover:text-cream">{product.category.name}</Link>
      </nav>

      <div className="mt-4 grid items-start gap-8 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 160, damping: 20 }}
          className="relative grid aspect-square place-items-center overflow-hidden rounded-3xl"
          style={{ background: product.category.tint }}
          onPointerEnter={() => setActive(true)}
        >
          <ProductIcon icon={productIconKey(product)} size={320} active={active} className="max-w-[80%]" />
          {product.badge && (
            <span className="absolute left-4 top-4 rounded-full bg-plum px-3 py-1.5 text-sm font-bold text-cream">{product.badge}</span>
          )}
          <SaveButton slug={product.slug} name={product.name} className="absolute right-4 top-4 h-12 w-12" size={24} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="md:pt-6">
          <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">{product.name}</h1>
          <p className="mt-2 text-lg text-muted">{product.subtitle}</p>
          {product.rating !== null && product.ratingCount > 0 && (
            <a href="#reviews-title" className="mt-3 inline-flex items-center gap-2 text-sm hover:text-marigold">
              <Stars value={product.rating} size={18} className="text-muted" />
              <span className="font-bold">{product.rating.toFixed(1)}</span>
              <span className="text-muted">· {product.ratingCount} review{product.ratingCount === 1 ? '' : 's'}</span>
            </a>
          )}
          <BuyBox product={product} />
          {product.description && <p className="mt-6 max-w-prose leading-relaxed text-cream/90">{product.description}</p>}
          <ul className="mt-6 grid gap-2 text-sm text-muted sm:grid-cols-2">
            <li className="card px-4 py-3">🛵 At your door in about 10 minutes</li>
            <li className="card px-4 py-3">🎁 Free delivery above {inr(FREE_DELIVERY_FROM)}</li>
          </ul>
        </motion.div>
      </div>

      <Reviews slug={product.slug} />

      {related.length > 0 && (
        <section className="pt-16" aria-labelledby="related-title">
          <h2 id="related-title" className="font-display text-3xl font-extrabold">You may also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}
    </div>
  );
}
