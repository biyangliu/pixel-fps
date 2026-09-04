import type { LevelMap, PickupKind } from './map';
import { isSolid, isExit, tryOpenNearbyDoors } from './map';
import type { InputState } from './input';
import { consumeMouseDelta, consumeWeaponSwitch, consumeScrollWeapon } from './input';
import { WEAPONS, weaponBySlot, type WeaponId, type AmmoType } from './weapons';
import { sfxPickup, sfxKey, sfxDoor, sfxShoot } from './audio';

export interface Player {
  x: number;
  y: number;
  angle: number;
  pitch: number;
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  ammo: Record<AmmoType, number>;
  maxAmmo: Record<AmmoType, number>;
  weapons: Record<WeaponId, boolean>;
  currentWeapon: WeaponId;
  shootCooldown: number;
  hurtFlash: number;
  pickupFlash: number;
  muzzleFlash: number;
  radius: number;
  score: number;
  kills: number;
  hasKey: boolean;
  /** Semi-auto edge: was shoot held last frame */
  wasShooting: boolean;
}

export function createPlayer(spawn: { x: number; y: number; angle: number }): Player {
  return {
    x: spawn.x,
    y: spawn.y,
    angle: spawn.angle,
    pitch: 0,
    hp: 100,
    maxHp: 100,
    armor: 0,
    maxArmor: 200,
    ammo: { bullets: 50, shells: 0 },
    maxAmmo: { bullets: 200, shells: 50 },
    weapons: { pistol: true, shotgun: false, chaingun: false },
    currentWeapon: 'pistol',
    shootCooldown: 0,
    hurtFlash: 0,
    pickupFlash: 0,
    muzzleFlash: 0,
    radius: 0.22,
    score: 0,
    kills: 0,
    hasKey: false,
    wasShooting: false,
  };
}

export function resetPlayer(player: Player, spawn: { x: number; y: number; angle: number }): void {
  player.x = spawn.x;
  player.y = spawn.y;
  player.angle = spawn.angle;
  player.pitch = 0;
  player.hp = player.maxHp;
  player.armor = 0;
  player.ammo.bullets = 50;
  player.ammo.shells = 0;
  player.weapons.pistol = true;
  player.weapons.shotgun = false;
  player.weapons.chaingun = false;
  player.currentWeapon = 'pistol';
  player.shootCooldown = 0;
  player.hurtFlash = 0;
  player.pickupFlash = 0;
  player.muzzleFlash = 0;
  player.score = 0;
  player.kills = 0;
  player.hasKey = false;
  player.wasShooting = false;
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

function switchWeapon(player: Player, id: WeaponId | null): void {
  if (!id) return;
  if (player.weapons[id]) player.currentWeapon = id;
}

function cycleWeapon(player: Player, dir: number): void {
  const order: WeaponId[] = ['pistol', 'shotgun', 'chaingun'];
  let idx = order.indexOf(player.currentWeapon);
  for (let i = 0; i < order.length; i++) {
    idx = (idx + dir + order.length) % order.length;
    if (player.weapons[order[idx]]) {
      player.currentWeapon = order[idx];
      return;
    }
  }
}

function applyPickup(player: Player, kind: PickupKind, amount: number): boolean {
  switch (kind) {
    case 'health':
      if (player.hp >= player.maxHp) return false;
      player.hp = Math.min(player.maxHp, player.hp + amount);
      sfxPickup();
      return true;
    case 'armor':
      if (player.armor >= 100 && amount <= 50) return false;
      player.armor = Math.min(player.maxArmor, player.armor + amount);
      sfxPickup();
      return true;
    case 'megaarmor':
      player.armor = Math.min(player.maxArmor, Math.max(player.armor, amount));
      sfxPickup();
      return true;
    case 'bullets':
      if (player.ammo.bullets >= player.maxAmmo.bullets) return false;
      player.ammo.bullets = Math.min(player.maxAmmo.bullets, player.ammo.bullets + amount);
      sfxPickup();
      return true;
    case 'shells':
      if (player.ammo.shells >= player.maxAmmo.shells) return false;
      player.ammo.shells = Math.min(player.maxAmmo.shells, player.ammo.shells + amount);
      sfxPickup();
      return true;
    case 'key':
      if (player.hasKey) return false;
      player.hasKey = true;
      sfxKey();
      return true;
    case 'weapon_shotgun':
      player.weapons.shotgun = true;
      player.ammo.shells = Math.min(player.maxAmmo.shells, player.ammo.shells + 8);
      player.currentWeapon = 'shotgun';
      sfxPickup();
      return true;
    case 'weapon_chaingun':
      player.weapons.chaingun = true;
      player.ammo.bullets = Math.min(player.maxAmmo.bullets, player.ammo.bullets + 40);
      player.currentWeapon = 'chaingun';
      sfxPickup();
      return true;
    default:
      return false;
  }
}

export function updatePlayer(
  player: Player,
  map: LevelMap,
  input: InputState,
  dt: number,
): { fired: boolean; reachedExit: boolean; openedDoor: boolean } {
  const { dx } = consumeMouseDelta(input);
  player.angle += dx * 0.0025;

  const slot = consumeWeaponSwitch(input);
  if (slot) switchWeapon(player, weaponBySlot(slot));
  const scroll = consumeScrollWeapon(input);
  if (scroll) cycleWeapon(player, scroll);

  const speed = 3.0;
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

  // Auto-open locked doors when carrying the key and adjacent
  let openedDoor = false;
  if (player.hasKey && tryOpenNearbyDoors(map, player.x, player.y, true)) {
    openedDoor = true;
    map.hasKey = true;
    sfxDoor();
  }

  if (player.shootCooldown > 0) player.shootCooldown -= dt;
  if (player.hurtFlash > 0) player.hurtFlash -= dt;
  if (player.pickupFlash > 0) player.pickupFlash -= dt;
  if (player.muzzleFlash > 0) player.muzzleFlash -= dt;

  const weap = WEAPONS[player.currentWeapon];
  let fired = false;
  const wantsShoot = input.shoot;
  const trigger =
    weap.automatic
      ? wantsShoot
      : wantsShoot && !player.wasShooting;
  player.wasShooting = wantsShoot;

  if (trigger && player.shootCooldown <= 0) {
    const ammo = player.ammo[weap.ammoType];
    if (ammo >= weap.ammoPerShot) {
      player.ammo[weap.ammoType] -= weap.ammoPerShot;
      player.shootCooldown = weap.cooldown;
      player.muzzleFlash = weap.id === 'chaingun' ? 0.05 : 0.1;
      fired = true;
      sfxShoot(weap.id);
    }
  }

  for (const p of map.pickups) {
    if (p.taken) continue;
    if (Math.hypot(p.x - player.x, p.y - player.y) < 0.55) {
      if (applyPickup(player, p.kind, p.amount)) {
        p.taken = true;
        player.pickupFlash = 0.2;
        if (p.kind === 'key') map.hasKey = true;
      }
    }
  }

  return { fired, reachedExit: isExit(map, player.x, player.y), openedDoor };
}

/** Armor absorbs ~1/3 of damage (classic-ish), remainder to HP. */
export function damagePlayer(player: Player, amount: number): void {
  let dmg = amount;
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, Math.ceil(dmg * 0.33));
    player.armor -= absorbed;
    dmg -= absorbed;
  }
  player.hp = Math.max(0, player.hp - dmg);
  player.hurtFlash = 0.28;
}
