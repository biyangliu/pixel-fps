import type { LevelMap } from './map';
import { Tile, getLight, doorAt, getFloorH, getCeilH } from './map';
import type { Player } from './player';
import type { Enemy, Projectile } from './enemies';
import type { TextureBank } from './textures';
import { sampleWall, sampleFlat } from './textures';

const FOV = Math.PI / 3;
export const STATUS_H = 32;

type SpriteKind =
  | 'enemy'
  | 'health' | 'stim' | 'bonus' | 'armor' | 'megaarmor' | 'soulsphere'
  | 'berserk' | 'invis' | 'invuln' | 'lightamp'
  | 'bullets' | 'shells' | 'rockets' | 'cells'
  | 'key_red' | 'key_yellow' | 'key_blue'
  | 'weapon_chainsaw' | 'weapon_shotgun' | 'weapon_chaingun'
  | 'weapon_rocket' | 'weapon_plasma' | 'weapon_bfg'
  | 'exit' | 'projectile';

interface SpriteDraw {
  dist: number;
  screenX: number;
  size: number;
  kind: SpriteKind;
  enemy?: Enemy;
  flash?: boolean;
  projKind?: string;
}

function isPassableForRay(map: LevelMap, mapX: number, mapY: number): boolean {
  if (mapX < 0 || mapY < 0 || mapX >= map.width || mapY >= map.height) return false;
  const tile = map.tiles[mapY * map.width + mapX];
  if (tile === Tile.Empty || tile === Tile.Exit || tile === Tile.Lift || tile === Tile.Switch) return true;
  if (tile === Tile.Door || tile === Tile.DoorRed || tile === Tile.DoorYellow || tile === Tile.DoorBlue) {
    const d = doorAt(map, mapX, mapY);
    return !!d && d.open >= 0.92;
  }
  return false;
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
  const mid = (viewH / 2) | 0;
  const eye = player.z;
  const lightBoost = player.lightAmpTimer > 0 ? 1.35 : 1;

  // Clear status strip
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
    let doorOpen = 0;
    for (let i = 0; i < 96; i++) {
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
      if (!isPassableForRay(map, mapX, mapY)) {
        texId = tile === Tile.Switch ? Tile.Switch : tile;
        if (tile === Tile.Door || tile === Tile.DoorRed || tile === Tile.DoorYellow || tile === Tile.DoorBlue) {
          const d = doorAt(map, mapX, mapY);
          doorOpen = d ? d.open : 0;
        }
        break;
      }
    }

    let perpWallDist: number;
    if (side === 0) perpWallDist = (mapX - player.x + (1 - stepX) / 2) / rayDirX;
    else perpWallDist = (mapY - player.y + (1 - stepY) / 2) / rayDirY;
    perpWallDist = Math.max(0.05, perpWallDist);
    const fish = Math.cos(rayAngle - player.angle);
    perpWallDist *= fish;

    zBuffer[x] = perpWallDist;

    // Height-aware wall column (doors retract upward)
    const floorHit = getFloorH(map, mapX + 0.5, mapY + 0.5);
    const ceilHit = getCeilH(map, mapX + 0.5, mapY + 0.5);
    let wallBottom = floorHit;
    let wallTop = ceilHit;
    if (doorOpen > 0) {
      wallBottom = floorHit + (ceilHit - floorHit) * doorOpen;
    }

    const worldH = wallTop - wallBottom;
    const lineHeight = ((viewH / perpWallDist) * worldH) | 0;
    // Vertical placement relative to eye
    const bottomOffset = ((eye - wallBottom) / perpWallDist) * viewH;
    let drawEnd = (mid + bottomOffset) | 0;
    let drawStart = drawEnd - lineHeight;
    if (drawStart < 0) drawStart = 0;
    if (drawEnd >= viewH) drawEnd = viewH - 1;

    let wallX: number;
    if (side === 0) wallX = player.y + ((mapX - player.x + (1 - stepX) / 2) / rayDirX) * rayDirY;
    else wallX = player.x + ((mapY - player.y + (1 - stepY) / 2) / rayDirY) * rayDirX;
    wallX -= Math.floor(wallX);

    const sectorLight = getLight(map, mapX + 0.5, mapY + 0.5) * lightBoost;
    const distShade = Math.min(1, 3.4 / (perpWallDist + 0.35));
    const shade = (side === 1 ? 0.65 : 1) * distShade * Math.min(1.15, sectorLight);

    // Floor / ceiling texturing below & above wall
    const floorRayDistFactor = fish;
    for (let y = 0; y < viewH; y++) {
      const i = (y * w + x) * 4;
      if (y >= drawStart && y <= drawEnd && lineHeight > 0) {
        const vRaw = (y - drawStart) / Math.max(1, lineHeight);
        const v = doorOpen > 0 ? doorOpen + vRaw * (1 - doorOpen) : vRaw;
        const [r, g, b] = sampleWall(textures, texId, wallX, v, shade);
        data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
        continue;
      }

      // Floorcast / ceilcast
      const p = y < mid ? (mid - y) : (y - mid);
      if (p === 0) {
        data[i] = 10; data[i + 1] = 8; data[i + 2] = 10; data[i + 3] = 255;
        continue;
      }
      const isFloor = y >= mid;
      const rowDist = (isFloor ? eye - 0 : 1 - eye) * viewH / (2 * p) / Math.max(0.2, floorRayDistFactor);
      // Simpler classic floorcast relative to flat plane at 0 / 1
      const planeDist = (0.5 * viewH) / p;
      const adj = planeDist / Math.max(0.25, fish);
      const wx = player.x + rayDirX * adj;
      const wy = player.y + rayDirY * adj;
      const flatShade = Math.min(1, 2.8 / (adj + 0.5)) * getLight(map, wx, wy) * lightBoost * (isFloor ? 0.95 : 0.7);
      const [r, g, b] = sampleFlat(
        isFloor ? textures.floor : textures.ceil,
        textures.size,
        wx,
        wy,
        Math.max(0.15, flatShade),
      );
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
      void rowDist;
    }
  }

  const sprites: SpriteDraw[] = [];

  for (const e of enemies) {
    if (!e.alive) continue;
    const scale =
      e.type === 'baron' ? 1.35 :
      e.type === 'caco' ? 1.2 :
      e.type === 'demon' ? 1.1 :
      e.type === 'soul' ? 0.7 : 0.95;
    pushSprite(sprites, player, e.x, e.y, w, viewH, FOV, (dist, screenX, size) => ({
      dist, screenX, size: size * scale, kind: 'enemy', enemy: e, flash: e.hurtFlash > 0,
    }));
  }

  for (const p of map.pickups) {
    if (p.taken) continue;
    const scale =
      p.kind.startsWith('weapon') || p.kind.startsWith('key') ? 0.4 :
      p.kind === 'soulsphere' || p.kind === 'megaarmor' ? 0.45 : 0.32;
    pushSprite(sprites, player, p.x, p.y, w, viewH, FOV, (dist, screenX, size) => ({
      dist, screenX, size: size * scale, kind: p.kind as SpriteKind,
    }), 22);
  }

  for (let ey = 0; ey < map.height; ey++) {
    for (let ex = 0; ex < map.width; ex++) {
      if (map.tiles[ey * map.width + ex] !== Tile.Exit) continue;
      pushSprite(sprites, player, ex + 0.5, ey + 0.5, w, viewH, FOV, (dist, screenX, size) => ({
        dist, screenX, size: size * 0.8, kind: 'exit',
      }));
    }
  }

  for (const pr of projectiles) {
    const sc = pr.kind === 'bfg' ? 0.4 : pr.kind === 'rocket' ? 0.28 : 0.2;
    pushSprite(sprites, player, pr.x, pr.y, w, viewH, FOV, (dist, screenX, size) => ({
      dist, screenX, size: Math.min(viewH * 0.35, size * sc), kind: 'projectile', projKind: pr.kind,
    }), 24);
  }

  sprites.sort((a, b) => b.dist - a.dist);
  for (const s of sprites) drawSprite(data, w, viewH, zBuffer, s);

  drawWeapon(data, w, viewH, player);

  // Directional damage vignette
  if (player.hurtFlash > 0) {
    const strength = Math.min(1, player.hurtFlash * 3.5);
    for (let y = 0; y < viewH; y++) {
      for (let x = 0; x < w; x++) {
        let vig = Math.max(0, 1 - Math.min(x, y, w - 1 - x, viewH - 1 - y) / 36) * strength;
        if (player.damageDirTimer > 0) {
          const sideBias = player.damageDir < 0 ? (1 - x / w) : (x / w);
          vig = Math.max(vig, sideBias * strength * 0.7);
        }
        if (vig <= 0) continue;
        const i = (y * w + x) * 4;
        data[i] = Math.min(255, data[i] + ((140 * vig) | 0));
        data[i + 1] = (data[i + 1] * (1 - vig * 0.55)) | 0;
        data[i + 2] = (data[i + 2] * (1 - vig * 0.55)) | 0;
      }
    }
  }

  if (player.invulnTimer > 0) {
    const pulse = 0.15 + 0.1 * Math.sin(Date.now() / 80);
    for (let y = 0; y < viewH; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        data[i] = Math.min(255, data[i] + ((80 * pulse) | 0));
        data[i + 1] = Math.min(255, data[i + 1] + ((60 * pulse) | 0));
      }
    }
  }

  if (player.pickupFlash > 0) {
    const strength = Math.min(1, player.pickupFlash * 4);
    for (let y = 0; y < viewH; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        data[i + 1] = Math.min(255, data[i + 1] + ((40 * strength) | 0));
      }
    }
  }

  const sh = player.shake;
  if (sh > 0.01) {
    const ox = ((Math.random() - 0.5) * sh * 10) | 0;
    const oy = ((Math.random() - 0.5) * sh * 8) | 0;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.putImageData(img, ox, oy);
  } else {
    ctx.putImageData(img, 0, 0);
  }
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
  maxDist = 22,
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
  const size = Math.min(viewH * 2.4, viewH / dist);
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
  const bob = s.enemy?.floating ? Math.sin(s.enemy.bob) * size * 0.04 : 0;
  const startY = (((viewH - size) / 2) + bob) | 0;

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

