import type { LevelMap } from './map';
import { Tile } from './map';
import type { Player } from './player';
import type { Enemy } from './enemies';
import type { TextureBank } from './textures';
import { sampleWall } from './textures';

const FOV = Math.PI / 3;

interface SpriteDraw {
  dist: number;
  screenX: number;
  size: number;
  kind: 'enemy' | 'health' | 'ammo' | 'exit';
  enemy?: Enemy;
  flash?: boolean;
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  map: LevelMap,
  player: Player,
  enemies: Enemy[],
  textures: TextureBank,
  zBuffer: Float32Array,
): void {
  const img = ctx.createImageData(w, h);
  const data = img.data;

  // Ceiling / floor
  const ceilR = (map.ceilColor >> 16) & 0xff;
  const ceilG = (map.ceilColor >> 8) & 0xff;
  const ceilB = map.ceilColor & 0xff;
  const floorR = (map.floorColor >> 16) & 0xff;
  const floorG = (map.floorColor >> 8) & 0xff;
  const floorB = map.floorColor & 0xff;
  const mid = (h / 2) | 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (y < mid) {
        const f = 0.55 + (y / mid) * 0.45;
        data[i] = (ceilR * f) | 0;
        data[i + 1] = (ceilG * f) | 0;
        data[i + 2] = (ceilB * f) | 0;
      } else {
        const f = 1 - ((y - mid) / mid) * 0.55;
        data[i] = (floorR * f) | 0;
        data[i + 1] = (floorG * f) | 0;
        data[i + 2] = (floorB * f) | 0;
      }
      data[i + 3] = 255;
    }
  }

  // Raycast walls
  for (let x = 0; x < w; x++) {
    const cameraX = 2 * x / w - 1;
    const rayAngle = player.angle + Math.atan(cameraX * Math.tan(FOV / 2));
    const rayDirX = Math.cos(rayAngle);
    const rayDirY = Math.sin(rayAngle);

    let mapX = player.x | 0;
    let mapY = player.y | 0;

    const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
    const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

    let stepX: number;
    let stepY: number;
    let sideDistX: number;
    let sideDistY: number;

    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (player.x - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1 - player.x) * deltaDistX;
    }
    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (player.y - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1 - player.y) * deltaDistY;
    }

    let side = 0;
    let texId = 1;
    for (let i = 0; i < 64; i++) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      if (mapX < 0 || mapY < 0 || mapX >= map.width || mapY >= map.height) {
        texId = 1;
        break;
      }
      const tile = map.tiles[mapY * map.width + mapX];
      if (tile !== Tile.Empty && tile !== Tile.Exit) {
        texId = tile;
        break;
      }
    }

    let perpWallDist: number;
    if (side === 0) perpWallDist = (mapX - player.x + (1 - stepX) / 2) / rayDirX;
    else perpWallDist = (mapY - player.y + (1 - stepY) / 2) / rayDirY;
    perpWallDist = Math.max(0.01, perpWallDist);
    // Fisheye correction
    perpWallDist *= Math.cos(rayAngle - player.angle);

    zBuffer[x] = perpWallDist;

    const lineHeight = (h / perpWallDist) | 0;
    let drawStart = ((-lineHeight / 2 + h / 2) | 0);
    let drawEnd = ((lineHeight / 2 + h / 2) | 0);
    if (drawStart < 0) drawStart = 0;
    if (drawEnd >= h) drawEnd = h - 1;

    let wallX: number;
    if (side === 0) wallX = player.y + ((mapX - player.x + (1 - stepX) / 2) / rayDirX) * rayDirY;
    else wallX = player.x + ((mapY - player.y + (1 - stepY) / 2) / rayDirY) * rayDirX;
    wallX -= Math.floor(wallX);

    const shade = (side === 1 ? 0.7 : 1) * Math.min(1, 4 / (perpWallDist + 0.5));

    for (let y = drawStart; y <= drawEnd; y++) {
      const v = (y - (-lineHeight / 2 + h / 2)) / lineHeight;
      const [r, g, b] = sampleWall(textures, texId, wallX, v, shade);
      const i = (y * w + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  // Collect sprites
  const sprites: SpriteDraw[] = [];

  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.1) continue;
    const angle = Math.atan2(dy, dx) - player.angle;
    let a = angle;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    if (Math.abs(a) > FOV) continue;
    const screenX = (w / 2) * (1 + Math.tan(a) / Math.tan(FOV / 2));
    const size = Math.min(h * 2, (h / dist) * 0.9);
    sprites.push({ dist, screenX, size, kind: 'enemy', enemy: e, flash: e.hurtFlash > 0 });
  }

  for (const p of map.pickups) {
    if (p.taken) continue;
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.1 || dist > 20) continue;
    const angle = Math.atan2(dy, dx) - player.angle;
    let a = angle;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    if (Math.abs(a) > FOV) continue;
    const screenX = (w / 2) * (1 + Math.tan(a) / Math.tan(FOV / 2));
    const size = Math.min(h, (h / dist) * 0.35);
    sprites.push({ dist, screenX, size, kind: p.kind });
  }

  // Exit marker
  for (let ey = 0; ey < map.height; ey++) {
    for (let ex = 0; ex < map.width; ex++) {
      if (map.tiles[ey * map.width + ex] !== Tile.Exit) continue;
      const cx = ex + 0.5;
      const cy = ey + 0.5;
      const dx = cx - player.x;
      const dy = cy - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.1) continue;
      const angle = Math.atan2(dy, dx) - player.angle;
      let a = angle;
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      if (Math.abs(a) > FOV) continue;
      const screenX = (w / 2) * (1 + Math.tan(a) / Math.tan(FOV / 2));
      const size = Math.min(h * 1.5, (h / dist) * 0.7);
      sprites.push({ dist, screenX, size, kind: 'exit' });
    }
  }

  sprites.sort((a, b) => b.dist - a.dist);

  for (const s of sprites) {
    drawSprite(data, w, h, zBuffer, s);
  }

  // Weapon / muzzle
  drawWeapon(data, w, h, player);

  // Hurt vignette
  if (player.hurtFlash > 0) {
    const strength = Math.min(1, player.hurtFlash * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
        const vig = Math.max(0, 1 - edge / 40) * strength;
        if (vig <= 0) continue;
        const i = (y * w + x) * 4;
        data[i] = Math.min(255, data[i] + (120 * vig) | 0);
        data[i + 1] = (data[i + 1] * (1 - vig * 0.5)) | 0;
        data[i + 2] = (data[i + 2] * (1 - vig * 0.5)) | 0;
      }
    }
  }

  ctx.putImageData(img, 0, 0);
}

