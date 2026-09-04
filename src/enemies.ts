import type { LevelMap, EnemyType } from './map';
import { isSolid } from './map';
import type { Player } from './player';
import { damagePlayer } from './player';
import { WEAPONS, type WeaponId } from './weapons';
import {
  sfxHurt, sfxEnemyHit, sfxEnemyDie, sfxEnemyAlert, sfxExplosion, sfxMelee, sfxEnemyAttack,
} from './audio';

export type AiState = 'idle' | 'chase' | 'attack' | 'pain' | 'dead';

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
  state: AiState;
  painChance: number;
  painTimer: number;
  alerted: boolean;
  floating: boolean;
  scoreValue: number;
  frame: number;
  closet: boolean;
  invisible: boolean; // spectre
  deathTimer: number;
  targetEnemy: Enemy | null; // infighting target
  lastAttacker: Enemy | null;
}

export type ProjKind = 'plasma' | 'rocket' | 'bfg' | 'fireball' | 'caco' | 'baron';

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  life: number;
  fromEnemy: boolean;
  kind: ProjKind;
  splash: number;
  splashDamage: number;
  owner: Enemy | null;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  r: number; g: number; b: number;
  size: number;
  kind: 'blood' | 'puff' | 'spark';
}

const DEFS: Record<EnemyType, {
  hp: number; speed: number; radius: number; pain: number;
  floating?: boolean; score: number; invisible?: boolean;
}> = {
  trooper: { hp: 30, speed: 1.4, radius: 0.28, pain: 0.35, score: 100 },
  shotgunner: { hp: 40, speed: 1.3, radius: 0.28, pain: 0.3, score: 150 },
  imp: { hp: 55, speed: 1.5, radius: 0.3, pain: 0.4, score: 200 },
  demon: { hp: 90, speed: 2.4, radius: 0.38, pain: 0.25, score: 300 },
  spectre: { hp: 90, speed: 2.5, radius: 0.38, pain: 0.25, score: 350, invisible: true },
  soul: { hp: 40, speed: 2.8, radius: 0.25, pain: 0.5, floating: true, score: 150 },
  caco: { hp: 160, speed: 1.1, radius: 0.45, pain: 0.2, floating: true, score: 500 },
  baron: { hp: 400, speed: 1.0, radius: 0.5, pain: 0.15, score: 1000 },
};

/** Skill scales enemy HP / count aggressiveness via spawn filter externally */
export function createEnemies(map: LevelMap, skill = 3): Enemy[] {
  let spawns = map.enemySpawns;
  if (skill === 1) {
    // Recruit: drop ~35% of non-boss
    spawns = spawns.filter((s, i) => s.type === 'baron' || i % 3 !== 0);
  } else if (skill === 2) {
    spawns = spawns.filter((s, i) => s.type === 'baron' || i % 5 !== 0);
  } else if (skill === 4) {
    // Nightmare: keep all (already max density)
  }
  const hpMul = skill === 1 ? 0.75 : skill === 4 ? 1.25 : 1;
  return spawns.map((s) => {
    const d = DEFS[s.type];
    return {
      x: s.x,
      y: s.y,
      type: s.type,
      hp: d.hp * hpMul,
      maxHp: d.hp * hpMul,
      speed: d.speed * (skill === 4 ? 1.15 : 1),
      radius: d.radius,
      attackCooldown: 0.3 + Math.random(),
      hurtFlash: 0,
      alive: true,
      bob: Math.random() * Math.PI * 2,
      state: 'idle' as AiState,
      painChance: d.pain,
      painTimer: 0,
      alerted: false,
      floating: !!d.floating,
      scoreValue: d.score,
      frame: 0,
      closet: !!s.closet,
      invisible: !!d.invisible,
      deathTimer: 0,
      targetEnemy: null,
      lastAttacker: null,
    };
  });
}

export function createProjectiles(): Projectile[] {
  return [];
}

export function createParticles(): Particle[] {
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

function hearOrSee(
  map: LevelMap,
  e: Enemy,
  player: Player,
  gunshot: boolean,
): boolean {
  const dist = Math.hypot(player.x - e.x, player.y - e.y);
  if (dist < 14 && canSee(map, e.x, e.y, player.x, player.y)) return true;
  if (gunshot && dist < 18) return true;
  if (player.berserkTimer > 0 && dist < 10) return true;
  return false;
}

function spawnBlood(particles: Particle[], x: number, y: number, n = 6): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1 + Math.random() * 2.5;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.35 + Math.random() * 0.25, maxLife: 0.5,
      r: 160 + Math.random() * 60, g: 20, b: 20, size: 2 + Math.random() * 2,
      kind: 'blood',
    });
  }
}

