# World of Sosso

A gravity-flip 2D platformer built with Phaser 4, vibe-coded with Claude Code (Opus 4.8 / Fable 5) as a birthday gift for my partner (Sosso is the hero). Thirteen levels take her from a bagel shop through a trip abroad to a rooftop boss fight in Lisbon.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Engine | **Phaser 4** | Ships with 28 official AI agent skills in the repo; new RenderNode WebGL pipeline; unified filter system |
| Language | **TypeScript** | Catches scene-key typos and frame-name mistakes before runtime |
| Bundler | **Vite** | Instant HMR — game feel iteration is the whole point |
| Linting | **ESLint + `@typescript-eslint`** | Light rules, just enough to catch silly stuff |
| Levels | **ASCII source + build script** | Levels authored as `.txt` art in `tools/levels/`, compiled to Tiled JSON via `npm run levels` |
| Testing | **Playwright CLI** (`@playwright/cli`) | Ships its own Claude `SKILL.md`; ~4× more token-efficient than Playwright MCP because state goes to disk, not into context |

---

## Running it

```bash
git clone <repo> ossos2
cd ossos2
npm install

npm run dev       # dev server with HMR → http://localhost:5173
npm run build     # production build to dist/ (preview serves on :8080)
```

The dev server binds all interfaces, so it's reachable from a phone on the same Wi‑Fi at `http://<your-LAN-ip>:5173` — handy for testing touch controls and fullscreen.

### Asset pipelines

Sprites and levels are generated from source files, not hand-edited binaries:

```bash
npm run sprites   # tools/sprites/*.txt + helpers → public/assets PNG sheets
npm run levels    # tools/levels/*.txt ASCII maps → public/assets/tilemaps/*.json
```

Re-run these after editing anything under `tools/`.

**Controls:** arrow keys / WASD to move and jump; flip gravity on the bound key (unlocked partway through the story); on-screen buttons + a fullscreen toggle appear automatically on touch devices.

---

## Claude Code setup

### Skills (in `.claude/skills/`)

- **Official Phaser 4 skills** — clone `phaserjs/phaser` and copy `/skills/` into `.claude/skills/phaser/`. 28 SKILL.md files covering scenes, physics, input, animations, tilemaps, tweens, particles, cameras, filters, plus a v3→v4 migration skill.
- **Playwright CLI SKILL.md** — installs with `npm i -D @playwright/cli`. Move it into `.claude/skills/playwright/`.
- **[Caveman](https://github.com/juliusbrussee/caveman)** *(optional, toggle)* — cuts ~65% of output tokens for mechanical work. Turn off when debugging or learning new Phaser concepts.

### MCP servers

Just one — keep the tool list short.

- **[Context7](https://context7.com)** — version-specific Phaser/Vite/TS docs injected on demand. Solves the "Phaser 4 is too new for the model's training data" problem.
  ```bash
  claude mcp add --transport http context7 https://mcp.context7.com/mcp
  ```
  Trigger with `use context7` in any prompt touching Phaser API surface.

### Model

```bash
claude
> /model opusplan   # Opus plans, Sonnet executes
```

### CLAUDE.md

Short and human-readable. Architecture, scene list, conventions, hard "don't"s. Project-specific context, not a textbook.

---

## Dev loop

1. **Plan mode** (`Shift+Tab`) — spec the next milestone, ask Claude to question your assumptions
2. **Execute** — out of plan mode, Claude reads the relevant Phaser skill and writes code
3. **Playwright CLI** — actually play the game, screenshot, verify state on `window.__game__`
4. **`git commit`** at every runnable milestone — cheap insurance

Caveman ON for mechanical refactors. OFF when stuck on a weird bug and you need Claude to think out loud.

---

## Assets

### 🎨 Sprite art

- **[PixelLab](https://www.pixellab.ai/)** — AI pixel-art generator; used for the bespoke character and prop sprites
- **[Kenney.nl](https://kenney.nl)** — CC0 platformer packs (tiles, props, UI bits)
- **[CraftPix](https://craftpix.net/)** — free pixel-art sprite sheets (source of the vampire-girl sheets used for the Lindy boss)

### 🔊 Sound & music

Custom SFX (coin, jump, hit, hurt, heal, death) and a background music loop, under `public/assets/audio/`.

---

## Project structure

```
.
├── .claude/
│   ├── skills/
│   │   ├── phaser/           # 28 official Phaser 4 skills
│   │   └── playwright/       # SKILL.md from @playwright/cli
│   └── settings.json
├── public/
│   └── assets/               # sprites, audio, tilemaps (Tiled JSON), tilesets
├── src/
│   ├── scenes/               # Boot, Preload, Title, Menu, Game, UI, Pause, GameOver
│   ├── entities/             # Player, Bagel, Walker, Bat, Karen, Saw, Shot, Lindy
│   ├── systems/              # audio, fullscreen, levels, state, touch
│   ├── assets/               # asset + scene key constants
│   └── main.ts               # game config, scene registration, exposes window.__game__
├── tools/
│   ├── sprites/              # ASCII sprite sources + build helpers (npm run sprites)
│   └── levels/               # ASCII level maps + generator (npm run levels)
├── vite/                     # dev + prod Vite configs
├── CLAUDE.md                 # project context for Claude Code
└── package.json
```
