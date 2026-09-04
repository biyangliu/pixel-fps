/** Tile types in the level map */
export enum Tile {
  Empty = 0,
  WallBrick = 1,
  WallStone = 2,
  WallMetal = 3,
  WallTech = 4,
  Exit = 5,
}

export interface Pickup {
  x: number;
  y: number;
  kind: 'health' | 'ammo';
  amount: number;
  taken: boolean;
}

export interface LevelMap {
  width: number;
  height: number;
  tiles: number[];
  floorColor: number;
  ceilColor: number;
  pickups: Pickup[];
  spawn: { x: number; y: number; angle: number };
  enemySpawns: { x: number; y: number; type: 'grunt' | 'shooter' }[];
}

/** 0 = empty, 1-4 = walls, 5 = exit trigger (walkable) */
const RAW = `
####################
#..................#
#.####.####.####...#
#.#..#.#..#.#..#...#
#.#..#.#..#.#..#.#.#
#.####.####.####.#.#
#..................#
#.####..####..####.#
#.#..#..#..#..#..#.#
#.#..#..#..#..#..#.#
#.####..####..####.#
#..................#
#.###.###.###.###..#
#.#.#.#.#.#.#.#.#..#
#.#.#.#.#.#.#.#.#..#
#.###.###.###.###..#
#..................#
#.####........####.#
#.#..........E...#.#
####################
`.trim().split('\n');

function charToTile(c: string): number {
  switch (c) {
    case '#': return Tile.WallBrick;
    case 'E': return Tile.Exit;
    case '.':
    case ' ':
    default: return Tile.Empty;
  }
}

export function createLevel(): LevelMap {
  const height = RAW.length;
  const width = RAW[0].length;
  const tiles: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let t = charToTile(RAW[y][x] ?? '#');
      // Vary wall textures for visual interest
      if (t === Tile.WallBrick) {
        const variety = (x * 3 + y * 7) % 4;
        if (variety === 1) t = Tile.WallStone;
        else if (variety === 2) t = Tile.WallMetal;
        else if (variety === 3 && (x + y) % 5 === 0) t = Tile.WallTech;
      }
      tiles.push(t);
    }
  }

  const pickups: Pickup[] = [
    { x: 3.5, y: 3.5, kind: 'health', amount: 25, taken: false },
    { x: 10.5, y: 3.5, kind: 'ammo', amount: 12, taken: false },
    { x: 16.5, y: 3.5, kind: 'health', amount: 25, taken: false },
    { x: 3.5, y: 9.5, kind: 'ammo', amount: 12, taken: false },
    { x: 16.5, y: 9.5, kind: 'health', amount: 40, taken: false },
    { x: 10.5, y: 11.5, kind: 'ammo', amount: 20, taken: false },
    { x: 5.5, y: 15.5, kind: 'health', amount: 25, taken: false },
    { x: 14.5, y: 15.5, kind: 'ammo', amount: 15, taken: false },
  ];

  const enemySpawns: LevelMap['enemySpawns'] = [
    { x: 8.5, y: 3.5, type: 'grunt' },
    { x: 14.5, y: 5.5, type: 'shooter' },
    { x: 5.5, y: 7.5, type: 'grunt' },
    { x: 12.5, y: 8.5, type: 'shooter' },
    { x: 3.5, y: 12.5, type: 'grunt' },
    { x: 16.5, y: 12.5, type: 'shooter' },
    { x: 8.5, y: 14.5, type: 'grunt' },
    { x: 12.5, y: 14.5, type: 'shooter' },
    { x: 10.5, y: 16.5, type: 'grunt' },
    { x: 15.5, y: 17.5, type: 'shooter' },
  ];

  return {
    width,
    height,
    tiles,
    floorColor: 0x2a1f14,
    ceilColor: 0x1a1520,
    pickups,
    spawn: { x: 1.5, y: 1.5, angle: 0 },
    enemySpawns,
  };
}

export function getTile(map: LevelMap, x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= map.width || iy >= map.height) return Tile.WallBrick;
  return map.tiles[iy * map.width + ix];
}

export function isSolid(map: LevelMap, x: number, y: number): boolean {
  const t = getTile(map, x, y);
  return t !== Tile.Empty && t !== Tile.Exit;
}

export function isExit(map: LevelMap, x: number, y: number): boolean {
  return getTile(map, x, y) === Tile.Exit;
}

export function resetPickups(map: LevelMap): void {
  for (const p of map.pickups) p.taken = false;
}
