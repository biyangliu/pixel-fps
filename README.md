# Pixel Doom

A browser-based **DOOM-like** pixel-art FPS built with **Vite + TypeScript** and an HTML Canvas *2.5D raycaster* (Wolfenstein-style core, DOOM-inspired presentation).

One complete multi-room level: fight through corridors, grab the key, unlock exit doors, and step into the green exit portal.

## Play

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Open the Vite URL (usually http://localhost:5173). Click to capture the mouse and start.

Production build: `npm run build` then `npm run preview`

## Controls

| Input | Action |
|-------|--------|
| Mouse | Look (pointer lock) |
| WASD | Move |
| Click / Space | Shoot |
| `1` / `2` / `3` | Switch pistol / shotgun / chaingun |
| Mouse wheel | Cycle owned weapons |
| Esc | Pause / release pointer |
| Click on menus | Start / resume / retry |

## Weapons

| Slot | Weapon | Ammo | Notes |
|------|-------|------|------%�
1 | Pistol | Bullets | Starting weapon, semi-auto |
2 | Shotgun | Shells | Pickup in the armory; 7-pellet spread |
3 | Chaingun | Bullets | Pickup in the lower halls: full-auto |

## Enemies

- **Grunt** (green) — fast melee rusher
- **Shooter** (red) — keeps distance, hitscan shots
- **Tank** (magenta) — high HP, fires visible plasma projectiles

## Objective flow

1. Spawn in the entry barracks
2. Clear rooms / corridors toward the vault
3. Pick up the **gold key**
4. Approach **locked doors** (they open automatically with the key)
5. Fight through the boss hall
6. Step into the **green exit** to win

Death → click to retry. Armor pickups mitigate ~1/3 of incoming damage.

## Pickups

- Health packs, armor, megaarmor (secret alcove)
- Bullet boxes & shells
- Shotgun / chaingun weapon pickups
- Gold key (required for exit path)

## Features

- Larger multi-room map with corridors and locked doors
- DOOM-style bottom status bar (ammo, health, face, armor, arms, key)
- Darker palette with distance + simple sector lighting
- Screen flash on damage / pickups
- Lightweight synthesized SFX (Web Audio)

## Design notes

- Internal resolution 320x200, upscaled with nearest-neighbor pixelated rendering
- Classic DDA raycasting for textured walls; billboard sprites for enemies, pickups, projectiles, exit
- All textures and sprites are procedural (no external art assets)
- Modules: map, player, weapons, enemies, renderer, input, ui, textures, audio, game

## Stack

- Vite 6
- TypeScript
- Canvas 2D
