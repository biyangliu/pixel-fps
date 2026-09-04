import type { LevelMap } from './map';
import { isSolid, isExit } from './map';
import type { InputState } from './input';
import { consumeMouseDelta } from './input';

export interface Player {
  x: number;
  y: number;
  angle: number;
  pitch: number;
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  shootCooldown: number;
  hurtFlash: number;
  muzzleFlash: number;
  radius: number;
  score: number;
  kills: number;
}

export function createPlayer(spawn: { x: number; y: number; angle: number }): Player {
  return {
    x: spawn.x,
    y: spawn.y,
    angle: spawn.angle,
    pitch: 0,
    hp: 100,
    maxHp: 100,
    ammo: 30,
    maxAmmo: 99,
    shootCooldown: 0,
    hurtFlash: 0,
    muzzleFlash: 0,
    radius: 0.22,
    score: 0,
    kills: 0,
  };
}

export function resetPlayer(player: Player, spawn: { x: number; y: number; angle: number }): void {
  player.x = spawn.x;
  player.y = spawn.y;
  player.angle = spawn.angle;
  player.pitch = 0;
  player.hp = player.maxHp;
  player.ammo = 30;
  player.shootCooldown = 0;
  player.hurtFlash = 0;
  player.muzzleFlash = 0;
  player.score = 0;
  player.kills = 0;
}

function tryMove(map: LevelMap, player: Player, nx: number, ny: number): void {
  const r = player.radius;
  if (!isSolid(map, nx - r, player.y - r) &&
      !isSolid(map, nx + r, player.y - r) &&
      !isSolid(map, nx - r, player.y + r) &&
      !isSolid(map, nx + r, player.y + r)) {
    player.x = nx;
  }
  if (!isSolid(map, player.x - r, ny - r) &&
      !isSolid(map, player.x + r, ny - r) &&
      !isSolid(map, player.x - r, ny + r) &&
      !isSolid(map, player.x + r, ny + r)) {
    player.y = ny;
  }
}

export function updatePlayer(
  player: Player,
  map: LevelMap,
  input: InputState,
  dt: number,
): { fired: boolean; reachedExit: boolean } {
  const { dx } = consumeMouseDelta(input);
  player.angle += dx * 0.0025;

  const speed = 2.8;
  let mx = 0;
  let my = 0;
  if (input.forward) { mx += Math.cos(player.angle); my += Math.sin(player.angle); }
  if (input.back) { mx -= Math.cos(player.angle); my -= Math.sin(player.angle); }
  if (input.left) { mx += Math.cos(player.angle - Math.PI / 2); my += Math.sin(player.angle - Math.PI / 2); }
  if (input.right) { mx += Math.cos(player.angle + Math.PI / 2); my += Math.sin(player.angle + Math.PI / 2); }

  const len = Math.hypot(mx, my);
  if (len > 0) {
    mx = (mx / len) * speed * dt;
    my = (my / len) * speed * dt;
    tryMove(map, player, player.x + mx, player.y + my);
  }

  if (player.shootCooldown > 0) player.shootCooldown -= dt;
  if (player.hurtFlash > 0) player.hurtFlash -= dt;
  if (player.muzzleFlash > 0) player.muzzleFlash -= dt;

  let fired = false;
  if (input.shoot && player.shootCooldown <= 0 && player.ammo > 0) {
    player.ammo--;
    player.shootCooldown = 0.22;
    player.muzzleFlash = 0.08;
    fired = true;
  }

  // Pickup collection
  for (const p of map.pickups) {
    if (p.taken) continue;
    if (Math.hypot(p.x - player.x, p.y - player.y) < 0.5) {
      if (p.kind === 'health') {
        if (player.hp < player.maxHp) {
          player.hp = Math.min(player.maxHp, player.hp + p.amount);
          p.taken = true;
        }
      } else {
        if (player.ammo < player.maxAmmo) {
          player.ammo = Math.min(player.maxAmmo, player.ammo + p.amount);
          p.taken = true;
        }
      }
    }
  }

  return { fired, reachedExit: isExit(map, player.x, player.y) };
}

export function damagePlayer(player: Player, amount: number): void {
  player.hp = Math.max(0, player.hp - amount);
  player.hurtFlash = 0.25;
}