function sampleSprite(s: SpriteDraw, u: number, v: number): [number, number, number] | null {
  const cx = u - 0.5;
  const cy = v - 0.5;

  if (s.kind === 'enemy' && s.enemy) {
    const e = s.enemy;
    const flash = s.flash;
    const pal =
      e.type === 'baron' ? [[80, 180, 70], [40, 110, 40], [30, 70, 30]] as const :
      e.type === 'caco' ? [[200, 60, 60], [140, 30, 30], [90, 20, 20]] as const :
      e.type === 'demon' ? [[200, 100, 140], [150, 60, 100], [100, 40, 70]] as const :
      e.type === 'soul' ? [[255, 220, 120], [255, 160, 40], [200, 80, 20]] as const :
      e.type === 'imp' ? [[200, 120, 60], [150, 70, 30], [100, 50, 25]] as const :
      e.type === 'shotgunner' ? [[180, 70, 50], [120, 40, 35], [80, 30, 30]] as const :
      [[60, 140, 70], [40, 90, 50], [30, 60, 40]] as const;

    if (e.type === 'soul') {
      const r = Math.hypot(cx, cy * 1.1);
      if (r < 0.32) {
        if (flash) return [255, 255, 200];
        return r < 0.12 ? [255, 255, 220] : pal[0] as unknown as [number, number, number];
      }
      return null;
    }
    if (e.type === 'caco') {
      const r = Math.hypot(cx, cy);
      if (r < 0.42) {
        if (flash) return [255, 200, 200];
        if (Math.abs(cx) < 0.12 && cy > -0.05 && cy < 0.2) return [255, 240, 80];
        return pal[1] as unknown as [number, number, number];
      }
      return null;
    }

    const body = (cx * cx) / (e.type === 'baron' ? 0.18 : 0.12) + ((cy + 0.05) * (cy + 0.05)) / (e.type === 'baron' ? 0.36 : 0.28);
    const head = (cx * cx) / 0.07 + ((cy + 0.28) * (cy + 0.28)) / 0.07;
    if (head < 1) return flash ? [255, 200, 200] : pal[0] as unknown as [number, number, number];
    if (body < 1) {
      if (flash) return [255, 180, 180];
      if (v > 0.22 && v < 0.32 && ((u > 0.35 && u < 0.42) || (u > 0.58 && u < 0.65))) {
        return [255, 40, 40];
      }
      return pal[1] as unknown as [number, number, number];
    }
    if (v > 0.7 && v < 0.95) {
      const leg = Math.abs(cx) < 0.12 + Math.sin(e.bob) * 0.04;
      if (leg && Math.abs(cx) > 0.03) return pal[2] as unknown as [number, number, number];
    }
    return null;
  }

  if (s.kind === 'health' || s.kind === 'stim') {
    if (Math.abs(cx) < 0.28 && Math.abs(cy) < 0.28) {
      const cross = (Math.abs(cx) < 0.08 && Math.abs(cy) < 0.22) || (Math.abs(cy) < 0.08 && Math.abs(cx) < 0.22);
      if (cross) return [255, 40, 40];
      return s.kind === 'stim' ? [220, 200, 180] : [200, 200, 200];
    }
    return null;
  }
  if (s.kind === 'bonus') {
    if (Math.hypot(cx, cy) < 0.18) return [255, 215, 60];
    return null;
  }
  if (s.kind === 'soulsphere') {
    const r = Math.hypot(cx, cy);
    if (r < 0.35) return r < 0.15 ? [180, 220, 255] : [40, 100, 220];
    return null;
  }
  if (s.kind === 'armor' || s.kind === 'megaarmor') {
    if (Math.abs(cx) < 0.28 && Math.abs(cy) < 0.32) {
      const glow = s.kind === 'megaarmor';
      if (Math.abs(cx) < 0.18 && cy > -0.2 && cy < 0.25) return glow ? [80, 200, 255] : [60, 120, 200];
      return glow ? [40, 100, 160] : [30, 50, 90];
    }
    return null;
  }
  if (s.kind === 'berserk') {
    if (Math.abs(cx) < 0.25 && Math.abs(cy) < 0.25) return [180, 30, 30];
    return null;
  }
  if (s.kind === 'invis') {
    if (Math.hypot(cx, cy) < 0.28) return [160, 160, 200];
    return null;
  }
  if (s.kind === 'invuln') {
    if (Math.hypot(cx, cy) < 0.3) return [220, 200, 80];
    return null;
  }
  if (s.kind === 'lightamp') {
    if (Math.abs(cx) < 0.22 && Math.abs(cy) < 0.15) return [80, 255, 120];
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
    if (Math.abs(cx) < 0.22 && Math.abs(cy) < 0.2) return [180, 100, 40];
    return null;
  }
  if (s.kind === 'rockets') {
    if (Math.abs(cx) < 0.15 && Math.abs(cy) < 0.3) return [120, 80, 40];
    return null;
  }
  if (s.kind === 'cells') {
    if (Math.abs(cx) < 0.2 && Math.abs(cy) < 0.25) return [80, 220, 180];
    return null;
  }
  if (s.kind === 'key_red' || s.kind === 'key_yellow' || s.kind === 'key_blue') {
    const col =
      s.kind === 'key_red' ? [255, 60, 60] as [number, number, number] :
      s.kind === 'key_yellow' ? [255, 210, 60] as [number, number, number] :
      [60, 120, 255] as [number, number, number];
    if (Math.abs(cy) < 0.12 && Math.abs(cx) < 0.3) return col;
    if (cx > 0.15 && Math.abs(cy) < 0.22 && cx < 0.32) return col;
    return null;
  }
  if (s.kind.startsWith('weapon_')) {
    const tint =
      s.kind === 'weapon_bfg' ? [80, 255, 120] :
      s.kind === 'weapon_plasma' ? [80, 200, 255] :
      s.kind === 'weapon_rocket' ? [180, 80, 40] :
      s.kind === 'weapon_chainsaw' ? [140, 140, 80] :
      [120, 90, 50];
    if (Math.abs(cy) < 0.1 && cx > -0.3 && cx < 0.35) return tint as [number, number, number];
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
    if (r < 0.4) {
      if (s.projKind === 'bfg') return r < 0.2 ? [200, 255, 180] : [40, 200, 80];
      if (s.projKind === 'rocket') return r < 0.15 ? [255, 200, 80] : [200, 80, 20];
      if (s.projKind === 'plasma') return r < 0.15 ? [200, 255, 255] : [40, 180, 255];
      if (s.projKind === 'baron') return r < 0.15 ? [180, 255, 120] : [40, 160, 40];
      if (r < 0.15) return [255, 255, 200];
      if (r < 0.25) return [255, 120, 40];
      return [200, 40, 40];
    }
    return null;
  }
  return null;
}

