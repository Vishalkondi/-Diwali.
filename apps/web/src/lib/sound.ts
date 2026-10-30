import { useFestive } from '../stores/festive';
import { prefersReducedMotion } from './storage';

// Synthesised with WebAudio: no audio files. Silent unless the visitor turned sound on.
let ac: AudioContext | null = null;

function audio() {
  if (!ac) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ac = new Ctor();
  }
  if (ac.state === 'suspended') void ac.resume();
  return ac;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number, glideTo?: number) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noisePop() {
  const a = audio();
  if (!a) return;
  const len = Math.floor(a.sampleRate * 0.25);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 1800;
  const g = a.createGain();
  g.gain.value = 0.25;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

export type Sound = 'ting' | 'chime' | 'pop' | 'tick';

export function play(sound: Sound) {
  if (!useFestive.getState().sound || prefersReducedMotion()) return;
  try {
    switch (sound) {
      case 'ting':
        tone(1568, 0, 0.35, 'sine', 0.12);
        tone(2349, 0.02, 0.25, 'sine', 0.05);
        break;
      case 'chime':
        [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, i * 0.09, 0.9, 'triangle', 0.08));
        break;
      case 'pop':
        noisePop();
        tone(220, 0, 0.18, 'sine', 0.12, 80);
        break;
      case 'tick':
        tone(2400, 0, 0.03, 'square', 0.03);
        break;
    }
  } catch {
    // audio is a nicety; never let it break anything
  }
}
