# Contributing

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first. To add a game: [docs/ADD_A_GAME.md](docs/ADD_A_GAME.md).

## Setup

1. `pnpm install`.
2. In a Claude Code session, run `/plugin-types`: it writes the API types of your installed build into `.claude-plugin/types/` (ignored by git). `pnpm typecheck` needs them.

## Dev loop

- **Terminal:** `claude --plugin-dir .` from the repo root. The mod reloads each time you save.
- **Desktop:** in `~/.claude/settings.json`, under `env`, set `CLAUDE_CODE_PLUGIN_DIRS` to the absolute path of the repo root. Restart Desktop and open a local session. After an edit, `/reload-plugins` reloads the code.
- Remove `CLAUDE_CODE_PLUGIN_DIRS` when you are done: it loads the mod in every session and skews a clean install test.
- A marketplace install is a snapshot pinned to a commit: it never picks up local changes, even after `/reload-plugins`. Use it only to test a committed version.

## Checks

Run them all before a PR:

```bash
pnpm typecheck
```

```bash
pnpm lint
```

```bash
claude plugin test
```

```bash
claude plugin validate .
```

```bash
claude plugin validate .claude-plugin/plugin.json
```

`pnpm format` fixes formatting. `claude plugin test` proves logic and tree validity, not what Desktop actually draws: a UI change also needs the manual protocol.

## Manual protocol

Run it on Desktop, then in a terminal, for any change to the band, the pane, a game or the pause policy.

1. **Band:** the folded `GAMEMODS` line shows; **Games** expands it by click and by Tab then Enter; `✕` hides it for the session.
2. **Pane:** it opens on the right. Note whether it gets the focus at open; one click inside gives it the keyboard.
3. **Command:** `/gamemods`, `/gamemods <game>` for each game, an unknown id (opens the menu), `/gamemods stop`. No line is added to the transcript.
4. **Game:** the manual checks of each game's README (`src/games/<id>/README.md`); `r` restarts; `q` back to the menu, then choosing the game resumes it.
5. **Animation**, for a game with `animation`: each move plays once and settles; keys chained fast during animations are all taken (no `ui_press not handled` in the Desktop log); after it settles, a click in or out of the board, `p` or a band toggle does not replay it.
6. **Permission dialog:** with the game focused, ask Claude for a command that needs approval (writing a file under `/tmp` with Bash). The game is paused before the dialog shows and no game key reaches the dialog.
7. **Auto mode:** a command the classifier approves shows no dialog and does not pause the game.
8. **Turn end:** "Claude is working" during the turn, then "Paused: Claude answered".
9. **Escape:** with the pane focused during a turn, Escape gives the keyboard back to the prompt, pauses the game and does not interrupt the turn.
10. **Close:** the pane's native `✕`, then reopen: the game is still there, paused.
11. **Best score:** it survives `/reload-plugins` and a new session.
12. **Window:** shrink it and leave fullscreen: "Widen the window to play" shows below the game's size, and the board comes back when enlarged.

## Logs

| Surface  | Where                                                                                 |
| :------- | :------------------------------------------------------------------------------------ |
| Desktop  | `~/Library/Logs/Claude/claude.ai-web.log` (macOS), lines `engine surface: ...`        |
| Terminal | `claude --debug-file <file>`, lines `hooks module gamemods@inline loaded ...`         |

## Known symptoms

| Symptom                                                              | Cause and fix                                                                                        |
| :------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| Edited code changes nothing                                          | Not reloaded: `/reload-plugins`. Still old: the mod comes from a marketplace install (see Dev loop). |
| No key answers in the pane, Desktop log shows `ui_press not handled` | An invalidate from a render hook ([Conventions](docs/ARCHITECTURE.md#conventions)).                  |
| Typing a letter in the pane sends the focus to the prompt            | The key is not a `hotkey` ([Conventions](docs/ARCHITECTURE.md#conventions)).                         |
| Tab does nothing in the pane                                         | The pane has no focus yet: click inside it.                                                          |
| The pane shows something other than the returned tree                | The tree is invalid and the engine draws the site instead: a `$.ui.mount` test catches it.           |
| `claude plugin test` passes, Desktop draws something wrong           | The kit does not paint: run the manual protocol.                                                     |
| The mod does not load                                                | Unsupported surface ([README → Limitations](README.md#limitations)).                                 |

## Commits and pull requests

- Commits follow Conventional Commits: `feat(game): ...`, `fix: ...`, `test: ...`, `docs: ...`, `chore: ...`, `refactor: ...`.
- Code, UI strings, tests and docs are in English.
- One topic per PR. Say which surfaces you checked (Desktop, terminal) and with which Claude Code build.
- Report a bug with the bug issue template: Claude Code build, surface, window size, steps.
