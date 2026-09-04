export type WeaponId = 'pistol' | 'shotgun' | 'chaingun';
export type AmmoType = 'bullets' | 'shells';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  slot: 1 | 2 | 3;
  ammoType: AmmoType;
  ammoPerShot: number;
  damage: number;
  /** Hitscan pellets (shotgun spread) */
  pellets: number;
  /** Spread half-angle in radians */
  spread: number;
  cooldown: number;
  /** Auto-fire while held */
  automatic: boolean;
  range: number;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  pistol: {
    id: 'pistol',
    name: 'PISTOL',
    slot: 1,
    ammoType: 'bullets',
    ammoPerShot: 1,
    damage: 15,
    pellets: 1,
    spread: 0.02,
    cooldown: 0.28,
    automatic: false,
    range: 16,
  },
  shotgun: {
    id: 'shotgun',
    name: 'SHOTGUN',
    slot: 2,
    ammoType: 'shells',
    ammoPerShot: 1,
    damage: 12,
    pellets: 7,
    spread: 0.14,
    cooldown: 0.75,
    automatic: false,
    range: 10,
  },
  chaingun: {
    id: 'chaingun',
    name: 'CHAINGUN',
    slot: 3,
    ammoType: 'bullets',
    ammoPerShot: 1,
    damage: 10,
    pellets: 1,
    spread: 0.05,
    cooldown: 0.09,
    automatic: true,
    range: 14,
  },
};

export function weaponBySlot(slot: number): WeaponId | null {
  if (slot === 1) return 'pistol';
  if (slot === 2) return 'shotgun';
  if (slot === 3) return 'chaingun';
  return null;
}
