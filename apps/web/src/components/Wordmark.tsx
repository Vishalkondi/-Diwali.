/** The diya mark: a bowl and flame in a marigold-to-rose badge. */
export function DiyaMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="dd-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb42e" />
          <stop offset="1" stopColor="#ff3d81" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#dd-mark)" />
      <path d="M14 34c1 10 9 13 18 13s17-3 18-13z" fill="#3a0b4d" />
      <path d="M32 31c-6-2-4-10 0-18 4 8 6 16 0 18z" fill="#fff3d6" />
    </svg>
  );
}

export function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const text = size === 'lg' ? 'text-5xl' : size === 'sm' ? 'text-xl' : 'text-2xl';
  const mark = size === 'lg' ? 56 : size === 'sm' ? 28 : 34;
  return (
    <span className="inline-flex items-center gap-2">
      <DiyaMark size={mark} />
      <span className={`font-display font-extrabold lowercase leading-none tracking-tight text-cream ${text}`}>utsavly</span>
    </span>
  );
}
