# Pixel FPS

A browser-based retro pixel-art first-person shooter built with **Vite + TypeScript** and an HTML Canvas *2.5D raycaster* (Wolfenstein-style).

Clear the sector by eliminating hostiles **or** reaching the glowing green exit.

## Play

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Open the Vite URL (usually http://localhost:5173). Click to capture the mouse and start.

Production build: `npm run build` othen `npm run preview`

## Controls

- Mouse: look (pointer lock)
- WASD: move
- Click / Space: shoot
- Esc: pause / release pointer
- Click on menus: start / resume / retry

## Gameplay

- One complete arena with brick / stone / metal / tech walls.
- Grunts chase and melee; shooters keep distance and fire hitscan shots.
- Pickups: health packs and ammo crates.
- HUD: health, ammo, and objective text.
- Win: walk into the green exit portal.
- Lose: HP reaches 0 — click to retry.

## Design notes

- Internal resolution 320x200, upscaled with nearest-neighbor pixelated rendering.
- Classic DDA raycasting for textured walls; billboard sprites for enemies, pickups, exit.
- All textures and sprites are procedural (no external art assets).
- Modules: map, player, enemies, renderer, input, ui, textures, game.

## Stack

- Vite 6
- TypeScript
- Canvas 2D
