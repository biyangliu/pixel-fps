/** Original synthesized SFX + sequenced music — genre DNA, not commercial audio */

let ctx: AudioContext | null = null;
let ambientNodes: { stop: () => void } | null = null;
let musicNodes: { stop: () => void } | null = null;
let chainsawIdle: { stop: () => void } | null = null;

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
    noiseBurst(0.28, 0.48, 320);
    noiseBurst(0.14, 0.24, 900, 0.04);
    beep(85, 0.18, 'sawtooth', 0.16, -55);
  } else if (weapon === 'chaingun') {
    noiseBurst(0.05, 0.22, 1500);
    beep(280, 0.04, 'square', 0.1, -140);
  } else if (weapon === 'rocket') {
    noiseBurst(0.12, 0.24, 260);
    beep(65, 0.28, 'sawtooth', 0.18, 110);
    beep(130, 0.1, 'square', 0.07, 50);
  } else if (weapon === 'plasma') {
    beep(980, 0.05, 'square', 0.1, -520);
    beep(520, 0.055, 'sine', 0.08);
    noiseBurst(0.035, 0.09, 2200);
  } else if (weapon === 'bfg') {
    beep(42, 0.35, 'sawtooth', 0.18, 180);
    beep(48, 0.7, 'sawtooth', 0.22, 240, 0.25);
    noiseBurst(0.55, 0.32, 140);
    beep(100, 0.7, 'sine', 0.12, 100, 0.2);
  } else if (weapon === 'chainsaw') {
    noiseBurst(0.08, 0.16, 520);
    beep(70, 0.08, 'sawtooth', 0.12, 30);
  } else if (weapon === 'fist') {
    beep(90, 0.08, 'triangle', 0.13, -55);
    noiseBurst(0.045, 0.09, 380);
  } else {
    noiseBurst(0.08, 0.24, 980);
    beep(380, 0.06, 'square', 0.12, -240);
  }
}

export function sfxEmptyClick(): void {
  beep(180, 0.04, 'square', 0.06);
  noiseBurst(0.03, 0.05, 2000);
}

export function sfxMelee(weapon: string): void {
  if (weapon === 'chainsaw') {
    noiseBurst(0.08, 0.2, 620);
    beep(60, 0.07, 'sawtooth', 0.15);
  } else {
    beep(120, 0.09, 'triangle', 0.15, -75);
    noiseBurst(0.055, 0.11, 280);
  }
}

export function sfxExplosion(): void {
  noiseBurst(0.45, 0.5, 140);
  noiseBurst(0.28, 0.28, 380, 0.06);
  beep(45, 0.4, 'sawtooth', 0.24, -28);
}

export function sfxHurt(): void {
  beep(160, 0.18, 'sawtooth', 0.17, -140);
  beep(80, 0.24, 'triangle', 0.12, -50);
}

export function sfxLand(): void {
  noiseBurst(0.06, 0.12, 200);
  beep(70, 0.05, 'triangle', 0.08, -30);
}

export function sfxPickup(): void {
  beep(720, 0.05, 'square', 0.1);
  beep(1080, 0.07, 'square', 0.09);
}

export function sfxPowerup(): void {
  beep(440, 0.07, 'square', 0.12);
  beep(660, 0.09, 'square', 0.12);
  beep(880, 0.14, 'square', 0.12);
}

export function sfxKey(): void {
  beep(540, 0.07, 'triangle', 0.12);
  beep(810, 0.09, 'triangle', 0.12);
  beep(1080, 0.12, 'triangle', 0.1);
}

export function sfxDoor(closing = false): void {
  if (closing) {
    beep(110, 0.22, 'sawtooth', 0.11, -40);
    noiseBurst(0.18, 0.12, 160);
  } else {
    beep(80, 0.3, 'sawtooth', 0.14, 55);
    noiseBurst(0.24, 0.17, 170);
  }
}

export function sfxSwitch(): void {
  beep(210, 0.05, 'square', 0.12);
  beep(140, 0.09, 'square', 0.1, -55);
}

export function sfxLift(): void {
  beep(55, 0.4, 'sawtooth', 0.1, 25);
  noiseBurst(0.35, 0.1, 120);
}

