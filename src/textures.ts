/** Procedural 32x32 wall / sprite textures as RGBA ImageData buffers */

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
      const n = noise(x, y, 1) * 20;
      if (mortar) {
        setPx(buf, x, y, 90 + n, 80 + n, 70 + n);
      } else {
        setPx(buf, x, y, 140 + n, 60 + n * 0.5, 45 + n * 0.3);
      }
    }
  }
  return buf;
}

export function makeStoneTexture(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = noise(x, y, 2) * 40;
      const edge = x % 16 < 1 || y % 16 < 1;
      if (edge) setPx(buf, x, y, 50, 50, 55);
      else setPx(buf, x, y, 100 + n, 100 + n, 110 + n);
    }
  }
  return buf;
}

export function makeMetalTexture(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const panel = (Math.floor(x / 8) + Math.floor(y / 8)) % 2;
      const n = noise(x, y, 3) * 15;
      const rivet = (x % 8 === 2 || x % 8 === 6) && (y % 8 === 2 || y % 8 === 6);
      if (rivet) setPx(buf, x, y, 200, 200, 180);
      else if (panel) setPx(buf, x, y, 70 + n, 75 + n, 85 + n);
      else setPx(buf, x, y, 55 + n, 60 + n, 70 + n);
    }
  }
  return buf;
}

export function makeTechTexture(): Uint8ClampedArray {
  const buf = makeBuffer();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = noise(x, y, 4) * 10;
      const circuit = (x + y) % 8 === 0 || (x - y + 32) % 8 === 0;
      const node = x % 8 === 4 && y % 8 === 4;
      if (node) setPx(buf, x, y, 80, 220, 120);
      else if (circuit) setPx(buf, x, y, 40, 120, 80);
      else setPx(buf, x, y, 25 + n, 30 + n, 40 + n);
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
      makeBrickTexture(),
      makeStoneTexture(),
      makeMetalTexture(),
      makeTechTexture(),
    ],
    size: SIZE,
  };
}

/** Sample wall texture; texId 1-4 maps to walls[0-3] */
export function sampleWall(
  bank: TextureBank,
  texId: number,
  u: number,
  v: number,
  shade: number,
): [number, number, number] {
  const tex = bank.walls[Math.max(0, Math.min(bank.walls.length - 1, texId - 1))];
  const tx = Math.floor(u * bank.size) & (bank.size - 1);
  const ty = Math.floor(v * bank.size) & (bank.size - 1);
  const i = (ty * bank.size + tx) * 4;
  return [
    (tex[i] * shade) | 0,
    (tex[i + 1] * shade) | 0,
    (tex[i + 2] * shade) | 0,
  ];
}