function spawnPuff(particles: Particle[], x: number, y: number): void {
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2;
    particles.push({
      x, y, vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 1.2,
      life: 0.2, maxLife: 0.2,
      r: 180, g: 180, b: 160, size: 2,
      kind: 'puff',
    });
  }
}

export function updateParticles(particles: Particle[], dt: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function updateEnemies(
  enemies: Enemy[],
  map: LevelMap,
  player: Player,
  projectiles: Projectile[],
  dt: number,
  gunshot: boolean,
  particles: Particle[],
): void {
  const invis = player.invisTimer > 0;

  for (const e of enemies) {
    if (!e.alive) {
      e.state = 'dead';
      if (e.deathTimer < 3) e.deathTimer += dt;
      continue;
    }
    if (e.hurtFlash > 0) e.hurtFlash -= dt;
    e.bob += dt * (e.type === 'soul' ? 10 : 6);
    e.frame += dt * 8;
    if (e.attackCooldown > 0) e.attackCooldown -= dt;

    if (e.painTimer > 0) {
      e.painTimer -= dt;
      e.state = 'pain';
      continue;
    }

    // Infighting: chase last attacker if set
    let chaseX = player.x;
    let chaseY = player.y;
    let chasingEnemy = false;
    if (e.targetEnemy && e.targetEnemy.alive) {
      chaseX = e.targetEnemy.x;
      chaseY = e.targetEnemy.y;
      chasingEnemy = true;
    } else {
      e.targetEnemy = null;
    }

    const dx = chaseX - e.x;
    const dy = chaseY - e.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const aware = chasingEnemy || (!invis && hearOrSee(map, e, player, gunshot));

    if (e.closet && !e.alerted) {
      const near = Math.hypot(player.x - e.x, player.y - e.y) < 5.5 && aware;
      if (near || e.hurtFlash > 0) {
        e.alerted = true;
        e.closet = false;
        sfxEnemyAlert(e.type);
      } else {
        e.state = 'idle';
        continue;
      }
    } else if (!e.alerted && aware) {
      e.alerted = true;
      sfxEnemyAlert(e.type);
    }

    if (!e.alerted) {
      e.state = 'idle';
      continue;
    }

    e.state = 'chase';

    const attackPlayer = !chasingEnemy;

    if (e.type === 'demon' || e.type === 'spectre' || e.type === 'soul') {
      if (dist > 0.55) {
        tryEnemyMove(map, e, e.x + (dx / dist) * e.speed * dt, e.y + (dy / dist) * e.speed * dt);
      } else if (e.attackCooldown <= 0) {
        e.state = 'attack';
        sfxEnemyAttack(e.type);
        if (chasingEnemy && e.targetEnemy) {
          hurtEnemy(e.targetEnemy, player, e.type === 'soul' ? 12 : 18, particles, e);
        } else if (attackPlayer) {
          damagePlayer(player, e.type === 'demon' || e.type === 'spectre' ? 18 : 12, e.x, e.y);
          sfxHurt();
        }
        e.attackCooldown = e.type === 'soul' ? 0.5 : 0.7;
      }
    } else if (e.type === 'trooper' || e.type === 'shotgunner') {
      const prefer = e.type === 'shotgunner' ? 4.5 : 5.5;
      if (dist < prefer - 1.5) {
        tryEnemyMove(map, e, e.x - (dx / dist) * e.speed * 0.7 * dt, e.y - (dy / dist) * e.speed * 0.7 * dt);
      } else if (dist > prefer + 1) {
        tryEnemyMove(map, e, e.x + (dx / dist) * e.speed * dt, e.y + (dy / dist) * e.speed * dt);
      }
      if (e.attackCooldown <= 0 && dist < 12 && canSee(map, e.x, e.y, chaseX, chaseY)) {
        e.state = 'attack';
        sfxEnemyAttack(e.type);
        const pellets = e.type === 'shotgunner' ? 5 : 1;
        const dmg = e.type === 'shotgunner' ? 6 : 9;
        if (chasingEnemy && e.targetEnemy) {
          hurtEnemy(e.targetEnemy, player, dmg * pellets * 0.6, particles, e);
        } else {
          let hit = false;
          for (let i = 0; i < pellets; i++) {
            if (Math.random() > (invis ? 0.55 : 0.22)) {
              damagePlayer(player, dmg, e.x, e.y);
              hit = true;
            }
          }
          if (hit) sfxHurt();
        }
        e.attackCooldown = e.type === 'shotgunner' ? 1.4 : 1.1;
      }
    } else if (e.type === 'imp') {
      if (dist > 5) tryEnemyMove(map, e, e.x + (dx / dist) * e.speed * dt, e.y + (dy / dist) * e.speed * dt);
      else if (dist < 2.5) tryEnemyMove(map, e, e.x - (dx / dist) * e.speed * 0.5 * dt, e.y - (dy / dist) * e.speed * 0.5 * dt);
      if (e.attackCooldown <= 0 && dist < 13 && canSee(map, e.x, e.y, chaseX, chaseY)) {
        e.state = 'attack';
        sfxEnemyAttack(e.type);
        const spd = 5.5;
        projectiles.push({
          x: e.x, y: e.y,
          vx: (dx / dist) * spd, vy: (dy / dist) * spd,
          damage: 14, radius: 0.16, life: 3.5, fromEnemy: true,
          kind: 'fireball', splash: 0, splashDamage: 0, owner: e,
        });
        e.attackCooldown = 1.35;
      }
    } else if (e.type === 'caco') {
      if (dist > 6) tryEnemyMove(map, e, e.x + (dx / dist) * e.speed * dt, e.y + (dy / dist) * e.speed * dt);
      else if (dist < 3) tryEnemyMove(map, e, e.x - (dx / dist) * e.speed * 0.4 * dt, e.y - (dy / dist) * e.speed * 0.4 * dt);
      if (e.attackCooldown <= 0 && dist < 14 && canSee(map, e.x, e.y, chaseX, chaseY)) {
        e.state = 'attack';
        sfxEnemyAttack(e.type);
        const spd = 4.8;
        projectiles.push({
          x: e.x, y: e.y,
          vx: (dx / dist) * spd, vy: (dy / dist) * spd,
          damage: 20, radius: 0.2, life: 4, fromEnemy: true,
          kind: 'caco', splash: 0, splashDamage: 0, owner: e,
        });
        e.attackCooldown = 1.55;
      }
    } else {
      // baron
      if (dist > 5) tryEnemyMove(map, e, e.x + (dx / dist) * e.speed * dt, e.y + (dy / dist) * e.speed * dt);
      if (e.attackCooldown <= 0 && dist < 14 && canSee(map, e.x, e.y, chaseX, chaseY)) {
        e.state = 'attack';
        sfxEnemyAttack(e.type);
        if (dist < 1.4) {
          if (chasingEnemy && e.targetEnemy) {
            hurtEnemy(e.targetEnemy, player, 28, particles, e);
          } else {
            damagePlayer(player, 28, e.x, e.y);
            sfxHurt();
          }
        } else {
          const spd = 6;
          projectiles.push({
            x: e.x, y: e.y,
            vx: (dx / dist) * spd, vy: (dy / dist) * spd,
            damage: 32, radius: 0.22, life: 4, fromEnemy: true,
            kind: 'baron', splash: 0, splashDamage: 0, owner: e,
          });
        }
        e.attackCooldown = 1.2;
      }
    }
  }
}

function splashDamage(
  enemies: Enemy[],
  player: Player,
  x: number,
  y: number,
  radius: number,
  damage: number,
  fromEnemy: boolean,
  particles: Particle[],
  owner: Enemy | null,
): void {
  if (radius <= 0) return;
  for (const e of enemies) {
    if (!e.alive) continue;
    if (fromEnemy && owner && e === owner) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < radius + e.radius) {
      const fall = 1 - d / (radius + e.radius);
      hurtEnemy(e, player, damage * fall, particles, fromEnemy ? owner : null);
    }
  }
  const pd = Math.hypot(player.x - x, player.y - y);
  if (pd < radius + player.radius) {
    const fall = 1 - pd / (radius + player.radius);
    damagePlayer(player, damage * fall * (fromEnemy ? 1 : 0.7));
    player.shake = Math.max(player.shake, 0.4 * fall);
    if (damage * fall > 1) sfxHurt();
  } else if (!fromEnemy && radius > 1) {
    player.shake = Math.max(player.shake, 0.25);
  }
}

