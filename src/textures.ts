/** Procedural wall + floor/ceiling flats — original art (64², genre DNA only) */

const SIZE = 64;

function makeBuffer(): Uint8ClampedArray {
  return new Uint8ClampedArray(SIZE * SIZE * 4);
}

function setPx(buf: Uint8ClampedArray, x: number, y: number, r: number, g: number, b: number, a = 255): void {
  const i = ((y & (SIZE - 1)) * SIZE + (x & (SIZE - 1))) * 4;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
}

function noise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.121) * 43758.5453;
  return n - Math.floor(n);
}

function fbm(x: number, y: number, seed: number): number {
  return (
    noise(x, y, seed) * 0.5 +
    noise(x * 2.1, y * 2.1, seed + 1) * 0.25 +
    noise(x * 4.3, y * 4.3, seed + 2) * 0.125
  );
}

export function makeBrickTexture(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const row = Math.floor(y / 10);
      const offset = (row % 2) * 16;
      const bx = (x + offset) % 32;
      const by = y % 10;
      const mortar = bx < 2 || by < 2;
      const n = fbm(x * 0.4, y * 0.4, 1) * 28;
      const crack = noise(x * 0.2, y * 0.7, 17) > 0.92 && !mortar;
      if (mortar) setPx(buf, x, y, 62 + n * 0.4, 54 + n * 0.3, 46 + n * 0.2);
      else if (crack) setPx(buf, x, y, 70 + n, 28, 22);
      else {
        const dirt = noise(x, y, 3) * 12;
        setPx(buf, x, y, 128 + n - dirt, 48 + n * 0.35, 36 + n * 0.2);
      }
    }
  }
  return buf;
}

export function makeStoneTexture(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = fbm(x * 0.3, y * 0.3, 2) * 40;
      const edge = x % 16 < 1 || y % 16 < 1 || x % 16 === 15 || y % 16 === 15;
      const chip = noise(x * 0.5, y * 0.5, 8) > 0.88;
      if (edge) setPx(buf, x, y, 22, 22, 28);
      else if (chip) setPx(buf, x, y, 48 + n * 0.5, 46 + n * 0.5, 54 + n * 0.5);
      else setPx(buf, x, y, 78 + n, 76 + n, 86 + n);
    }
  }
  return buf;
}

export function makeMetalTexture(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const panel = (Math.floor(x / 16) + Math.floor(y / 16)) % 2;
      const n = fbm(x * 0.5, y * 0.2, 3) * 14;
      const rivet = (x % 16 === 3 || x % 16 === 12) && (y % 16 === 3 || y % 16 === 12);
      const seam = x % 16 < 1 || y % 16 < 1;
      const scratch = noise(x * 0.15, y, 11) > 0.94;
      if (rivet) setPx(buf, x, y, 190, 180, 140);
      else if (seam) setPx(buf, x, y, 18, 20, 24);
      else if (scratch) setPx(buf, x, y, 90 + n, 95 + n, 100 + n);
      else if (panel) setPx(buf, x, y, 54 + n, 58 + n, 68 + n);
      else setPx(buf, x, y, 40 + n, 44 + n, 52 + n);
    }
  }
  return buf;
}

export function makeTechTexture(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = fbm(x * 0.4, y * 0.4, 4) * 10;
      const circuit = (x + y) % 10 === 0 || (x - y + 64) % 12 === 0;
      const node = x % 10 === 5 && y % 10 === 5;
      const vent = y > 28 && y < 36 && x % 4 !== 0;
      if (node) setPx(buf, x, y, 220, 70, 35);
      else if (circuit) setPx(buf, x, y, 100, 45, 28);
      else if (vent) setPx(buf, x, y, 12 + n, 14 + n, 18 + n);
      else setPx(buf, x, y, 20 + n, 18 + n, 26 + n);
    }
  }
  return buf;
}

export function makeBloodTexture(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = fbm(x * 0.35, y * 0.35, 5) * 30;
      const stain = fbm(x * 0.15, y * 0.2, 9) > 0.52;
      const drip = noise(x * 0.8, Math.floor(y / 4), 21) > 0.7 && y > 20;
      if (drip) setPx(buf, x, y, 110 + n, 12, 10);
      else if (stain) setPx(buf, x, y, 95 + n, 22, 18);
      else setPx(buf, x, y, 58 + n * 0.4, 48 + n * 0.25, 42);
    }
  }
  return buf;
}

