/** Sector Zero — hand-authored episode map (original layout). */

export enum Tile {
  Empty = 0,
  WallBrick = 1,
  WallStone = 2,
  WallMetal = 3,
  WallTech = 4,
  Exit = 5,
  Door = 6,
  DoorRed = 7,
  DoorYellow = 8,
  DoorBlue = 9,
  WallBlood = 10,
  Lift = 11,
  Switch = 12,
  SecretWall = 13,
  WallComputer = 14,
  WallExitSign = 15,
  Nukage = 16,
  Teleporter = 17,
  Crusher = 18,
}

export type KeyColor = 'red' | 'yellow' | 'blue';

export type PickupKind =
  | 'health' | 'stim' | 'bonus' | 'armor' | 'armorbonus' | 'megaarmor' | 'soulsphere'
  | 'berserk' | 'invis' | 'invuln' | 'lightamp' | 'radsuit' | 'backpack' | 'allmap'
  | 'bullets' | 'shells' | 'rockets' | 'cells'
  | 'key_red' | 'key_yellow' | 'key_blue'
  | 'weapon_chainsaw' | 'weapon_shotgun' | 'weapon_chaingun'
  | 'weapon_rocket' | 'weapon_plasma' | 'weapon_bfg';

export interface Pickup {
  x: number; y: number; kind: PickupKind; amount: number; taken: boolean; secret?: boolean;
}

export type EnemyType =
  | 'trooper' | 'shotgunner' | 'imp' | 'demon' | 'spectre' | 'soul' | 'caco' | 'baron';

export interface DoorState {
  x: number; y: number; open: number; opening: boolean; keyed: KeyColor | null; timer: number;
  wasOpen?: boolean;
}

export interface LiftState {
  x: number; y: number; pos: number; moving: number; low: number; high: number;
}

export interface SwitchState {
  x: number; y: number; on: boolean; action: string; targetId: number;
}

export interface ClosetTrigger {
  x0: number; y0: number; x1: number; y1: number;
  doorCells: { x: number; y: number }[];
  fired: boolean;
  toast?: string;
}

export interface Teleporter {
  x: number; y: number; destX: number; destY: number; destAngle: number;
}

export interface CrusherState {
  x: number; y: number; pos: number; dir: number; active: boolean;
}

export interface LevelMap {
  width: number;
  height: number;
  tiles: number[];
  floorH: Float32Array;
  ceilH: Float32Array;
  light: Float32Array;
  floorType: Uint8Array; // 0 normal, 1 nukage
  floorColor: number;
  ceilColor: number;
  pickups: Pickup[];
  spawn: { x: number; y: number; angle: number };
  enemySpawns: { x: number; y: number; type: EnemyType; closet?: boolean }[];
  doors: DoorState[];
  lifts: LiftState[];
  switches: SwitchState[];
  closets: ClosetTrigger[];
  teleporters: Teleporter[];
  crushers: CrusherState[];
  secretsFound: number;
  secretsTotal: number;
  gunLight: number;
  explored: Uint8Array;
}

/**
 * SECTOR ZERO — verified critical path (48×29):
 *  Start → stim/shotgun → red key room → RED door → chaingun + yellow key
 *  → YELLOW door → lift/switch corridor + blue key → BLUE door → baron/exit
 *  Optional: chainsaw/berserk, rockets/demon pit, nukage+radsuit, teleporter, secrets
 */
