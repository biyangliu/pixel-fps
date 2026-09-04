import type { LevelMap } from './map';
import { isSolid } from './map';
import type { Player } from './player';
import { damagePlayer } from './player';

export interface Enemy {
  x: number;
  y: number;
  type: 'grunt' | 'shooter';
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  attackCooldown: number;
  hurtFlash: number;
  alive: boolean;
  /** Animation phase */
  bob: number;
}

export function createEnemies(map: LevelMap): Enemy[] {
  return map.enemySpawns.map((s) => {
    if (s.type === 'shooter') {
      return {
        x: s.x, y: s.y, type: 'shooter',
        hp: 40, maxHp: 40, speed: 1.2, radius: 0.28,
        attackCooldown: 0.5 + Math.random(), hurtFlash: 0, alive: true, bob: Math.random() * Math.PI * 2,
      };
    }
    return {
      x: s.x, y: s.y, type: 'grunt',
      hp: 30, maxHp: 30, speed: 1.8, radius: 0.28,
      attackCooldown: 0, hurtFlash: 0, alive: true, bob: Math.random() * Math.PI * 2,
    };
  });
}

function canSee(map: LevelMap, x0: number, y0: number, x1: number, y1: number): boolean {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.ceil(dist * 8);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isSolid(map, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}

function tryEnemyMove(map: LevelMap, e: Enemy, nx: number, ny: number): void {
  const r = e.radius;
  if (!isSolid(map, nx - r, e.y) && !isSolid(map, nx + r, e.y)) e.x = nx;
  if (!isSolid(map, e.x, ny - r) && !isSolid(map, e.x, ny + r)) e.y = ny;
}

export function updateEnemies(
  enemies: Enemy[],
  map: LevelMap,
  player: Player,
  dt: number,
): void {
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.hurtFlash > 0) e.hurtFlash -= dt;
    e.bob += dt * 6;
    if (e.attackCooldown > 0) e.attackCooldown -= dt;

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy);
    const sees = dist < 12 && canSee(map, e.x, e.y, player.x, player.y);

    if (!sees) continue;

    if (e.type === 'grunt') {
      if (dist > 0.55) {
        const nx = e.x + (dx / dist) * e.speed * dt;
        const ny = e.y + (dy / dist) * e.speed * dt;
        tryEnemyMove(map, e, nx, ny);
      } else if (e.attackCooldown <= 0) {
        damagePlayer(player, 12);
        e.attackCooldown = 0.9;
      }
    } else {
      // Shooter: keep distance, fire projectiles (hitscan with delay)
      if (dist < 3.5 && dist > 0.1) {
        const nx = e.x - (dx / dist) * e.speed * 0.6 * dt;
        const ny = e.y - (dy / dist) * e.speed * 0.6 * dt;
        tryEnemyMove(map, e, nx, ny);
      } else if (dist > 5) {
        const nx = e.x + (dx / dist) * e.speed * dt;
        const ny = e.y + (dy / dist) * e.speed * dt;
        tryEnemyMove(map, e, nx, ny);
      }
      if (e.attackCooldown <= 0 && dist < 10) {
        damagePlayer(player, 8);
        e.attackCooldown = 1.4;
      }
    }
  }
}

/** Hitscan from player; returns true if something died */
export function playerShoot(
  enemies: Enemy[],
  map: LevelMap,
  player: Player,
): boolean {
  const range = 14;
  const aimX = Math.cos(player.angle);
  const aimY = Math.sin(player.angle);
  let closest: Enemy | null = null;
  let closestDist = range;

  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > range || dist < 0.01) continue;
    // Project onto aim direction
    const proj = dx * aimX + dy * aimY;
    if (proj < 0) continue;
    const perp = Math.abs(dx * aimY - dy * aimX);
    const hitRadius = e.radius + 0.15 + dist * 0.02;
    if (perp > hitRadius) continue;
    if (!canSee(map, player.x, player.y, e.x, e.y)) continue;
    if (dist < closestDist) {
      closestDist = dist;
      closest = e;
    }
  }

  if (closest) {
    const dmg = closest.type === 'shooter' ? 22 : 18;
    closest.hp -= dmg;
    closest.hurtFlash = 0.15;
    if (closest.hp <= 0) {
      closest.alive = false;
      player.kills++;
      player.score += closest.type === 'shooter' ? 150 : 100;
      return true;
    }
  }
  return false;
}

export function aliveCount(enemies: Enemy[]): number {
  return enemies.filter((e) => e.alive).length;
}