export function makeComputerTexture(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const frame = x < 3 || x > 60 || y < 3 || y > 60;
      const screen = x >= 8 && x <= 55 && y >= 10 && y <= 42;
      const n = noise(x, y, 14) * 8;
      if (frame) setPx(buf, x, y, 70 + n, 72 + n, 80 + n);
      else if (screen) {
        const scan = (y % 3 === 0);
        const glyph = ((x + y * 3) % 7 === 0);
        if (glyph) setPx(buf, x, y, 40, 220, 80);
        else if (scan) setPx(buf, x, y, 8, 40, 18);
        else setPx(buf, x, y, 6, 28, 14);
      } else {
        const led = x > 48 && y > 48 && ((x + y) % 5 === 0);
        if (led) setPx(buf, x, y, 255, 60, 40);
        else setPx(buf, x, y, 36 + n, 38 + n, 48 + n);
      }
    }
  }
  return buf;
}

export function makeDoorTexture(tint: 'normal' | 'red' | 'yellow' | 'blue' = 'normal'): Uint8ClampedArray {
  const buf = makeBuffer();
  const tintRGB =
    tint === 'red' ? [200, 45, 45] :
    tint === 'yellow' ? [210, 180, 40] :
    tint === 'blue' ? [45, 90, 220] :
    [190, 150, 45];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const frame = x < 3 || x > 60 || y < 3 || y > 60;
      const bar = Math.abs(x - 32) < 3;
      const panel = (Math.floor(x / 16) + Math.floor(y / 16)) % 2;
      const n = fbm(x * 0.4, y * 0.4, 6) * 12;
      const stripe = y > 28 && y < 36 && !frame;
      if (frame) setPx(buf, x, y, 95 + n, 75, 35);
      else if (bar || stripe) setPx(buf, x, y, tintRGB[0], tintRGB[1], tintRGB[2]);
      else if (panel) setPx(buf, x, y, 48 + n, 62 + n, 78 + n);
      else setPx(buf, x, y, 36 + n, 48 + n, 62 + n);
    }
  }
  return buf;
}

export function makeExitSignTexture(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const frame = x < 2 || x > 61 || y < 18 || y > 46;
      const n = noise(x, y, 19) * 6;
      if (frame) setPx(buf, x, y, 30 + n, 30 + n, 32 + n);
      else {
        // EXIT lettering (blocky)
        const inLetter = (() => {
          const lx = x - 8;
          const ly = y - 22;
          if (ly < 0 || ly > 20) return false;
          // E
          if (lx >= 0 && lx <= 8 && (lx < 2 || ly < 3 || ly > 17 || (ly > 8 && ly < 12))) return true;
          // X
          if (lx >= 12 && lx <= 20) {
            const t = (ly / 20) * 8;
            if (Math.abs(lx - 12 - t) < 2 || Math.abs(lx - 20 + t) < 2) return true;
          }
          // I
          if (lx >= 24 && lx <= 30 && (lx > 25 && lx < 29 || ly < 3 || ly > 17)) return true;
          // T
          if (lx >= 34 && lx <= 44 && (ly < 3 || (lx > 37 && lx < 41))) return true;
          return false;
        })();
        if (inLetter) setPx(buf, x, y, 40, 255, 90);
        else setPx(buf, x, y, 10 + n, 40 + n, 18 + n);
      }
    }
  }
  return buf;
}

export function makeFloorFlat(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = fbm(x * 0.4, y * 0.4, 11) * 22;
      const tile = (Math.floor(x / 16) + Math.floor(y / 16)) % 2;
      const grit = noise(x, y, 33) * 8;
      if (tile) setPx(buf, x, y, 48 + n - grit, 38 + n - grit, 30 + n * 0.5);
      else setPx(buf, x, y, 36 + n - grit, 28 + n - grit, 24 + n * 0.4);
    }
  }
  return buf;
}

