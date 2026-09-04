# Sector Zero (Pixel FPS)

A browser **spiritual successor** to classic 90s shareware FPS design DNA — one dense, hand-authored episode that aims for the *feel* of what that era’s designers would ship next: weapon-ladder satisfaction, key-gated tension, monster closets, secret delight, and a dirty tech-hell atmosphere.

**Not a remake.** Original map, original procedural art, synthesized audio. Systems parity with the genre’s classics — not cloned content.

Built with **Vite + TypeScript** and a Canvas **2.5D raycaster** (floor/ceiling flats, height-aware doors & lifts, billboard actors, projectiles, screen shake).

> **Legal:** Not affiliated with id Software. No commercial WAD/IWAD, sprites, flats, MIDI, or map geometry. All art/audio are original procedural/synthesized placeholders inspired by the *genre*.

## Play

```bash
# install dependencies with your package manager, then:
node node_modules/vite/bin/vite.js
```

Open the Vite URL (usually http://localhost:5173). Click → skill select → fight.

Production build: run the `build` script (`tsc && vite build`), then preview.

## Controls

| Input | Action |
|-------|--------|
| Mouse | Look (pointer lock) |
| WASD | Move |
| Click / Space | Fire |
| `E` | Use (doors, switches, secret walls) |
| `1`–`7` | Arms (1 fist/chainsaw … 7 BFG-tier) |
| Mouse wheel | Cycle owned weapons |
| Esc | Pause |
| Skill screen | `1`–`4` then click |

## What you’ll feel

- **Dark barracks cold open** — pistol, troopers, stim; learn the gun before the storm.
- **Shotgun moment** — grab it, then a closet dump teaches paranoia.
- **Red key pressure** — hold a room, gate the hub, push into imp galleries with real sightlines.
- **Yellow wing floaters** — plasma tease, souls screaming in, keycard tension.
- **Lower arsenal** — chaingun / rockets / demon rush; optional berserk+chainsaw power fantasy.
- **Lift commit** — switch, rise, blue key antechamber.
- **Baron climax** — support cast, BFG-tier payoff, glowing exit pad.
- **Secrets that pay** — blur / invuln niches, not empty boxes.

## Systems (one map)

**Weapons:** fist, chainsaw, pistol, shotgun, chaingun, rocket (splash), plasma, BFG-tier. Distinct ammo, rates, spreads, shake & muzzle flash.

**Hostiles:** trooper, shotgunner, imp-like, demon rusher, soul flyer, caco floater, baron mid-boss. Idle → hear/see → chase → attack; pain; death. Closet ambushes.

**Items:** stim/med/bonus, armor/megaarmor, soulsphere-like, berserk, blur, invuln, light-amp, all ammo, full weapon pickups.

**Flow:** RYB keys & doors, free doors (vertical open), lift+switch, ≥2 secrets, exit pad. Intermission stats.

**HUD:** ammo, health, reactive face, armor, arms 1–7, RYB keys, directional damage vignette, gunshot light bumps.

**Audio:** synthesized weapons/doors/pickups/alerts/deaths/explosions + oppressive ambient drone.

## Engine notes

- 320×200 internal, nearest-neighbor upscale
- Raycaster pushed toward 2.5D (flats, height map, animated doors, lifts) rather than a half-finished BSP rewrite
- Modules: `map`, `player`, `weapons`, `enemies`, `renderer`, `input`, `ui`, `textures`, `audio`, `game`

## Stack

Vite 6 · TypeScript · Canvas 2D
