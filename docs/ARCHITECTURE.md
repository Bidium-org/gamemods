# Architecture

A Claude Code mod: a game menu in the band above the prompt, the game in a pane. One hooks module answers every key itself, so it makes zero model calls and adds nothing to the transcript. Desktop (Code tab) and terminal run the same code; each game draws its own board with the elements its surface offers.

## Layout

```
.claude-plugin/   → plugin and marketplace manifests (the repo is both); types/ is generated, ignored
hooks/            → the single entry point: wires engine hooks to the session
src/              → session state and transitions, band, pane and menu views, /gamemods parsing
src/games/        → contract, registry and helpers shared by games (`drawCells` for cell boards); one folder per game, with its README
tests/            → kit tests run by `claude plugin test`; shared engine stub in tests/engine.ts
docs/             → this file, ADD_A_GAME.md
```

Games are pure (state in, state out, no `$`). How to add one: `docs/ADD_A_GAME.md`.

## Flows

**Session start.**

1. `session.start` in `hooks/register.ts` registers `/gamemods` with `immediate: true`.
2. `loadBest()` reads `best:<id>` from `$.store` for every game of `GAMES` in `src/games/index.ts`.

**Open from the band.**

1. `ui.render` `AbovePrompt` → `band()` in `src/band.ts`: the `GAMEMODS` line, the other mods' drawing kept above it (`await next(e)` as a child). Yields to `hasSurvey` and to its own `✕`.
2. Expanded, it draws `menu()` from `src/menu.ts`, the same list the pane shows.
3. Choosing a game → `chooseGame()` in `src/session.ts`, seeded by `$.clock.now()` → `openPane()` in `hooks/register.ts` → `$.ui.open({ focus: true })`.
4. If the pane comes back unplaced, the band shows a "widen the window" line (read from `$.ui.panes()` at each render, never stored); a toast replaces it when the band is hidden.
5. `ui.render` `Pane` → `pane()` in `src/pane.ts`: menu screen or game screen.

**`/gamemods [game|stop]`.**

1. `command.run` → `parseArgs()` in `src/command.ts`: first word only, unknown opens the menu.
2. `stop` → `$.ui.close`, then `closePane()`. A game id → `chooseGame()`. Otherwise → `openMenu()`. Then `openPane()`.
3. The hook returns `{}`: never `{ text }`, which would add a transcript line.

**A key press.**

