import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Field } from '../components/Field';
import { WishCard } from '../components/WishCard';
import { api, ApiError } from '../lib/api';
import { useMe } from '../lib/queries';
import type { Lang, Wish, WishTheme } from '../lib/types';
import { THEMES, WISH_TEXT } from '../lib/wishText';

export default function WishBuilder() {
  const me = useMe();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<WishTheme>('diya');
  const [lang, setLang] = useState<Lang>('en');
  const [toName, setTo] = useState('');
  const [fromName, setFrom] = useState(me.data?.name ?? '');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const copy = WISH_TEXT[lang];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const res = await api<{ wish: Wish }>('/wishes', {
        method: 'POST',
        body: { toName, fromName, message: message.trim() || copy.fallback, theme, lang },
      });
      navigate(`/w/${res.wish.slug}?new=1`);
    } catch (err) {
      setErrors(err instanceof ApiError ? { ...err.fields, _: err.message } : { _: 'Could not create the card.' });
    } finally {
      setBusy(false);
    }
  };

  const chip = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-bold transition-colors ${active ? 'bg-marigold text-plum' : 'bg-panel-2 text-muted ring-1 ring-line hover:text-cream'}`;

  return (
    <div className="shell py-10">
      <h1 className="font-display text-4xl font-extrabold">Send a Diwali wish</h1>
      <p className="mt-1 text-muted">Make a glowing card and share the link. No sign-in needed.</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.25fr]">
        <form onSubmit={submit} className="card space-y-5 p-5 sm:p-6" noValidate>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Style</legend>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button key={t.key} type="button" aria-pressed={theme === t.key} onClick={() => setTheme(t.key)} className={chip(theme === t.key)}>
                  <span aria-hidden="true">{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Language</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(WISH_TEXT) as Lang[]).map((l) => (
                <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)} className={chip(lang === l)}>
                  {WISH_TEXT[l].label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="To" name="toName" value={toName} onChange={(e) => setTo(e.target.value)} maxLength={40} placeholder="Nani" error={errors.toName} />
            <Field label="From" name="fromName" value={fromName} onChange={(e) => setFrom(e.target.value)} maxLength={40} placeholder="Aarav" error={errors.fromName} />
          </div>
          <div>
            <Field
              textarea
              lang={lang}
              label="Message"
              name="message"
              rows={4}
              maxLength={240}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={copy.fallback}
              error={errors.message}
              hint={<span className={message.length > 220 ? 'text-marigold' : ''}>{message.length}/240</span>}
            />
            <div className="mt-2 flex flex-wrap gap-2" aria-label="Message ideas">
              {copy.templates.map((tpl, i) => (
                <button key={i} type="button" lang={lang} onClick={() => setMessage(tpl)} className="rounded-xl bg-panel-2 px-3 py-1.5 text-left text-xs text-cream/90 ring-1 ring-line hover:ring-marigold">
                  {tpl.length > 48 ? `${tpl.slice(0, 46)}…` : tpl}
                </button>
              ))}
            </div>
          </div>
          {errors._ && <p className="rounded-xl bg-rose/15 px-3 py-2 text-sm text-rose" role="alert">{errors._}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={busy} data-testid="create-wish">
            {busy ? 'Lighting it up…' : 'Create my card'}
          </button>
        </form>
        <motion.div layout className="lg:sticky lg:top-28 lg:h-fit">
          <p className="mb-2 text-sm font-semibold text-muted">Live preview</p>
          <WishCard theme={theme} lang={lang} toName={toName} fromName={fromName} message={message} animateText={false} />
        </motion.div>
      </div>
    </div>
  );
}
