import { createLevel, resetPickups, type LevelMap } from './map';
import { createPlayer, resetPlayer, updatePlayer, type Player, type Skill } from './player';
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
import {
  createInput, consumePause, consumeClickToStart, consumeMenuSelect, type InputState,
} from './input';
import { renderFrame } from './renderer';
import { drawHUD, type GamePhase } from './ui';
import { sfxWin, sfxLose, startAmbient, stopAmbient, sfxDoor } from './audio';

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
  private skillCursor: Skill = 3;
  private lastGunshot = false;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.map = createLevel();
    this.player = createPlayer(this.map.spawn, this.skillCursor);
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
    this.map = createLevel();
    resetPickups(this.map);
    resetPlayer(this.player, this.map.spawn, this.skillCursor);
    this.enemies = createEnemies(this.map);
    this.projectiles = createProjectiles();
    this.toast = null;
    this.toastTimer = 0;
    this.lastGunshot = false;
  }

  private beginPlay(): void {
    this.resetLevel();
    this.phase = 'playing';
    this.startArmed = false;
    startAmbient();
    this.showToast('ENTER SECTOR ZERO');
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

    const menuSel = consumeMenuSelect(this.input);
    if (menuSel && menuSel >= 1 && menuSel <= 4) {
      this.skillCursor = menuSel as Skill;
    }

    if (this.phase === 'title') {
      consumePause(this.input);
      if (this.startArmed) {
        this.startArmed = false;
        this.phase = 'skill';
      }
      return;
    }

    if (this.phase === 'skill') {
      consumePause(this.input);
      if (this.startArmed) {
        this.beginPlay();
      }
      return;
    }

    if (this.phase === 'win' || this.phase === 'lose') {
      consumePause(this.input);
      if (this.startArmed) {
        this.phase = 'skill';
        this.startArmed = false;
        stopAmbient();
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

    const hadKeys = { ...this.player.keys };
    const { fired, reachedExit, message } = updatePlayer(
      this.player,
      this.map,
      this.input,
      dt,
    );

    if (!hadKeys.red && this.player.keys.red) this.showToast('RED KEYCARD');
    if (!hadKeys.yellow && this.player.keys.yellow) this.showToast('YELLOW KEYCARD');
    if (!hadKeys.blue && this.player.keys.blue) this.showToast('BLUE KEYCARD');
    if (message) this.showToast(message, 1.8);

    // Closet release: wake dormant trap monsters near the player
    if (message === 'TRAP!' || message === 'INCOMING!' || message === 'AMBUSH!') {
      sfxDoor();
      for (const e of this.enemies) {
        if (!e.alive || !e.closet) continue;
        if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < 10) {
          e.closet = false;
          e.alerted = true;
        }
      }
    }

    if (fired) {
      playerShoot(this.enemies, this.projectiles, this.map, this.player, this.player.currentWeapon);
      this.lastGunshot = true;
    }

    updateEnemies(this.enemies, this.map, this.player, this.projectiles, dt, this.lastGunshot);
    this.lastGunshot = false;
    updateProjectiles(this.projectiles, this.enemies, this.map, this.player, dt);

    if (this.player.hp <= 0) {
      this.phase = 'lose';
      sfxLose();
      stopAmbient();
      if (document.pointerLockElement) document.exitPointerLock();
      return;
    }

    if (reachedExit) {
      this.phase = 'win';
      sfxWin();
      stopAmbient();
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
      this.skillCursor,
    );
  }
}
