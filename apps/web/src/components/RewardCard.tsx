import { useState } from 'react';
import type { Reward } from '../lib/types';

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function RewardCard({ reward, compact = false }: { reward: Reward; compact?: boolean }) {
  const [copied, setCopied] = useState<'idle' | 'yes' | 'no'>('idle');
  const status = reward.used ? 'Used' : reward.expired ? 'Expired' : `Valid till ${new Date(reward.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  return (
    <div data-prize={reward.prizeIndex} className={`rounded-2xl bg-linear-to-br from-marigold via-saffron to-rose p-[2px] ${reward.used || reward.expired ? 'opacity-60' : ''}`}>
      <div className={`rounded-[14px] bg-panel text-left ${compact ? 'p-3' : 'p-4'}`}>
        <p className="text-xs font-bold uppercase tracking-wider text-marigold">You won</p>
        <p className={`font-display font-extrabold ${compact ? 'text-xl' : 'text-3xl'}`}>{reward.label}</p>
        <p className="text-sm text-muted">{reward.description} · {status}</p>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-panel-2 px-3 py-2 font-mono text-sm font-bold tracking-wider" data-testid="reward-code">{reward.code}</code>
          {!reward.used && !reward.expired && (
            <button
              type="button"
              className="btn btn-ghost min-h-10! px-3! text-sm"
              onClick={async () => setCopied((await copyText(reward.code)) ? 'yes' : 'no')}
            >
              {copied === 'yes' ? 'Copied!' : copied === 'no' ? 'Copy failed' : 'Copy code'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
