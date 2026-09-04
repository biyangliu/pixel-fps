import { createLevel, resetPickups, type LevelMap } from './map';
import { createPlayer, resetPlayer, updatePlayer, type Player } from './player';
import {
  createEnemies,
  createProjectiles,
  updateEnemies,
  updateProjectiles,
  playerShoot,
  type Enemy,
  type Projectile,
} from './enemies';
import { createTextures, type TextureBank } from './textures';
import { createInput, consumePause, consumeClickToStart, type InputState } from './input';
import { renderFrame } from './renderer';
import { drawHUD, type GamePhase } from './ui';
import { sfxWin, sfxLose } from './audio';

const INTERNAL_W = 320;
const INTERNAL_H = 200;

export class Game {
  private ctx: CanvasRenderingContext2D;
  private map: LevelMap;
  private player: Player;
  private enemies: Enemy[];
  private projectiles: Projectile[];
  private textures: TextureBank;
  private input: InputState;
  private phase: GamePhase = 'title';
  private zBuffer: Float32Array;
  private lastTime = 0;
  private running = false;
  private startArmed = false;
  private toast: string | null = null;
  private toastTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.map = createLevel();
    this.player = createPlayer(this.map.spawn);
    this.enemies = createEnemies(this.map);
    this.projectiles = createProjectiles();
    this.textures = createTextures();
    this.input = createInput(canvas);
    this.zBuffer = new Float32Array(INTERNAL_W);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.frame);
  }

  private resetLevel(): void {
    // Recreate map tiles so doors relock cleanly
    this.map = createLevel();
    resetPickups(this.map);
    resetPlayer(this.player, this.map.spawn);
    this.enemies = createEnemies(this.map);
    this.projectiles = createProjectiles();
    this.toast = null;
    this.toastTimer = 0;
  }

  private beginPlay(): void {
    this.resetLevel();
    this.phase = 'playing';
    this.startArmed = false;
    this.showToast('ENTER THE COMPLEX');
  }

  private showToast(msg: string, time = 2.2): void {
    this.toast = msg;
    this.toastTimer = time;
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.update(dt);
    this.draw();

    requestAnimationFrame(this.frame);
  };

  private update(dt: number): void {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toast = null;
    }

    if (consumeClickToStart(this.input)) {
      this.startArmed = true;
    }

    if (this.phase === 'title' || this.phase === 'win' || this.phase === 'lose') {
      consumePause(this.input);
      if (this.startArmed) {
        this.beginPlay();
      }
      return;
    }

    if (this.phase === 'paused') {
      consumePause(this.input);
      if (this.input.pointerLocked || this.startArmed) {
        this.startArmed = false;
        this.phase = 'playing';
      }
      return;
    }

    this.startArmed = false;
    if (consumePause(this.input) || !this.input.pointerLocked) {
      this.phase = 'paused';
      if (document.pointerLockElement) document.exitPointerLock();
      return;
    }

    const hadKey = this.player.hasKey;
    const { fired, reachedExit, openedDoor } = updatePlayer(
      this.player,
      this.map,
      this.input,
      dt,
    );

    if (!hadKey && this.player.hasKey) {
      this.showToast('GOT THE KEY! FIND EXIT DOORS');
    }
    if (openedDoor) {
      this.showToast('DOOR UNLOCKED');
    }

    if (fired) playerShoot(this.enemies, this.map, this.player, this.player.currentWeapon);

    updateEnemies(this.enemies, this.map, this.player, this.projectiles, dt);
    updateProjectiles(this.projectiles, this.map, this.player, dt);

    if (this.player.hp <= 0) {
      this.phase = 'lose';
      sfxLose();
      if (document.pointerLockElement) document.exitPointerLock();
      return;
    }

    // Win only by reaching the exit (after fighting through / unlocking path)
    if (reachedExit) {
      this.phase = 'win';
      sfxWin();
      if (document.pointerLockElement) document.exitPointerLock();
    }
  }

  private draw(): void {
    if (this.phase === 'playing' || this.phase === 'paused') {
      renderFrame(
        this.ctx,
        INTERNAL_W,
        INTERNAL_H,
        this.map,
        this.player,
        this.enemies,
        this.projectiles,
        this.textures,
        this.zBuffer,
      );
    } else {
      this.ctx.fillStyle = '#0a0808';
      this.ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
      this.ctx.fillStyle = '#120e0c';
      for (let y = 0; y < INTERNAL_H; y += 2) {
        this.ctx.fillRect(0, y, INTERNAL_W, 1);
      }
    }
    drawHUD(
      this.ctx,
      INTERNAL_W,
      INTERNAL_H,
      this.player,
      this.enemies,
      this.phase,
      this.phase === 'playing' ? this.toast : null,
    );
  }
}