export function sfxSecret(): void {
  beep(523, 0.09, 'square', 0.12);
  beep(659, 0.09, 'square', 0.12);
  beep(784, 0.16, 'square', 0.14);
}

export function sfxSplash(): void {
  noiseBurst(0.2, 0.18, 600);
  beep(200, 0.12, 'sine', 0.08, -100);
}

export function sfxTeleport(): void {
  beep(200, 0.15, 'sawtooth', 0.12, 400);
  beep(600, 0.2, 'sine', 0.1, -300, 0.08);
  noiseBurst(0.25, 0.15, 900);
}

export function sfxEnemyHit(): void {
  beep(190, 0.05, 'square', 0.08, -90);
}

export function sfxEnemyAttack(type?: string): void {
  if (type === 'imp') beep(280, 0.08, 'sawtooth', 0.09, 80);
  else if (type === 'caco') beep(140, 0.12, 'triangle', 0.1, 60);
  else if (type === 'baron') beep(70, 0.15, 'sawtooth', 0.12, 40);
  else if (type === 'demon' || type === 'spectre') beep(90, 0.1, 'sawtooth', 0.11);
  else noiseBurst(0.05, 0.1, 1200);
}

export function sfxEnemyDie(type?: string): void {
  if (type === 'baron' || type === 'caco') {
    beep(70, 0.42, 'sawtooth', 0.19, -55);
    noiseBurst(0.38, 0.24, 220);
  } else if (type === 'demon' || type === 'spectre') {
    beep(100, 0.26, 'sawtooth', 0.15, -80);
    noiseBurst(0.22, 0.16, 280);
  } else if (type === 'soul') {
    beep(400, 0.2, 'sine', 0.12, -300);
    noiseBurst(0.15, 0.1, 1500);
  } else {
    beep(130, 0.18, 'sawtooth', 0.13, -100);
    noiseBurst(0.14, 0.13, 320);
  }
}

export function sfxEnemyAlert(type?: string): void {
  if (type === 'demon' || type === 'spectre') beep(85, 0.16, 'sawtooth', 0.12, 45);
  else if (type === 'imp') beep(300, 0.1, 'square', 0.1, -90);
  else if (type === 'baron') { beep(60, 0.2, 'sawtooth', 0.15); beep(90, 0.15, 'sawtooth', 0.11, 30, 0.08); }
  else if (type === 'caco') beep(160, 0.14, 'triangle', 0.11, -40);
  else if (type === 'soul') beep(500, 0.1, 'sine', 0.09, -200);
  else beep(230, 0.08, 'square', 0.09);
}

export function sfxWin(): void {
  playSting('win');
}

export function sfxLose(): void {
  beep(200, 0.35, 'sawtooth', 0.17, -160);
  beep(100, 0.45, 'triangle', 0.14, -55);
}

export function startChainsawIdle(): void {
  const a = ac();
  if (!a || chainsawIdle) return;
  const osc = a.createOscillator();
  const filter = a.createBiquadFilter();
  const gain = a.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 55;
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  gain.gain.value = 0.035;
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(a.destination);
  osc.start();
  const lfo = a.createOscillator();
  const lfoG = a.createGain();
  lfo.frequency.value = 18;
  lfoG.gain.value = 8;
  lfo.connect(lfoG);
  lfoG.connect(osc.frequency);
  lfo.start();
  chainsawIdle = {
    stop: () => {
      try { osc.stop(); lfo.stop(); } catch { /* */ }
      chainsawIdle = null;
    },
  };
}

export function stopChainsawIdle(): void {
  chainsawIdle?.stop();
  chainsawIdle = null;
}

/** Short title / intermission stings */
export function playSting(kind: 'title' | 'win' | 'inter'): void {
  if (kind === 'title') {
    beep(110, 0.2, 'sawtooth', 0.12);
    beep(146, 0.2, 'sawtooth', 0.12, 0, 0.15);
    beep(174, 0.35, 'sawtooth', 0.14, 0, 0.3);
    beep(220, 0.4, 'square', 0.1, 0, 0.5);
  } else if (kind === 'win' || kind === 'inter') {
    beep(220, 0.12, 'square', 0.12);
    beep(277, 0.12, 'square', 0.12, 0, 0.12);
    beep(330, 0.12, 'square', 0.12, 0, 0.24);
    beep(440, 0.28, 'square', 0.14, 0, 0.36);
  }
}

