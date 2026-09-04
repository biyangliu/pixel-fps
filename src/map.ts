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
}

export type KeyColor = 'red' | 'yellow' | 'blue';

export type PickupKind =
  | 'health' | 'stim' | 'bonus' | 'armor' | 'megaarmor' | 'soulsphere'
  | 'berserk' | 'invis' | 'invuln' | 'lightamp'
  | 'bullets' | 'shells' | 'rockets' | 'cells'
  | 'key_red' | 'key_yellow' | 'key_blue'
  | 'weapon_chainsaw' | 'weapon_shotgun' | 'weapon_chaingun'
  | 'weapon_rocket' | 'weapon_plasma' | 'weapon_bfg';

export interface Pickup {
  x: number; y: number; kind: PickupKind; amount: number; taken: boolean; secret?: boolean;
}

export type EnemyType =
  | 'trooper' | 'shotgunner' | 'imp' | 'demon' | 'soul' | 'caco' | 'baron';

export interface DoorState {
  x: number; y: number; open: number; opening: boolean; keyed: KeyColor | null; timer: number;
}

export interface LiftState {
  x: number; y: number; pos: number; moving: number; low: number; high: number;
}

export interface SwitchState {
  x: number; y: number; on: boolean; action: string; targetId: number;
}

/** Tripwire that opens closet doors / reveals enemies when crossed. */
export interface ClosetTrigger {
  x0: number; y0: number; x1: number; y1: number;
  doorCells: { x: number; y: number }[];
  fired: boolean;
  toast?: string;
}

export interface LevelMap {
  width: number;
  height: number;
  tiles: number[];
  floorH: Float32Array;
  ceilH: Float32Array;
  light: Float32Array;
  floorColor: number;
  ceilColor: number;
  pickups: Pickup[];
  spawn: { x: number; y: number; angle: number };
  enemySpawns: { x: number; y: number; type: EnemyType; closet?: boolean }[];
  doors: DoorState[];
  lifts: LiftState[];
  switches: SwitchState[];
  closets: ClosetTrigger[];
  secretsFound: number;
  secretsTotal: number;
  gunLight: number;
}

/**
 * SECTOR ZERO — one killer episode.
 *
 * Beat sheet:
 *  1. Dark barracks start — pistol, two troopers, stim (learn move/shoot)
 *  2. Shotgun reveal in side armory + first closet ambush
 *  3. Hub crossroads — red key behind pressure, RED door gates east
 *  4. Imp galleries — fireball sightlines, shells economy
 *  5. Yellow wing — plasma tease, souls floaters, YELLOW key
 *  6. Lower arsenal — chaingun, rockets, demon rush closets
 *  7. Chainsaw berserk pit (optional power fantasy)
 *  8. Lift + switch — commit upward into blue key antechamber
 *  9. BLUE door → baron climax with caco support → EXIT
 *  Secrets: megaarmor niche, invuln before climax
 *
 * Legend: # wall  . floor  S spawn  E exit  d door
 *         r/y/b keyed doors  L lift  W switch  * secret wall
 */
const RAW = `
################################################################
#S....#..........##..............##............##.............##
#.....#...d......##......####....##...####.....##.............##
#..h..#..........dd......#..#....##...#..#.....##......y......##
#.....#...########.......#..#....d....#..#.....########d########
#.....#...#......#.......#..######....####.............#....E.##
#....######......#.......#........#........#####.......#......##
#.........#......#########..#######..#######...#.......####d####
#..s..#####..........................#.....#...#..............##
#.....#...#..########..##########....#..c..d...#..............##
#.....#...#..#......#..#........#....#.....#...#......####....##
#..####...d..#..R...#..#..i..i..#....#######...#......#..#....##
#............#......#..#........#..............#......#..#....##
#............########..##########..............#......#..d....##
#..............................................#......####....##
#..####..#######################################..............##
#..#..#..#............#.........#..............##.............##
#..#..#..#..######....#..p......#..............##....L........##
#..#.....#..#....#....#.........#..#############..............##
#..#######..#....#....######d####..#...........#..............##
#...........#..C.#.........#....#..#...........#..............##
#...........######.........#....d..#...........#..............##
#..........................#....#..#.....W.....#..............##
#..########..###############....#..#############..............##
#..#......#..#..................#.............................##
#..#..k...d..#........D.D.......#.............................##
#..#......#..#..................#.............................##
#..########..####################.............................##
#.............................................................##
#............................*................................##
################################################################
`.trim().split('\n');

