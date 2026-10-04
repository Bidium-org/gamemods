# Add a game

A game is a pure object: state in, state out, no `$`. Everything it touches lives in `src/games/`.

## Steps

1. **Game.** Create `src/games/<id>/` and write `src/games/<id>/<id>.ts` exporting a `Game<S>` (contract in `src/games/game.ts`). Everything the game owns lives in that folder. `src/games/tic-tac-toe/tic-tac-toe.ts` is the reference; `src/games/echo/echo.ts` for a game with a clock.
2. **README.** Write `src/games/<id>/README.md`: what the game is, its keys, its score, and its manual checks. `src/games/tic-tac-toe/README.md` is the reference. Add a row to the games table of the root `README.md`, linking to it.
3. **Registry.** In `src/games/index.ts`, add one entry to `ENTRIES`: `<id>: { name, tagline, game }`. The key is the game's id: typed after `/gamemods` and stored with its best score, so it never changes. The menu lists games in key order, where JS puts an integer-like id (`2048`) first. A duplicate id or a missing field fails `pnpm typecheck`.

The session already handles the menu, `p` pause, `r` restart, `q` back to the menu, automatic pauses and the best score.

## Contract notes

- `controls`: one `Button` each, with a `hotkey`. Rules: [ARCHITECTURE.md → Conventions](ARCHITECTURE.md#conventions).
- `init(seed)`: all randomness comes from the seed, kept in the state. Same seed, same game.
- `restart(s, seed)`: optional, defaults to `init(seed)`. Use it to carry something across games (Tic-tac-toe keeps its win streak).
- `status(s).score`: higher is better. The best score is the max ever reached, stored per game.
- `board(s)` and `render`: a `CellBoard`, drawn with `render: drawCells` (`src/games/cells.ts`): rows of `Cell`s drawn as fixed-size boxes (`cell.width` × `cell.height`, `gap` apart, `bg` as background). Give `cell.height` an odd value: a terminal tile needs a middle row to center its glyph. Why fixed-size: [ARCHITECTURE.md → Platform constraints](ARCHITECTURE.md#platform-constraints).
- Cells are not clickable ([ARCHITECTURE.md → Platform constraints](ARCHITECTURE.md#platform-constraints)): move a cursor with `MOVES` and `moveCursor` (`src/games/grid.ts`) and select with a key.
- A board that cells cannot draw gets its own type and renderer: see [Beyond cells](#beyond-cells).
- `size`: the smallest pane body (columns, rows) the whole game screen fits in: header, framed board, legend. Below it, the pane asks for a wider window. Check it on Desktop.
- `tickMs` / `tick(s)`: the session calls `tick` every `tickMs` (a multiple of 100), only while the game shows, unpaused, in phase `playing`. Count time in ticks in the state. Return the same state when nothing changes: an unchanged state draws nothing.
- `resume(s)`: optional, called when a pause lifts. Use it when a pause must not cost the player (Echo replays its round with a full answer time).

## Beyond cells

Each step below is optional and stands alone: a game can draw an `Svg` without animating, or animate on one surface only. 2048 (`src/games/2048/`) uses them all; Hogzzle (`src/games/hogzzle/`) is a static picture on Desktop. Why the rules: [ARCHITECTURE.md → Renderers](ARCHITECTURE.md#renderers), [The two clocks](ARCHITECTURE.md#the-two-clocks) and [Platform constraints](ARCHITECTURE.md#platform-constraints).

### Its own board

1. Write the board's type in the game's folder (`src/games/2048/board.ts`, `src/games/hogzzle/board.ts`): plain data, which the session compares to skip redraws. `board(s)` returns it; the game is a `Game<S, YourBoard>`.
2. Write a renderer per surface in the game's folder: `(els, board, draw) → RenderElement`. It draws only the board: the session header shows the score and the end of the game. Show `draw.dimmed` (the pause): Hogzzle and 2048 lay a veil on their `Svg`, 2048's `Client` fades its colors.
3. Route them in the game's `render(els, board, draw)` by element, never by surface: `els` holds `Svg` only where it draws and `Client` only where it loads. Without the element you need, return a fallback (2048 builds a cell board, `cells.ts`) or null, which shows "not playable here". `src/games/2048/2048.ts` is the reference.

### A Desktop `Svg`

- An `Svg` without `isInteractive` is drawn as an image. Its `source` stays under 131 072 characters, the largest board in motion included: test it (`tests/2048-svg.test.ts`).
- `key`: a static picture is keyed by a hash of its `source` (`src/games/hogzzle/svg.ts`); 2048's animated one has none. Never a counter.

### A terminal `Client`

- The renderer returns `Client({ key, module, props })`, written in the game's folder (`src/games/2048/terminal.ts`); the module is its own file, its default export a `ClientModule` (`src/games/2048/client.ts`).
- `key` MUST be a stable literal: a `Client` keeps its state and timers only while one with the same `key` stays in the tree.
- `module` MUST be a string literal relative to the file that writes the call (`"./client.ts"`); a variable or a template string is refused at load. Check that `claude plugin validate .claude-plugin/plugin.json` lists it under `surface modules`.
- `props` are JSON: a motion that reaches one is plain data.
- The module reads no key: `controls` stay the game's input. It MUST call `setState` only on mount, on a new `moveId` and in its own `surface.every` timer: the engine unmounts a `Client` that calls `setState` on three consecutive renders with nothing changed (props, key, pointer, tick).
- With no motion it draws the settled board, whatever its own timer holds.

### Animation

- Add `animation: { ms, play }` to the game, and write the type of one move, plain JSON, as its third parameter: `Game<S, YourBoard, YourMotion>` (`Motion` in `src/games/2048/rules.ts`). `play(s, id)` plays the key once and returns `{ state, motion }`: the next state, and the move as a `YourMotion`, or null. A key that changes nothing returns `s` itself. Define the move once and derive `onControl` from it, `(s, id) => play(s, id).state` (`src/games/2048/2048.ts`).
- `ms`: how long the session keeps the motion before it settles it. At least the longest animation of every renderer (2048: `ANIMATION_MS` of `svg.ts`, longer than the `Client`'s own).
- The renderer takes a `Draw<YourMotion>` and reads `draw.motion` and `draw.moveId`. With no motion it draws the settled board; an `Svg` replays its CSS at each redraw while the motion lasts, a `Client` starts its own animation on a new `moveId`.
- Motion is display only: the score, the best score and the pause never read it, and `tick` leaves it alone.

### Room

- `draw.room` holds the pane columns and rows left to the board. A renderer that can shrink picks its layout from it: 2048's `Client` goes from 3-row tiles with gaps down to 1-row tiles (`fitLayout()`). `size` still sets the smallest pane the game plays in.

## Tests

- Logic: test the game alone with a fixed seed (`tests/games/tic-tac-toe/tic-tac-toe.test.ts`). A clock is just `tick` called in a loop (`tests/echo.test.ts`).
- Clock in the pane: `stubEngine(on).clock.advance(ms)` moves time (`tests/clock.test.ts`).
- Interface: a `$.ui.mount` test as required by [ARCHITECTURE.md → Conventions](ARCHITECTURE.md#conventions) (`tests/pane.test.ts`, fixtures in `tests/engine.ts`).
- Beyond cells: the `Svg` source as a string, settled, in motion and paused (`tests/2048-svg.test.ts`); the `Client` mounted on `terminal`, its animation driven by `ui.advance`, through redraws, quick moves, a pause and a restart (`tests/2048-client.test.ts`); the motion in the session (`tests/session.test.ts`) and its lifetime on the mock clock (`tests/motion.test.ts`).
- Run `pnpm typecheck`, `pnpm lint`, `claude plugin test` and `claude plugin validate .`, then play it in Desktop and in a terminal (`claude --plugin-dir .`) with the manual checks of its README.

API reference: [Claude Code mods](https://code.claude.com/docs/en/plugins/mods/overview). `/plugin-types` writes the API types into `.claude-plugin/types/`.