const RAW = `
################################################
#S....###..##....#............##################
#.....#..d.h.....#............#................#
#..TT.d..........#....####....d................#
#.....#....s.....#....#..#....#................#
#..####..........######..######................#
#.....#........................................#
#.....d..########..............................#
#..####..#..R...#......ii..............#########
#........#......#................c.....r..Y....#
#........###d####..#####d######........#.......#
#...............#..#.........#.........#.......#
#...............#..#....~~...#.........#.......#
#...............#..#....~~...#.........####y####
##########......####.........##........#.......#
#........#.........#..C.......#........#..L....#
#........d.........#..........#........#.......#
#........#...######..####d#####........#..W....#
#####.####...#....#..#......#..........#.......#
#...#........#....#..#..D...#..........#..B....#
#.K.d......P.#....#..#......#..........#.......#
#...#........#....#..###d####.......######b#####
#####.######.#....#.................#.......E..#
#..........#.#....#.................#..........#
#..........#.#....#.............################
#.....###..###....##############.............###
#.....#.#.......................*###############
#.....#*d......................................#
################################################
`.trim().split('\n');

function charToTile(c: string): number {
  switch (c) {
    case '#': return Tile.WallBrick;
    case '*': return Tile.SecretWall;
    case 'E': return Tile.Exit;
    case 'd': return Tile.Door;
    case 'r': return Tile.DoorRed;
    case 'y': return Tile.DoorYellow;
    case 'b': return Tile.DoorBlue;
    case 'L': return Tile.Lift;
    case 'W': return Tile.Switch;
    case '~': return Tile.Nukage;
    default: return Tile.Empty;
  }
}

function findChars(ch: string): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < RAW.length; y++) {
    for (let x = 0; x < RAW[y].length; x++) {
      if (RAW[y][x] === ch) out.push({ x: x + 0.5, y: y + 0.5 });
    }
  }
  return out;
}

function isWalkableTile(t: number): boolean {
  return t === Tile.Empty || t === Tile.Exit || t === Tile.Lift || t === Tile.Switch ||
    t === Tile.Nukage || t === Tile.Teleporter || t === Tile.Crusher;
}

function buildLight(width: number, height: number, tiles: number[]): Float32Array {
  const light = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const t = tiles[i];
      if (!isWalkableTile(t) && t !== Tile.Door && t !== Tile.DoorRed &&
          t !== Tile.DoorYellow && t !== Tile.DoorBlue) {
        light[i] = 0.48;
        continue;
      }
      let wallNear = 0;
      for (let oy = -2; oy <= 2; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          const nx = x + ox; const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) { wallNear++; continue; }
          const nt = tiles[ny * width + nx];
          if (!isWalkableTile(nt) && nt !== Tile.Door && nt !== Tile.DoorRed &&
              nt !== Tile.DoorYellow && nt !== Tile.DoorBlue) wallNear++;
        }
      }
      let L = 0.34 + (1 - wallNear / 25) * 0.44;
      if (t === Tile.Exit) L = 1.05;
      if (t === Tile.Nukage) L = 0.7;
      if (t === Tile.Teleporter) L = 0.95;
      if (wallNear > 14) L *= 0.7;
      if (x < 8 && y < 8) L *= 0.82;
      light[i] = Math.max(0.18, Math.min(1.1, L));
    }
  }
  return light;
}

