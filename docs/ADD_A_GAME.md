# Add a game

A game is a pure object: state in, state out, no `$`. Everything it touches lives in `src/games/`.

## Steps

1. **Catalog.** In `src/games/catalog.ts`, add the id to `GameId` and an entry to `CATALOG`. Keep `status: "soon"` until the game is playable.
2. **Game.** Create `src/games/<id>/` and write `src/games/<id>/<id>.ts` exporting a `Game<S>` (contract in `src/games/game.ts`). Everything the game owns lives in that folder. `src/games/morpion/morpion.ts` is the reference; `src/games/echo/echo.ts` for a game with a clock.
3. **README.** Write `src/games/<id>/README.md`: what the game is, its keys, its score, and its manual checks. `src/games/morpion/README.md` is the reference. Add a row to the games table of the root `README.md`, linking to it.
4. **Registry.** Add it to `GAMES` in `src/games/index.ts`, then set `status: "available"`.

The session already handles the menu, `p` pause, `r` restart, `q` back to the menu, automatic pauses and the best score.

## Contract notes

- `controls`: one `Button` each, with a `hotkey`. Rules: [ARCHITECTURE.md → Conventions](ARCHITECTURE.md#conventions).
- `init(seed)`: all randomness comes from the seed, kept in the state. Same seed, same game.
- `restart(s, seed)`: optional, defaults to `init(seed)`. Use it to carry something across games (Morpion keeps its win streak).
- `status(s).score`: higher is better. The best score is the max ever reached, stored per game.
- `board(s)`: a `CellBoard` (`kind: "cells"`), rows of `Cell`s drawn as fixed-size boxes (`cell.width` × `cell.height`, `gap` apart, `bg` as background). Give `cell.height` an odd value: a terminal tile needs a middle row to center its glyph. Why fixed-size: [ARCHITECTURE.md → Platform constraints](ARCHITECTURE.md#platform-constraints).
- Cells are not clickable ([ARCHITECTURE.md → Platform constraints](ARCHITECTURE.md#platform-constraints)): move a cursor with `MOVES` and `moveCursor` (`src/games/grid.ts`) and select with a key.
- A board that cells cannot draw gets its own kind: add it to the `Board` union of `src/games/game.ts`, write its renderers in the game's folder, and route them in `src/render/board.ts` per surface. A surface with no renderer shows "not playable here". Hogzzle's `PictureBoard` and `svg.ts` are the example.
- `size`: the smallest pane body (columns, rows) the whole game screen fits in: header, framed board, legend. Below it, the pane asks for a wider window. Check it on Desktop.
- `tickMs` / `tick(s)`: the session calls `tick` every `tickMs` (a multiple of 100), only while the game shows, unpaused, in phase `playing`. Count time in ticks in the state. Return the same state when nothing changes: an unchanged state draws nothing.
- `resume(s)`: optional, called when a pause lifts. Use it when a pause must not cost the player (Echo replays its round with a full answer time).

## Tests

- Logic: test the game alone with a fixed seed (`tests/morpion.test.ts`). A clock is just `tick` called in a loop (`tests/echo.test.ts`).
- Clock in the pane: `stubEngine(on).clock.advance(ms)` moves time (`tests/clock.test.ts`).
- Interface: a `$.ui.mount` test as required by [ARCHITECTURE.md → Conventions](ARCHITECTURE.md#conventions) (`tests/pane.test.ts`, fixtures in `tests/engine.ts`).
- Run `pnpm typecheck`, `pnpm lint`, `claude plugin test` and `claude plugin validate .`, then play it in Desktop and in a terminal (`claude --plugin-dir .`) with the manual checks of its README.

API reference: [Claude Code mods](https://code.claude.com/docs/en/plugins/mods/overview). `/plugin-types` writes the API types into `.claude-plugin/types/`.
