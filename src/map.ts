/** Tile types in the level map */
export enum Tile {
  Empty = 0,
  WallBrick = 1,
  WallStone = 2,
  WallMetal = 3,
  WallTech = 4,
  Exit = 5,
  DoorLocked = 6,
  DoorOpen = 7,
  WallBlood = 8,
}

export type PickupKind =
  | 'health'
  | 'armor'
  | 'megaarmor'
  | 'bullets'
  | 'shells'
  | 'key'
  | 'weapon_shotgun'
  | 'weapon_chaingun';

export interface Pickup {
  x: number;
  y: number;
  kind: PickupKind;
  amount: number;
  taken: boolean;
}

export type EnemyType = 'grunt' | 'shooter' | 'tank';

export interface LevelMap {
  width: number;
  height: number;
  tiles: number[];
  /** Per-tile light multiplier 0.35–1.0 for sector-ish shading */
  light: Float32Array;
  floorColor: number;
  ceilColor: number;
  pickups: Pickup[];
  spawn: { x: number; y: number; angle: number };
  enemySpawns: { x: number; y: number; type: EnemyType }[];
  hasKey: boolean;
  exitUnlocked: boolean;
}

/**
 * Multi-room DOOM-like layout.
 * Legend: # wall  . floor  S spawn  E exit  D locked door  K key spot
 * Rooms: start → barracks → hub → armory → vault (key) → boss hall → exit chamber
 * Secret: hidden alcove off armory with megaarmor.
 */
const RAW = `
##########################################
#S....#..........#..........#............#
#.....#..........#..........#............#
#.....#...####...#...####...#............#
#.....#...#..#...#...#..#...##############
#.....#...#..#...#...#..#..............#.#
#.....#...#..####....#..#####...######.#.#
#.....#...#..........#..........#....#.#.#
#.............##................D..E.#.#.#
#...###...####..#####...###.....#....#.#.#
#...#.#.........#.......#.#.....######.#.#
#...#.#.........#.......#.#............#.#
#...#.###########...#####.#............#.#
#...#...........K.........#............#.#
#...#######################...##########.#
#........................................#
#..####..######################...####...#
#..#..#..#....................#...#..#...#
#..#..#..#..#########..####...#...#..#...#
#..#.....#..#.......#..#..#...#..........#
#..#######..#.......#..#..#...#######....#
#...........#...M...#..#..#..............#
#...........####.####..#..####...........#
#......................#.................#
#......................#.................#
##########################################
`.trim().split('\n');

function charToTile(c: string): number {
  switch (c) {
    case '#': return Tile.WallBrick;
    case 'E': return Tile.Exit;
    case 'D': return Tile.DoorLocked;
    case 'S':
    case 'H':
    case 'A':
    case 'K':
    case 'T':
    case 'M':
    case '.':
    case ' ':
    default: return Tile.Empty;
  }
}

function findChar(ch: string): { x: number; y: number } | null {
  for (let y = 0; y < RAW.length; y++) {
    const x = RAW[y].indexOf(ch);
    if (x >= 0) return { x: x + 0.5, y: y + 0.5 };
  }
  return null;
}

function buildLight(width: number, height: number, tiles: number[]): Float32Array {
  const light = new Float32Array(width * height);
  // Base dark; brighten near exits, pickups corridors, and room centers
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const t = tiles[i];
      if (t !== Tile.Empty && t !== Tile.Exit && t !== Tile.DoorOpen && t !== Tile.DoorLocked) {
        light[i] = 0.55;
        continue;
      }
      // Distance from walls → brighter in open rooms
      let wallNear = 0;
      for (let oy = -2; oy <= 2; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            wallNear++;
            continue;
          }
          const nt = tiles[ny * width + nx];
          if (nt !== Tile.Empty && nt !== Tile.Exit && nt !== Tile.DoorOpen) wallNear++;
        }
      }
      const open = 1 - wallNear / 25;
      let L = 0.42 + open * 0.35;
      if (t === Tile.Exit) L = 0.95;
      // Cooler darker corridors (narrow)
      if (wallNear > 12) L *= 0.75;
      light[i] = Math.max(0.28, Math.min(1, L));
    }
  }
  return light;
}