export function createLevel(): LevelMap {
  const height = RAW.length;
  const width = Math.max(...RAW.map((r) => r.length));
  const tiles: number[] = [];
  const floorH = new Float32Array(width * height);
  const ceilH = new Float32Array(width * height);
  const floorType = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const row = RAW[y].padEnd(width, '#');
    for (let x = 0; x < width; x++) {
      const ch = row[x] ?? '#';
      let t = charToTile(ch);
      if (t === Tile.WallBrick) {
        const variety = (x * 3 + y * 7) % 7;
        if (variety === 1) t = Tile.WallStone;
        else if (variety === 2) t = Tile.WallMetal;
        else if (variety === 3 && (x + y) % 5 === 0) t = Tile.WallTech;
        else if (variety === 4 && (x * y) % 11 === 0) t = Tile.WallBlood;
        else if (variety === 5 && (x + y * 2) % 13 === 0) t = Tile.WallComputer;
      }
      tiles.push(t);
      const i = y * width + x;
      floorH[i] = 0;
      ceilH[i] = 1;
      floorType[i] = t === Tile.Nukage ? 1 : 0;
      if (t === Tile.Nukage) {
        tiles[i] = Tile.Empty;
        floorType[i] = 1;
        t = Tile.Empty;
      }
      if (t === Tile.Exit) floorH[i] = 0.12;
      if (x >= 39 && x <= 45 && y >= 14 && y <= 20 && isWalkableTile(t)) {
        floorH[i] = 0.04;
      }
    }
  }

  // Place EXIT sign wall next to exit pad
  const exitCells = findChars('E');
  if (exitCells[0]) {
    const ex = Math.floor(exitCells[0].x);
    const ey = Math.floor(exitCells[0].y);
    // North wall of exit room gets exit sign if solid
    if (ey > 0) {
      const ni = (ey - 1) * width + ex;
      if (tiles[ni] !== Tile.Empty && tiles[ni] !== Tile.Exit) {
        tiles[ni] = Tile.WallExitSign;
      }
    }
  }

  // Teleporter: lower arsenal → mid gallery (optional shortcut)
  const teleX = 8; const teleY = 20;
  if (tiles[teleY * width + teleX] === Tile.Empty) {
    tiles[teleY * width + teleX] = Tile.Teleporter;
  }
  const teleDestX = 22; const teleDestY = 9;

  // Crusher in demon pit corridor
  const crushers: CrusherState[] = [];
  const cx = 24; const cy = 19;
  if (tiles[cy * width + cx] === Tile.Empty) {
    tiles[cy * width + cx] = Tile.Crusher;
    crushers.push({ x: cx, y: cy, pos: 0, dir: 1, active: true });
  }

  const doors: DoorState[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = tiles[y * width + x];
      if (t === Tile.Door || t === Tile.DoorRed || t === Tile.DoorYellow || t === Tile.DoorBlue) {
        let keyed: KeyColor | null = null;
        if (t === Tile.DoorRed) keyed = 'red';
        if (t === Tile.DoorYellow) keyed = 'yellow';
        if (t === Tile.DoorBlue) keyed = 'blue';
        doors.push({ x, y, open: 0, opening: false, keyed, timer: 0, wasOpen: false });
      }
    }
  }

  const closetDoor2 = { x: 18, y: 18 };
  if ([Tile.WallBrick, Tile.WallStone, Tile.WallMetal, Tile.WallTech, Tile.WallBlood, Tile.WallComputer]
    .includes(tiles[closetDoor2.y * width + closetDoor2.x])) {
    tiles[closetDoor2.y * width + closetDoor2.x] = Tile.Door;
    doors.push({ x: closetDoor2.x, y: closetDoor2.y, open: 0, opening: false, keyed: null, timer: 0, wasOpen: false });
  }

  const lifts: LiftState[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y * width + x] === Tile.Lift) {
        lifts.push({ x, y, pos: 0, moving: 0, low: 0, high: 0.42 });
      }
    }
  }

  const switches: SwitchState[] = [];
  for (const p of findChars('W')) {
    switches.push({
      x: Math.floor(p.x), y: Math.floor(p.y), on: false, action: 'lift', targetId: 0,
    });
  }

  const spawn = findChars('S')[0] ?? { x: 1.5, y: 1.5 };
  const redKey = findChars('R')[0]!;
  const yelKey = findChars('Y')[0]!;
  const bluKey = findChars('B')[0]!;
  const shotgun = findChars('s')[0]!;
  const stim = findChars('h')[0]!;
  const chaingun = findChars('c')[0]!;
  const chainsaw = findChars('C')[0]!;
  const rocket = findChars('P')[0]!;
  const berserk = findChars('K')[0]!;
  const exitPad = findChars('E')[0]!;

  const pickups: Pickup[] = [
    { x: stim.x, y: stim.y, kind: 'stim', amount: 10, taken: false },
    { x: shotgun.x, y: shotgun.y, kind: 'weapon_shotgun', amount: 1, taken: false },
    { x: shotgun.x - 1, y: shotgun.y, kind: 'shells', amount: 8, taken: false },
    { x: 4.5, y: 1.5, kind: 'bonus', amount: 1, taken: false },
    { x: 3.5, y: 1.5, kind: 'armorbonus', amount: 1, taken: false },
    { x: 14.5, y: 3.5, kind: 'bullets', amount: 20, taken: false },
    { x: redKey.x, y: redKey.y, kind: 'key_red', amount: 1, taken: false },
    { x: redKey.x - 1, y: redKey.y + 1, kind: 'armor', amount: 25, taken: false },
    { x: redKey.x + 1, y: redKey.y, kind: 'shells', amount: 8, taken: false },
    { x: chaingun.x, y: chaingun.y, kind: 'weapon_chaingun', amount: 1, taken: false },
    { x: chaingun.x - 1, y: chaingun.y, kind: 'bullets', amount: 50, taken: false },
    { x: yelKey.x, y: yelKey.y, kind: 'key_yellow', amount: 1, taken: false },
    { x: yelKey.x, y: yelKey.y + 2, kind: 'weapon_plasma', amount: 1, taken: false },
    { x: yelKey.x, y: yelKey.y + 3, kind: 'cells', amount: 40, taken: false },
    { x: chainsaw.x, y: chainsaw.y, kind: 'weapon_chainsaw', amount: 1, taken: false },
    { x: berserk.x, y: berserk.y, kind: 'berserk', amount: 1, taken: false },
    { x: rocket.x, y: rocket.y, kind: 'weapon_rocket', amount: 1, taken: false },
    { x: rocket.x + 1, y: rocket.y, kind: 'rockets', amount: 5, taken: false },
    { x: 22.5, y: 11.5, kind: 'health', amount: 25, taken: false },
    { x: 26.5, y: 8.5, kind: 'shells', amount: 8, taken: false },
    { x: bluKey.x, y: bluKey.y, kind: 'key_blue', amount: 1, taken: false },
    { x: bluKey.x, y: bluKey.y - 1, kind: 'megaarmor', amount: 200, taken: false },
    { x: 40.5, y: 16.5, kind: 'cells', amount: 20, taken: false },
    { x: exitPad.x - 1, y: exitPad.y, kind: 'weapon_bfg', amount: 1, taken: false },
    { x: exitPad.x - 1, y: exitPad.y + 1, kind: 'soulsphere', amount: 100, taken: false },
    { x: exitPad.x, y: exitPad.y + 1, kind: 'cells', amount: 40, taken: false },
    // Nukage / radsuit
    { x: 22.5, y: 12.5, kind: 'radsuit', amount: 1, taken: false },
    { x: 21.5, y: 13.5, kind: 'backpack', amount: 1, taken: false },
    // Secrets
    { x: 7.5, y: 26.5, kind: 'invis', amount: 1, taken: false, secret: true },
    { x: 34.5, y: 25.5, kind: 'invuln', amount: 1, taken: false, secret: true },
    { x: 22.5, y: 22.5, kind: 'lightamp', amount: 1, taken: false },
    { x: 20.5, y: 15.5, kind: 'rockets', amount: 2, taken: false },
    { x: 15.5, y: 6.5, kind: 'bullets', amount: 15, taken: false },
    { x: 33.5, y: 6.5, kind: 'health', amount: 25, taken: false },
    { x: 12.5, y: 15.5, kind: 'allmap', amount: 1, taken: false },
    { x: 5.5, y: 16.5, kind: 'armorbonus', amount: 1, taken: false },
  ];

  const enemySpawns: LevelMap['enemySpawns'] = [
    { x: 3.5, y: 3.5, type: 'trooper' },
    { x: 4.5, y: 3.5, type: 'trooper' },
    { x: 12.5, y: 4.5, type: 'shotgunner' },
    { x: 9.5, y: 1.5, type: 'imp', closet: true },
    { x: 10.5, y: 1.5, type: 'trooper', closet: true },
    { x: 13.5, y: 8.5, type: 'shotgunner' },
    { x: 11.5, y: 9.5, type: 'imp' },
    { x: 22.5, y: 8.5, type: 'imp' },
    { x: 23.5, y: 8.5, type: 'imp' },
    { x: 20.5, y: 11.5, type: 'trooper' },
    { x: 31.5, y: 9.5, type: 'shotgunner' },
    { x: 28.5, y: 6.5, type: 'imp' },
    { x: 41.5, y: 11.5, type: 'soul' },
    { x: 42.5, y: 12.5, type: 'soul' },
    { x: 40.5, y: 10.5, type: 'caco' },
    { x: 12.5, y: 19.5, type: 'demon' },
    { x: 14.5, y: 20.5, type: 'demon' },
    { x: 16.5, y: 18.5, type: 'shotgunner' },
    { x: 15.5, y: 19.5, type: 'spectre' },
    { x: 19.5, y: 19.5, type: 'imp', closet: true },
    { x: 20.5, y: 20.5, type: 'shotgunner', closet: true },
    { x: 19.5, y: 20.5, type: 'soul', closet: true },
    { x: 25.5, y: 19.5, type: 'demon' },
    { x: 26.5, y: 20.5, type: 'imp' },
    { x: 23.5, y: 18.5, type: 'spectre' },
    { x: 41.5, y: 16.5, type: 'caco' },
    { x: 40.5, y: 18.5, type: 'shotgunner' },
    { x: 43.5, y: 22.5, type: 'baron' },
    { x: 41.5, y: 23.5, type: 'caco' },
    { x: 44.5, y: 23.5, type: 'imp' },
    { x: 42.5, y: 22.5, type: 'demon' },
  ];

  const closets: ClosetTrigger[] = [
    {
      x0: 6, y0: 1, x1: 12, y1: 5,
      doorCells: [{ x: 9, y: 2 }],
      fired: false,
      toast: 'TRAP!',
    },
    {
      x0: 10, y0: 17, x1: 16, y1: 21,
      doorCells: [closetDoor2],
      fired: false,
      toast: 'AMBUSH!',
    },
    {
      x0: 18, y0: 7, x1: 28, y1: 12,
      doorCells: [{ x: 24, y: 10 }],
      fired: false,
      toast: 'INCOMING!',
    },
  ];

  const teleporters: Teleporter[] = [
    { x: teleX, y: teleY, destX: teleDestX + 0.5, destY: teleDestY + 0.5, destAngle: 0 },
  ];

  return {
    width, height, tiles, floorH, ceilH, floorType,
    light: buildLight(width, height, tiles),
    floorColor: 0x16100e,
    ceilColor: 0x0a0810,
    pickups,
    spawn: { x: spawn.x, y: spawn.y, angle: 0 },
    enemySpawns,
    doors, lifts, switches, closets, teleporters, crushers,
    secretsFound: 0,
    secretsTotal: 2,
    gunLight: 0,
    explored: new Uint8Array(width * height),
  };
}

