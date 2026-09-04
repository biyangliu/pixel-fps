import type { Player } from './player';
import { aliveCount } from './enemies';
import type { Enemy } from './enemies';
import { WEAPONS } from './weapons';
import { STATUS_H } from './renderer';

export type GamePhase = 'title' | 'playing' | 'paused' | 'win' | 'lose';

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  player: Player,
  enemies: Enemy[],
  phase: GamePhase,
  message: string | null,
): void {
  ctx.imageSmoothingEnabled = false;
  const viewH = h - STATUS_H;

  if (phase === 'playing' || phase === 'paused') {
    // Crosshair
    if (phase === 'playing') {
      const cx = (w / 2) | 0;
      const cy = (viewH / 2) | 0;
      ctx.fillStyle = '#ffffffaa';
      ctx.fillRect(cx - 3, cy, 7, 1);
      ctx.fillRect(cx, cy - 3, 1, 7);
    }

    drawStatusBar(ctx, w, h, player);

    // Floating objective / toast
    const left = aliveCount(enemies);
    ctx.fillStyle = '#00000088';
    ctx.fillRect(4, 4, w - 8, 12);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#ccaa66';
    let obj: string;
    if (!player.hasKey) {
      obj = `FIND THE KEY  —  hostiles ${left}`;
    } else {
      obj = `KEY ACQUIRED — OPEN EXIT DOORS  —  hostiles ${left}`;
    }
    ctx.fillText(obj, 8, 13);

    if (message) {
      ctx.fillStyle = '#000000aa';
      ctx.fillRect(40, viewH / 2 - 10, w - 80, 16);
      ctx.fillStyle = '#ffee88';
      const m = ctx.measureText(message);
      ctx.fillText(message, (w - m.width) / 2, viewH / 2 + 2);
    }
  }

  if (phase === 'title') {
    drawPanel(ctx, w, h);
    ctx.fillStyle = '#ff4422';
    ctx.font = 'bold 16px monospace';
    centerText(ctx, 'PIXEL DOOM', w, 42);
    ctx.fillStyle = '#cc8844';
    ctx.font = '8px monospace';
    centerText(ctx, 'ONE LEVEL — RAYCAST HELL', w, 58);
    ctx.fillStyle = '#ffffff';
    centerText(ctx, 'Click to start', w, 90);
    ctx.fillStyle = '#8899aa';
    centerText(ctx, 'WASD move | Mouse look | Click/Space shoot', w, 115);
    centerText(ctx, '1-3 / scroll weapons | Esc pause', w, 128);
    centerText(ctx, 'Find key, open doors, reach the exit', w, 148);
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
    ctx.font = 'bold 16px monospace';
    centerText(ctx, 'EXIT REACHED', w, 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    centerText(ctx, `Kills: ${player.kills}   Score: ${player.score}`, w, 78);
    centerText(ctx, `HP ${player.hp}   ARMOR ${player.armor}`, w, 94);
    ctx.fillStyle = '#aaddcc';
    centerText(ctx, 'Click to play again', w, 130);
  }

  if (phase === 'lose') {
    drawPanel(ctx, w, h);
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 16px monospace';
    centerText(ctx, 'YOU DIED', w, 48);
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

  // Beveled bar background
  ctx.fillStyle = '#2a2218';
  ctx.fillRect(0, y0, w, STATUS_H);
  ctx.fillStyle = '#3a3024';
  ctx.fillRect(0, y0, w, 2);
  ctx.fillStyle = '#1a140e';
  ctx.fillRect(0, h - 2, w, 2);

  // Panels
  const panels = [
    { x: 2, w: 54 },
    { x: 58, w: 54 },
    { x: 114, w: 70 },
    { x: 186, w: 48 },
    { x: 236, w: 82 },
  ];
  for (const p of panels) {
    ctx.fillStyle = '#181410';
    ctx.fillRect(p.x, y0 + 4, p.w, STATUS_H - 8);
    ctx.strokeStyle = '#554433';
    ctx.strokeRect(p.x + 0.5, y0 + 4.5, p.w - 1, STATUS_H - 9);
  }

  ctx.font = '7px monospace';

  // Ammo
  const weap = WEAPONS[player.currentWeapon];
  const ammo = player.ammo[weap.ammoType];
  ctx.fillStyle = '#887755';
  ctx.fillText('AMMO', 6, y0 + 12);
  ctx.fillStyle = '#ffcc44';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(String(ammo).padStart(3, ' '), 8, y0 + 26);
  ctx.font = '7px monospace';

  // Health
  ctx.fillStyle = '#887755';
  ctx.fillText('HEALTH', 62, y0 + 12);
  ctx.fillStyle = player.hp > 30 ? '#44dd55' : '#ff3333';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(String(player.hp).padStart(3, ' '), 64, y0 + 26);
  ctx.font = '7px monospace';

  // Face / mugshot
  drawFace(ctx, 130, y0 + 6, player);

  // Armor
  ctx.fillStyle = '#887755';
  ctx.fillText('ARMOR', 190, y0 + 12);
  ctx.fillStyle = '#5599ff';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(String(player.armor).padStart(3, ' '), 192, y0 + 26);
  ctx.font = '7px monospace';

  // Weapon + keys
  ctx.fillStyle = '#887755';
  ctx.fillText('ARMS', 240, y0 + 11);
  const slots: { id: typeof player.currentWeapon; label: string; x: number }[] = [
    { id: 'pistol', label: '1', x: 240 },
    { id: 'shotgun', label: '2', x: 258 },
    { id: 'chaingun', label: '3', x: 276 },
  ];
  for (const s of slots) {
    const owned = player.weapons[s.id];
    const cur = player.currentWeapon === s.id;
    ctx.fillStyle = !owned ? '#333' : cur ? '#ffaa33' : '#888866';
    ctx.fillRect(s.x, y0 + 14, 14, 12);
    ctx.fillStyle = '#111';
    ctx.fillText(s.label, s.x + 4, y0 + 23);
  }

  // Key icon
  if (player.hasKey) {
    ctx.fillStyle = '#ffdd44';
    ctx.fillRect(294, y0 + 10, 18, 10);
    ctx.fillStyle = '#aa8800';
    ctx.fillRect(308, y0 + 8, 4, 14);
  } else {
    ctx.fillStyle = '#333';
    ctx.fillRect(294, y0 + 10, 18, 10);
  }
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  player: Player,
): void {
  const hp = player.hp;
  // Skin
  let skin = '#d4a574';
  if (hp < 30) skin = '#aa6655';
  else if (hp < 60) skin = '#c48866';
  ctx.fillStyle = skin;
  ctx.fillRect(x, y, 28, 22);

  // Eyes
  ctx.fillStyle = '#111';
  if (hp <= 0) {
    ctx.fillText('x', x + 5, y + 12);
    ctx.fillText('x', x + 17, y + 12);
  } else {
    const look = ((Date.now() / 800) | 0) % 5;
    const ox = look === 1 ? -1 : look === 2 ? 1 : 0;
    ctx.fillRect(x + 6 + ox, y + 7, 4, 4);
    ctx.fillRect(x + 18 + ox, y + 7, 4, 4);
    if (player.hurtFlash > 0) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 6, y + 7, 4, 4);
      ctx.fillRect(x + 18, y + 7, 4, 4);
    }
  }

  // Mouth
  ctx.fillStyle = '#441111';
  if (hp < 25) {
    ctx.fillRect(x + 10, y + 16, 8, 3);
  } else if (player.muzzleFlash > 0) {
    ctx.fillRect(x + 11, y + 15, 6, 5);
  } else {
    ctx.fillRect(x + 10, y + 17, 8, 2);
  }

  // God / happy when armored well
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