export function makeCeilFlat(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = fbm(x * 0.35, y * 0.35, 13) * 14;
      const grate = x % 16 < 1 || y % 16 < 1;
      const pipe = (y > 28 && y < 36) && x % 2 === 0;
      if (grate) setPx(buf, x, y, 32 + n, 30 + n, 42 + n);
      else if (pipe) setPx(buf, x, y, 50 + n, 40 + n, 35 + n);
      else setPx(buf, x, y, 16 + n, 14 + n, 22 + n);
    }
  }
  return buf;
}

export function makeNukageFlat(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = fbm(x * 0.25, y * 0.25, 44) * 40;
      const bubble = noise(x * 0.4, y * 0.4, 45) > 0.85;
      if (bubble) setPx(buf, x, y, 180, 255, 80);
      else setPx(buf, x, y, 40 + n * 0.4, 120 + n, 30 + n * 0.3);
    }
  }
  return buf;
}

export function makeSwitchTexture(on: boolean): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const frame = x < 4 || x > 59 || y < 4 || y > 59;
      const btn = Math.hypot(x - 32, y - 32) < 12;
      const n = noise(x, y, 7) * 8;
      if (frame) setPx(buf, x, y, 75 + n, 75 + n, 88 + n);
      else if (btn) setPx(buf, x, y, on ? 40 : 220, on ? 220 : 40, 40);
      else setPx(buf, x, y, 44 + n, 46 + n, 55 + n);
    }
  }
  return buf;
}

export interface TextureBank {
  walls: Uint8ClampedArray[];
  floor: Uint8ClampedArray;
  ceil: Uint8ClampedArray;
  nukage: Uint8ClampedArray;
  size: number;
}

export function createTextures(): TextureBank {
  return {
    walls: [
      makeBrickTexture(),       // 0
      makeStoneTexture(),       // 1
      makeMetalTexture(),       // 2
      makeTechTexture(),        // 3
      makeDoorTexture('normal'),// 4
      makeBloodTexture(),       // 5
      makeDoorTexture('red'),   // 6
      makeDoorTexture('yellow'),// 7
      makeDoorTexture('blue'),  // 8
      makeSwitchTexture(false), // 9
      makeSwitchTexture(true),  // 10
      makeComputerTexture(),    // 11
      makeExitSignTexture(),    // 12
    ],
    floor: makeFloorFlat(),
    ceil: makeCeilFlat(),
    nukage: makeNukageFlat(),
    size: SIZE,
  };
}

export function sampleWall(
  bank: TextureBank,
  texId: number,
  u: number,
  v: number,
  shade: number,
): [number, number, number] {
  let idx = 0;
  if (texId === 2) idx = 1;
  else if (texId === 3) idx = 2;
  else if (texId === 4) idx = 3;
  else if (texId === 6) idx = 4;
  else if (texId === 10) idx = 5;
  else if (texId === 7) idx = 6;
  else if (texId === 8) idx = 7;
  else if (texId === 9) idx = 8;
  else if (texId === 12) idx = 9;
  else if (texId === 100) idx = 10;
  else if (texId === 13) idx = 0;
  else if (texId === 14) idx = 11; // computer
  else if (texId === 15) idx = 12; // exit sign
  else idx = 0;

  const tex = bank.walls[Math.max(0, Math.min(bank.walls.length - 1, idx))];
  const tx = Math.floor(u * bank.size) & (bank.size - 1);
  const ty = Math.floor(v * bank.size) & (bank.size - 1);
  const i = (ty * bank.size + tx) * 4;
  return [
    (tex[i] * shade) | 0,
    (tex[i + 1] * shade) | 0,
    (tex[i + 2] * shade) | 0,
  ];
}

export function sampleFlat(
  tex: Uint8ClampedArray,
  size: number,
  u: number,
  v: number,
  shade: number,
): [number, number, number] {
  const tx = Math.floor(u * size) & (size - 1);
  const ty = Math.floor(v * size) & (size - 1);
  const i = (ty * size + tx) * 4;
  return [
    (tex[i] * shade) | 0,
    (tex[i + 1] * shade) | 0,
    (tex[i + 2] * shade) | 0,
  ];
}
