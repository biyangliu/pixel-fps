/**
 * Headless BFS verification of Sector Zero critical path.
 * Ensures keys → doors → exit are reachable; reports softlock risks.
 * Run: node scripts/verify-map.mjs
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

const H = RAW.length;
const W = Math.max(...RAW.map((r) => r.length));
const grid = RAW.map((r) => r.padEnd(W, '#'));

function find(ch) {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (grid[y][x] === ch) return { x, y };
  return null;
}

const DOOR_KEYS = { r: 'red', y: 'yellow', b: 'blue' };
const KEY_CHARS = { R: 'red', Y: 'yellow', B: 'blue' };

function walkable(ch, keys) {
  if ('S.~ ETdWhsciiCPLK*'.includes(ch) || ch === ' ') return true;
  if (ch === '.' || ch === 'i' || ch === '~') return true;
  if ('SEhscCRYPKLWBd*'.includes(ch)) return true;
  if (ch === 'd') return true; // free door
  if (ch === 'r' || ch === 'y' || ch === 'b') return !!keys[DOOR_KEYS[ch]];
  if (ch === 'L' || ch === 'W') return true;
  if (ch === 'E') return true;
  if (ch === '*') return true; // secret pushable — treat as open for reachability of stash
  return false;
}

function bfs(start, keys) {
  const seen = new Set();
  const q = [start];
  seen.add(`${start.x},${start.y}`);
  const reached = new Set();
  while (q.length) {
    const { x, y } = q.shift();
    reached.add(`${x},${y}`);
    const ch = grid[y][x];
    if (KEY_CHARS[ch]) keys[KEY_CHARS[ch]] = true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const k = `${nx},${ny}`;
      if (seen.has(k)) continue;
      const nch = grid[ny][nx];
      if (nch === '#') continue;
      // Keys may unlock doors — re-check with current keys
      if (!walkable(nch, keys) && !(DOOR_KEYS[nch] && keys[DOOR_KEYS[nch]])) continue;
      // Allow keyed doors if we have key
      if ((nch === 'r' || nch === 'y' || nch === 'b') && !keys[DOOR_KEYS[nch]]) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  return reached;
}

// Progressive key acquisition simulation
function verifyCriticalPath() {
  const spawn = find('S');
  const red = find('R');
  const yel = find('Y');
  const blu = find('B');
  const exit = find('E');
  const shotgun = find('s');
  const issues = [];

  let keys = { red: false, yellow: false, blue: false };
  let reached = bfs(spawn, keys);

  if (!reached.has(`${shotgun.x},${shotgun.y}`)) issues.push('Shotgun unreachable from start');
  if (!reached.has(`${red.x},${red.y}`)) issues.push('Red key unreachable from start');

  // After red
  keys = { red: true, yellow: false, blue: false };
  reached = bfs(spawn, keys);
  if (!reached.has(`${yel.x},${yel.y}`)) issues.push('Yellow key unreachable with red');

  keys = { red: true, yellow: true, blue: false };
  reached = bfs(spawn, keys);
  if (!reached.has(`${blu.x},${blu.y}`)) issues.push('Blue key unreachable with red+yellow');

  keys = { red: true, yellow: true, blue: true };
  reached = bfs(spawn, keys);
  if (!reached.has(`${exit.x},${exit.y}`)) issues.push('Exit unreachable with all keys');

  // Weapons
  for (const [ch, name] of [['c', 'chaingun'], ['C', 'chainsaw'], ['P', 'rocket'], ['s', 'shotgun']]) {
    const p = find(ch);
    if (p && !reached.has(`${p.x},${p.y}`)) issues.push(`${name} marker unreachable`);
  }

  console.log('Sector Zero map verify');
  console.log(`Size: ${W}x${H}`);
  console.log(`Spawn: (${spawn.x},${spawn.y}) Exit: (${exit.x},${exit.y})`);
  console.log(`Keys: R(${red.x},${red.y}) Y(${yel.x},${yel.y}) B(${blu.x},${blu.y})`);
  console.log(`Reachable with all keys: ${reached.size} cells`);
  if (issues.length === 0) {
    console.log('OK: critical path completable (keys → exit)');
    process.exit(0);
  } else {
    console.error('FAIL:');
    for (const i of issues) console.error(' -', i);
    process.exit(1);
  }
}

verifyCriticalPath();
