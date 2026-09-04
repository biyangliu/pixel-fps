/** Procedural 32x32 wall textures — darker DOOM-ish palette */

const SIZE = 32;

function makeBuffer(): Uint8ClampedArray {
  return new Uint8ClampedArray(SIZE * SIZE * 4);
}

function setPx(buf: Uint8ClampedArray, x: number, y: number, r: number, g: number, b: number, a = 255): void {
  const i = (y * SIZE + x) * 4;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
}

function noise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

export function makeBrickTexture(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const row = Math.floor(y / 8);
      const offset = (row % 2) * 8;
      const bx = (x + offset) % 16;
      const by = y % 8;
      const mortar = bx === 0 || by === 0;
      const n = noise(x, y, 1) * 18;
      if (mortar) setPx(buf, x, y, 55 + n, 48 + n, 42 + n);
      else setPx(buf, x, y, 110 + n, 42 + n * 0.4, 32 + n * 0.2);
    }
  }
  return buf;
}

export function makeStoneTexture(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = noise(x, y, 2) * 35;
      const edge = x % 16 < 1 || y % 16 < 1;
      if (edge) setPx(buf, x, y, 28, 28, 32);
      else setPx(buf, x, y, 70 + n, 68 + n, 78 + n);
    }
  }
  return buf;
}

export function makeMetalTexture(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const panel = (Math.floor(x / 8) + Math.floor(y / 8)) % 2;
      const n = noise(x, y, 3) * 12;
      const rivet = (x % 8 === 2 || x % 8 === 6) && (y % 8 === 2 || y % 8 === 6);
      if (rivet) setPx(buf, x, y, 160, 155, 130);
      else if (panel) setPx(buf, x, y, 48 + n, 52 + n, 60 + n);
      else setPx(buf, x, y, 36 + n, 40 + n, 48 + n);
    }
  }
  return buf;
}

export function makeTechTexture(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = noise(x, y, 4) * 8;
      const circuit = (x + y) % 8 === 0 || (x - y + 32) % 8 === 0;
      const node = x % 8 === 4 && y % 8 === 4;
      if (node) setPx(buf, x, y, 200, 60, 30);
      else if (circuit) setPx(buf, x, y, 90, 40, 25);
      else setPx(buf, x, y, 18 + n, 16 + n, 22 + n);
    }
  }
  return buf;
}

export function makeBloodTexture(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = noise(x, y, 5) * 25;
      const stain = noise(x * 0.5, y * 0.5, 9) > 0.55;
      if (stain) setPx(buf, x, y, 90 + n, 20, 18);
      else setPx(buf, x, y, 55 + n * 0.5, 45 + n * 0.3, 40);
    }
  }
  return buf;
}

export function makeDoorTexture(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const frame = x < 2 || x > 29 || y < 2 || y > 29;
      const bar = Math.abs(x - 16) < 2;
      const n = noise(x, y, 6) * 10;
      if (frame) setPx(buf, x, y, 90 + n, 70, 30);
      else if (bar) setPx(buf, x, y, 180, 140, 40);
      else setPx(buf, x, y, 40 + n, 55 + n, 70 + n);
    }
  }
  return buf;
}

export interface TextureBank {
  walls: Uint8ClampedArray[];
  size: number;
}

export function createTextures(): TextureBank {
  return {
    walls: [
      makeBrickTexture(),   // 1
      makeStoneTexture(),   // 2
      makeMetalTexture(),   // 3
      makeTechTexture(),    // 4
      makeDoorTexture(),    // used for doors via remap
      makeBloodTexture(),   // 8 -> index handled in sample
    ],
    size: SIZE,
  };
}

/** Sample wall texture; texId maps to procedural wall banks */
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
  else if (texId === 6) idx = 4; // locked door
  else if (texId === 8) idx = 5; // blood
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