function charToTile(c: string): number {
  switch (c) {
    case '#': case '*': return Tile.WallBrick;
    case 'E': return Tile.Exit;
    case 'd': return Tile.Door;
    case 'L': return Tile.Lift;
    case 'W': return Tile.Switch;
    default: return Tile.Empty; // letters (R,y,h,…) are floor markers only
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
  return t === Tile.Empty || t === Tile.Exit || t === Tile.Lift || t === Tile.Switch;
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
      let L = 0.32 + (1 - wallNear / 25) * 0.42;
      if (t === Tile.Exit) L = 1.0;
      if (wallNear > 14) L *= 0.68;
      // Darker start barracks mood
      if (x < 8 && y < 8) L *= 0.85;
      light[i] = Math.max(0.18, Math.min(1, L));
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

  for (let y = 0; y < height; y++) {
    const row = RAW[y].padEnd(width, '#');
    for (let x = 0; x < width; x++) {
      const ch = row[x] ?? '#';
      let t = charToTile(ch);
      if (ch === '*') t = Tile.SecretWall;
      if (t === Tile.WallBrick) {
        const variety = (x * 3 + y * 7) % 5;
        if (variety === 1) t = Tile.WallStone;
        else if (variety === 2) t = Tile.WallMetal;
        else if (variety === 3 && (x + y) % 5 === 0) t = Tile.WallTech;
        else if (variety === 4 && (x * y) % 11 === 0) t = Tile.WallBlood;
      }
      tiles.push(t);
      const i = y * width + x;
      floorH[i] = 0;
      ceilH[i] = 1;
      // Raised exit platform
      if (x >= 54 && y >= 1 && y <= 6 && isWalkableTile(t)) floorH[i] = 0.16;
      // Subtle step to lift
      if (x >= 48 && x <= 52 && y === 17 && isWalkableTile(t)) floorH[i] = 0.08;
      if (x >= 48 && x <= 52 && y === 16 && isWalkableTile(t)) floorH[i] = 0.04;
    }
  }

  // Explicit keyed doors by glyph / coordinate
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y * width + x] !== Tile.Door) continue;
      // Red gate: double door leaving start into galleries (x~18)
      if (y === 3 && (x === 17 || x === 18)) tiles[y * width + x] = Tile.DoorRed;
      // Yellow: east approach before exit antechamber
      if (y === 4 && x === 55) tiles[y * width + x] = Tile.DoorYellow;
      // Blue: final door into exit chamber
      if (y === 7 && x === 59) tiles[y * width + x] = Tile.DoorBlue;
    }
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
        doors.push({ x, y, open: 0, opening: false, keyed, timer: 0 });
      }
    }
  }

  const lifts: LiftState[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y * width + x] === Tile.Lift) {
        lifts.push({ x, y, pos: 0, moving: 0, low: 0, high: 0.38 });
      }
    }
  }

  const switches: SwitchState[] = [];
  for (const p of findChars('W')) {
    switches.push({
      x: Math.floor(p.x), y: Math.floor(p.y), on: false, action: 'lift', targetId: 0,
    });
  }
  // Second switch opens all remaining secret walls
  switches.push({ x: 30, y: 29, on: false, action: 'secret', targetId: 0 });
  if (tiles[29 * width + 30] === Tile.Empty) tiles[29 * width + 30] = Tile.Switch;

  const spawn = findChars('S')[0] ?? { x: 1.5, y: 1.5 };

  // Authored pickups — tight ammo economy
  const pickups: Pickup[] = [
    { x: 3.5, y: 3.5, kind: 'stim', amount: 10, taken: false },
    { x: 3.5, y: 8.5, kind: 'weapon_shotgun', amount: 1, taken: false },
    { x: 2.5, y: 8.5, kind: 'shells', amount: 8, taken: false },
    { x: 14.5, y: 11.5, kind: 'key_red', amount: 1, taken: false },
    { x: 12.5, y: 12.5, kind: 'armor', amount: 25, taken: false },
    { x: 12.5, y: 12.5, kind: 'bullets', amount: 20, taken: false },
    { x: 26.5, y: 11.5, kind: 'shells', amount: 8, taken: false },
    { x: 28.5, y: 12.5, kind: 'health', amount: 25, taken: false },
    { x: 40.5, y: 9.5, kind: 'weapon_chaingun', amount: 1, taken: false },
    { x: 41.5, y: 8.5, kind: 'bullets', amount: 40, taken: false },
    { x: 56.5, y: 3.5, kind: 'key_yellow', amount: 1, taken: false },
    { x: 50.5, y: 2.5, kind: 'cells', amount: 40, taken: false },
    { x: 48.5, y: 5.5, kind: 'weapon_plasma', amount: 1, taken: false },
    { x: 36.5, y: 17.5, kind: 'weapon_rocket', amount: 1, taken: false },
    { x: 35.5, y: 16.5, kind: 'rockets', amount: 4, taken: false },
    { x: 22.5, y: 20.5, kind: 'weapon_chainsaw', amount: 1, taken: false },
    { x: 20.5, y: 20.5, kind: 'berserk', amount: 1, taken: false },
    { x: 6.5, y: 25.5, kind: 'health', amount: 25, taken: false },
    { x: 8.5, y: 24.5, kind: 'shells', amount: 8, taken: false },
    { x: 52.5, y: 17.5, kind: 'key_blue', amount: 1, taken: false },
    { x: 50.5, y: 18.5, kind: 'megaarmor', amount: 200, taken: false },
    { x: 58.5, y: 5.5, kind: 'soulsphere', amount: 100, taken: false },
    { x: 57.5, y: 2.5, kind: 'weapon_bfg', amount: 1, taken: false },
    { x: 56.5, y: 1.5, kind: 'cells', amount: 40, taken: false },
    // Secrets
    { x: 30.5, y: 28.5, kind: 'invis', amount: 1, taken: false, secret: true },
    { x: 44.5, y: 21.5, kind: 'invuln', amount: 1, taken: false, secret: true },
    { x: 4.5, y: 1.5, kind: 'bonus', amount: 1, taken: false },
    { x: 38.5, y: 20.5, kind: 'lightamp', amount: 1, taken: false },
    { x: 28.5, y: 20.5, kind: 'rockets', amount: 2, taken: false },
    { x: 15.5, y: 3.5, kind: 'bullets', amount: 10, taken: false },
  ];

  // Staged encounters — closets flagged so they stay quiet until trigger
  const enemySpawns: LevelMap['enemySpawns'] = [
    // 1. Barracks greeting
    { x: 5.5, y: 2.5, type: 'trooper' },
    { x: 7.5, y: 5.5, type: 'trooper' },
    // 2. Shotgun alcove pressure
    { x: 5.5, y: 9.5, type: 'shotgunner' },
    // Closet behind start door column
    { x: 10.5, y: 2.5, type: 'imp', closet: true },
    { x: 11.5, y: 1.5, type: 'trooper', closet: true },
    // 3. Red key room guards
    { x: 15.5, y: 11.5, type: 'shotgunner' },
    { x: 14.5, y: 12.5, type: 'imp' },
    // 4. Imp gallery
    { x: 27.5, y: 11.5, type: 'imp' },
    { x: 29.5, y: 12.5, type: 'imp' },
    { x: 25.5, y: 10.5, type: 'trooper' },
    // Closet mid-hub
    { x: 22.5, y: 8.5, type: 'demon', closet: true },
    { x: 23.5, y: 8.5, type: 'soul', closet: true },
    // 5. Chaingun wing
    { x: 41.5, y: 10.5, type: 'shotgunner' },
    { x: 39.5, y: 8.5, type: 'imp' },
    { x: 43.5, y: 12.5, type: 'caco' },
    // 6. Yellow antechamber floaters
    { x: 52.5, y: 3.5, type: 'soul' },
    { x: 54.5, y: 2.5, type: 'soul' },
    { x: 50.5, y: 5.5, type: 'imp' },
    // 7. Lower arsenal demons
    { x: 24.5, y: 25.5, type: 'demon' },
    { x: 26.5, y: 25.5, type: 'demon' },
    { x: 22.5, y: 24.5, type: 'shotgunner' },
    // Closet when taking rockets
    { x: 34.5, y: 20.5, type: 'imp', closet: true },
    { x: 33.5, y: 20.5, type: 'shotgunner', closet: true },
    { x: 33.5, y: 21.5, type: 'soul', closet: true },
    // 8. Blue key approach
    { x: 50.5, y: 16.5, type: 'caco' },
    { x: 53.5, y: 18.5, type: 'shotgunner' },
    // 9. Climax
    { x: 60.5, y: 5.5, type: 'baron' },
    { x: 58.5, y: 3.5, type: 'caco' },
    { x: 61.5, y: 2.5, type: 'imp' },
    { x: 57.5, y: 6.5, type: 'demon' },
  ];

  // Monster closet triggers — open specific doors when player crosses
  const closets: ClosetTrigger[] = [
    {
      x0: 8, y0: 1, x1: 12, y1: 6,
      doorCells: [{ x: 6, y: 2 }],
      fired: false,
      toast: 'TRAP!',
    },
    {
      x0: 20, y0: 8, x1: 28, y1: 14,
      doorCells: findDoorNear(doors, 22, 8),
      fired: false,
      toast: 'INCOMING!',
    },
    {
      x0: 32, y0: 16, x1: 38, y1: 22,
      doorCells: [{ x: 36, y: 19 }],
      fired: false,
      toast: 'AMBUSH!',
    },
  ];

  // Ensure closet door cells exist as doors
  for (const c of closets) {
    for (const cell of c.doorCells) {
      const i = cell.y * width + cell.x;
      if (i >= 0 && i < tiles.length && tiles[i] !== Tile.Door && tiles[i] !== Tile.DoorRed &&
          tiles[i] !== Tile.DoorYellow && tiles[i] !== Tile.DoorBlue) {
        // If wall, convert to door for closet release
        if (tiles[i] !== Tile.Empty && tiles[i] !== Tile.Exit) {
          tiles[i] = Tile.Door;
          if (!doors.some((d) => d.x === cell.x && d.y === cell.y)) {
            doors.push({ x: cell.x, y: cell.y, open: 0, opening: false, keyed: null, timer: 0 });
          }
        }
      }
    }
  }

  return {
    width, height, tiles, floorH, ceilH,
    light: buildLight(width, height, tiles),
    floorColor: 0x16100e,
    ceilColor: 0x0a0810,
    pickups,
    spawn: { x: spawn.x, y: spawn.y, angle: 0 },
    enemySpawns,
    doors, lifts, switches, closets,
    secretsFound: 0,
    secretsTotal: 2,
    gunLight: 0,
  };
}