/**
 * Original sequenced in-game music — dark industrial chiptune bed.
 * Notes are original; not arranged from any commercial MIDI.
 */
export function startMusic(): void {
  const a = ac();
  if (!a || musicNodes) return;

  const master = a.createGain();
  master.gain.value = 0.055;
  master.connect(a.destination);

  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1200;
  filter.connect(master);

  // Bass pattern (Am-ish industrial)
  const bassNotes = [55, 55, 65.4, 55, 73.4, 55, 49, 55];
  const leadNotes = [220, 0, 246.9, 220, 261.6, 0, 196, 233.1, 220, 0, 174.6, 196, 220, 246.9, 0, 196];
  const hatPattern = [1, 0, 1, 0, 1, 0, 1, 1];

  const beat = 0.22;
  const loopBars = 8;
  const loopDur = beat * 8 * loopBars;

  const schedule = (tBase: number) => {
    for (let i = 0; i < 8 * loopBars; i++) {
      const t = tBase + i * beat;
      const bn = bassNotes[i % bassNotes.length];
      const osc = a.createOscillator();
      const g = a.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = bn;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.45, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.9);
      osc.connect(g);
      g.connect(filter);
      osc.start(t);
      osc.stop(t + beat);

      const ln = leadNotes[i % leadNotes.length];
      if (ln > 0 && i % 2 === 0) {
        const lo = a.createOscillator();
        const lg = a.createGain();
        lo.type = 'square';
        lo.frequency.value = ln;
        lg.gain.setValueAtTime(0.0001, t);
        lg.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
        lg.gain.exponentialRampToValueAtTime(0.001, t + beat * 1.4);
        lo.connect(lg);
        lg.connect(filter);
        lo.start(t);
        lo.stop(t + beat * 1.5);
      }

      if (hatPattern[i % hatPattern.length]) {
        const n = (a.sampleRate * 0.04) | 0;
        const buf = a.createBuffer(1, n, a.sampleRate);
        const d = buf.getChannelData(0);
        for (let j = 0; j < n; j++) d[j] = Math.random() * 2 - 1;
        const src = a.createBufferSource();
        src.buffer = buf;
        const hf = a.createBiquadFilter();
        hf.type = 'highpass';
        hf.frequency.value = 4000;
        const hg = a.createGain();
        hg.gain.setValueAtTime(0.12, t);
        hg.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        src.connect(hf);
        hf.connect(hg);
        hg.connect(master);
        src.start(t);
      }
    }
  };

  let nextT = a.currentTime + 0.05;
  schedule(nextT);
  nextT += loopDur;
  const timer = window.setInterval(() => {
    if (!musicNodes) { clearInterval(timer); return; }
    const now = a.currentTime;
    if (now + loopDur * 0.5 > nextT) {
      schedule(nextT);
      nextT += loopDur;
    }
  }, 500);

  musicNodes = {
    stop: () => {
      clearInterval(timer);
      try { master.disconnect(); } catch { /* */ }
      musicNodes = null;
    },
  };
}

export function stopMusic(): void {
  musicNodes?.stop();
  musicNodes = null;
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
  gain.gain.value = 0.022;
  osc1.connect(filter);
  osc2.connect(filter);
  osc3.connect(gain);
  filter.connect(gain);
  gain.connect(a.destination);
  osc1.start(); osc2.start(); osc3.start();
  const lfo = a.createOscillator();
  const lfoGain = a.createGain();
  lfo.frequency.value = 0.08;
  lfoGain.gain.value = 0.008;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  lfo.start();
  ambientNodes = {
    stop: () => {
      try { osc1.stop(); osc2.stop(); osc3.stop(); lfo.stop(); } catch { /* */ }
      ambientNodes = null;
    },
  };
  startMusic();
}

export function stopAmbient(): void {
  ambientNodes?.stop();
  ambientNodes = null;
  stopMusic();
  stopChainsawIdle();
}