export function getTile(map: LevelMap, x: number, y: number): number {
  const ix = Math.floor(x); const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= map.width || iy >= map.height) return Tile.WallBrick;
  return map.tiles[iy * map.width + ix];
}

export function getLight(map: LevelMap, x: number, y: number): number {
  const ix = Math.floor(x); const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= map.width || iy >= map.height) return 0.4;
  let L = map.light[iy * map.width + ix];
  if (map.gunLight > 0) L = Math.min(1.25, L + map.gunLight * 0.5);
  return L;
}

export function getFloorH(map: LevelMap, x: number, y: number): number {
  const ix = Math.floor(x); const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= map.width || iy >= map.height) return 0;
  for (const lift of map.lifts) {
    if (lift.x === ix && lift.y === iy) return lift.low + (lift.high - lift.low) * lift.pos;
  }
  return map.floorH[iy * map.width + ix];
}

export function getCeilH(map: LevelMap, x: number, y: number): number {
  const ix = Math.floor(x); const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= map.width || iy >= map.height) return 1;
  for (const c of map.crushers) {
    if (c.x === ix && c.y === iy) return 1 - c.pos * 0.75;
  }
  return map.ceilH[iy * map.width + ix];
}

export function isNukage(map: LevelMap, x: number, y: number): boolean {
  const ix = Math.floor(x); const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= map.width || iy >= map.height) return false;
  return map.floorType[iy * map.width + ix] === 1;
}