function drawWeapon(data: Uint8ClampedArray, w: number, viewH: number, player: Player): void {
  const moveBob = Math.sin(Date.now() / 140) * (player.muzzleFlash > 0 ? 0 : 2.2);
  const bob = moveBob + (player.shake > 0 ? (Math.random() - 0.5) * player.shake * 3 : 0);
  const kick = player.muzzleFlash > 0 ? (8 + player.shake * 6) : 0;
  const baseX = (w / 2 - 22 + bob) | 0;
  const baseY = (viewH - 50 + kick) | 0;
  const weap = player.currentWeapon;

  const put = (x: number, y: number, r: number, g: number, b: number) => {
    if (x < 0 || y < 0 || x >= w || y >= viewH) return;
    const i = (y * w + x) * 4;
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
  };

  if (weap === 'fist') {
    for (let y = 18; y < 48; y++) for (let x = 8; x < 36; x++) put(baseX + x, baseY + y, 180, 130, 90);
    for (let y = 10; y < 22; y++) for (let x = 20; x < 40; x++) put(baseX + x, baseY + y, 160, 110, 80);
  } else if (weap === 'chainsaw') {
    for (let y = 16; y < 44; y++) for (let x = 6; x < 30; x++) put(baseX + x, baseY + y, 90, 90, 70);
    for (let y = 8; y < 18; y++) for (let x = 24; x < 54; x++) put(baseX + x, baseY + y, 140, 140, 120);
    for (let y = 10; y < 16; y++) for (let x = 28; x < 50; x += 2) put(baseX + x, baseY + y, 200, 200, 180);
  } else if (weap === 'shotgun') {
    for (let y = 22; y < 44; y++) for (let x = 14; x < 26; x++) put(baseX + x, baseY + y, 55, 40, 28);
    for (let y = 6; y < 22; y++) for (let x = 6; x < 36; x++) put(baseX + x, baseY + y, 100, 85, 55);
    for (let y = 8; y < 16; y++) for (let x = 34; x < 52; x++) put(baseX + x, baseY + y, 45, 45, 50);
  } else if (weap === 'chaingun') {
    for (let y = 18; y < 42; y++) for (let x = 10; x < 28; x++) put(baseX + x, baseY + y, 50, 50, 55);
    for (let y = 4; y < 20; y++) for (let x = 4; x < 32; x++) put(baseX + x, baseY + y, 80, 85, 95);
    for (let y = 6; y < 14; y++) for (let x = 30; x < 48; x++) put(baseX + x, baseY + y, 40, 40, 45);
  } else if (weap === 'rocket') {
    for (let y = 14; y < 44; y++) for (let x = 12; x < 28; x++) put(baseX + x, baseY + y, 70, 50, 35);
    for (let y = 4; y < 16; y++) for (let x = 8; x < 40; x++) put(baseX + x, baseY + y, 100, 70, 40);
    for (let y = 6; y < 14; y++) for (let x = 38; x < 56; x++) put(baseX + x, baseY + y, 60, 60, 50);
  } else if (weap === 'plasma') {
    for (let y = 16; y < 42; y++) for (let x = 10; x < 30; x++) put(baseX + x, baseY + y, 40, 50, 70);
    for (let y = 6; y < 18; y++) for (let x = 6; x < 34; x++) put(baseX + x, baseY + y, 60, 90, 120);
    for (let y = 8; y < 14; y++) for (let x = 32; x < 50; x++) put(baseX + x, baseY + y, 40, 200, 255);
  } else if (weap === 'bfg') {
    for (let y = 12; y < 46; y++) for (let x = 4; x < 34; x++) put(baseX + x, baseY + y, 40, 70, 40);
    for (let y = 4; y < 16; y++) for (let x = 8; x < 44; x++) put(baseX + x, baseY + y, 60, 120, 60);
    for (let y = 6; y < 14; y++) for (let x = 40; x < 58; x++) put(baseX + x, baseY + y, 120, 255, 80);
  } else {
    for (let y = 20; y < 40; y++) for (let x = 10; x < 22; x++) put(baseX + x, baseY + y, 60, 50, 40);
    for (let y = 8; y < 24; y++) for (let x = 4; x < 28; x++) put(baseX + x, baseY + y, 90, 90, 100);
    for (let y = 10; y < 16; y++) for (let x = 26; x < 40; x++) put(baseX + x, baseY + y, 50, 50, 55);
  }

  if (player.muzzleFlash > 0 && weap !== 'fist' && weap !== 'chainsaw') {
    const fx = baseX + (weap === 'bfg' ? 58 : weap === 'rocket' ? 56 : weap === 'shotgun' ? 52 : 44);
    const fy = baseY + 10;
    const rad = weap === 'bfg' ? 14 : weap === 'shotgun' ? 10 : 6;
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad / 2; dx <= rad + 2; dx++) {
        if (dx * dx + dy * dy < rad * rad) {
          put(fx + dx, fy + dy, weap === 'plasma' || weap === 'bfg' ? 120 : 255, 220, weap === 'plasma' ? 255 : 80);
        }
      }
    }
  }
}