export function createLevel(): LevelMap {
  const height = RAW.length;
  const width = RAW[0].length;
  const tiles: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let t = charToTile(RAW[y][x] ?? '#');
      if (t === Tile.WallBrick) {
        const variety = (x * 3 + y * 7) % 5;
        if (variety === 1) t = Tile.WallStone;
        else if (variety === 2) t = Tile.WallMetal;
        else if (variety === 3 && (x + y) % 5 === 0) t = Tile.WallTech;
        else if (variety === 4 && (x * y) % 11 === 0) t = Tile.WallBlood;
      }
      tiles.push(t);
    }
  }

  const spawnPos = findChar('S') ?? { x: 1.5, y: 1.5 };
  const keyPos = findChar('K') ?? { x: 14.5, y: 13.5 };

  const pickups: Pickup[] = [
    { x: 2.5, y: 5.5, kind: 'health', amount: 25, taken: false },
    { x: 4.5, y: 2.5, kind: 'bullets', amount: 20, taken: false },
    { x: 9.5, y: 2.5, kind: 'armor', amount: 50, taken: false },
    { x: 11.5, y: 7.5, kind: 'shells', amount: 8, taken: false },
    { x: 8.5, y: 8.5, kind: 'health', amount: 25, taken: false },
    { x: 22.5, y: 2.5, kind: 'weapon_shotgun', amount: 1, taken: false },
    { x: 23.5, y: 7.5, kind: 'shells', amount: 12, taken: false },
    { x: 20.5, y: 8.5, kind: 'bullets', amount: 40, taken: false },
    { x: 23.5, y: 10.5, kind: 'armor', amount: 25, taken: false },
    { x: 14.5, y: 13.5, kind: 'health', amount: 40, taken: false },
    { x: 2.5, y: 18.5, kind: 'weapon_chaingun', amount: 1, taken: false },
    { x: 8.5, y: 21.5, kind: 'bullets', amount: 50, taken: false },
    { x: 14.5, y: 19.5, kind: 'shells', amount: 10, taken: false },
    { x: 18.5, y: 23.5, kind: 'health', amount: 25, taken: false },
    { x: 28.5, y: 21.5, kind: 'armor', amount: 50, taken: false },
    { x: 16.5, y: 21.5, kind: 'megaarmor', amount: 100, taken: false },
    { x: 29.5, y: 5.5, kind: 'health', amount: 40, taken: false },
    { x: 27.5, y: 2.5, kind: 'shells', amount: 8, taken: false },
    { x: 36.5, y: 15.5, kind: 'bullets', amount: 30, taken: false },
    { x: keyPos.x, y: keyPos.y, kind: 'key', amount: 1, taken: false },
  ];

  const enemySpawns: LevelMap['enemySpawns'] = [
    { x: 4.5, y: 4.5, type: 'grunt' },
    { x: 9.5, y: 5.5, type: 'grunt' },
    { x: 11.5, y: 5.5, type: 'shooter' },
    { x: 13.5, y: 1.5, type: 'tank' },
    { x: 15.5, y: 1.5, type: 'grunt' },
    { x: 16.5, y: 8.5, type: 'shooter' },
    { x: 18.5, y: 11.5, type: 'tank' },
    { x: 2.5, y: 14.5, type: 'tank' },
    { x: 5.5, y: 13.5, type: 'shooter' },
    { x: 9.5, y: 11.5, type: 'grunt' },
    { x: 12.5, y: 11.5, type: 'tank' },
    { x: 3.5, y: 24.5, type: 'grunt' },
    { x: 7.5, y: 17.5, type: 'shooter' },
    { x: 10.5, y: 19.5, type: 'tank' },
    { x: 13.5, y: 23.5, type: 'grunt' },
    { x: 17.5, y: 17.5, type: 'shooter' },
    { x: 21.5, y: 17.5, type: 'tank' },
    { x: 28.5, y: 10.5, type: 'shooter' },
    { x: 30.5, y: 10.5, type: 'tank' },
    { x: 32.5, y: 21.5, type: 'grunt' },
    { x: 35.5, y: 22.5, type: 'shooter' },
    { x: 38.5, y: 16.5, type: 'tank' },
  ];

  const light = buildLight(width, height, tiles);

  return {
    width,
    height,
    tiles,
    light,
    floorColor: 0x1a1210,
    ceilColor: 0x0c0a10,
    pickups,
    spawn: { x: spawnPos.x, y: spawnPos.y, angle: 0 },
    enemySpawns,
    hasKey: false,
    exitUnlocked: false,
  };
}

export function getTile(map: LevelMap, x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= map.width || iy >= map.height) return Tile.WallBrick;
  return map.tiles[iy * map.width + ix];
}

export function getLight(map: LevelMap, x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= map.width || iy >= map.height) return 0.4;
  return map.light[iy * map.width + ix];
}

export function isSolid(map: LevelMap, x: number, y: number): boolean {
  const t = getTile(map, x, y);
  return t !== Tile.Empty && t !== Tile.Exit && t !== Tile.DoorOpen;
}

export function isExit(map: LevelMap, x: number, y: number): boolean {
  return getTile(map, x, y) === Tile.Exit;
}

export function tryOpenDoor(map: LevelMap, x: number, y: number, hasKey: boolean): boolean {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= map.width || iy >= map.height) return false;
  const i = iy * map.width + ix;
  if (map.tiles[i] === Tile.DoorLocked) {
    if (!hasKey) return false;
    map.tiles[i] = Tile.DoorOpen;
    map.exitUnlocked = true;
    return true;
  }
  return false;
}

/** Probe adjacent tiles for locked doors the player can open with a key. */
export function tryOpenNearbyDoors(map: LevelMap, px: number, py: number, hasKey: boolean): boolean {
  if (!hasKey) return false;
  let opened = false;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      if (tryOpenDoor(map, px + ox, py + oy, hasKey)) opened = true;
    }
  }
  return opened;
}

export function resetPickups(map: LevelMap): void {
  for (const p of map.pickups) p.taken = false;
  map.hasKey = false;
  map.exitUnlocked = false;
  // Relock any opened doors
  for (let i = 0; i < map.tiles.length; i++) {
    if (map.tiles[i] === Tile.DoorOpen) map.tiles[i] = Tile.DoorLocked;
  }
}
