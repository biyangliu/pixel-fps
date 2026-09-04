import type { Player, Skill } from './player';
import { aliveCount, totalEnemyCount } from './enemies';
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
  automap = false,
): void {
  ctx.imageSmoothingEnabled = false;
  const viewH = h - STATUS_H;

  if (phase === 'playing' || phase === 'paused') {
    if (phase === 'playing' && !automap) {
      const cx = (w / 2) | 0;
      const cy = (viewH / 2) | 0;
      ctx.fillStyle = '#ffffffaa';
      ctx.fillRect(cx - 3, cy, 7, 1);
      ctx.fillRect(cx, cy - 3, 1, 7);
    }

    drawStatusBar(ctx, w, h, player);

    if (!automap) {
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
    } else {
      ctx.fillStyle = '#000000aa';
      ctx.fillRect(4, 4, w - 8, 12);
      ctx.font = '8px monospace';
      ctx.fillStyle = '#88ffaa';
      ctx.fillText(player.hasAllMap ? 'COMPUTER MAP — ALL REVEALED' : 'AUTOMAP — Tab to close', 8, 13);
    }

    if (message && !automap) {
      ctx.fillStyle = '#000000aa';
      ctx.fillRect(30, viewH / 2 - 10, w - 60, 16);
      ctx.fillStyle = '#ffee88';
      const m = ctx.measureText(message);
      ctx.fillText(message, (w - m.width) / 2, viewH / 2 + 2);
    }

    let py = 20;
    const buffs: string[] = [];
    if (player.berserkTimer > 0) buffs.push(`BERSERK ${player.berserkTimer | 0}`);
    if (player.invisTimer > 0) buffs.push(`BLUR ${player.invisTimer | 0}`);
    if (player.invulnTimer > 0) buffs.push(`GOD ${player.invulnTimer | 0}`);
    if (player.lightAmpTimer > 0) buffs.push(`LAMP ${player.lightAmpTimer | 0}`);
    if (player.radSuitTimer > 0) buffs.push(`RAD ${player.radSuitTimer | 0}`);
    for (const b of buffs) {
      ctx.fillStyle = '#44ff88';
      ctx.fillText(b, 8, py);
      py += 10;
    }
  }

  if (phase === 'title') {
    drawPanel(ctx, w, h);
    // Logo block
    ctx.fillStyle = '#441100';
    ctx.fillRect(60, 28, w - 120, 36);
    ctx.fillStyle = '#ff5522';
    ctx.font = 'bold 18px monospace';
    centerText(ctx, 'SECTOR ZERO', w, 52);
    ctx.fillStyle = '#cc8844';
    ctx.font = '8px monospace';
    centerText(ctx, 'TECH-HELL PROTOCOL — ONE SECTOR', w, 72);
    ctx.fillStyle = '#ffffff';
    centerText(ctx, 'Click to continue', w, 96);
    ctx.fillStyle = '#8899aa';
    centerText(ctx, 'Find the keys. Clear the closets. Reach the pad.', w, 118);
    centerText(ctx, 'WASD  Mouse  Fire  E use  Tab map  1-7 arms', w, 136);
    ctx.fillStyle = '#665544';
    centerText(ctx, 'Original art & audio — genre DNA, not a remake', w, 158);
  }

  if (phase === 'skill') {
    drawPanel(ctx, w, h);
    ctx.fillStyle = '#ffaa44';
    ctx.font = 'bold 12px monospace';
    centerText(ctx, 'CHOOSE SKILL', w, 40);
    ctx.font = '8px monospace';
    const descs = [
      'Fewer hostiles, more ammo, soft hits',
      'Standard density',
      'Full roster, full pain',
      'Fast demons, hard hits, lean ammo',
    ];
    for (let s = 1; s <= 4; s++) {
      const selected = skillCursor === s;
      ctx.fillStyle = selected ? '#ffffff' : '#887766';
      centerText(ctx, `${selected ? '>' : ' '} ${s}. ${SKILL_NAMES[s as Skill]}`, w, 58 + s * 18);
      if (selected) {
        ctx.fillStyle = '#aa8866';
        centerText(ctx, descs[s - 1], w, 68 + s * 18);
      }
    }
    ctx.fillStyle = '#aaccff';
    centerText(ctx, '1-4 select / Click to start', w, 168);
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
    centerText(ctx, 'SECTOR ZERO CLEARED', w, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    const elapsed = Math.max(0, (performance.now() - player.startTime) / 1000);
    const totalE = Math.max(1, totalEnemyCount(enemies));
    const killsPct = Math.min(100, Math.round((player.kills / totalE) * 100));
    const itemsTotal = Math.max(1, player.itemsTotal || 1);
    const itemsPct = Math.min(100, Math.round((player.itemsPicked / itemsTotal) * 100));
    const secretsPct = Math.min(100, Math.round((player.secrets / 2) * 100));
    const mm = (elapsed / 60) | 0;
    const ss = (elapsed % 60) | 0;
    centerText(ctx, `KILLS   ${String(killsPct).padStart(3, ' ')}%  (${player.kills}/${totalE})`, w, 54);
    centerText(ctx, `ITEMS   ${String(itemsPct).padStart(3, ' ')}%  (${player.itemsPicked}/${itemsTotal})`, w, 68);
    centerText(ctx, `SECRET  ${String(secretsPct).padStart(3, ' ')}%  (${player.secrets}/2)`, w, 82);
    centerText(ctx, `TIME    ${mm}:${String(ss).padStart(2, '0')}   ${SKILL_NAMES[player.skill]}`, w, 96);
    centerText(ctx, `SCORE ${player.score}   HP ${player.hp}  ARM ${player.armor}`, w, 114);
    ctx.fillStyle = '#aaddcc';
    centerText(ctx, 'Click to run it back', w, 150);
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
  else if (hp <= 0) skin = '#554444';
  else if (hp < 30) skin = '#aa6655';
  else if (hp < 60) skin = '#c48866';
  ctx.fillStyle = skin;
  ctx.fillRect(x, y, 28, 22);

  ctx.fillStyle = '#111';
  if (hp <= 0) {
    ctx.fillText('x', x + 5, y + 12);
    ctx.fillText('x', x + 17, y + 12);
    ctx.fillRect(x + 10, y + 16, 8, 2);
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
  if (hp > 0) {
    if (hp < 25) ctx.fillRect(x + 10, y + 16, 8, 3);
    else if (player.muzzleFlash > 0 || player.berserkTimer > 0) ctx.fillRect(x + 11, y + 15, 6, 5);
    else ctx.fillRect(x + 10, y + 17, 8, 2);
  }

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
