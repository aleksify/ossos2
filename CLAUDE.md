# World of Sosso — Handoff

Single-file Phaser 3 platformer. `index.html` holds everything: HTML shell, CSS, all JS. Loaded via local HTTP server (Python/Node), not `file://`, because Phaser CDN + image assets need real HTTP.

## Run

**Default (Claude's local checks):**

```sh
python3 -m http.server 8765
# open http://localhost:8765/index.html
```

**User test loop (LAN + phone):** start with `npx serve .` (NO flags — defaults to port 3000, binds 0.0.0.0). User reaches it at `http://192.168.1.113:3000`. Don't add `-l`, `-p`, or any flag — host IP / port are stable; flags break the user's bookmark.

Assets next to `index.html`: `sprite.png` (run, 6 frames @ 92×92), `sprite2.png` (jump, 9 frames), `sprite3.png` (spin, 8 frames, title), `sprite4.png` (punch, 3 frames), `bagel.png` (full-heal pickup). All other textures generated procedurally in `generateTextures()`.

## Architecture

```
index.html
├── <head>: viewport, PWA metas, all CSS
├── <body>: #game, #controls (fs + clear-save), #mobile-fs, .touch-controls, #rotate-overlay
└── <script>
    ├── CONSTANTS         (WIDTH, HEIGHT, TILE, PLAYER, ENEMY, SPIKE, MAX_HP, HEART_COUNT)
    ├── Save              (localStorage 'osso.save.v1' → { maxLevel })
    ├── Audio             (actx, beep, noise, sfx{}, BGM scheduler)
    ├── THEMES + LEVEL_KEYS + loadTilemap   (theme palettes; level keys array; tilemap loader helper)
    ├── generateTextures  (Phaser.Graphics → texture atlas)
    ├── bakeTileset       (?baketiles=1 dev flag — re-bake tileset.png from textures)
    ├── bakeOneEntity + ENTITY_BAKE_MAP   (?bakeentity=NAME — single entity to body for CDP screenshot)
    ├── computeHolesFromLayer  (derives hole pixel ranges from tilemap ground layer)
    ├── Input             (keyboard + touch unified — exposes left/right/jump/attackJustPressed/pauseJustPressed/restartJustPressed)
    ├── Player            (sprite + state machine: idle|run|jump|punch — owns update + attack)
    ├── BootScene         (preload sprites + 3 tilemap JSONs + tileset, generate textures, register anims, cache levelNames from tilemap props, init registry from Save)
    ├── TitleScene        (spin hero, "continue from level N" text, start on input)
    ├── GameScene         (_buildBackground, _buildGeometry, _buildEntitiesFromObjects, _spawnPlayer, _buildParticles, _wireColliders, _buildHUD, _wireInput)
    ├── PauseScene        (overlay scene, P/Esc/click to resume)
    └── DOM glue          (toggleFs w/ iOS pseudo-fs fallback, orientation lock, resizeGame, touchState binding)
```

### State ownership

- **Per-scene state** (`this.*` on GameScene): `gameOver`, `invulnUntil`, `bobbers[]`, `player`, `platforms`, `coins`, `spikes`, `enemies`, `healthPickups`, `checkpointFlags`, `goal`, `holes`, `controls`, `tilemap`, `groundLayer`, `themeName`, `levelName`, `spawnPoint`.
- **Cross-scene persistent state** (Phaser `this.registry`): `score`, `currentLevel`, `checkpoint`, `hp`, `startLevel`, `levelNames`.
- **Persisted to localStorage** (via `Save`): only `maxLevel` for progression unlock.
- **`this.input` is Phaser's input plugin** — do NOT shadow with the `Input` class. Game stores Input as `this.controls` (this was a bug fixed mid-session).

### Single source of truth for hole geometry

`computeHolesFromLayer(groundLayer)` scans bottom row of tilemap, emits `{left, right}` pixel ranges for contiguous empty tiles. Every gap-aware system (spike auto-fill, decor culling, coin culling, ground-level enemy patrol clamping) reads `this.holes`. Don't add new gap-aware logic without going through it.

### Ground physics

Tilemap layer `ground` (from `levels/level{1,2,3}.json`) provides visual + physics. Collision via `setCollisionByProperty({ collides: true })` on tile properties. One collider for player, one for enemies. Floating platforms (counter / counter_big / platform / bigplatform) live in `this.platforms` static group, spawned from object-layer `platform` markers.

### Save / progression

- Goal reach → `Save.setMaxLevel(nextLevel)`.
- Title shows "Continue from Level N" when `maxLevel > 0`.
- "Clear Save" button → `confirm()` → `Save.clear()` → `location.reload()`.

### iOS / mobile fullscreen

iOS Safari can't fullscreen a `<div>`. `toggleFs()` flow:
1. Already in fullscreen → exit.
2. Non-iOS + supports native → `requestFullscreen({ navigationUI: 'hide' })`, then `screen.orientation.lock('landscape')` (no-op fail on Safari).
3. Failure or iOS → `enterPseudoFs()` adds `.pseudo-fs` class to `body` + `#game` (CSS `position: fixed; inset: 0; 100dvh` with safe-area padding).
- "Add to Home Screen" launches in standalone via apple-mobile-web-app metas — closest to true fullscreen on iOS.
- Portrait + touch + in-fullscreen → shows `#rotate-overlay` with rotate-device prompt.

### Touch controls

CSS `@media (pointer: coarse)` shows `.touch-controls`. 4 buttons (◀ ▶ ✶ ⤒) bind to shared `touchState` object. `Input.left/right/jump` OR `touchState.left/right/jump`. Attack uses edge detection via `_prevTouchAttack` flag.

## Levels (Tiled JSON + bake scripts)

- Source-of-truth = `levels/level{1,2,3}.json` (Tiled 1.10 format). Two tilesets per level:
  - Ground tileset: `tileset.png`, 8 slots × 32px, GIDs 1–8 (GID 1 = outdoor ground, GID 2 = bagel ground_tile, 3–8 reserved). Source-rendered via `generateTextures()`. Re-bake with `?baketiles=1`.
  - Entities tileset: inlined into each level JSON (Phaser tilemap loader can't fetch external tilesets — "External tilesets unsupported"). Canonical source = `levels/entities.tsj` (image-collection format). Each tile entry has `type` (Tiled class) + per-tile `properties` (e.g. `key=platform`). Tile-object GIDs start at 9; see `TID`/`G()` in `bake_levels.mjs`.
- Entity sprites live in `entities/*.png` (19 files). Re-bake with `node bake_entities.mjs` — launches one headless Brave via CDP, screenshots each procedural texture at native size. Whole bake ~5s.
- `index.html` is data-free at runtime — no `LEVELS` array. All level state comes from the loaded tilemap.
- **For tile-level edits**: open `levels/level{N}.json` in Tiled. Entity sprites render at true sizes (platforms as 96×16 / 128×16 strips, trees at 64×112, etc.). Drag-and-drop from the entities tileset palette.
- **For bulk edits or new levels** (additive or format changes): edit the inline `LEVELS` array in `bake_levels.mjs`, then `node bake_levels.mjs` → overwrites all three JSONs.
- **Tile-object coord convention**: Tiled tile objects anchor at the bottom-LEFT of their bbox. `bake_levels.mjs` converts (centerX, centerY) → (cx-w/2, cy+h/2) for center-anchored sprites and (bcx, by) → (bcx-w/2, by) for bottom-anchored sprites (goal, checkpoint, tree, bush, rock). `_buildEntitiesFromObjects` reverses the conversion via `posOf(o)`.
- Object types: `spawn`, `goal`, `coin`, `spike`, `heart`, `checkpoint`, `enemy` (`min`/`max`/`onPlatform` props), `platform` (`key` = `platform`|`bigplatform`), `tree`, `bush`, `rock`. Spikes from object layer are **ignored** — `_buildGeometry` auto-fills them per hole.
- Map custom properties: `theme` (`outdoor`|`bagel`), `name` (HUD label).

## Dev URL flags

- `?baketiles=1` — re-bake `tileset.png` from procedural ground textures, halt boot.
- `?bakeentity=NAME` — render a single entity texture as the whole page body (used by `bake_entities.mjs` via CDP screenshot). `NAME` must exist in `ENTITY_BAKE_MAP` in `index.html`.
- `?autogame=1` — skip Title scene, jump straight to GameScene (headless tests use this).
- `?lvl=N` — start at level index N (0..2). Combine with `autogame=1`.

## Known caveats / gotchas

- BGM scheduler (`setInterval`) starts once, never stops. Fine for current scope. If you ever need to stop it (page hidden, etc.), call `clearInterval(bgm.timer); bgm.playing = false;`.
- Floating-platform enemy patrol bounds (`min`/`max`) are hand-tuned to platform extents — no auto-clamp. If you re-author levels, double-check enemies don't walk off platform edges. Ground-level enemies ARE auto-clamped to holes.
- Heart count `HEART_COUNT = ceil(MAX_HP/2)` — change `MAX_HP` and hearts auto-resize.
- Spike static bodies must call `s.refreshBody()` after `setSize()/setOffset()` — Phaser doesn't auto-refresh static bodies. Pattern repeated for checkpoint flags.
- `coins` group keeps full sprite around when destroyed — `b.active` guard in bob loop handles it.
- `Input` class shadowed Phaser `this.input` in an early version of the refactor → broke F/M keys. Fixed by renaming to `this.controls`. Don't reintroduce.

## TODO — next session

Ordered by ROI:

### Game feel (highest impact, ~30 min)
- [ ] **Coyote time** — allow jump for ~80ms (5 frames) after player walks off platform. Track `lastGroundedAt = time` in `Player.update`; jump check becomes `time - lastGroundedAt < COYOTE_MS`.
- [ ] **Jump buffer** — if jump pressed in air, queue for ~100ms; consume on landing. Track `lastJumpPressedAt`.
- [ ] **Variable jump height** — releasing jump key mid-rise cuts `velocityY` to ~half (e.g., `if (!input.jump && body.velocity.y < 0) body.velocity.y *= 0.5;`).

### Polish (~30 min)
- [ ] **Slash visual** — `slash` texture generated in `generateTextures()` but never used. Display short-lived sprite at player x±32 during punch via `Player.attack()`. Fade out 100ms.
- [ ] **Mute persistence** — save `bgm.muted` to localStorage. Load on Boot. M key toggles + writes.
- [ ] **Level select on Title** — when `maxLevel > 0`, show 1-2-3 buttons for unlocked levels instead of single "continue".
- [ ] **Floating-platform enemy auto-clamp** — at enemy create-time, find platform under `(d.x, d.y + 20)` and clamp `min/max` to its extents.

### Bigger lifts
- [x] ~~Phaser Tilemap proper~~ — done; see `levels/` and `loadTilemap`.
- [x] ~~Externalize `LEVELS` to JSON~~ — done; see `levels/*.json` + `bake_levels.mjs`.
- [ ] Split into ES modules (`audio.js`, `textures.js`, `scenes/*.js`). Server already serves via HTTP, modules will work. Worthwhile when file exceeds ~2500 lines.
- [ ] Paint-style spike tiles — replace `_buildGeometry` per-hole spike auto-fill with a damaging tile variant authored in Tiled. Currently object-layer `spike` markers are ignored.
- [ ] Full Player FSM (separate `idle/run/jump/fall/punch/hurt/respawn` states with explicit transitions) — needed only when adding wall-jump/dash/climb.

### Content
- [ ] Only 3 levels. Add 2-3 more for full game.
- [ ] Drag-on-canvas level editor that emits level data — saves hours of hand-authoring coords.

## Smoke-testing with headless Brave

Phaser games can fail silently after a scene transition (e.g. `Uncaught ReferenceError` inside `GameScene.create()` aborts the scene mid-build — looks like a freeze, no error in the visible UI). Use headless Brave to surface the console.

Brave binary path: `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser` (Chromium-based — same flags as Chrome, including `--headless=new`, `--remote-debugging-port`, `--enable-logging=stderr`).

**One-shot console capture:**

```sh
# 1. serve files (Claude side — port 8765 keeps it off the user's npx serve)
python3 -m http.server 8765 > /tmp/ossos_server.log 2>&1 &
SPID=$!
sleep 1

# 2. headless load. --virtual-time-budget lets Phaser preload + run a few frames before exit.
BRAVE="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
PROFILE=$(mktemp -d)
"$BRAVE" --headless=new --disable-gpu --no-sandbox \
  --user-data-dir="$PROFILE" \
  --virtual-time-budget=15000 \
  --enable-logging=stderr --v=1 \
  'http://localhost:8765/index.html' \
  > /tmp/brave.out 2> /tmp/brave.log

# 3. cleanup + inspect
kill $SPID 2>/dev/null
rm -rf "$PROFILE"
grep -E 'INFO:CONSOLE|ERROR:CONSOLE|WARNING:CONSOLE|Uncaught|TypeError|ReferenceError|RangeError' /tmp/brave.log | head -40
```

Each `console.log` / thrown error shows up as `[pid:tid:ts:LEVEL:CONSOLE:LINE] "msg", source: URL (LINE)`. Source line number = the line in `index.html` (one big script — line numbers match the file).

**Reaching GameScene without keypress:** title screen waits for input. Headless can't easily simulate that, so temporarily add a URL-flag bypass in `BootScene.create()`:

```js
if (params.get('autogame') === '1') { this.scene.start('Game'); }
else { this.scene.start('Title'); }
```

Then load `?autogame=1`. **Always revert** the bypass before reporting done — it's a debug aid, not a feature.

**Why `--user-data-dir=$(mktemp -d)`:** stops Brave from refusing to launch when the user's normal Brave profile is open.

**Why not `chromium`:** `/opt/homebrew/bin/chromium` shim points at a missing `.app`. Brave is the working Chromium on this machine.

## Hotkeys

| Key | Action |
|-----|--------|
| WASD / Arrows | Move |
| W / Up / Space | Jump |
| X / J | Attack |
| F | Fullscreen |
| P / Esc | Pause |
| M | Mute BGM |
| R | Restart (only when game-over) |

## Touch buttons

◀ ▶ ✶ (attack) ⤒ (jump). ⛶ top-right toggles fullscreen. Sized 54×54 portrait, 60×60 landscape phones.

## File map

- `index.html` — entire game
- `sprite.png` `sprite2.png` `sprite3.png` `sprite4.png` — player frames
- `bagel.png` — full-heal pickup
- `tileset.png` — baked ground tiles (8 slots × 32px)
- `entities/*.png` — 19 per-entity sprites used by the Tiled image-collection tileset
- `levels/level{1,2,3}.json` — Tiled-format level data (source of truth)
- `levels/entities.tsj` — canonical Tiled image-collection tileset for entities (inlined per level at bake time)
- `bake_levels.mjs` — dev tool, regenerates the 3 JSONs from inline LEVELS data
- `bake_entities.mjs` — dev tool, screenshots 19 entity PNGs via headless Brave + CDP
- No build step.

## Conventions

- Constants at top, ALL_CAPS object namespaces (`PLAYER.JUMP_VEL`).
- Scene classes use `_camelCase` for private helpers (`_buildGeometry`).
- No external dependencies beyond Phaser CDN.
- No `.original.md` backups, no docs files unless explicitly requested.
- Pixel art rendering: `pixelArt: true`, `roundPixels: true`, `antialias: false`. Player sprite uses 32px tiles, world coords in pixels.
