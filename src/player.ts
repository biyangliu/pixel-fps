import type { LevelMap, PickupKind, KeyColor } from './map';
import {
  isSolid, isExit, tryUse, getFloorH, getCeilH, updateDoorsLifts, updateClosets,
  isNukage, tryTeleport, markExplored, revealAllMap,
} from './map';
import type { InputState } from './input';
import {
  consumeMouseDelta, consumeWeaponSwitch, consumeScrollWeapon, consumeUse,
} from './input';
import {
  WEAPONS, WEAPON_ORDER, resolveSlotWeapon, type WeaponId, type AmmoType,
} from './weapons';
import {
  sfxPickup, sfxKey, sfxDoor, sfxShoot, sfxPowerup, sfxSwitch, sfxSecret,
  sfxEmptyClick, sfxLand, sfxSplash, sfxTeleport, sfxLift,
  startChainsawIdle, stopChainsawIdle,
} from './audio';

export type Skill = 1 | 2 | 3 | 4;

export interface Player {
  x: number;
  y: number;
  z: number;
  angle: number;
  pitch: number;
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  ammo: Record<Exclude<AmmoType, 'none'>, number>;
  maxAmmo: Record<Exclude<AmmoType, 'none'>, number>;
  weapons: Record<WeaponId, boolean>;
  currentWeapon: WeaponId;
  shootCooldown: number;
  hurtFlash: number;
  pickupFlash: number;
  muzzleFlash: number;
  radius: number;
  score: number;
  kills: number;
  keys: Record<KeyColor, boolean>;
  wasShooting: boolean;
  berserkTimer: number;
  invisTimer: number;
  invulnTimer: number;
  lightAmpTimer: number;
  radSuitTimer: number;
  hasBackpack: boolean;
  hasAllMap: boolean;
  faceLook: number;
  damageDir: number;
  damageDirTimer: number;
  skill: Skill;
  secrets: number;
  itemsPicked: number;
  itemsTotal: number;
  startTime: number;
  shake: number;
  moveBob: number;
  wasInNukage: boolean;
  floorDamageTimer: number;
  prevZ: number;
  teleportCooldown: number;
  moving: boolean;
}

const BASE_MAX_AMMO = { bullets: 200, shells: 50, rockets: 25, cells: 150 };
const PACK_MAX_AMMO = { bullets: 400, shells: 100, rockets: 50, cells: 300 };

export function createPlayer(spawn: { x: number; y: number; angle: number }, skill: Skill = 3): Player {
  const ammoMul = skill === 1 ? 1.5 : skill === 4 ? 0.75 : 1;
  return {
    x: spawn.x,
    y: spawn.y,
    z: 0.5,
    angle: spawn.angle,
    pitch: 0,
    hp: 100,
    maxHp: 100,
    armor: 0,
    maxArmor: 200,
    ammo: {
      bullets: Math.floor(50 * ammoMul),
      shells: 0,
      rockets: 0,
      cells: 0,
    },
    maxAmmo: { ...BASE_MAX_AMMO },
    weapons: {
      fist: true,
      chainsaw: false,
      pistol: true,
      shotgun: false,
      chaingun: false,
      rocket: false,
      plasma: false,
      bfg: false,
    },
    currentWeapon: 'pistol',
    shootCooldown: 0,
    hurtFlash: 0,
    pickupFlash: 0,
    muzzleFlash: 0,
    radius: 0.22,
    score: 0,
    kills: 0,
    keys: { red: false, yellow: false, blue: false },
    wasShooting: false,
    berserkTimer: 0,
    invisTimer: 0,
    invulnTimer: 0,
    lightAmpTimer: 0,
    radSuitTimer: 0,
    hasBackpack: false,
    hasAllMap: false,
    faceLook: 0,
    damageDir: 0,
    damageDirTimer: 0,
    skill,
    secrets: 0,
    itemsPicked: 0,
    itemsTotal: 0,
    startTime: performance.now(),
    shake: 0,
    moveBob: 0,
    wasInNukage: false,
    floorDamageTimer: 0,
    prevZ: 0.5,
    teleportCooldown: 0,
    moving: false,
  };
}

export function resetPlayer(player: Player, spawn: { x: number; y: number; angle: number }, skill?: Skill): void {
  const s = skill ?? player.skill;
  const fresh = createPlayer(spawn, s);
  Object.assign(player, fresh);
  stopChainsawIdle();
}

