import type { LevelMap } from './map';
import { Tile, getLight } from './map';
import type { Player } from './player';
import type { Enemy, Projectile } from './enemies';
import type { TextureBank } from './textures';
import { sampleWall } from './textures';
import { WEAPONS } from './weapons';

const FOV = Math.PI / 3;
/** World view height leaves room for DOOM-style status bar */
export const STATUS_H = 32;

interface SpriteDraw {
  dist: number;
  screenX: number;
  size: number;
  kind:
    | 'enemy'
    | 'health'
    | 'armor'
    | 'megaarmor'
    | 'bullets'
    | 'shells'
    | 'key'
    | 'weapon_shotgun'
    | 'weapon_chaingun'
    | 'exit'
    | 'projectile';
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
  projectiles: Projectile[],
  textures: TextureBank,
  zBuffer: Float32Array,
): void {
  const viewH = h - STATUS_H;
  const img = ctx.createImageData(w, h);
  const data = img.data;

  const ceilR = (map.ceilColor >> 16) & 0xff;
  const ceilG = (map.ceilColor >> 8) & 0xff;
  const ceilB = map.ceilColor & 0xff;
  const floorR = (map.floorColor >> 16) & 0xff;
  const floorG = (map.floorColor >> 8) & 0xff;
  const floorB = map.floorColor & 0xff;
  const mid = (viewH / 2) | 0;

  // Dark ceiling / floor with stronger vertical falloff
  for (let y = 0; y < viewH; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (y < mid) {
        const f = 0.35 + (y / mid) * 0.4;
        data[i] = (ceilR * f) | 0;
        data[i + 1] = (ceilG * f) | 0;
        data[i + 2] = (ceilB * f) | 0;
      } else {
        const f = 0.85 - ((y - mid) / mid) * 0.55;
        data[i] = (floorR * f) | 0;
        data[i + 1] = (floorG * f) | 0;
        data[i + 2] = (floorB * f) | 0;
      }
      data[i + 3] = 255;
    }
  }
  // Status bar backdrop fill (drawn over later by UI, but clear alpha)
  for (let y = viewH; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      data[i] = 20; data[i + 1] = 16; data[i + 2] = 14; data[i + 3] = 255;
    }
  }

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
    for (let i = 0; i < 80; i++) {
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
      if (tile !== Tile.Empty && tile !== Tile.Exit && tile !== Tile.DoorOpen) {
        texId = tile;
        break;
      }
    }

    let perpWallDist: number;
    if (side === 0) perpWallDist = (mapX - player.x + (1 - stepX) / 2) / rayDirX;
    else perpWallDist = (mapY - player.y + (1 - stepY) / 2) / rayDirY;
    perpWallDist = Math.max(0.01, perpWallDist);
    perpWallDist *= Math.cos(rayAngle - player.angle);

    zBuffer[x] = perpWallDist;

    const lineHeight = (viewH / perpWallDist) | 0;
    let drawStart = ((-lineHeight / 2 + viewH / 2) | 0);
    let drawEnd = ((lineHeight / 2 + viewH / 2) | 0);
    if (drawStart < 0) drawStart = 0;
    if (drawEnd >= viewH) drawEnd = viewH - 1;

    let wallX: number;
    if (side === 0) wallX = player.y + ((mapX - player.x + (1 - stepX) / 2) / rayDirX) * rayDirY;
    else wallX = player.x + ((mapY - player.y + (1 - stepY) / 2) / rayDirY) * rayDirX;
    wallX -= Math.floor(wallX);

    const sectorLight = getLight(map, mapX + 0.5, mapY + 0.5);
    const distShade = Math.min(1, 3.2 / (perpWallDist + 0.35));
    const shade = (side === 1 ? 0.65 : 1) * distShade * sectorLight;

    for (let y = drawStart; y <= drawEnd; y++) {
      const v = (y - (-lineHeight / 2 + viewH / 2)) / lineHeight;
      const [r, g, b] = sampleWall(textures, texId, wallX, v, shade);
      const i = (y * w + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  const sprites: SpriteDraw[] = [];

  for (const e of enemies) {
    if (!e.alive) continue;
    pushSprite(sprites, player, e.x, e.y, w, viewH, FOV, (dist, screenX, size) => ({
      dist, screenX, size: size * (e.type === 'tank' ? 1.15 : 0.95),
      kind: 'enemy', enemy: e, flash: e.hurtFlash > 0,
    }));
  }

  for (const p of map.pickups) {
    if (p.taken) continue;
    const scale =
      p.kind === 'key' || p.kind.startsWith('weapon') ? 0.4 :
      p.kind === 'megaarmor' ? 0.42 : 0.32;
    pushSprite(sprites, player, p.x, p.y, w, viewH, FOV, (dist, screenX, size) => ({
      dist, screenX, size: size * scale, kind: p.kind,
    }), 22);
  }

  for (let ey = 0; ey < map.height; ey++) {
    for (let ex = 0; ex < map.width; ex++) {
      if (map.tiles[ey * map.width + ex] !== Tile.Exit) continue;
      pushSprite(sprites, player, ex + 0.5, ey + 0.5, w, viewH, FOV, (dist, screenX, size) => ({
        dist, screenX, size: size * 0.75, kind: 'exit',
      }));
    }
  }

  for (const pr of projectiles) {
    pushSprite(sprites, player, pr.x, pr.y, w, viewH, FOV, (dist, screenX, size) => ({
      dist, screenX, size: Math.min(viewH * 0.25, size * 0.22), kind: 'projectile',
    }), 18);
  }

  sprites.sort((a, b) => b.dist - a.dist);
  for (const s of sprites) drawSprite(data, w, viewH, zBuffer, s);

  drawWeapon(data, w, viewH, player);

  // Hurt red flash
  if (player.hurtFlash > 0) {
    const strength = Math.min(1, player.hurtFlash * 3.5);
    for (let y = 0; y < viewH; y++) {
      for (let x = 0; x < w; x++) {
        const edge = Math.min(x, y, w - 1 - x, viewH - 1 - y);
        const vig = Math.max(0, 1 - edge / 36) * strength;
        if (vig <= 0) continue;
        const i = (y * w + x) * 4;
        data[i] = Math.min(255, data[i] + ((140 * vig) | 0));
        data[i + 1] = (data[i + 1] * (1 - vig * 0.55)) | 0;
        data[i + 2] = (data[i + 2] * (1 - vig * 0.55)) | 0;
      }
    }
  }

  // Pickup green flash
  if (player.pickupFlash > 0) {
    const strength = Math.min(1, player.pickupFlash * 4);
    for (let y = 0; y < viewH; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        data[i + 1] = Math.min(255, data[i + 1] + ((40 * strength) | 0));
      }
    }
  }

  ctx.putImageData(img, 0, 0);
}