function drawSprite(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  zBuffer: Float32Array,
  s: SpriteDraw,
): void {
  const size = s.size | 0;
  const startX = (s.screenX - size / 2) | 0;
  const startY = ((h - size) / 2) | 0;

  for (let sx = 0; sx < size; sx++) {
    const screenX = startX + sx;
    if (screenX < 0 || screenX >= w) continue;
    if (s.dist >= zBuffer[screenX]) continue;
    const u = sx / size;

    for (let sy = 0; sy < size; sy++) {
      const screenY = startY + sy;
      if (screenY < 0 || screenY >= h) continue;
      const v = sy / size;
      const color = sampleSprite(s, u, v);
      if (!color) continue;
      const i = (screenY * w + screenX) * 4;
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
    }
  }
}

function sampleSprite(
  s: SpriteDraw,
  u: number,
  v: number,
): [number, number, number] | null {
  // Simple procedural billboard sprites in UV space
  const cx = u - 0.5;
  const cy = v - 0.5;

  if (s.kind === 'enemy' && s.enemy) {
    const e = s.enemy;
    // Body oval
    const body = (cx * cx) / 0.12 + ((cy + 0.05) * (cy + 0.05)) / 0.28;
    const head = (cx * cx) / 0.06 + ((cy + 0.28) * (cy + 0.28)) / 0.06;
    const flash = s.flash;
    if (head < 1) {
      if (flash) return [255, 200, 200];
      return e.type === 'shooter' ? [200, 80, 60] : [60, 160, 80];
    }
    if (body < 1) {
      if (flash) return [255, 180, 180];
      // Eyes
      if (v > 0.22 && v < 0.32 && ((u > 0.35 && u < 0.42) || (u > 0.58 && u < 0.65))) {
        return [255, 40, 40];
      }
      return e.type === 'shooter' ? [140, 40, 50] : [40, 100, 55];
    }
    // Legs
    if (v > 0.7 && v < 0.95) {
      const leg = Math.abs(cx) < 0.12 + Math.sin(e.bob) * 0.04;
      const gap = Math.abs(cx) > 0.03;
      if (leg && gap) {
        return e.type === 'shooter' ? [90, 30, 35] : [30, 70, 40];
      }
    }
    return null;
  }

  if (s.kind === 'health') {
    // Cross pack
    if (Math.abs(cx) < 0.28 && Math.abs(cy) < 0.28) {
      const cross = (Math.abs(cx) < 0.08 && Math.abs(cy) < 0.22) ||
                    (Math.abs(cy) < 0.08 && Math.abs(cx) < 0.22);
      if (cross) return [255, 40, 40];
      return [220, 220, 220];
    }
    return null;
  }

  if (s.kind === 'ammo') {
    if (Math.abs(cx) < 0.2 && Math.abs(cy) < 0.3) {
      if (Math.abs(cx) < 0.12 && cy > -0.2 && cy < 0.25) return [220, 180, 40];
      return [80, 80, 60];
    }
    return null;
  }

  if (s.kind === 'exit') {
    // Glowing door portal
    const ring = Math.abs(Math.hypot(cx, cy * 1.2) - 0.28);
    if (ring < 0.06) return [80, 255, 180];
    if (Math.hypot(cx, cy * 1.2) < 0.28) {
      const pulse = ((Math.sin(Date.now() / 200) + 1) / 2);
      return [20, (80 + pulse * 100) | 0, (60 + pulse * 80) | 0];
    }
    return null;
  }

  return null;
}

