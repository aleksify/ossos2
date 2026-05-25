# CLAUDE.md

Project context for Claude Code. Game design TBD — this file covers stack, conventions, and workflow only.

## Stack

- **Phaser 4** (WebGL, new RenderNode pipeline). Treat v3 patterns as suspect — use `phaser-v3-to-v4-migration` skill when porting examples from older docs.
- **TypeScript** strict mode. No `any` without a `// why:` comment.
- **Vite** dev server on `localhost:5173`. HMR is the iteration loop.
- **Tiled** for levels — exports JSON, loaded via `this.load.tilemapTiledJSON()`. Tilesets and maps live in `public/assets/tilemaps/`.
- **Playwright CLI** for in-browser verification. Not a unit test framework — used to actually drive the game and inspect state.

## Skills

`.claude/skills/` contains 28 official Phaser 4 skills (`phaser-*`) plus `playwright-cli`. Auto-loaded by description match. When touching Phaser API, prefer the relevant skill over training-data recall. For Phaser 4 specifics not in skills, use Context7 MCP: add `use context7` to the prompt.

## Project layout

```
public/assets/          sprites, audio, tilemaps (Tiled JSON)
src/
  main.ts               game config, scene registration, exposes window.__game__
  scenes/               Boot, Preload, Menu, Game, UI, GameOver
  entities/             Player, Enemy, Pickup — composition over inheritance
  systems/              input, save/load, physics helpers — pure modules, no scene refs
tests/                  Playwright specs
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

Not yet specified. Will be added to this file once decided. Until then, ask before inventing mechanics, scenes, or content.