export function doorAt(map: LevelMap, ix: number, iy: number): DoorState | null {
  for (const d of map.doors) if (d.x === ix && d.y === iy) return d;
  return null;
}

export function isSolid(map: LevelMap, x: number, y: number, eyeH = 0.5): boolean {
  const ix = Math.floor(x); const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= map.width || iy >= map.height) return true;
  const t = map.tiles[iy * map.width + ix];
  if (t === Tile.Empty || t === Tile.Exit || t === Tile.Lift || t === Tile.Switch ||
      t === Tile.Teleporter || t === Tile.Crusher) {
    const fh = getFloorH(map, x, y);
    if (fh > eyeH - 0.12 && fh > 0.28) return true;
    return false;
  }
  if (t === Tile.SecretWall) return true;
  if (t === Tile.Door || t === Tile.DoorRed || t === Tile.DoorYellow || t === Tile.DoorBlue) {
    const d = doorAt(map, ix, iy);
    return !d || d.open < 0.72;
  }
  return true;
}

export function isExit(map: LevelMap, x: number, y: number): boolean {
  return getTile(map, x, y) === Tile.Exit;
}

export function markExplored(map: LevelMap, px: number, py: number, radius = 8): void {
  const cx = Math.floor(px); const cy = Math.floor(py);
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= radius * radius) {
        map.explored[y * map.width + x] = 1;
      }
    }
  }
}

