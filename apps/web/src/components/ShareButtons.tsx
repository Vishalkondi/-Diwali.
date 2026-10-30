import { useState } from 'react';
import { copyText } from './RewardCard';

/** "Copy link" plus a WhatsApp share (the phone's own share sheet first, where there is one). */
export function ShareButtons({ url, text, testId }: { url: string; text: string; testId?: string }) {
  const [copied, setCopied] = useState<'idle' | 'yes' | 'no'>('idle');

  const whatsapp = async () => {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    if (coarse && navigator.share) {
      try {
        await navigator.share({ text, url });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn btn-primary" onClick={async () => setCopied((await copyText(url)) ? 'yes' : 'no')} data-testid={testId}>
        {copied === 'yes' ? '✓ Link copied' : copied === 'no' ? 'Copy failed: select the link below' : 'Copy link'}
      </button>
      <button type="button" className="btn btn-ghost" onClick={whatsapp}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#25d366" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.1.1.7-.1 1.3Z" />
        </svg>
        Share on WhatsApp
      </button>
      {copied === 'no' && (
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="field mt-1 w-full text-sm" aria-label="Share link" />
      )}
    </div>
  );
}
