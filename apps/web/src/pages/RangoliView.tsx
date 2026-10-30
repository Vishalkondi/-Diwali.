import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { paintFloor } from '../components/RangoliCanvas';
import { ShareButtons } from '../components/ShareButtons';
import { StageCanvas } from '../components/StageCanvas';
import { currentCtx } from '../engine';
import { drawRangoli, pointCount } from '../engine/rangoli';
import { api } from '../lib/api';
import type { Rangoli } from '../lib/types';

const SIZE = 800;
const REPLAY_SECONDS = 5;

export default function RangoliView() {
  const { slug = '' } = useParams();
  const [run, setRun] = useState(0);
  const q = useQuery({
    queryKey: ['rangoli', slug],
    queryFn: () => api<{ rangoli: Rangoli }>(`/rangolis/${slug}`).then((r) => r.rangoli),
    retry: false,
    staleTime: Infinity,
  });
  const r = q.data;
  const total = r ? pointCount(r.strokes) : 0;
  const draw = useCallback(
    (t: number) => {
      if (!r) return;
      paintFloor(currentCtx(), SIZE, 0);
      drawRangoli(r.strokes, r.folds, r.mirror, SIZE, Math.ceil((Math.min(t, REPLAY_SECONDS) / REPLAY_SECONDS) * total));
    },
    [r, total],
  );

  if (q.isLoading) return <div className="shell py-24 text-center text-muted">Fetching the colours…</div>;
  if (q.isError || !r) {
    return (
      <div className="shell grid place-items-center gap-3 py-24 text-center">
        <h1 className="font-display text-3xl font-extrabold">This rangoli was swept away</h1>
        <Link to="/rangoli" className="btn btn-primary">Draw your own</Link>
      </div>
    );
  }
  const url = `${window.location.origin}/rangoli/${slug}`;
  return (
    <div className="shell py-8">
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-4xl font-extrabold">{r.name}</h1>
        <p className="mt-1 text-sm text-muted">{r.folds} folds{r.mirror ? ', mirrored' : ''} · {r.views} views</p>
        <StageCanvas
          key={run}
          draw={draw}
          width={SIZE}
          height={SIZE}
          still={REPLAY_SECONDS}
          label={`Rangoli “${r.name}” being drawn`}
          className="mt-5 block aspect-square w-full rounded-3xl border border-line"
        />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <ShareButtons url={url} text={`A rangoli for Diwali: “${r.name}”`} />
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setRun((n) => n + 1)}>↻ Replay</button>
            <Link to="/rangoli" className="btn btn-ghost">Draw your own</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