function findDoorNear(doors: DoorState[], x: number, y: number): { x: number; y: number }[] {
  const found = doors.filter((d) => Math.hypot(d.x - x, d.y - y) < 4);
  return found.length ? found.map((d) => ({ x: d.x, y: d.y })) : [{ x, y }];
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
  return map.ceilH[iy * map.width + ix];
}

export function doorAt(map: LevelMap, ix: number, iy: number): DoorState | null {
  for (const d of map.doors) if (d.x === ix && d.y === iy) return d;
  return null;
}

export function isSolid(map: LevelMap, x: number, y: number, eyeH = 0.5): boolean {
  const ix = Math.floor(x); const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= map.width || iy >= map.height) return true;
  const t = map.tiles[iy * map.width + ix];
  if (t === Tile.Empty || t === Tile.Exit || t === Tile.Lift || t === Tile.Switch) {
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

export function tryUse(
  map: LevelMap,
  px: number,
  py: number,
  angle: number,
  keys: Record<KeyColor, boolean>,
): { openedDoor: boolean; usedSwitch: boolean; secret: boolean; needKey: KeyColor | null } {
  const fx = px + Math.cos(angle) * 1.15;
  const fy = py + Math.sin(angle) * 1.15;
  const ix = Math.floor(fx); const iy = Math.floor(fy);
  let openedDoor = false; let usedSwitch = false; let secret = false;
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
    sw.on = !sw.on || sw.action === 'secret';
    usedSwitch = true;
    if (sw.action === 'lift') {
      for (const lift of map.lifts) lift.moving = lift.pos < 0.5 ? 1 : -1;
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

  if (getTile(map, fx, fy) === Tile.SecretWall) {
    map.tiles[iy * map.width + ix] = Tile.Empty;
    secret = true;
    map.secretsFound = Math.min(map.secretsTotal, map.secretsFound + 1);
  }

  return { openedDoor, usedSwitch, secret, needKey };
}

export function updateDoorsLifts(map: LevelMap, dt: number): void {
  for (const d of map.doors) {
    if (d.opening) {
      d.open = Math.min(1, d.open + dt * 1.35);
      if (d.open >= 1) { d.opening = false; d.timer = 4; }
    } else if (d.open > 0) {
      d.timer -= dt;
      if (d.timer <= 0) d.open = Math.max(0, d.open - dt * 1.1);
    }
  }
  for (const lift of map.lifts) {
    if (lift.moving === 0) continue;
    lift.pos += lift.moving * dt * 0.6;
    if (lift.pos >= 1) { lift.pos = 1; lift.moving = 0; }
    if (lift.pos <= 0) { lift.pos = 0; lift.moving = 0; }
  }
  if (map.gunLight > 0) map.gunLight = Math.max(0, map.gunLight - dt * 3.5);
}

/** Returns toast if a closet just fired. */
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

export function resetPickups(map: LevelMap): void {
  for (const p of map.pickups) p.taken = false;
  map.secretsFound = 0;
  for (const d of map.doors) { d.open = 0; d.opening = false; d.timer = 0; }
  for (const lift of map.lifts) { lift.pos = 0; lift.moving = 0; }
  for (const sw of map.switches) sw.on = false;
  for (const c of map.closets) c.fired = false;
}
