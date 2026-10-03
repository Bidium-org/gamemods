# Architecture

A Claude Code mod: a game menu in the band above the prompt, the game in a pane. One hooks module answers every key itself, so it makes zero model calls and adds nothing to the transcript. Desktop (Code tab) and terminal run the same code; each board is drawn by the renderer its kind and the surface call for.

## Layout

```
.claude-plugin/   → plugin and marketplace manifests (the repo is both); types/ is generated, ignored
hooks/            → the single entry point: wires engine hooks to the session
src/              → session state and transitions, band, pane and menu views, /gameboy parsing
src/games/        → contract, catalog, registry and helpers shared by games; one folder per game, with its README
src/render/       → Board to elements: picks the renderer by board kind and surface; text for cell boards
tests/            → kit tests run by `claude plugin test`; shared engine stub in tests/engine.ts
docs/             → this file, ADD_A_GAME.md
```

Games are pure (state in, state out, no `$`). How to add one: `docs/ADD_A_GAME.md`.

## Flows

**Session start.**

1. `session.start` in `hooks/register.ts` registers `/gameboy` with `immediate: true`.
2. `loadBest()` reads `best:<id>` from `$.store` for every `available` game of `src/games/catalog.ts`.

**Open from the band.**

1. `ui.render` `AbovePrompt` → `band()` in `src/band.ts`: the `GAMEBOY` line, the other mods' drawing kept above it (`await next(e)` as a child). Yields to `hasSurvey` and to its own `✕`.
2. Expanded, it draws `menu()` from `src/menu.ts`, the same list the pane shows.
3. Choosing a game → `chooseGame()` in `src/session.ts`, seeded by `$.clock.now()` → `openPane()` in `hooks/register.ts` → `$.ui.open({ focus: true })`.
4. If the pane comes back unplaced, the band shows a "widen the window" line (read from `$.ui.panes()` at each render, never stored); a toast replaces it when the band is hidden.
5. `ui.render` `Pane` → `pane()` in `src/pane.ts`: menu screen or game screen.

**`/gameboy [game|stop]`.**

1. `command.run` → `parseArgs()` in `src/command.ts`: first word only, unknown opens the menu.
2. `stop` → `$.ui.close`, then `closePane()`. A game id → `chooseGame()`. Otherwise → `openMenu()`. Then `openPane()`.
3. The hook returns `{}`: never `{ text }`, which would add a transcript line.

**A key press.**

1. A `Button` with a `hotkey` in `src/pane.ts` → `update()` in `hooks/register.ts`.
2. `control()` in `src/session.ts` → the game's `onControl()` (`src/games/<id>/<id>.ts`), ignored while paused. The session's best score follows the game's score up.
3. If the best score rose, `saveBest()` re-reads the store and writes only a higher value: `$.store` is shared by every session of the machine.
4. `commit()` invalidates; the next draw goes through `drawBoard()` in `src/render/board.ts`: `boardText()` for a cell board, the game's own renderer for its board kind (Hogzzle's `svg.ts`), or a "not playable here" screen when the surface has none.

**The clock.** One per session, for a game with `tickMs`.

1. Every `commit()` in `hooks/register.ts` ends with `syncClock()`, which reads `clockMs()` in `src/session.ts`: the period while the game shows, unpaused, in phase `playing`; null otherwise.
2. A period that changes cancels the running `$.clock.every` and starts one at the new period; null leaves none. Nothing ticks at rest, paused or after a game ends.
3. Each period, `onTick()` calls `tick()` in `src/session.ts`, which calls the game's `tick()`. It redraws only when `gameView()` (board and status) changed: a redraw replaces the pane's buttons, and a key aimed at a replaced one is lost (`ui_press not handled` in the Desktop log). At 10 redraws a second, Echo dropped keys on Desktop.
4. A pause raised in the `Pane` render (focus loss) cannot commit: the next tick sees the pause, changes nothing, and that commit stops the clock.

**Closing the pane.** The native `✕` (`ui.close` with a person origin) and `/gameboy stop` both reach `closePane()`. The game stays in memory, paused. Reopening shows the menu; choosing the same game resumes it, another one abandons it.

## Pause policy

A game runs only on the game screen with no pause. One field holds the pause and its reason; the first reason wins, so a later event never overwrites the line shown.

| Reason       | Raised by                                               |
| :----------- | :------------------------------------------------------ |
| `manual`     | `p` or the button, which toggles                        |
| `focus`      | the pane's `isFocused` going from true to false         |
| `permission` | `classic.PermissionRequest`, subagent dialogs included  |
| `turn-end`   | `turn.complete` of the main agent (`agentId` undefined) |
| `menu`       | `q` back to the pane menu, or the pane closed           |

