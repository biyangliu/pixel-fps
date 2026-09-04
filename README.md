# Sector Zero (Pixel FPS)

A browser **spiritual successor** to classic 90s shareware FPS design DNA — one dense, hand-authored episode that aims for the *feel* of what that era's designers would ship next: weapon-ladder satisfaction, key-gated tension, monster closets, secret delight, and a dirty tech-hell atmosphere.

**Not a remake.** Original map, original procedural art (64²), synthesized SFX + sequenced WebAudio music. Systems parity with the genre's classics — not cloned content.

Built with **Vite + TypeScript** and a Canvas **2.5D raycaster** (floor/ceiling flats, height-aware doors & lifts, billboard actors, projectiles, automap, screen shake).

> **Legal:** Not affiliated with id Software. **No commercial IWAD/WAD textures, sprites, sounds, or MIDI** — and none are ripped or reconstructed. All art/audio are original procedural/synthesized assets inspired by the *genre*, not any specific commercial package.

## Play

```bash
# install deps with your package manager, then:
node node_modules/vite/bin/vite.js
```

Open the Vite URL (usually http://localhost:5173). Click → skill select → fight.

Production: `node node_modules/typescript/bin/tsc && node node_modules/vite/bin/vite.js build`

Map path check: `node scripts/verify-map.mjs`

## Controls

| Input | Action |
|-------|--------|
| Mouse | Look (pointer lock) |
| WASD | Move |
| Click / Space | Fire |
| `E` | Use (doors, switches, secret walls) |
| `Tab` | Automap (explored walls; computer-map reveals all) |
| `1`–`7` | Arms (1 fist/chainsaw … 7 BFG-tier) |
| Mouse wheel | Cycle owned weapons |
| Esc | Pause |
| Skill screen | `1`–`4` then click |

## Full playthrough (verified critical path)

1. **Dark barracks** — pistol, troopers, stim/armor-bonus; learn move/shoot.
2. **Shotgun alcove** — grab the boomstick; closet trap teaches paranoia.
3. **Red key room** — hold the pocket, take the card, open the **RED** door east.
4. **Chaingun + yellow key** — galleries, floaters, plasma tease behind the card.
5. **YELLOW door** — lift switch corridor, megaarmor, **BLUE** key.
6. **Optional lower arsenal** — chainsaw, berserk, rockets, demons + **spectres**, teleporter pad, crusher hazard.
7. **Nukage pit** — damaging slime floors; grab **radsuit** + **backpack** before lingering.
8. **Secrets** — push two unmarked walls for blur + invuln; computer-map pickup lights the automap.
9. **BLUE door climax** — baron + support, BFG-tier payoff, EXIT sign + glowing pad.
10. **Intermission** — kills%, items%, secrets%, time, skill.

## Systems (one map)

**Weapons:** fist, chainsaw, pistol, shotgun, chaingun, rocket (splash), plasma, BFG-tier. Distinct ammo, rates, spreads, kick, muzzle flash, empty-click. Backpack doubles capacity.

**Hostiles:** trooper, shotgunner, imp-like, demon, **spectre** (partial invis), lost soul, caco, baron. Idle → hear/see → chase → attack; pain; death corpses; blood splat. **Monster infighting** when hit by other monsters. Closet ambushes. Skill scales density/HP/speed/ammo.

**Items:** stim/med/bonus, armor bonus/security/combat(mega), soulsphere-like, berserk, blur, invuln, light-amp, **radsuit**, **backpack**, **computer-map**, all ammo, full weapon pickups, RYB keys.

**World:** RYB locked doors, free doors, remote lift switch, **damaging nukage**, **crusher**, **teleporter**, push-wall secrets, EXIT pad + EXIT sign wall, automap.

**Feel:** weapon bob + kick, muzzle light, screen shake, directional damage vignette, face states (look/pain/god/dead), pickup flash, classic status bar, pause, retry.

**Audio:** chunky per-weapon SFX, world (door open/close, switch, lift, splash, teleport, secret), player (pain, land, empty click), enemy alert/attack/pain/death by type, **looping original sequenced music** + ambient bed + title/intermission stings.

## Engine notes / limits

- 320×200 internal, nearest-neighbor upscale
- Raycaster pushed toward 2.5D (flats, height map, animated doors, lifts, crushers) — not a full BSP portal engine
- Billboard sprites are procedural multi-pose (walk/attack/pain/death), not ripped WAD frames
- Modules: `map`, `player`, `weapons`, `enemies`, `renderer`, `input`, `ui`, `textures`, `audio`, `game`

## Stack

Vite 6 · TypeScript · Canvas 2D · Web Audio