export function revealAllMap(map: LevelMap): void {
  map.explored.fill(1);
}

export function tryUse(
  map: LevelMap,
  px: number,
  py: number,
  angle: number,
  keys: Record<KeyColor, boolean>,
): { openedDoor: boolean; usedSwitch: boolean; secret: boolean; needKey: KeyColor | null; lift: boolean } {
  const fx = px + Math.cos(angle) * 1.15;
  const fy = py + Math.sin(angle) * 1.15;
  const ix = Math.floor(fx); const iy = Math.floor(fy);
  let openedDoor = false; let usedSwitch = false; let secret = false; let lift = false;
  let needKey: KeyColor | null = null;

  const tryDoor = (dx: number, dy: number) => {
    const d = doorAt(map, dx, dy);
    if (!d || d.opening || d.open > 0.05) return;
    if (d.keyed && !keys[d.keyed]) { needKey = d.keyed; return; }
    d.opening = true; d.timer = 5; openedDoor = true;
  };

  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      tryDoor(Math.floor(px) + ox, Math.floor(py) + oy);
      tryDoor(ix + ox, iy + oy);
    }
  }

  for (const sw of map.switches) {
    if (Math.hypot(sw.x + 0.5 - px, sw.y + 0.5 - py) > 1.45) continue;
    if (sw.on && sw.action !== 'lift') continue;
    sw.on = sw.action === 'lift' ? !sw.on : true;
    usedSwitch = true;
    if (sw.action === 'lift') {
      for (const lf of map.lifts) lf.moving = lf.pos < 0.5 ? 1 : -1;
      lift = true;
    } else if (sw.action === 'secret') {
      for (let i = 0; i < map.tiles.length; i++) {
        if (map.tiles[i] === Tile.SecretWall) {
          map.tiles[i] = Tile.Empty;
          secret = true;
        }
      }
      if (secret) map.secretsFound = Math.min(map.secretsTotal, map.secretsFound + 1);
    }
  }

  const secretTargets = [
    [ix, iy],
    [Math.floor(px), Math.floor(py)],
    [Math.floor(fx), Math.floor(fy)],
  ];
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      secretTargets.push([Math.floor(px) + ox, Math.floor(py) + oy]);
      secretTargets.push([ix + ox, iy + oy]);
    }
  }
  for (const [sx, sy] of secretTargets) {
    if (sx < 0 || sy < 0 || sx >= map.width || sy >= map.height) continue;
    if (map.tiles[sy * map.width + sx] === Tile.SecretWall) {
      map.tiles[sy * map.width + sx] = Tile.Empty;
      secret = true;
      map.secretsFound = Math.min(map.secretsTotal, map.secretsFound + 1);
    }
  }

  return { openedDoor, usedSwitch, secret, needKey, lift };
}

