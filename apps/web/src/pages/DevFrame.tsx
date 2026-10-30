import { useSearchParams } from 'react-router';
import { StageCanvas } from '../components/StageCanvas';
import { render, renderFireworks, renderScene } from '../engine';

/**
 * Development-only: renders one exact frame for visual checks.
 * /dev/frame?t=12.4   film at t     /dev/frame?scene=4&t=1.2   one scene     /dev/frame?fireworks&t=3
 */
export default function DevFrame() {
  const [params] = useSearchParams();
  const t = Number(params.get('t') ?? 0);
  const scene = params.get('scene');
  const draw = () => {
    if (params.has('fireworks')) renderFireworks(t);
    else if (scene !== null) renderScene(Number(scene), t);
    else render(t);
  };
  return (
    <div style={{ background: '#000', width: 1280, height: 720 }}>
      <StageCanvas draw={draw} paused label="frame" style={{ width: 1280, height: 720, display: 'block' }} data-frame-ready="1" />
    </div>
  );
}