function drawWeapon(data: Uint8ClampedArray, w: number, h: number, player: Player): void {
  // Pixel gun at bottom center
  const bob = Math.sin(Date.now() / 200) * (player.muzzleFlash > 0 ? 0 : 1);
  const baseX = (w / 2 - 18 + bob) | 0;
  const baseY = (h - 42) | 0;

  const put = (x: number, y: number, r: number, g: number, b: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
  };

  // Grip
  for (let y = 20; y < 40; y++) {
    for (let x = 10; x < 22; x++) put(baseX + x, baseY + y, 60, 50, 40);
  }
  // Body
  for (let y = 8; y < 24; y++) {
    for (let x = 4; x < 28; x++) put(baseX + x, baseY + y, 90, 90, 100);
  }
  // Barrel
  for (let y = 10; y < 16; y++) {
    for (let x = 26; x < 40; x++) put(baseX + x, baseY + y, 50, 50, 55);
  }
  // Detail
  for (let y = 12; y < 20; y++) {
    for (let x = 8; x < 14; x++) put(baseX + x, baseY + y, 40, 140, 80);
  }

  if (player.muzzleFlash > 0) {
    const fx = baseX + 40;
    const fy = baseY + 12;
    for (let dy = -6; dy <= 6; dy++) {
      for (let dx = -4; dx <= 10; dx++) {
        if (dx * dx + dy * dy < 40) {
          put(fx + dx, fy + dy, 255, 220, 80);
        }
      }
    }
  }
}
