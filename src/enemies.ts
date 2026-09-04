import type { LevelMap, EnemyType } from './map';
import { isSolid } from './map';
import type { Player } from './player';
import { damagePlayer } from './player';
import { WEAPONS, type WeaponId } from './weapons';
import { sfxHurt, sfxEnemyHit, sfxEnemyDie } from './audio';

export interface Enemy {
  x: number;
  y: number;
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  attackCooldown: number;
  hurtFlash: number;
  alive: boolean;
  bob: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  life: number;
  fromEnemy: boolean;
}

export function createEnemies(map: LevelMap): Enemy[] {
  return map.enemySpawns.map((s) => {
    if (s.type === 'shooter') {
      return {
        x: s.x, y: s.y, type: 'shooter',
        hp: 45, maxHp: 45, speed: 1.25, radius: 0.28,
        attackCooldown: 0.4 + Math.random(), hurtFlash: 0, alive: true, bob: Math.random() * Math.PI * 2,
      };
    }
    if (s.type === 'tank') {
      return {
        x: s.x, y: s.y, type: 'tank',
        hp: 120, maxHp: 120, speed: 0.95, radius: 0.38,
        attackCooldown: 0.8 + Math.random(), hurtFlash: 0, alive: true, bob: Math.random() * Math.PI * 2,
      };
    }
    return {
      x: s.x, y: s.y, type: 'grunt',
      hp: 35, maxHp: 35, speed: 2.1, radius: 0.28,
      attackCooldown: 0, hurtFlash: 0, alive: true, bob: Math.random() * Math.PI * 2,
    };
  });
}

export function createProjectiles(): Projectile[] {
  return [];
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
  projectiles: Projectile[],
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
    const sees = dist < 14 && canSee(map, e.x, e.y, player.x, player.y);

    if (!sees) continue;

    if (e.type === 'grunt') {
      if (dist > 0.55) {
        tryEnemyMove(map, e, e.x + (dx / dist) * e.speed * dt, e.y + (dy / dist) * e.speed * dt);
      } else if (e.attackCooldown <= 0) {
        damagePlayer(player, 14);
        sfxHurt();
        e.attackCooldown = 0.85;
      }
    } else if (e.type === 'shooter') {
      if (dist < 3.2 && dist > 0.1) {
        tryEnemyMove(map, e, e.x - (dx / dist) * e.speed * 0.65 * dt, e.y - (dy / dist) * e.speed * 0.65 * dt);
      } else if (dist > 5.5) {
        tryEnemyMove(map, e, e.x + (dx / dist) * e.speed * dt, e.y + (dy / dist) * e.speed * dt);
      }
      if (e.attackCooldown <= 0 && dist < 11) {
        // Hitscan with slight inaccuracy
        const miss = Math.random() < 0.18;
        if (!miss) {
          damagePlayer(player, 9);
          sfxHurt();
        }
        e.attackCooldown = 1.25;
      }
    } else {
      // Tank: lumber closer, fire visible plasma bolts
      if (dist > 4) {
        tryEnemyMove(map, e, e.x + (dx / dist) * e.speed * dt, e.y + (dy / dist) * e.speed * dt);
      } else if (dist < 2.5) {
        tryEnemyMove(map, e, e.x - (dx / dist) * e.speed * 0.4 * dt, e.y - (dy / dist) * e.speed * 0.4 * dt);
      }
      if (e.attackCooldown <= 0 && dist < 12) {
        const spd = 4.2;
        projectiles.push({
          x: e.x,
          y: e.y,
          vx: (dx / dist) * spd,
          vy: (dy / dist) * spd,
          damage: 18,
          radius: 0.18,
          life: 3.5,
          fromEnemy: true,
        });
        e.attackCooldown = 1.6;
      }
    }
  }
}

export function updateProjectiles(
  projectiles: Projectile[],
  map: LevelMap,
  player: Player,
  dt: number,
): void {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0 || isSolid(map, p.x, p.y)) {
      projectiles.splice(i, 1);
      continue;
    }
    if (p.fromEnemy) {
      if (Math.hypot(p.x - player.x, p.y - player.y) < player.radius + p.radius) {
        damagePlayer(player, p.damage);
        sfxHurt();
        projectiles.splice(i, 1);
      }
    }
  }
}

function hitscanOne(
  enemies: Enemy[],
  map: LevelMap,
  ox: number,
  oy: number,
  aimAngle: number,
  range: number,
  damage: number,
  player: Player,
): boolean {
  const aimX = Math.cos(aimAngle);
  const aimY = Math.sin(aimAngle);
  let closest: Enemy | null = null;
  let closestDist = range;

  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = e.x - ox;
    const dy = e.y - oy;
    const dist = Math.hypot(dx, dy);
    if (dist > range || dist < 0.01) continue;
    const proj = dx * aimX + dy * aimY;
    if (proj < 0) continue;
    const perp = Math.abs(dx * aimY - dy * aimX);
    const hitRadius = e.radius + 0.12 + dist * 0.015;
    if (perp > hitRadius) continue;
    if (!canSee(map, ox, oy, e.x, e.y)) continue;
    if (dist < closestDist) {
      closestDist = dist;
      closest = e;
    }
  }

  if (!closest) return false;

  // Falloff: shotgun pellets weaker at range
  const falloff = Math.max(0.45, 1 - closestDist / (range + 2));
  closest.hp -= damage * falloff;
  closest.hurtFlash = 0.15;
  sfxEnemyHit();
  if (closest.hp <= 0) {
    closest.alive = false;
    player.kills++;
    const pts = closest.type === 'tank' ? 300 : closest.type === 'shooter' ? 150 : 100;
    player.score += pts;
    sfxEnemyDie();
    return true;
  }
  return false;
}

/** Fire current weapon hitscan (multi-pellet for shotgun). */
export function playerShoot(
  enemies: Enemy[],
  map: LevelMap,
  player: Player,
  weaponId: WeaponId,
): void {
  const weap = WEAPONS[weaponId];
  for (let i = 0; i < weap.pellets; i++) {
    const spread = (Math.random() * 2 - 1) * weap.spread;
    hitscanOne(enemies, map, player.x, player.y, player.angle + spread, weap.range, weap.damage, player);
  }
}

export function aliveCount(enemies: Enemy[]): number {
  return enemies.filter((e) => e.alive).length;
}
