import { useEffect, useState } from 'react';

/** Lakshmi Puja 2026: 8 November, 00:00 IST. */
export const LAKSHMI_PUJA = new Date('2026-11-08T00:00:00+05:30');

export const FIVE_DAYS = [
  { name: 'Dhanteras', date: 'Fri 6 Nov', note: 'New beginnings: buy something bright and new for the home.' },
  { name: 'Choti Diwali', date: 'Sun 8 Nov', note: 'Naraka Chaturdashi. The first diyas are lit at dusk.' },
  { name: 'Lakshmi Puja', date: 'Sun 8 Nov', note: 'The main evening of Diwali: puja, diyas in every window.' },
  { name: 'Govardhan Puja', date: 'Tue 10 Nov', note: 'Annakut: a mountain of food offered in thanks.' },
  { name: 'Bhai Dooj', date: 'Wed 11 Nov', note: 'Siblings, tilak and sweets.' },
] as const;

/** Ten puja essentials, by product slug. */
export const PUJA_CHECKLIST = [
  'clay-diyas',
  'ghee-cotton-wicks',
  'brass-puja-thali',
  'lakshmi-ganesh-idol',
  'kumkum-haldi-set',
  'agarbatti-bundle',
  'marigold-garlands',
  'rangoli-colours',
  'kaju-katli',
  'marigold-toran',
] as const;

export function timeLeft(target: Date, now = Date.now()) {
  const ms = Math.max(0, target.getTime() - now);
  const s = Math.floor(ms / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60, done: ms === 0 };
}

export function useCountdown(target: Date) {
  const [left, setLeft] = useState(() => timeLeft(target));
  useEffect(() => {
    const id = window.setInterval(() => setLeft(timeLeft(target)), 1000);
    return () => window.clearInterval(id);
  }, [target]);
  return left;
}

export function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}