function tryMove(map: LevelMap, player: Player, nx: number, ny: number): void {
  const r = player.radius;
  const eye = player.z;
  if (!isSolid(map, nx - r, player.y - r, eye) &&
      !isSolid(map, nx + r, player.y - r, eye) &&
      !isSolid(map, nx - r, player.y + r, eye) &&
      !isSolid(map, nx + r, player.y + r, eye)) {
    player.x = nx;
  }
  if (!isSolid(map, player.x - r, ny - r, eye) &&
      !isSolid(map, player.x + r, ny - r, eye) &&
      !isSolid(map, player.x - r, ny + r, eye) &&
      !isSolid(map, player.x + r, ny + r, eye)) {
    player.y = ny;
  }
  const fh = getFloorH(map, player.x, player.y);
  player.z = 0.5 + fh;
}

function switchWeapon(player: Player, id: WeaponId | null): void {
  if (!id) return;
  if (player.weapons[id]) {
    player.currentWeapon = id;
    if (id === 'chainsaw') startChainsawIdle();
    else stopChainsawIdle();
  }
}

function cycleWeapon(player: Player, dir: number): void {
  let idx = WEAPON_ORDER.indexOf(player.currentWeapon);
  for (let i = 0; i < WEAPON_ORDER.length; i++) {
    idx = (idx + dir + WEAPON_ORDER.length) % WEAPON_ORDER.length;
    const id = WEAPON_ORDER[idx];
    if (player.weapons[id]) {
      switchWeapon(player, id);
      return;
    }
  }
}

