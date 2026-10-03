# Add a game

A game is a pure object: state in, state out, no `$`. Everything it touches lives in `src/games/`.

## Steps

1. **Catalog.** In `src/games/catalog.ts`, add the id to `GameId` and an entry to `CATALOG`. Keep `status: "soon"` until the game is playable.
2. **Game.** Write `src/games/<id>.ts` exporting a `Game<S>` (contract in `src/games/game.ts`). `src/games/morpion.ts` is the reference.
3. **Registry.** Add it to `GAMES` in `src/games/index.ts`, then set `status: "available"`.

The session already handles the menu, `p` pause, `r` restart, `q` back to the menu, automatic pauses and the best score.

## Contract notes

- `controls`: one `Button` each, with a `hotkey`. Rules: [ARCHITECTURE.md → Conventions](ARCHITECTURE.md#conventions).
- `init(seed)`: all randomness comes from the seed, kept in the state. Same seed, same game.
- `restart(s, seed)`: optional, defaults to `init(seed)`. Use it to carry something across games (Morpion keeps its win streak).
- `status(s).score`: higher is better. The best score is the max ever reached, stored per game.
- `board(s)`: rows of `Cell`s drawn as fixed-size boxes (`cell.width` × `cell.height`, `gap` apart, `bg` as background). Why: [ARCHITECTURE.md → Platform constraints](ARCHITECTURE.md#platform-constraints).
- `size`: the smallest pane body (columns, rows) the whole game screen fits in: header, framed board, legend. Below it, the pane asks for a wider window. Check it on Desktop.
- `tickMs` / `tick`: reserved, see [ARCHITECTURE.md → Current state](ARCHITECTURE.md#current-state).

## Tests

- Logic: test the game alone with a fixed seed (`tests/morpion.test.ts`).
- Interface: a `$.ui.mount` test as required by [ARCHITECTURE.md → Conventions](ARCHITECTURE.md#conventions) (`tests/pane.test.ts`, fixtures in `tests/engine.ts`).
- Run `pnpm typecheck`, `pnpm lint`, `claude plugin test` and `claude plugin validate .`, then play it in Desktop and in a terminal (`claude --plugin-dir .`).

API reference: [Claude Code mods](https://code.claude.com/docs/en/plugins/mods/overview). `/plugin-types` writes the API types into `.claude-plugin/types/`.