1. A `Button` with a `hotkey` in `src/pane.ts` → `update()` in `hooks/register.ts`.
2. `control()` in `src/session.ts` → the game's `animation.play()` when it has one, else its `onControl()` (`src/games/<id>/<id>.ts`), ignored while paused. The session's best score follows the game's score up; a move that changed the state stores its `motion` and increments `moveId`.
3. If the best score rose, `saveBest()` re-reads the store and writes only a higher value: `$.store` is shared by every session of the machine.
4. `commit()` invalidates and syncs both [clocks](#the-two-clocks); the next draw calls the game's `render()` ([Renderers](#renderers)).

**The two clocks.** Both are synced at the end of every `commit()` in `hooks/register.ts`, from the session alone, and never touch each other.

| Clock           | Runs                                | Drives                         | Kept in                      |
| :-------------- | :---------------------------------- | :----------------------------- | :--------------------------- |
| Game clock      | `$.clock.every(tickMs)`, repeating  | the game's logic, `tick()`     | the game's state             |
| Animation timer | `$.clock.after(animation.ms)`, once | the display only, `settle()`   | the session's `motion`       |

They stay apart on purpose: folding the animation into `tickMs` would tick all game long to clear one drawing, and put a display detail in the game's state.

Game clock, for a game with `tickMs`:

1. `syncClock()`, which reads `clockMs()` in `src/session.ts`: the period while the game shows, unpaused, in phase `playing`; null otherwise.
2. A period that changes cancels the running `$.clock.every` and starts one at the new period; null leaves none. Nothing ticks at rest, paused or after a game ends.
3. Each period, `onTick()` calls `tick()` in `src/session.ts`, which calls the game's `tick()`. It redraws only when `gameView()` (board and status) changed: a redraw replaces the pane's buttons, and a key aimed at a replaced one is lost (`ui_press not handled` in the Desktop log). At 10 redraws a second, Echo dropped keys on Desktop.
4. A pause raised in the `Pane` render (focus loss) cannot commit: the next tick sees the pause, changes nothing, and that commit stops the clock.

Animation timer, for a game with `animation`:

1. `syncMotion()` reads `motionMs()` in `src/session.ts`: the game's `animation.ms` while a motion is held, null otherwise.
2. A new `moveId` cancels the pending timer and starts one `$.clock.after`; a cleared motion cancels it. A key that changes nothing, or a key ignored while paused, returns the same session: the timer runs on, and a pause lets the animation finish.
3. The timer commits `settle()`, which clears the motion and nothing else: no best score is saved. That commit redraws the board settled.
4. Restart, the menu, closing the pane and choosing another game clear the motion, which cancels the timer.
5. `tick()` leaves the motion alone: no game both ticks and animates yet.

Why the timer: Desktop replays an animated `Svg` at every redraw ([Platform constraints](#platform-constraints)). A motion kept after it played would replay the last move at each click. Its settle redraw replaces the pane's buttons like any redraw, so it is one per move, never per frame.

**Closing the pane.** The native `✕` (`ui.close` with a person origin) and `/gamemods stop` both reach `closePane()`. The game stays in memory, paused. Reopening shows the menu; choosing the same game resumes it, another one abandons it.

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

## Renderers

Each game draws its own board: `render(els, board, draw)` of its `Game`. The pane passes only the elements the surface can draw (`boardElements()` in `src/pane.ts`) and keeps the session header, the frame (recolored while paused) and the legend around the board. A null from `render` shows "not playable here"; otherwise the "Widen the window" check on the game's `size` comes before the board shows.

| Game              | Desktop                                  | Terminal                                                      |
| :---------------- | :--------------------------------------- | :------------------------------------------------------------ |
| Tic-tac-toe, Echo | `drawCells()` in `src/games/cells.ts`    | `drawCells()`                                                 |
| Hogzzle           | `Svg`, `src/games/hogzzle/svg.ts`        | none: "not playable here"                                     |
| 2048              | animated `Svg`, `src/games/2048/svg.ts`  | animated `Client`, `src/games/2048/terminal.ts` + `client.ts` |

- A game picks its renderer by the elements it gets, never by the surface: `boardElements()` gives `Svg` only off the terminal and `Client` only on it, because the kit's terminal table holds an `Svg` and Desktop's types list a `Client` that never loads there.
- Without the element it needs, a game returns its fallback: 2048 its cell board (`src/games/2048/cells.ts`), Hogzzle null.
- `draw` (`Draw` in `src/games/game.ts`) is what the session adds to a board; a renderer reads only what it needs:
  - `dimmed`: the game is paused. Every renderer shows it.
  - `motion` and `moveId`: the running move's animation, null once settled, and the count of moves that changed a state, never reset. A renderer tells a new move from a redraw by `moveId`.
  - `room`: the columns and rows left to the board once the header, the legend, the frame and their gaps (`CHROME_ROWS` in `src/pane.ts`) and the unfocused hint are taken.

**A terminal `Client`.** A board's terminal renderer may return a `Client`, a renderer only: props in, drawing out, animated locally with `surface.every`. No `onKey`, no game state, no randomness; keys stay `Button` hotkeys in the hooks module's tree. How to write one: [ADD_A_GAME.md → A terminal `Client`](ADD_A_GAME.md#a-terminal-client).

## Conventions

- Session state MUST be a top-level variable of `hooks/register.ts`. The engine reads the module source at load: `$` is used at `$.noun.event(...)` call sites or passed to functions declared at the top of the file. Passing it to a function declared inside `register` makes the engine refuse the module.
- Transitions in `src/session.ts` MUST be pure and return the same object when nothing changes. `commit()` skips the invalidate on an unchanged session: that is what keeps redraws at zero at rest.
- NEVER call `$.ui.invalidate` from a `ui.render` hook. On Desktop the drawn tree freezes and its buttons stop answering (`engine surface: ui_press not handled` in the Desktop log); the test kit sees nothing. The `Pane` hook assigns `observeFocus()` directly; the band catches up at the next redraw.
- Every key a game reads MUST be a `hotkey` (a digit or lowercase letter) on a `Button`. Any other printable key sends the focus to the prompt. `p`, `r`, `q` belong to the session.
- A `hotkey` goes only where it demonstrably fires: Desktop draws its key badge regardless. Menu and band buttons have none (clicked, or Tab, arrows and Enter).
- Every render has a `$.ui.mount` test on `desktop` and `terminal`. An invalid tree makes the engine draw the site instead.
- Files ending in `.gen.ts` are generated and committed: never edit them by hand, their header names the script that wrote them.

## Platform constraints

Measured on Desktop 2.1.286 and terminal 2.1.287 unless a build is named. A new Claude Code build can change any of these.

- **No `Client` on Desktop.** It never loads there (content security policy, 2.1.286), although the types list it. Loop, state and input all live in the hooks module, and every Desktop view is a tree returned by `ui.render`.
- **`Client` on terminal, as a renderer.** It loads and draws on terminal 2.1.288, with input left to `Button` hotkeys, which fire even after a click on it. Its `module` literal resolves relative to the file that writes it, not to the hooks module. Rules: [ADD_A_GAME.md → A terminal `Client`](ADD_A_GAME.md#a-terminal-client).
- **An animated `Svg` replays at every redraw on Desktop.** Without `isInteractive` it is drawn as an image whose CSS `@keyframes` play when the drawing comes in, and play again at each redraw, a click inside or outside it included (Desktop app 2.19675.0, CLI 2.1.288). Hence the [animation timer](#the-two-clocks).
- **Proportional font on Desktop.** A grid drawn with characters never aligns. `drawCells()` in `src/games/cells.ts` draws each cell as a fixed-size `Box` with its glyph centered; the terminal, monospace, aligns both.
- **No focus at open on Desktop.** Neither after a band press nor after `/gamemods`, despite `focus: true`; the terminal grants it. A click gives the keys only if it lands inside the drawn tree, so the pane's root `Box` takes `minHeight` of the body rows. The pane shows a "click to play" hint while unfocused.
- **`Svg` keeps its first drawing per `key` on Desktop.** Text around it updates, the picture does not. A press counter as key replays old drawings after `/reload-plugins`, when the counter restarts: the key must be a hash of the `source` (`src/games/hogzzle/svg.ts`). The types declare no `key` on `Svg` and the test kit drops it from the drawn tree, yet Desktop reads it: only Desktop shows this. An unkeyed `Svg` takes each new `source` (2048's, Desktop app 2.19675.0). The `source` is capped at 131 072 characters.
- **No clickable cell.** `Button` takes no size: a plain one inside a tile draws on Desktop as a small native button in its middle, never the tile; a blank label collapses it to nothing, and in a terminal the focus inverts its label into a bar. Removing the focused Button from the tree (a cell redrawn without one) takes the focus from the pane on Desktop, which pauses the game. Tried with Echo and dropped: cells are played by keys.
- **Pane placement.** Desktop keeps the pane `dock`, even out of fullscreen. Below the game's `size` the pane shows "Widen the window to play". `inline` was never observed.

## Current state

- Renderers: text for cell boards on every surface; Hogzzle's `Svg` on Desktop, with no terminal renderer yet, so Hogzzle shows "not playable here" there; 2048's animated `Svg` on Desktop and animated `Client` on terminal.
- 2048 is the only game with `animation`, and Echo the only one with a clock.
- `src/session.ts` imports `./games/index` explicitly: directory imports are not proven on Desktop.
- A "Resume" button on the folded band was tried and reverted: it showed while the pane was open and paused for focus. The band only says `<Game> paused`.
- An aborted turn still pauses with "Claude answered" (`isAborted` is not read).
- `tests/engine.ts` starts the kit's mock clock at 1, a seed where the bot lets the test's winning line through and `LOSING_2048_KEYS` ends a 2048 game. Changing the bot or the 2048 rules can break keyboard tests loudly.