function applyPickup(player: Player, kind: PickupKind, amount: number): boolean {
  switch (kind) {
    case 'stim':
    case 'health':
      if (player.hp >= player.maxHp) return false;
      player.hp = Math.min(player.maxHp, player.hp + amount);
      sfxPickup();
      return true;
    case 'bonus':
      player.hp = Math.min(player.maxHp + 50, player.hp + 1);
      player.score += 1;
      sfxPickup();
      return true;
    case 'soulsphere':
      player.hp = Math.min(200, player.hp + amount);
      sfxPowerup();
      return true;
    case 'armor':
      if (player.armor >= 100 && amount <= 50) return false;
      player.armor = Math.min(player.maxArmor, player.armor + amount);
      sfxPickup();
      return true;
    case 'armorbonus':
      player.armor = Math.min(player.maxArmor, player.armor + 1);
      player.score += 1;
      sfxPickup();
      return true;
    case 'megaarmor':
      player.armor = Math.min(player.maxArmor, Math.max(player.armor, amount));
      sfxPowerup();
      return true;
    case 'berserk':
      player.berserkTimer = 30;
      player.hp = Math.max(player.hp, 100);
      switchWeapon(player, 'fist');
      sfxPowerup();
      return true;
    case 'invis':
      player.invisTimer = 20;
      sfxPowerup();
      return true;
    case 'invuln':
      player.invulnTimer = 12;
      sfxPowerup();
      return true;
    case 'lightamp':
      player.lightAmpTimer = 40;
      sfxPowerup();
      return true;
    case 'radsuit':
      player.radSuitTimer = 60;
      sfxPowerup();
      return true;
    case 'backpack':
      if (player.hasBackpack) return false;
      player.hasBackpack = true;
      player.maxAmmo = { ...PACK_MAX_AMMO };
      player.ammo.bullets = Math.min(player.maxAmmo.bullets, player.ammo.bullets + 20);
      player.ammo.shells = Math.min(player.maxAmmo.shells, player.ammo.shells + 4);
      player.ammo.rockets = Math.min(player.maxAmmo.rockets, player.ammo.rockets + 1);
      player.ammo.cells = Math.min(player.maxAmmo.cells, player.ammo.cells + 20);
      sfxPowerup();
      return true;
    case 'allmap':
      player.hasAllMap = true;
      sfxPowerup();
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
    case 'rockets':
      if (player.ammo.rockets >= player.maxAmmo.rockets) return false;
      player.ammo.rockets = Math.min(player.maxAmmo.rockets, player.ammo.rockets + amount);
      sfxPickup();
      return true;
    case 'cells':
      if (player.ammo.cells >= player.maxAmmo.cells) return false;
      player.ammo.cells = Math.min(player.maxAmmo.cells, player.ammo.cells + amount);
      sfxPickup();
      return true;
    case 'key_red':
      if (player.keys.red) return false;
      player.keys.red = true;
      sfxKey();
      return true;
    case 'key_yellow':
      if (player.keys.yellow) return false;
      player.keys.yellow = true;
      sfxKey();
      return true;
    case 'key_blue':
      if (player.keys.blue) return false;
      player.keys.blue = true;
      sfxKey();
      return true;
    case 'weapon_chainsaw':
      player.weapons.chainsaw = true;
      switchWeapon(player, 'chainsaw');
      sfxPickup();
      return true;
    case 'weapon_shotgun':
      player.weapons.shotgun = true;
      player.ammo.shells = Math.min(player.maxAmmo.shells, player.ammo.shells + 8);
      switchWeapon(player, 'shotgun');
      sfxPickup();
      return true;
    case 'weapon_chaingun':
      player.weapons.chaingun = true;
      player.ammo.bullets = Math.min(player.maxAmmo.bullets, player.ammo.bullets + 40);
      switchWeapon(player, 'chaingun');
      sfxPickup();
      return true;
    case 'weapon_rocket':
      player.weapons.rocket = true;
      player.ammo.rockets = Math.min(player.maxAmmo.rockets, player.ammo.rockets + 2);
      switchWeapon(player, 'rocket');
      sfxPickup();
      return true;
    case 'weapon_plasma':
      player.weapons.plasma = true;
      player.ammo.cells = Math.min(player.maxAmmo.cells, player.ammo.cells + 40);
      switchWeapon(player, 'plasma');
      sfxPickup();
      return true;
    case 'weapon_bfg':
      player.weapons.bfg = true;
      player.ammo.cells = Math.min(player.maxAmmo.cells, player.ammo.cells + 40);
      switchWeapon(player, 'bfg');
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
): { fired: boolean; reachedExit: boolean; message: string | null } {
  const { dx } = consumeMouseDelta(input);
  player.angle += dx * 0.0025;
  player.faceLook += dt;

  const slot = consumeWeaponSwitch(input);
  if (slot) switchWeapon(player, resolveSlotWeapon(slot, player.weapons));
  const scroll = consumeScrollWeapon(input);
  if (scroll) cycleWeapon(player, scroll);

  const speed = player.berserkTimer > 0 ? 3.4 : 3.0;
  let mx = 0;
  let my = 0;
  if (input.forward) { mx += Math.cos(player.angle); my += Math.sin(player.angle); }
  if (input.back) { mx -= Math.cos(player.angle); my -= Math.sin(player.angle); }
  if (input.left) { mx += Math.cos(player.angle - Math.PI / 2); my += Math.sin(player.angle - Math.PI / 2); }
  if (input.right) { mx += Math.cos(player.angle + Math.PI / 2); my += Math.sin(player.angle + Math.PI / 2); }

  const len = Math.hypot(mx, my);
  player.moving = len > 0;
  if (player.moving) {
    mx = (mx / len) * speed * dt;
    my = (my / len) * speed * dt;
    tryMove(map, player, player.x + mx, player.y + my);
    player.moveBob += dt * 10;
  }

  // Landing thud
  if (player.z - player.prevZ < -0.08) sfxLand();
  player.prevZ = player.z;

  let message: string | null = null;
  if (consumeUse(input)) {
    const r = tryUse(map, player.x, player.y, player.angle, player.keys);
    if (r.openedDoor) { sfxDoor(false); message = 'DOOR OPENED'; }
    if (r.usedSwitch) { sfxSwitch(); message = 'SWITCH'; }
    if (r.lift) { sfxLift(); message = 'LIFT'; }
    if (r.secret) { sfxSecret(); player.secrets = map.secretsFound; message = 'A SECRET IS REVEALED!'; }
    if (r.needKey) message = `NEED ${r.needKey.toUpperCase()} KEY`;
  }

  const { doorClosed } = updateDoorsLifts(map, dt);
  if (doorClosed) sfxDoor(true);

  const closetToast = updateClosets(map, player.x, player.y);
  if (closetToast && !message) message = closetToast;

  // Teleporter
  if (player.teleportCooldown > 0) player.teleportCooldown -= dt;
  const tele = player.teleportCooldown <= 0 ? tryTeleport(map, player.x, player.y) : null;
  if (tele) {
    player.x = tele.destX;
    player.y = tele.destY;
    player.angle = tele.destAngle;
    player.teleportCooldown = 1.2;
    sfxTeleport();
    message = 'TELEPORT!';
    player.shake = Math.max(player.shake, 0.3);
  }

  // Keep doors from closing on player
  for (const d of map.doors) {
    if (d.open > 0 && d.open < 1 && Math.hypot(d.x + 0.5 - player.x, d.y + 0.5 - player.y) < 1.2) {
      d.timer = Math.max(d.timer, 1.5);
    }
  }

  // Nukage damage
  const inNuke = isNukage(map, player.x, player.y);
  if (inNuke && !player.wasInNukage) sfxSplash();
  player.wasInNukage = inNuke;
  if (inNuke) {
    player.floorDamageTimer -= dt;
    if (player.floorDamageTimer <= 0) {
      player.floorDamageTimer = 0.35;
      if (player.radSuitTimer <= 0 && player.invulnTimer <= 0) {
        damagePlayer(player, 5);
      }
    }
  } else {
    player.floorDamageTimer = 0;
  }

  // Crusher damage
  const ix = Math.floor(player.x);
  const iy = Math.floor(player.y);
  for (const c of map.crushers) {
    if (c.x === ix && c.y === iy && c.pos > 0.7) {
      damagePlayer(player, 20 * dt * 8);
      player.shake = Math.max(player.shake, 0.4);
    }
  }
  // Eye height under crusher
  const ch = getCeilH(map, player.x, player.y);
  if (ch < player.z + 0.15) {
    damagePlayer(player, 25 * dt);
  }

  markExplored(map, player.x, player.y, player.hasAllMap ? 40 : 7);
  if (player.hasAllMap) revealAllMap(map);

  if (player.shootCooldown > 0) player.shootCooldown -= dt;
  if (player.hurtFlash > 0) player.hurtFlash -= dt;
  if (player.pickupFlash > 0) player.pickupFlash -= dt;
  if (player.muzzleFlash > 0) player.muzzleFlash -= dt;
  if (player.damageDirTimer > 0) player.damageDirTimer -= dt;
  if (player.berserkTimer > 0) player.berserkTimer -= dt;
  if (player.invisTimer > 0) player.invisTimer -= dt;
  if (player.invulnTimer > 0) player.invulnTimer -= dt;
  if (player.lightAmpTimer > 0) player.lightAmpTimer -= dt;
  if (player.radSuitTimer > 0) player.radSuitTimer -= dt;
  if (player.shake > 0) player.shake = Math.max(0, player.shake - dt * 4.5);

  const weap = WEAPONS[player.currentWeapon];
  let fired = false;
  const wantsShoot = input.shoot;
  const trigger =
    weap.automatic
      ? wantsShoot
      : wantsShoot && !player.wasShooting;
  player.wasShooting = wantsShoot;

  if (trigger && player.shootCooldown <= 0) {
    let ammoOk = true;
    if (weap.ammoType !== 'none') {
      ammoOk = player.ammo[weap.ammoType] >= weap.ammoPerShot;
    }
    if (ammoOk) {
      if (weap.ammoType !== 'none') player.ammo[weap.ammoType] -= weap.ammoPerShot;
      player.shootCooldown = weap.cooldown;
      player.muzzleFlash = weap.automatic ? 0.05 : 0.12;
      map.gunLight = weap.id === 'bfg' ? 1.2 : weap.id === 'plasma' ? 0.7 : weap.id === 'shotgun' ? 1.0 : 0.85;
      player.shake = Math.max(player.shake,
        weap.id === 'bfg' ? 0.55 :
        weap.id === 'shotgun' ? 0.35 :
        weap.id === 'rocket' ? 0.28 :
        weap.id === 'chaingun' ? 0.12 :
        weap.id === 'plasma' ? 0.08 : 0.1);
      fired = true;
      sfxShoot(weap.id);
    } else {
      sfxEmptyClick();
      player.shootCooldown = 0.2;
      if (player.ammo.bullets > 0 && player.weapons.pistol) switchWeapon(player, 'pistol');
      else switchWeapon(player, player.weapons.chainsaw ? 'chainsaw' : 'fist');
    }
  }

  // Chainsaw idle management
  if (player.currentWeapon === 'chainsaw' && !fired) {
    // idle already running
  } else if (player.currentWeapon !== 'chainsaw') {
    stopChainsawIdle();
  }

  for (const p of map.pickups) {
    if (p.taken) continue;
    if (Math.hypot(p.x - player.x, p.y - player.y) < 0.55) {
      if (applyPickup(player, p.kind, p.amount)) {
        p.taken = true;
        player.pickupFlash = 0.2;
        player.itemsPicked++;
        if (p.kind === 'allmap') revealAllMap(map);
        if (p.secret) {
          if (map.secretsFound < map.secretsTotal) {
            map.secretsFound++;
            player.secrets = map.secretsFound;
          }
          message = 'SECRET STASH!';
          sfxSecret();
        }
      }
    }
  }

  return { fired, reachedExit: isExit(map, player.x, player.y), message };
}

export function damagePlayer(player: Player, amount: number, fromX?: number, fromY?: number): void {
  if (player.invulnTimer > 0) return;
  let dmg = amount;
  if (player.skill === 1) dmg *= 0.55;
  else if (player.skill === 2) dmg *= 0.8;
  else if (player.skill === 4) dmg *= 1.35;

  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, Math.ceil(dmg * 0.33));
    player.armor -= absorbed;
    dmg -= absorbed;
  }
  player.hp = Math.max(0, player.hp - dmg);
  player.hurtFlash = 0.28;
  player.shake = Math.max(player.shake, Math.min(0.5, amount * 0.02));
  if (fromX !== undefined && fromY !== undefined) {
    let a = Math.atan2(fromY - player.y, fromX - player.x) - player.angle;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    player.damageDir = a < 0 ? -1 : 1;
    player.damageDirTimer = 0.4;
  } else {
    player.damageDir = Math.random() < 0.5 ? -1 : 1;
    player.damageDirTimer = 0.35;
  }
}
