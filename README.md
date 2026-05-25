# Ossos2

Vibe coding a small Phaser.js 2D platformer for my partner's birthday using Claude Opus 4.7.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Engine | **Phaser 4** | Ships with 28 official AI agent skills in the repo; new RenderNode WebGL pipeline; unified filter system |
| Language | **TypeScript** | Catches scene-key typos and frame-name mistakes before runtime |
| Bundler | **Vite** | Instant HMR — game feel iteration is the whole point |
| Linting | **ESLint + `@typescript-eslint`** | Light rules, just enough to catch silly stuff |
| Level editor | **[Tiled](https://www.mapeditor.org/)** | Exports JSON that Phaser loads natively via `load.tilemapTiledJSON()` |
| Testing | **Playwright CLI** (`@playwright/cli`) | Ships its own Claude `SKILL.md`; ~4× more token-efficient than Playwright MCP because state goes to disk, not into context |

## Scaffold

```bash
npm create @phaserjs/game@latest ossos2 
# → Web Bundler → Vite → TypeScript → Minimal
cd ossos2
npm install
npm run dev   # localhost:5173
```

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

## Asset resources

### 🎨 Sprite art

Free pixel-art packs that drop straight into a Phaser project:

- **[Kenney.nl](https://kenney.nl)** — CC0, dozens of platformer packs (*Pixel Platformer*, *Platformer Art Deluxe*, *Abstract Platformer*)
- **[Pixel Frog Studio](https://pixelfrog-assets.itch.io)** — gorgeous free pixel art. *Pixel Adventure 1 & 2*, *Kings and Pigs*, *Tiny Swords*
- **[OpenGameArt](https://opengameart.org)** — enormous library, check individual licenses
- **[itch.io free assets](https://itch.io/game-assets/free)** — browse by tag

**Sprite editors:**

- **[Aseprite](https://www.aseprite.org/)** — $20, gold standard. Has an [MCP server](https://aseprite-mcp.abyo.net/) if you want Claude to drive it
- **[Piskel](https://www.piskelapp.com/)** — free, browser-based
- **[Pixelorama](https://orama-interactive.itch.io/pixelorama)** — free, open-source desktop
- **[LibreSprite](https://libresprite.github.io/)** — free fork of older Aseprite

### 🔊 Sound effects

- **[Jsfxr](https://sfxr.me/)** — browser-based 8-bit SFX generator, instant gratification
- **[ChipTone](https://sfbgames.itch.io/chiptone)** — more advanced retro SFX, CC0
- **[Freesound](https://freesound.org)** — huge library, filter by CC0
- **Kenney audio packs** — CC0 SFX bundles

### 🎵 Music

- **[Suno](https://suno.com)** / **[Udio](https://udio.com)** — AI-generated loops
- **Kenney music packs** — CC0
- **[Incompetech](https://incompetech.com/)** (Kevin MacLeod) — CC BY
- **[FreePD](https://freepd.com/)** — public domain

### 🔤 Fonts

- **[Google Fonts](https://fonts.google.com)** — retro picks: *Press Start 2P*, *VT323*, *Silkscreen*, *Jersey 25*
- **Bitmap fonts** — use [Hiero](https://libgdx.com/wiki/tools/hiero) or [BMFont](https://www.angelcode.com/products/bmfont/) for crisp `Phaser.BitmapText` rendering

### 🗺️ Tilesets

Pair with Tiled. Most of the platformer art packs above include tilesets.

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
│   └── assets/               # Sprites, audio, tilemaps (Tiled JSON)
├── src/
│   ├── scenes/               # Boot, Preload, Menu, Game, UI, GameOver
│   ├── entities/             # Player, Enemy, Pickup (composition > inheritance)
│   ├── systems/              # Input, save/load, physics helpers
│   └── main.ts
├── tests/                    # Playwright specs
├── CLAUDE.md                 # Project context for Claude Code
├── vite.config.ts
└── package.json
```