function hurtEnemy(
  e: Enemy,
  player: Player,
  amount: number,
  particles: Particle[],
  attacker: Enemy | null,
): void {
  if (!e.alive) return;
  e.hp -= amount;
  e.hurtFlash = 0.15;
  sfxEnemyHit();
  spawnBlood(particles, e.x, e.y, 4);
  if (Math.random() < e.painChance) e.painTimer = 0.2;

  // Monster infighting: if hit by another monster, target them
  if (attacker && attacker !== e && attacker.alive) {
    e.targetEnemy = attacker;
    e.alerted = true;
    e.lastAttacker = attacker;
  }

  if (e.hp <= 0) {
    e.alive = false;
    e.state = 'dead';
    e.deathTimer = 0;
    player.kills++;
    player.score += e.scoreValue;
    sfxEnemyDie(e.type);
    spawnBlood(particles, e.x, e.y, 12);
  }
}

export function updateProjectiles(
  projectiles: Projectile[],
  enemies: Enemy[],
  map: LevelMap,
  player: Player,
  dt: number,
  particles: Particle[],
): void {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    let hit = false;
    if (p.life <= 0 || isSolid(map, p.x, p.y)) {
      hit = true;
      if (!p.fromEnemy) spawnPuff(particles, p.x, p.y);
    }

    if (!hit && p.fromEnemy) {
      // Can hit player
      if (Math.hypot(p.x - player.x, p.y - player.y) < player.radius + p.radius) {
        damagePlayer(player, p.damage, p.x, p.y);
        sfxHurt();
        hit = true;
      }
      // Infighting: enemy projectiles can hit other enemies
      for (const e of enemies) {
        if (!e.alive || e === p.owner) continue;
        if (Math.hypot(p.x - e.x, p.y - e.y) < e.radius + p.radius) {
          hurtEnemy(e, player, p.damage, particles, p.owner);
          hit = true;
          break;
        }
      }
    } else if (!hit && !p.fromEnemy) {
      for (const e of enemies) {
        if (!e.alive) continue;
        if (Math.hypot(p.x - e.x, p.y - e.y) < e.radius + p.radius) {
          hurtEnemy(e, player, p.damage, particles, null);
          hit = true;
          break;
        }
      }
    }

    if (hit) {
      if (p.splash > 0) {
        sfxExplosion();
        splashDamage(enemies, player, p.x, p.y, p.splash, p.splashDamage || p.damage * 0.5, p.fromEnemy, particles, p.owner);
        if (p.kind === 'bfg' && !p.fromEnemy) {
          for (const e of enemies) {
            if (!e.alive) continue;
            const d = Math.hypot(e.x - player.x, e.y - player.y);
            if (d < 16 && canSee(map, player.x, player.y, e.x, e.y)) {
              hurtEnemy(e, player, 40, particles, null);
            }
          }
        }
      }
      projectiles.splice(i, 1);
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
  particles: Particle[],
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

  if (!closest) {
    // Wall puff at end of range
    const hx = ox + aimX * Math.min(range, 4);
    const hy = oy + aimY * Math.min(range, 4);
    spawnPuff(particles, hx, hy);
    return false;
  }
  const falloff = Math.max(0.45, 1 - closestDist / (range + 2));
  hurtEnemy(closest, player, damage * falloff, particles, null);
  return true;
}

export function playerShoot(
  enemies: Enemy[],
  projectiles: Projectile[],
  map: LevelMap,
  player: Player,
  weaponId: WeaponId,
  particles: Particle[],
): void {
  const weap = WEAPONS[weaponId];
  const dmgMul = player.berserkTimer > 0 && (weaponId === 'fist' || weaponId === 'chainsaw') ? 10 : 1;

  if (weap.fireMode === 'melee') {
    sfxMelee(weaponId);
    hitscanOne(enemies, map, player.x, player.y, player.angle, weap.range, weap.damage * dmgMul, player, particles);
    return;
  }

  if (weap.fireMode === 'projectile') {
    const spd = weap.projSpeed ?? 10;
    const kind: ProjKind =
      weaponId === 'rocket' ? 'rocket' :
      weaponId === 'bfg' ? 'bfg' : 'plasma';
    projectiles.push({
      x: player.x + Math.cos(player.angle) * 0.4,
      y: player.y + Math.sin(player.angle) * 0.4,
      vx: Math.cos(player.angle) * spd,
      vy: Math.sin(player.angle) * spd,
      damage: weap.damage,
      radius: weaponId === 'bfg' ? 0.35 : weaponId === 'rocket' ? 0.2 : 0.12,
      life: 5,
      fromEnemy: false,
      kind,
      splash: weap.splash ?? 0,
      splashDamage: weap.splashDamage ?? 0,
      owner: null,
    });
    return;
  }

  for (let i = 0; i < weap.pellets; i++) {
    const spread = (Math.random() * 2 - 1) * weap.spread;
    hitscanOne(enemies, map, player.x, player.y, player.angle + spread, weap.range, weap.damage, player, particles);
  }
}

export function aliveCount(enemies: Enemy[]): number {
  return enemies.filter((e) => e.alive).length;
}

export function totalEnemyCount(enemies: Enemy[]): number {
  return enemies.length;
}
