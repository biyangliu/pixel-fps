/** Original synthesized SFX + oppressive ambient bed — genre DNA, not commercial audio */

let ctx: AudioContext | null = null;
let ambientNodes: { stop: () => void } | null = null;

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
  delay = 0,
): void {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  gain.connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBurst(dur: number, vol: number, hpFreq = 800, delay = 0): void {
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
  filter.Q.value = 0.8;
  const gain = a.createGain();
  const t0 = a.currentTime + delay;
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(a.destination);
  src.start(t0);
}

export function sfxShoot(weapon: string): void {
  if (weapon === 'shotgun') {
    noiseBurst(0.22, 0.42, 350);
    noiseBurst(0.12, 0.2, 900, 0.03);
    beep(90, 0.16, 'sawtooth', 0.14, -50);
  } else if (weapon === 'chaingun') {
    noiseBurst(0.045, 0.2, 1400);
    beep(300, 0.035, 'square', 0.09, -120);
  } else if (weapon === 'rocket') {
    noiseBurst(0.1, 0.22, 280);
    beep(70, 0.2, 'sawtooth', 0.16, 90);
    beep(140, 0.08, 'square', 0.06, 40);
  } else if (weapon === 'plasma') {
    beep(920, 0.045, 'square', 0.09, -480);
    beep(480, 0.05, 'sine', 0.07);
    noiseBurst(0.03, 0.08, 2000);
  } else if (weapon === 'bfg') {
    beep(48, 0.55, 'sawtooth', 0.2, 220);
    noiseBurst(0.45, 0.3, 160);
    beep(110, 0.6, 'sine', 0.12, 90);
    beep(220, 0.2, 'square', 0.08, 0, 0.15);
  } else if (weapon === 'chainsaw') {
    noiseBurst(0.07, 0.14, 550);
    beep(75, 0.07, 'sawtooth', 0.11, 25);
  } else if (weapon === 'fist') {
    beep(95, 0.07, 'triangle', 0.12, -50);
    noiseBurst(0.04, 0.08, 400);
  } else {
    noiseBurst(0.07, 0.22, 950);
    beep(400, 0.055, 'square', 0.11, -220);
  }
}

export function sfxMelee(weapon: string): void {
  if (weapon === 'chainsaw') {
    noiseBurst(0.07, 0.18, 650);
    beep(65, 0.06, 'sawtooth', 0.14);
  } else {
    beep(130, 0.08, 'triangle', 0.14, -70);
    noiseBurst(0.05, 0.1, 300);
  }
}

export function sfxExplosion(): void {
  noiseBurst(0.4, 0.48, 150);
  noiseBurst(0.25, 0.25, 400, 0.05);
  beep(48, 0.35, 'sawtooth', 0.22, -25);
}

export function sfxHurt(): void {
  beep(170, 0.16, 'sawtooth', 0.16, -130);
  beep(85, 0.22, 'triangle', 0.11, -45);
}

export function sfxPickup(): void {
  beep(700, 0.05, 'square', 0.09);
  beep(1050, 0.07, 'square', 0.08);
}

export function sfxPowerup(): void {
  beep(440, 0.07, 'square', 0.11);
  beep(660, 0.09, 'square', 0.11);
  beep(880, 0.14, 'square', 0.11);
}

export function sfxKey(): void {
  beep(540, 0.07, 'triangle', 0.11);
  beep(810, 0.09, 'triangle', 0.11);
  beep(1080, 0.12, 'triangle', 0.09);
}

export function sfxDoor(): void {
  beep(85, 0.28, 'sawtooth', 0.13, 50);
  noiseBurst(0.22, 0.16, 180);
}

export function sfxSwitch(): void {
  beep(210, 0.05, 'square', 0.11);
  beep(140, 0.09, 'square', 0.09, -55);
}

export function sfxSecret(): void {
  beep(523, 0.09, 'square', 0.11);
  beep(659, 0.09, 'square', 0.11);
  beep(784, 0.16, 'square', 0.13);
}

export function sfxEnemyHit(): void {
  beep(190, 0.045, 'square', 0.07, -90);
}

export function sfxEnemyDie(type?: string): void {
  if (type === 'baron' || type === 'caco') {
    beep(70, 0.4, 'sawtooth', 0.18, -55);
    noiseBurst(0.35, 0.22, 220);
  } else if (type === 'demon') {
    beep(100, 0.25, 'sawtooth', 0.14, -80);
    noiseBurst(0.2, 0.15, 280);
  } else {
    beep(130, 0.18, 'sawtooth', 0.12, -100);
    noiseBurst(0.14, 0.12, 320);
  }
}

export function sfxEnemyAlert(type?: string): void {
  if (type === 'demon') beep(85, 0.16, 'sawtooth', 0.11, 45);
  else if (type === 'imp') beep(300, 0.1, 'square', 0.09, -90);
  else if (type === 'baron') { beep(60, 0.2, 'sawtooth', 0.14); beep(90, 0.15, 'sawtooth', 0.1, 30, 0.08); }
  else if (type === 'caco') beep(160, 0.14, 'triangle', 0.1, -40);
  else beep(230, 0.08, 'square', 0.08);
}

export function sfxWin(): void {
  beep(440, 0.1, 'square', 0.11);
  beep(554, 0.1, 'square', 0.11, 0, 0.1);
  beep(659, 0.22, 'square', 0.13, 0, 0.2);
}

export function sfxLose(): void {
  beep(200, 0.35, 'sawtooth', 0.16, -160);
  beep(100, 0.45, 'triangle', 0.13, -55);
}

export function startAmbient(): void {
  const a = ac();
  if (!a || ambientNodes) return;
  const osc1 = a.createOscillator();
  const osc2 = a.createOscillator();
  const osc3 = a.createOscillator();
  const filter = a.createBiquadFilter();
  const gain = a.createGain();
  osc1.type = 'sine';
  osc2.type = 'triangle';
  osc3.type = 'sawtooth';
  osc1.frequency.value = 46;
  osc2.frequency.value = 69;
  osc3.frequency.value = 92;
  filter.type = 'lowpass';
  filter.frequency.value = 280;
  gain.gain.value = 0.028;
  osc1.connect(filter);
  osc2.connect(filter);
  osc3.connect(gain);
  filter.connect(gain);
  gain.connect(a.destination);
  osc1.start(); osc2.start(); osc3.start();
  // Slow pulse
  const lfo = a.createOscillator();
  const lfoGain = a.createGain();
  lfo.frequency.value = 0.08;
  lfoGain.gain.value = 0.01;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  lfo.start();
  ambientNodes = {
    stop: () => {
      try { osc1.stop(); osc2.stop(); osc3.stop(); lfo.stop(); } catch { /* */ }
      ambientNodes = null;
    },
  };
}

export function stopAmbient(): void {
  ambientNodes?.stop();
  ambientNodes = null;
}
