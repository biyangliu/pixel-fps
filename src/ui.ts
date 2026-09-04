import type { Player, Skill } from './player';
import { aliveCount } from './enemies';
import type { Enemy } from './enemies';
import { WEAPONS, WEAPON_ORDER, type WeaponId } from './weapons';
import { STATUS_H } from './renderer';

export type GamePhase = 'title' | 'skill' | 'playing' | 'paused' | 'win' | 'lose';

const SKILL_NAMES: Record<Skill, string> = {
  1: 'RECRUIT',
  2: 'REGULAR',
  3: 'VETERAN',
  4: 'NIGHTMARE',
};

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  player: Player,
  enemies: Enemy[],
  phase: GamePhase,
  message: string | null,
  skillCursor: Skill,
): void {
  ctx.imageSmoothingEnabled = false;
  const viewH = h - STATUS_H;

  if (phase === 'playing' || phase === 'paused') {
    if (phase === 'playing') {
      const cx = (w / 2) | 0;
      const cy = (viewH / 2) | 0;
      ctx.fillStyle = '#ffffffaa';
      ctx.fillRect(cx - 3, cy, 7, 1);
      ctx.fillRect(cx, cy - 3, 1, 7);
    }

    drawStatusBar(ctx, w, h, player);

    const left = aliveCount(enemies);
    ctx.fillStyle = '#00000088';
    ctx.fillRect(4, 4, w - 8, 12);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#ccaa66';
    const keys = [
      player.keys.red ? 'R' : '-',
      player.keys.yellow ? 'Y' : '-',
      player.keys.blue ? 'B' : '-',
    ].join('');
    ctx.fillText(`SECTOR ZERO  keys[${keys}]  hostiles ${left}`, 8, 13);

    if (message) {
      ctx.fillStyle = '#000000aa';
      ctx.fillRect(30, viewH / 2 - 10, w - 60, 16);
      ctx.fillStyle = '#ffee88';
      const m = ctx.measureText(message);
      ctx.fillText(message, (w - m.width) / 2, viewH / 2 + 2);
    }

    // Powerup timers
    let py = 20;
    const buffs: string[] = [];
    if (player.berserkTimer > 0) buffs.push(`BERSERK ${player.berserkTimer | 0}`);
    if (player.invisTimer > 0) buffs.push(`BLUR ${player.invisTimer | 0}`);
    if (player.invulnTimer > 0) buffs.push(`GOD ${player.invulnTimer | 0}`);
    if (player.lightAmpTimer > 0) buffs.push(`LAMP ${player.lightAmpTimer | 0}`);
    for (const b of buffs) {
      ctx.fillStyle = '#44ff88';
      ctx.fillText(b, 8, py);
      py += 10;
    }
  }

  if (phase === 'title') {
    drawPanel(ctx, w, h);
    ctx.fillStyle = '#ff5522';
    ctx.font = 'bold 16px monospace';
    centerText(ctx, 'SECTOR ZERO', w, 40);
    ctx.fillStyle = '#cc8844';
    ctx.font = '8px monospace';
    centerText(ctx, 'TECH-HELL PROTOCOL — ONE SECTOR', w, 56);
    ctx.fillStyle = '#ffffff';
    centerText(ctx, 'Click to continue', w, 88);
    ctx.fillStyle = '#8899aa';
    centerText(ctx, 'Find the keys. Clear the closets. Reach the pad.', w, 118);
    centerText(ctx, 'WASD  Mouse  Click/Space fire  E use  1-7 arms', w, 140);
  }

  if (phase === 'skill') {
    drawPanel(ctx, w, h);
    ctx.fillStyle = '#ffaa44';
    ctx.font = 'bold 12px monospace';
    centerText(ctx, 'CHOOSE SKILL', w, 40);
    ctx.font = '8px monospace';
    for (let s = 1; s <= 4; s++) {
      const selected = skillCursor === s;
      ctx.fillStyle = selected ? '#ffffff' : '#887766';
      centerText(ctx, `${selected ? '>' : ' '} ${s}. ${SKILL_NAMES[s as Skill]}`, w, 60 + s * 16);
    }
    ctx.fillStyle = '#aaccff';
    centerText(ctx, '1-4 select / Click to start', w, 150);
  }

  if (phase === 'paused') {
    ctx.fillStyle = '#00000088';
    ctx.fillRect(0, 0, w, viewH);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    centerText(ctx, 'PAUSED', w, 70);
    ctx.font = '8px monospace';
    centerText(ctx, 'Click to resume', w, 100);
  }

  if (phase === 'win') {
    drawPanel(ctx, w, h);
    ctx.fillStyle = '#44ff88';
    ctx.font = 'bold 14px monospace';
    centerText(ctx, 'SECTOR ZERO CLEARED', w, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    const elapsed = Math.max(0, (performance.now() - player.startTime) / 1000);
    centerText(ctx, `Kills ${player.kills}   Score ${player.score}`, w, 62);
    centerText(ctx, `Secrets ${player.secrets}/2   Items ${player.itemsPicked}`, w, 76);
    centerText(ctx, `Time ${elapsed | 0}s   Skill ${SKILL_NAMES[player.skill]}`, w, 90);
    centerText(ctx, `HP ${player.hp}  ARMOR ${player.armor}`, w, 104);
    ctx.fillStyle = '#aaddcc';
    centerText(ctx, 'Click to run it back', w, 140);
  }

  if (phase === 'lose') {
    drawPanel(ctx, w, h);
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 16px monospace';
    centerText(ctx, 'FLATLINED', w, 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    centerText(ctx, `Kills: ${player.kills}   Score: ${player.score}`, w, 85);
    ctx.fillStyle = '#aaddcc';
    centerText(ctx, 'Click to retry', w, 130);
  }
}

function drawStatusBar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  player: Player,
): void {
  const y0 = h - STATUS_H;

  ctx.fillStyle = '#2a2218';
  ctx.fillRect(0, y0, w, STATUS_H);
  ctx.fillStyle = '#3a3024';
  ctx.fillRect(0, y0, w, 2);
  ctx.fillStyle = '#1a140e';
  ctx.fillRect(0, h - 2, w, 2);

  const panels = [
    { x: 2, w: 48 },
    { x: 52, w: 48 },
    { x: 102, w: 56 },
    { x: 160, w: 42 },
    { x: 204, w: 114 },
  ];
  for (const p of panels) {
    ctx.fillStyle = '#181410';
    ctx.fillRect(p.x, y0 + 4, p.w, STATUS_H - 8);
    ctx.strokeStyle = '#554433';
    ctx.strokeRect(p.x + 0.5, y0 + 4.5, p.w - 1, STATUS_H - 9);
  }

  ctx.font = '7px monospace';
  const weap = WEAPONS[player.currentWeapon];
  const ammo = weap.ammoType === 'none' ? '∞' : String(player.ammo[weap.ammoType]);
  ctx.fillStyle = '#887755';
  ctx.fillText('AMMO', 6, y0 + 12);
  ctx.fillStyle = '#ffcc44';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(ammo.padStart(3, ' '), 6, y0 + 26);
  ctx.font = '7px monospace';
  ctx.font = '7px monospace';

  ctx.fillStyle = '#887755';
  ctx.fillText('HEALTH', 56, y0 + 12);
  ctx.fillStyle = player.hp > 30 ? '#44dd55' : '#ff3333';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(String(Math.min(999, player.hp | 0)).padStart(3, ' '), 56, y0 + 26);
  ctx.font = '7px monospace';

  drawFace(ctx, 114, y0 + 6, player);

  ctx.fillStyle = '#887755';
  ctx.fillText('ARMOR', 164, y0 + 12);
  ctx.fillStyle = '#5599ff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(String(player.armor | 0).padStart(3, ' '), 164, y0 + 26);
  ctx.font = '7px monospace';

  // Arms 2-7 (skip fist/chainsaw shared slot display as 1)
  ctx.fillStyle = '#887755';
  ctx.fillText('ARMS', 208, y0 + 10);
  const slots: { slot: number; ids: WeaponId[] }[] = [
    { slot: 1, ids: ['fist', 'chainsaw'] },
    { slot: 2, ids: ['pistol'] },
    { slot: 3, ids: ['shotgun'] },
    { slot: 4, ids: ['chaingun'] },
    { slot: 5, ids: ['rocket'] },
    { slot: 6, ids: ['plasma'] },
    { slot: 7, ids: ['bfg'] },
  ];
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const owned = s.ids.some((id) => player.weapons[id]);
    const cur = s.ids.includes(player.currentWeapon);
    const x = 208 + i * 14;
    ctx.fillStyle = !owned ? '#333' : cur ? '#ffaa33' : '#888866';
    ctx.fillRect(x, y0 + 14, 12, 12);
    ctx.fillStyle = '#111';
    ctx.fillText(String(s.slot), x + 3, y0 + 23);
  }

  // Keys
  const keyCols: [boolean, string][] = [
    [player.keys.red, '#ff4444'],
    [player.keys.yellow, '#ffdd44'],
    [player.keys.blue, '#4488ff'],
  ];
  for (let i = 0; i < 3; i++) {
    const [has, col] = keyCols[i];
    ctx.fillStyle = has ? col : '#333';
    ctx.fillRect(300, y0 + 6 + i * 8, 14, 6);
  }

  void WEAPON_ORDER;
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  player: Player,
): void {
  const hp = player.hp;
  let skin = '#d4a574';
  if (player.invulnTimer > 0) skin = '#ffe680';
  else if (hp < 30) skin = '#aa6655';
  else if (hp < 60) skin = '#c48866';
  ctx.fillStyle = skin;
  ctx.fillRect(x, y, 28, 22);

  ctx.fillStyle = '#111';
  if (hp <= 0) {
    ctx.fillText('x', x + 5, y + 12);
    ctx.fillText('x', x + 17, y + 12);
  } else {
    const look = ((player.faceLook * 1.2) | 0) % 5;
    let ox = look === 1 ? -1 : look === 2 ? 1 : 0;
    if (player.damageDirTimer > 0) ox = player.damageDir;
    ctx.fillRect(x + 6 + ox, y + 7, 4, 4);
    ctx.fillRect(x + 18 + ox, y + 7, 4, 4);
    if (player.hurtFlash > 0) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 6, y + 7, 4, 4);
      ctx.fillRect(x + 18, y + 7, 4, 4);
    }
  }

  ctx.fillStyle = '#441111';
  if (hp < 25) ctx.fillRect(x + 10, y + 16, 8, 3);
  else if (player.muzzleFlash > 0 || player.berserkTimer > 0) ctx.fillRect(x + 11, y + 15, 6, 5);
  else ctx.fillRect(x + 10, y + 17, 8, 2);

  if (player.armor >= 100 && hp > 50) {
    ctx.fillStyle = '#2266aa';
    ctx.fillRect(x + 2, y + 1, 24, 3);
  }
}

function drawPanel(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#000000cc';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#884422';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 24, w - 40, h - 48);
}

function centerText(ctx: CanvasRenderingContext2D, text: string, w: number, y: number): void {
  const m = ctx.measureText(text);
  ctx.fillText(text, (w - m.width) / 2, y);
}
