export interface InputState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
  pause: boolean;
  mouseDX: number;
  mouseDY: number;
  pointerLocked: boolean;
  clickToStart: boolean;
  weaponSlot: number | null;
  scrollWeapon: number;
}

export function createInput(canvas: HTMLCanvasElement): InputState {
  const state: InputState = {
    forward: false,
    back: false,
    left: false,
    right: false,
    shoot: false,
    pause: false,
    mouseDX: 0,
    mouseDY: 0,
    pointerLocked: false,
    clickToStart: false,
    weaponSlot: null,
    scrollWeapon: 0,
  };

  const keyMap: Record<string, keyof InputState> = {
    KeyW: 'forward',
    KeyS: 'back',
    KeyA: 'left',
    KeyD: 'right',
    Space: 'shoot',
  };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      state.pause = true;
      return;
    }
    if (e.code === 'Digit1' || e.code === 'Numpad1') {
      state.weaponSlot = 1;
      e.preventDefault();
      return;
    }
    if (e.code === 'Digit2' || e.code === 'Numpad2') {
      state.weaponSlot = 2;
      e.preventDefault();
      return;
    }
    if (e.code === 'Digit3' || e.code === 'Numpad3') {
      state.weaponSlot = 3;
      e.preventDefault();
      return;
    }
    const k = keyMap[e.code];
    if (k && typeof state[k] === 'boolean') {
      (state as unknown as Record<string, boolean>)[k] = true;
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    const k = keyMap[e.code];
    if (k && typeof state[k] === 'boolean') {
      (state as unknown as Record<string, boolean>)[k] = false;
      e.preventDefault();
    }
  });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      if (!state.pointerLocked) {
        state.clickToStart = true;
        canvas.requestPointerLock();
      } else {
        state.shoot = true;
      }
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) state.shoot = false;
  });

  canvas.addEventListener('wheel', (e) => {
    if (!state.pointerLocked) return;
    e.preventDefault();
    state.scrollWeapon += e.deltaY > 0 ? 1 : -1;
  }, { passive: false });

  document.addEventListener('pointerlockchange', () => {
    state.pointerLocked = document.pointerLockElement === canvas;
    if (!state.pointerLocked) state.pause = true;
  });

  document.addEventListener('mousemove', (e) => {
    if (state.pointerLocked) {
      state.mouseDX += e.movementX;
      state.mouseDY += e.movementY;
    }
  });

  return state;
}

export function consumeMouseDelta(input: InputState): { dx: number; dy: number } {
  const dx = input.mouseDX;
  const dy = input.mouseDY;
  input.mouseDX = 0;
  input.mouseDY = 0;
  return { dx, dy };
}

export function consumePause(input: InputState): boolean {
  if (input.pause) {
    input.pause = false;
    return true;
  }
  return false;
}

export function consumeClickToStart(input: InputState): boolean {
  if (input.clickToStart) {
    input.clickToStart = false;
    return true;
  }
  return false;
}

export function consumeWeaponSwitch(input: InputState): number | null {
  const s = input.weaponSlot;
  input.weaponSlot = null;
  return s;
}

export function consumeScrollWeapon(input: InputState): number {
  const s = input.scrollWeapon;
  input.scrollWeapon = 0;
  if (s === 0) return 0;
  return s > 0 ? 1 : -1;
}