export function updateDoorsLifts(map: LevelMap, dt: number): { doorClosed: boolean } {
  let doorClosed = false;
  for (const d of map.doors) {
    if (d.opening) {
      d.open = Math.min(1, d.open + dt * 1.35);
      if (d.open >= 1) { d.opening = false; d.timer = 4; d.wasOpen = true; }
    } else if (d.open > 0) {
      d.timer -= dt;
      if (d.timer <= 0) {
        const prev = d.open;
        d.open = Math.max(0, d.open - dt * 1.1);
        if (prev > 0.1 && d.open <= 0.1) doorClosed = true;
      }
    }
  }
  for (const lift of map.lifts) {
    if (lift.moving === 0) continue;
    lift.pos += lift.moving * dt * 0.6;
    if (lift.pos >= 1) { lift.pos = 1; lift.moving = 0; }
    if (lift.pos <= 0) { lift.pos = 0; lift.moving = 0; }
  }
  for (const c of map.crushers) {
    if (!c.active) continue;
    c.pos += c.dir * dt * 0.55;
    if (c.pos >= 1) { c.pos = 1; c.dir = -1; }
    if (c.pos <= 0) { c.pos = 0; c.dir = 1; }
  }
  if (map.gunLight > 0) map.gunLight = Math.max(0, map.gunLight - dt * 3.5);
  return { doorClosed };
}

export function updateClosets(map: LevelMap, px: number, py: number): string | null {
  let toast: string | null = null;
  for (const c of map.closets) {
    if (c.fired) continue;
    if (px >= c.x0 && px <= c.x1 && py >= c.y0 && py <= c.y1) {
      c.fired = true;
      for (const cell of c.doorCells) {
        const d = doorAt(map, cell.x, cell.y);
        if (d) { d.opening = true; d.timer = 8; d.keyed = null; }
      }
      toast = c.toast ?? 'TRAP!';
    }
  }
  return toast;
}

export function tryTeleport(map: LevelMap, px: number, py: number): Teleporter | null {
  const ix = Math.floor(px); const iy = Math.floor(py);
  if (ix < 0 || iy < 0 || ix >= map.width || iy >= map.height) return null;
  if (map.tiles[iy * map.width + ix] !== Tile.Teleporter) return null;
  for (const t of map.teleporters) {
    if (t.x === ix && t.y === iy) return t;
  }
  return null;
}

export function resetPickups(map: LevelMap): void {
  for (const p of map.pickups) p.taken = false;
  map.secretsFound = 0;
  for (const d of map.doors) { d.open = 0; d.opening = false; d.timer = 0; d.wasOpen = false; }
  for (const lift of map.lifts) { lift.pos = 0; lift.moving = 0; }
  for (const sw of map.switches) sw.on = false;
  for (const c of map.closets) c.fired = false;
  for (const c of map.crushers) { c.pos = 0; c.dir = 1; }
  map.explored.fill(0);
}
