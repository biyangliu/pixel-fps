/** Tiny Web Audio synthesized SFX — no asset packs */

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function beep(
  freq: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  slide = 0,
): void {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  gain.connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBurst(dur: number, vol: number, hpFreq = 800): void {
  const a = ac();
  if (!a) return;
  const n = (a.sampleRate * dur) | 0;
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = hpFreq;
  filter.Q.value = 0.7;
  const gain = a.createGain();
  const t0 = a.currentTime;
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(a.destination);
  src.start(t0);
}

export function sfxShoot(weapon: string): void {
  if (weapon === 'shotgun') {
    noiseBurst(0.18, 0.35, 400);
    beep(120, 0.12, 'sawtooth', 0.12, -80);
  } else if (weapon === 'chaingun') {
    noiseBurst(0.05, 0.18, 1200);
    beep(280, 0.04, 'square', 0.08, -100);
  } else {
    noiseBurst(0.06, 0.2, 900);
    beep(420, 0.05, 'square', 0.1, -200);
  }
}

export function sfxHurt(): void {
  beep(180, 0.15, 'sawtooth', 0.15, -120);
  beep(90, 0.2, 'triangle', 0.1, -40);
}

export function sfxPickup(): void {
  beep(660, 0.06, 'square', 0.08);
  beep(990, 0.08, 'square', 0.07);
}

export function sfxKey(): void {
  beep(520, 0.08, 'triangle', 0.1);
  beep(780, 0.1, 'triangle', 0.1);
  beep(1040, 0.12, 'triangle', 0.08);
}

export function sfxDoor(): void {
  beep(90, 0.25, 'sawtooth', 0.12, 40);
  noiseBurst(0.2, 0.15, 200);
}

export function sfxEnemyHit(): void {
  beep(200, 0.05, 'square', 0.06, -80);
}

export function sfxEnemyDie(): void {
  beep(140, 0.2, 'sawtooth', 0.12, -100);
  noiseBurst(0.15, 0.12, 300);
}

export function sfxWin(): void {
  beep(440, 0.12, 'square', 0.1);
  beep(554, 0.12, 'square', 0.1);
  beep(659, 0.2, 'square', 0.12);
}

export function sfxLose(): void {
  beep(220, 0.3, 'sawtooth', 0.15, -150);
  beep(110, 0.4, 'triangle', 0.12, -50);
}
