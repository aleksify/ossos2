# CLAUDE.md

Project context for Claude Code. The game is **Flipside**, a gravity-flip 2D platformer — see Game design below.

## Stack

- **Phaser 4** (WebGL, new RenderNode pipeline). Treat v3 patterns as suspect — use `phaser-v3-to-v4-migration` skill when porting examples from older docs.
- **TypeScript** strict mode. No `any` without a `// why:` comment.
- **Vite** dev server on `localhost:5173`. HMR is the iteration loop.
- **Levels** are ASCII files in `tools/levels/*.txt`, compiled to Tiled-format JSON by `npm run levels` (`tools/build-levels.mjs` — legend in its header). Output in `public/assets/tilemaps/` is **generated, never hand-edit**. Loaded via `this.load.tilemapTiledJSON()`. Tileset images live in `public/assets/tiles/` (Kenney Pixel Platformer, CC0; 18px tiles). Layer/object-type names shared via `src/assets/level-vocab.json`.
- **Playwright CLI** for in-browser verification. Not a unit test framework — used to actually drive the game and inspect state.

## Skills

`.claude/skills/` contains 28 official Phaser 4 skills (`phaser-*`) plus `playwright-cli`. Auto-loaded by description match. When touching Phaser API, prefer the relevant skill over training-data recall. For Phaser 4 specifics not in skills, use Context7 MCP: add `use context7` to the prompt.

## Project layout

```
public/assets/tiles/    spritesheets (tiles.png 18px, characters.png 24px, backgrounds.png 24px)
public/assets/audio/    sfx (Kenney Digital Audio, CC0)
public/assets/tilemaps/ GENERATED level JSON — edit tools/levels/*.txt instead
src/
  main.ts               game config, scene registration, exposes window.__game__
  scenes/               Boot, Preload, Menu, Game, UI, GameOver (+ keys.ts)
  entities/             Player, Walker, Saw, Bat — extend Arcade.Sprite
  systems/              levels (specs/palettes), state (registry helpers) — no scene imports
  assets/               keys.ts (asset/anim/frame consts), level-vocab.json
tools/
  build-levels.mjs      ASCII → Tiled JSON compiler (npm run levels)
  levels/               level1..5.txt — ASCII level sources
```

## Conventions

- **Scene keys** are string constants in `src/scenes/keys.ts`. Never inline `'Game'` — typos are silent.
- **Asset keys** same treatment — `src/assets/keys.ts`.
- **Entities** are classes extending `Phaser.GameObjects.*` only when they need to live in the display list. Otherwise plain classes with a `sprite` field.
- **Systems** never import scenes. Scenes call into systems, not the reverse.
- **No globals** except `window.__game__` (debug/Playwright handle, set in `main.ts`).
- **Physics**: pick Arcade or Matter per-scene and stick with it. Don't mix in one scene.

## Verification loop

1. `npm run dev` running in background.
2. After non-trivial change, drive the game with Playwright CLI — load page, take screenshot, read `window.__game__.scene.keys` or scene-specific state.
3. Don't claim a feature works without seeing it run. Type-check passing ≠ feature working.
4. User tests manually too — don't waste their time with a broken golden path.

## Commit cadence

Every runnable milestone. Cheap insurance. Use `/caveman-commit` for terse conventional-commit messages.

## Hard don'ts

- No Phaser 3 API patterns (`game.add.sprite` outside scenes, old physics config shape, etc.). Check `phaser-v4-new-features` skill if unsure.
- No mocking Phaser in tests — Playwright drives the real game.
- No adding MCP servers beyond Context7 without discussion. Tool list stays short.
- No premature abstraction. Three similar scenes is fine; extract a base class only when the fourth shows up.
- No comments restating what code does. Comments only for non-obvious *why* (a Phaser quirk, an asset-loading order constraint, etc.).
- No `README.md`-style docs in `src/`. This file + code is the doc.

## Game design

**Flipside — a Sosso story.** Sosso (young brunette, pale, red dress; the user's girlfriend — treat respectfully) escapes her bagel-shop job and gains gravity powers. Pixel art: Kenney tiles + custom sprites (see sprite pipeline above).

- **Story arc**: levels 1–3 = bagel shop (no flip; SPACE jumps, X/J throws bagels). Enemies are annoying customers (patrol) and Karens (lob coffee). Level 3 is long, with checkpoint flags `F`, and ends in a boss fight vs **Lindy** (skinny boss, 6 HP, dash → rolling-pin volley → enrage at ≤3 HP). She drops the **anti-gravity bagel**: eating it permanently swaps jump → gravity flip. Levels 4–8 = the flip levels, **set in dusk Paris** (Eiffel + Haussmann-skyline parallax from `paris.png`/`eiffel.png`, limestone tile tops, lamp/railing deco, croissant collectibles, walkers reskinned as pigeons). Level 8 (**La Tour de Stinky**) is a **vertical** climb inside the Eiffel Tower — 27×100 tiles, camera scrolls up, traversal is chained gravity flips between girder undersides. Stinky (black cat) waits in a cage (`G` in ASCII) on the summit deck — touch → hearts cinematic → level 9. Level 9 (**Ubatuba Express**) is the vacation epilogue, the drive from **São Paulo to Ubatuba at sunset** (Sosso's girlfriend-player grew up in SP — references must land for a paulistana): auto-scroll (`autoScroll` px/s in LevelSpec — camera drives itself, falling off the left screen edge kills, scroll pauses during respawn grace), brazil tileset (boardwalk caps + sand fills, firstgid 197, `t` palm 2×2 deco), staged parallax journey — SP skyline backdrop `sampa.png` (Banespa, Copan, MASP on its pillars, Ponte Estaiada) + highrise/pichação strip frames giving way to Serra do Mar hills (`serra.png`) and beach kiosks (`brasil.png` strip), maritaca walkers (green parakeets, THE São Paulo bird), brigadeiro collectibles, the Ubachuva joke in the hint, Stinky waiting at the exit door → ending screen. Engine notes: world/camera bounds come from map dimensions, so levels may be any size (horizontal ones are 15 rows tall); auto-scroll edge math must use `cam.worldView`, not `cam.scrollX` — scrollX is offset from the visible edge under zoom; parallax-staged backdrops sit at `ride·p·sf + 240·(1−sf)`, not at `p·mapWidth` (see `addParallax`).
- **Flip mechanic**: SPACE/W/↑ flips gravity, grounded-only (100ms coyote). Walk floors *and* ceilings. Bagel throw stays in flip levels; kills walkers/bats/customers/karens, not saws. Bagels die on terrain.
- **Levels**: 15 tiles tall (viewport at zoom 2, no vertical scroll), horizontal scroll, enclosed rooms. ASCII legend in `tools/build-levels.mjs` (incl. `C` customer, `K` karen, `L` lindy, `F` checkpoint).
- **Death**: one hit; respawn at level start or last checkpoint; deaths counted. R restarts, ESC to menu.
- **Player physics**: body 14×19, run 170 px/s, jump 390, gravity ±1500, max fall 460, tileBias 18.
- **HUD**: collectible (bagels in shop, gems after) x/total, deaths, boss HP bar, run timer on win screen.
- **Gotcha**: use plain `add.group()` for entity collections — `physics.add.group()` re-applies group defaults on add() and wipes body config set in entity constructors.
