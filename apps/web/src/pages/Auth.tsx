import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { Field } from '../components/Field';
import { Wordmark } from '../components/Wordmark';
import { api, ApiError } from '../lib/api';
import { safeNext } from '../lib/format';
import { keys, useMe } from '../lib/queries';
import type { User } from '../lib/types';

/** One form for sign-in and registration. */
export default function Auth({ mode }: { mode: 'login' | 'register' }) {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const qc = useQueryClient();
  const me = useMe();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';

  if (me.data) return <Navigate to={next} replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage('');
    try {
      const body = isRegister ? form : { email: form.email, password: form.password };
      const res = await api<{ user: User }>(`/auth/${mode}`, { method: 'POST', body });
      qc.setQueryData(keys.me, res.user);
      navigate(next, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setMessage(err.message);
      } else setMessage('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const other = isRegister ? '/login' : '/register';

  return (
    <div className="shell grid min-h-[70vh] place-items-center py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 160, damping: 20 }}
        className="card w-full max-w-md p-6 sm:p-8"
      >
        <Wordmark size="sm" />
        <h1 className="mt-5 font-display text-3xl font-extrabold">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p className="mt-1 text-muted">{isRegister ? 'So we know whose doorstep to light up.' : 'Sign in to check out and track your orders.'}</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          {isRegister && <Field label="Your name" name="name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} required />}
          <Field label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} required />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            hint={isRegister ? 'At least 8 characters.' : undefined}
            required
          />
          {message && Object.keys(errors).length === 0 && (
            <p className="rounded-xl bg-rose/15 px-3 py-2 text-sm font-medium text-rose" role="alert">{message}</p>
          )}
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? 'One moment…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          {isRegister ? 'Already have an account?' : 'New to Utsavly?'}{' '}
          <Link to={`${other}${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-bold text-marigold hover:underline">
            {isRegister ? 'Sign in' : 'Create one'}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
