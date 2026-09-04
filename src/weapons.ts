/** Classic-style weapon ladder — original definitions, genre-inspired */

export type WeaponId =
  | 'fist'
  | 'chainsaw'
  | 'pistol'
  | 'shotgun'
  | 'chaingun'
  | 'rocket'
  | 'plasma'
  | 'bfg';

export type AmmoType = 'none' | 'bullets' | 'shells' | 'rockets' | 'cells';

export type FireMode = 'hitscan' | 'melee' | 'projectile';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  slot: number;
  ammoType: AmmoType;
  ammoPerShot: number;
  damage: number;
  pellets: number;
  spread: number;
  cooldown: number;
  automatic: boolean;
  range: number;
  fireMode: FireMode;
  /** Projectile speed when fireMode === projectile */
  projSpeed?: number;
  /** Splash radius for rockets / BFG residual */
  splash?: number;
  /** Extra splash damage */
  splashDamage?: number;
}

export const WEAPON_ORDER: WeaponId[] = [
  'fist',
  'chainsaw',
  'pistol',
  'shotgun',
  'chaingun',
  'rocket',
  'plasma',
  'bfg',
];

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  fist: {
    id: 'fist',
    name: 'FIST',
    slot: 1,
    ammoType: 'none',
    ammoPerShot: 0,
    damage: 12,
    pellets: 1,
    spread: 0,
    cooldown: 0.4,
    automatic: false,
    range: 1.15,
    fireMode: 'melee',
  },
  chainsaw: {
    id: 'chainsaw',
    name: 'CHAINSAW',
    slot: 1,
    ammoType: 'none',
    ammoPerShot: 0,
    damage: 8,
    pellets: 1,
    spread: 0,
    cooldown: 0.1,
    automatic: true,
    range: 1.25,
    fireMode: 'melee',
  },
  pistol: {
    id: 'pistol',
    name: 'PISTOL',
    slot: 2,
    ammoType: 'bullets',
    ammoPerShot: 1,
    damage: 15,
    pellets: 1,
    spread: 0.02,
    cooldown: 0.28,
    automatic: false,
    range: 18,
    fireMode: 'hitscan',
  },
  shotgun: {
    id: 'shotgun',
    name: 'SHOTGUN',
    slot: 3,
    ammoType: 'shells',
    ammoPerShot: 1,
    damage: 12,
    pellets: 7,
    spread: 0.14,
    cooldown: 0.78,
    automatic: false,
    range: 12,
    fireMode: 'hitscan',
  },
  chaingun: {
    id: 'chaingun',
    name: 'CHAINGUN',
    slot: 4,
    ammoType: 'bullets',
    ammoPerShot: 1,
    damage: 10,
    pellets: 1,
    spread: 0.05,
    cooldown: 0.09,
    automatic: true,
    range: 16,
    fireMode: 'hitscan',
  },
  rocket: {
    id: 'rocket',
    name: 'ROCKET',
    slot: 5,
    ammoType: 'rockets',
    ammoPerShot: 1,
    damage: 80,
    pellets: 1,
    spread: 0.01,
    cooldown: 0.85,
    automatic: false,
    range: 40,
    fireMode: 'projectile',
    projSpeed: 9,
    splash: 2.2,
    splashDamage: 60,
  },
  plasma: {
    id: 'plasma',
    name: 'PLASMA',
    slot: 6,
    ammoType: 'cells',
    ammoPerShot: 1,
    damage: 22,
    pellets: 1,
    spread: 0.03,
    cooldown: 0.08,
    automatic: true,
    range: 30,
    fireMode: 'projectile',
    projSpeed: 12,
  },
  bfg: {
    id: 'bfg',
    name: 'BFG9000',
    slot: 7,
    ammoType: 'cells',
    ammoPerShot: 40,
    damage: 200,
    pellets: 1,
    spread: 0,
    cooldown: 1.4,
    automatic: false,
    range: 40,
    fireMode: 'projectile',
    projSpeed: 8,
    splash: 4.5,
    splashDamage: 100,
  },
};

export function weaponBySlot(slot: number): WeaponId | null {
  // Slot 1 prefers chainsaw if owned, else fist
  if (slot === 1) return 'fist';
  if (slot === 2) return 'pistol';
  if (slot === 3) return 'shotgun';
  if (slot === 4) return 'chaingun';
  if (slot === 5) return 'rocket';
  if (slot === 6) return 'plasma';
  if (slot === 7) return 'bfg';
  return null;
}

export function resolveSlotWeapon(
  slot: number,
  owned: Record<WeaponId, boolean>,
): WeaponId | null {
  if (slot === 1) {
    if (owned.chainsaw) return 'chainsaw';
    return 'fist';
  }
  const id = weaponBySlot(slot);
  if (!id) return null;
  return owned[id] ? id : null;
}
