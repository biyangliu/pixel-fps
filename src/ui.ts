import type { Player } from './player';
import { aliveCount } from './enemies';
import type { Enemy } from './enemies';

export type GamePhase = 'title' | 'playing' | 'paused' | 'win' | 'lose';

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  player: Player,
  enemies: Enemy[],
  phase: GamePhase,
): void {
  ctx.imageSmoothingEnabled = false;

  if (phase === 'playing' || phase === 'paused') {
    // Health bar
    ctx.fillStyle = '#000000aa';
    ctx.fillRect(4, 4, 84, 12);
    ctx.fillStyle = '#331111';
    ctx.fillRect(6, 6, 80, 8);
    const hpW = Math.max(0, (player.hp / player.maxHp) * 80);
    ctx.fillStyle = player.hp > 30 ? '#33cc55' : '#cc3333';
    ctx.fillRect(6, 6, hpW, 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.fillText(`HP ${player.hp}`, 8, 13);

    // Ammo
    ctx.fillStyle = '#000000aa';
    ctx.fillRect(w - 60, 4, 56, 12);
    ctx.fillStyle = '#eebb33';
    ctx.fillText(`AMMO ${player.ammo}`, w - 56, 13);

    // Objective
    const left = aliveCount(enemies);
    ctx.fillStyle = '#000000aa';
    ctx.fillRect(4, h - 16, w - 8, 12);
    ctx.fillStyle = '#88eecc';
    const obj = left > 0
      ? `ELIMINATE HOSTILES — ${left} REMAINING  |  OR REACH EXIT`
      : 'ALL CLEAR — SECTOR SECURED';
    ctx.fillText(obj, 8, h - 7);

    // Crosshair
    if (phase === 'playing') {
      const cx = (w / 2) | 0;
      const cy = (h / 2) | 0;
      ctx.fillStyle = '#ffffffcc';
      ctx.fillRect(cx - 4, cy, 9, 1);
      ctx.fillRect(cx, cy - 4, 1, 9);
    }
  }

  if (phase === 'title') {
    drawPanel(ctx, w, h);
    ctx.fillStyle = '#ff6644';
    ctx.font = 'bold 16px monospace';
    centerText(ctx, 'PIXEL FPS', w, 50);
    ctx.fillStyle = '#aaddcc';
    ctx.font = '8px monospace';
    centerText(ctx, 'RETRO RAYCAST SHOOTER', w, 70);
    ctx.fillStyle = '#ffffff';
    centerText(ctx, 'Click to start', w, 110);
    ctx.fillStyle = '#8899aa';
    centerText(ctx, 'WASD move  |  Mouse look  |  Click/Space shoot', w, 140);
    centerText(ctx, 'Esc pause  |  Clear enemies or reach exit', w, 155);
  }

  if (phase === 'paused') {
    ctx.fillStyle = '#00000088';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    centerText(ctx, 'PAUSED', w, 80);
    ctx.font = '8px monospace';
    centerText(ctx, 'Click to resume  |  Esc releases mouse', w, 110);
  }

  if (phase === 'win') {
    drawPanel(ctx, w, h);
    ctx.fillStyle = '#44ff88';
    ctx.font = 'bold 16px monospace';
    centerText(ctx, 'SECTOR CLEARED', w, 55);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    centerText(ctx, `Kills: ${player.kills}   Score: ${player.score}`, w, 85);
    centerText(ctx, `HP left: ${player.hp}`, w, 100);
    ctx.fillStyle = '#aaddcc';
    centerText(ctx, 'Click to play again', w, 140);
  }

  if (phase === 'lose') {
    drawPanel(ctx, w, h);
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 16px monospace';
    centerText(ctx, 'YOU DIED', w, 55);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    centerText(ctx, `Kills: ${player.kills}   Score: ${player.score}`, w, 90);
    ctx.fillStyle = '#aaddcc';
    centerText(ctx, 'Click to retry', w, 140);
  }
}

function drawPanel(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#000000cc';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#44aa88';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 30, w - 40, h - 60);
}

function centerText(ctx: CanvasRenderingContext2D, text: string, w: number, y: number): void {
  const m = ctx.measureText(text);
  ctx.fillText(text, (w - m.width) / 2, y);
}