- Resuming is always explicit (`p`). Getting the focus back never resumes.
- Focus pauses on the falling edge only. The Desktop pane always opens unfocused (Platform constraints): "unfocused means paused" would cost a click plus `p` at every launch instead of one click.
- Permission uses `classic.PermissionRequest`, not `tool.check`. `tool.check` fires before the mode settles an `ask`: in auto mode most calls arrive as `ask` and are then approved by the classifier with no dialog, so the game would pause for nothing. `classic.PermissionRequest` fires when a dialog is about to show, before the pane loses the focus.
- Paused means the game's keys are ignored and its clock is stopped. `p`, `r` and `q` stay active; `r` also lifts the pause.
- Lifting the pause with `p` calls the game's `resume()` when it has one.

## Conventions

- Session state MUST be a top-level variable of `hooks/register.ts`. The engine reads the module source at load: `$` is used at `$.noun.event(...)` call sites or passed to functions declared at the top of the file. Passing it to a function declared inside `register` makes the engine refuse the module.
- Transitions in `src/session.ts` MUST be pure and return the same object when nothing changes. `commit()` skips the invalidate on an unchanged session: that is what keeps redraws at zero at rest.
- NEVER call `$.ui.invalidate` from a `ui.render` hook. On Desktop the drawn tree freezes and its buttons stop answering (`engine surface: ui_press not handled` in the Desktop log); the test kit sees nothing. The `Pane` hook assigns `observeFocus()` directly; the band catches up at the next redraw.
- Every key a game reads MUST be a `hotkey` (a digit or lowercase letter) on a `Button`. Any other printable key sends the focus to the prompt. `p`, `r`, `q` belong to the session.
- A `hotkey` goes only where it demonstrably fires: Desktop draws its key badge regardless. Menu and band buttons have none (clicked, or Tab, arrows and Enter).
- Every render has a `$.ui.mount` test on `desktop` and `terminal`. An invalid tree makes the engine draw the site instead.
- Files ending in `.gen.ts` are generated and committed: never edit them by hand, their header names the script that wrote them.

## Platform constraints

Measured on Desktop 2.1.286 and terminal 2.1.287. A new Claude Code build can change any of these.

- **No `Client`.** It never loads on Desktop (content security policy). Loop, state and input all live in the hooks module, and every view is a tree returned by `ui.render`.
- **Proportional font on Desktop.** A grid drawn with characters never aligns. `src/render/text.ts` draws each cell as a fixed-size `Box` with its glyph centered; the terminal, monospace, aligns both.
- **No focus at open on Desktop.** Neither after a band press nor after `/gameboy`, despite `focus: true`; the terminal grants it. A click gives the keys only if it lands inside the drawn tree, so the pane's root `Box` takes `minHeight` of the body rows. The pane shows a "click to play" hint while unfocused.
- **`Svg` keeps its first drawing per `key` on Desktop.** Text around it updates, the picture does not. A press counter as key replays old drawings after `/reload-plugins`, when the counter restarts: the key must be a hash of the `source` (`src/games/hogzzle/svg.ts`). The types declare no `key` on `Svg` and the test kit drops it from the drawn tree, yet Desktop reads it: only Desktop shows this. The `source` is capped at 131 072 characters.
- **No clickable cell.** `Button` takes no size: a plain one inside a tile draws on Desktop as a small native button in its middle, never the tile; a blank label collapses it to nothing, and in a terminal the focus inverts its label into a bar. Removing the focused Button from the tree (a cell redrawn without one) takes the focus from the pane on Desktop, which pauses the game. Tried with Echo and dropped: cells are played by keys.
- **Pane placement.** Desktop keeps the pane `dock`, even out of fullscreen. Below the game's `size` the pane shows "Widen the window to play". `inline` was never observed.

## Current state

- Renderers: text for cell boards on every surface, Hogzzle's `Svg` on Desktop. The terminal has no picture renderer yet, so Hogzzle shows "not playable here" there.
- `src/session.ts` imports `./games/index` explicitly: directory imports are not proven on Desktop.
- A "Resume" button on the folded band was tried and reverted: it showed while the pane was open and paused for focus. The band only says `<Game> paused`.
- An aborted turn still pauses with "Claude answered" (`isAborted` is not read).
- `tests/engine.ts` starts the kit's mock clock at 1, a seed where the bot lets the test's winning line through. Changing the bot can break keyboard tests loudly.