function pushSprite(
  sprites: SpriteDraw[],
  player: Player,
  wx: number,
  wy: number,
  w: number,
  viewH: number,
  fov: number,
  make: (dist: number, screenX: number, size: number) => SpriteDraw,
  maxDist = 20,
): void {
  const dx = wx - player.x;
  const dy = wy - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.08 || dist > maxDist) return;
  let a = Math.atan2(dy, dx) - player.angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  if (Math.abs(a) > fov) return;
  const screenX = (w / 2) * (1 + Math.tan(a) / Math.tan(fov / 2));
  const size = Math.min(viewH * 2.2, (viewH / dist));
  sprites.push(make(dist, screenX, size));
}

function drawSprite(
  data: Uint8ClampedArray,
  w: number,
  viewH: number,
  zBuffer: Float32Array,
  s: SpriteDraw,
): void {
  const size = s.size | 0;
  const startX = (s.screenX - size / 2) | 0;
  const startY = ((viewH - size) / 2) | 0;

  for (let sx = 0; sx < size; sx++) {
    const screenX = startX + sx;
    if (screenX < 0 || screenX >= w) continue;
    if (s.dist >= zBuffer[screenX]) continue;
    const u = sx / size;

    for (let sy = 0; sy < size; sy++) {
      const screenY = startY + sy;
      if (screenY < 0 || screenY >= viewH) continue;
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
  const cx = u - 0.5;
  const cy = v - 0.5;

  if (s.kind === 'enemy' && s.enemy) {
    const e = s.enemy;
    const body = (cx * cx) / (e.type === 'tank' ? 0.16 : 0.12) + ((cy + 0.05) * (cy + 0.05)) / (e.type === 'tank' ? 0.32 : 0.28);
    const head = (cx * cx) / (e.type === 'tank' ? 0.08 : 0.06) + ((cy + 0.28) * (cy + 0.28)) / (e.type === 'tank' ? 0.08 : 0.06);
    const flash = s.flash;
    const palette =
      e.type === 'tank' ? [[220, 80, 200], [140, 40, 130], [90, 25, 85]] as const :
      e.type === 'shooter' ? [[200, 80, 60], [140, 40, 50], [90, 30, 35]] as const :
      [[60, 160, 80], [40, 100, 55], [30, 70, 40]] as const;

    if (head < 1) {
      if (flash) return [255, 200, 200];
      return palette[0] as unknown as [number, number, number];
    }
    if (body < 1) {
      if (flash) return [255, 180, 180];
      if (v > 0.22 && v < 0.32 && ((u > 0.35 && u < 0.42) || (u > 0.58 && u < 0.65))) {
        return e.type === 'tank' ? [255, 220, 40] : [255, 40, 40];
      }
      return palette[1] as unknown as [number, number, number];
    }
    if (v > 0.7 && v < 0.95) {
      const leg = Math.abs(cx) < 0.12 + Math.sin(e.bob) * 0.04;
      const gap = Math.abs(cx) > 0.03;
      if (leg && gap) return palette[2] as unknown as [number, number, number];
    }
    return null;
  }

  if (s.kind === 'health') {
    if (Math.abs(cx) < 0.28 && Math.abs(cy) < 0.28) {
      const cross = (Math.abs(cx) < 0.08 && Math.abs(cy) < 0.22) ||
                    (Math.abs(cy) < 0.08 && Math.abs(cx) < 0.22);
      if (cross) return [255, 40, 40];
      return [200, 200, 200];
    }
    return null;
  }

  if (s.kind === 'armor' || s.kind === 'megaarmor') {
    if (Math.abs(cx) < 0.28 && Math.abs(cy) < 0.32) {
      const glow = s.kind === 'megaarmor';
      if (Math.abs(cx) < 0.18 && cy > -0.2 && cy < 0.25) {
        return glow ? [80, 200, 255] : [60, 120, 200];
      }
      return glow ? [40, 100, 160] : [30, 50, 90];
    }
    return null;
  }

  if (s.kind === 'bullets') {
    if (Math.abs(cx) < 0.18 && Math.abs(cy) < 0.28) {
      if (Math.abs(cx) < 0.1 && cy > -0.18) return [220, 180, 40];
      return [70, 70, 50];
    }
    return null;
  }

  if (s.kind === 'shells') {
    if (Math.abs(cx) < 0.22 && Math.abs(cy) < 0.2) {
      return [180, 100, 40];
    }
    return null;
  }

  if (s.kind === 'key') {
    // Gold keycard
    if (Math.abs(cy) < 0.12 && Math.abs(cx) < 0.3) return [255, 210, 60];
    if (cx > 0.15 && Math.abs(cy) < 0.22 && cx < 0.32) return [220, 170, 40];
    return null;
  }

  if (s.kind === 'weapon_shotgun' || s.kind === 'weapon_chaingun') {
    if (Math.abs(cy) < 0.1 && cx > -0.3 && cx < 0.35) {
      return s.kind === 'weapon_shotgun' ? [120, 90, 50] : [90, 90, 100];
    }
    if (Math.abs(cx + 0.15) < 0.08 && cy > 0 && cy < 0.25) return [60, 50, 40];
    return null;
  }

  if (s.kind === 'exit') {
    const ring = Math.abs(Math.hypot(cx, cy * 1.2) - 0.28);
    if (ring < 0.06) return [80, 255, 120];
    if (Math.hypot(cx, cy * 1.2) < 0.28) {
      const pulse = ((Math.sin(Date.now() / 200) + 1) / 2);
      return [10, (60 + pulse * 120) | 0, (40 + pulse * 60) | 0];
    }
    return null;
  }

  if (s.kind === 'projectile') {
    const r = Math.hypot(cx, cy);
    if (r < 0.35) {
      if (r < 0.15) return [255, 255, 200];
      if (r < 0.25) return [255, 120, 40];
      return [200, 40, 200];
    }
    return null;
  }

  return null;
}

function drawWeapon(data: Uint8ClampedArray, w: number, viewH: number, player: Player): void {
  const bob = Math.sin(Date.now() / 180) * (player.muzzleFlash > 0 ? 0 : 1.5);
  const kick = player.muzzleFlash > 0 ? 4 : 0;
  const baseX = (w / 2 - 20 + bob) | 0;
  const baseY = (viewH - 48 + kick) | 0;
  const weap = player.currentWeapon;

  const put = (x: number, y: number, r: number, g: number, b: number) => {
    if (x < 0 || y < 0 || x >= w || y >= viewH) return;
    const i = (y * w + x) * 4;
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
  };

  if (weap === 'shotgun') {
    for (let y = 22; y < 44; y++) for (let x = 14; x < 26; x++) put(baseX + x, baseY + y, 55, 40, 28);
    for (let y = 6; y < 22; y++) for (let x = 6; x < 36; x++) put(baseX + x, baseY + y, 100, 85, 55);
    for (let y = 8; y < 16; y++) for (let x = 34; x < 52; x++) put(baseX + x, baseY + y, 45, 45, 50);
  } else if (weap === 'chaingun') {
    for (let y = 18; y < 42; y++) for (let x = 10; x < 28; x++) put(baseX + x, baseY + y, 50, 50, 55);
    for (let y = 4; y < 20; y++) for (let x = 4; x < 32; x++) put(baseX + x, baseY + y, 80, 85, 95);
    for (let y = 6; y < 14; y++) for (let x = 30; x < 48; x++) put(baseX + x, baseY + y, 40, 40, 45);
    for (let y = 10; y < 18; y++) for (let x = 8; x < 16; x++) put(baseX + x, baseY + y, 160, 50, 30);
  } else {
    for (let y = 20; y < 40; y++) for (let x = 10; x < 22; x++) put(baseX + x, baseY + y, 60, 50, 40);
    for (let y = 8; y < 24; y++) for (let x = 4; x < 28; x++) put(baseX + x, baseY + y, 90, 90, 100);
    for (let y = 10; y < 16; y++) for (let x = 26; x < 40; x++) put(baseX + x, baseY + y, 50, 50, 55);
    for (let y = 12; y < 20; y++) for (let x = 8; x < 14; x++) put(baseX + x, baseY + y, 40, 140, 80);
  }

  if (player.muzzleFlash > 0) {
    const fx = baseX + (weap === 'shotgun' ? 52 : weap === 'chaingun' ? 48 : 40);
    const fy = baseY + (weap === 'shotgun' ? 10 : 12);
    const rad = weap === 'shotgun' ? 10 : 6;
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad / 2; dx <= rad + 2; dx++) {
        if (dx * dx + dy * dy < rad * rad) put(fx + dx, fy + dy, 255, 220, 80);
      }
    }
  }

  void WEAPONS;
}
