import { expect, test } from "claude-code/testing";
import { GAME_IDS, GAMES, type GameId } from "../../src/games/index";
import { SESSION_HOTKEYS } from "../../src/pane";
import {
  chooseGame,
  control,
  initialSession,
  restart,
  type Session,
  tick,
} from "../../src/session";
import { SEED } from "../fixtures/engine";

// What every game in GAMES must satisfy. Controls go through the session's `control`, so a game
// is pressed the way the session presses it: through its animation when it has one

// Presses of one control in a row: enough for a cursor to cross a board, or a grid to settle
const PRESSES = 50;

// Times the scripted run goes through the game's controls
const ROUNDS = 3;

const newGame = (id: GameId): Session => chooseGame(initialSession, id, SEED);

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

test("every game has a name of its own and a tagline", () => {
  const names = GAME_IDS.map((id) => GAMES[id].name);
  expect(new Set(names).size).toBe(names.length);
  for (const id of GAME_IDS) {
    expect(GAMES[id].name.trim()).not.toBe("");
    expect(GAMES[id].tagline.trim()).not.toBe("");
  }
});

for (const id of GAME_IDS) {
  const { name, game } = GAMES[id];

  test(`${name}'s controls each take a key of their own, none of the session's`, () => {
    const ids = game.controls.map((c) => c.id);
    const hotkeys = game.controls.map((c) => c.hotkey);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(hotkeys).size).toBe(hotkeys.length);
    for (const { label, hotkey } of game.controls) {
      expect(label.trim()).not.toBe("");
      expect(hotkey).toMatch(/^[0-9a-z]$/);
      expect(Object.values(SESSION_HOTKEYS)).not.toContain(hotkey);
    }
  });

  test(`${name} ticks every multiple of 100 ms, or has no clock`, () => {
    expect(game.tickMs === undefined).toBe(game.tick === undefined);
    if (game.tickMs === undefined) return;
    expect(game.tickMs).toBeGreaterThan(0);
    expect(game.tickMs % 100).toBe(0);
  });

  test(`${name}'s size and animation time are positive`, () => {
    expect(game.size.columns).toBeGreaterThan(0);
    expect(game.size.rows).toBeGreaterThan(0);
    if (game.animation) expect(game.animation.ms).toBeGreaterThan(0);
  });

  test(`${name} starts playing at score 0 with a status line, and restarts the same`, () => {
    for (const s of [newGame(id), restart(newGame(id), SEED)]) {
      const status = game.status(s.state);
      expect(status.phase).toBe("playing");
      expect(status.score).toBe(0);
      expect(status.line.trim()).not.toBe("");
    }
  });

  test(`${name} plays the same game from the same seed`, () => {
    const run = () => {
      const states: unknown[] = [];
      let s = newGame(id);
      for (let round = 0; round < ROUNDS; round++) {
        for (const c of game.controls) {
          s = tick(control(s, c.id));
          states.push(s.state);
        }
      }
      return states;
    };
    expect(run()).toEqual(run());
  });

  // An unchanged state must be the same object: the session redraws on a new one
  test(`${name} keeps the very same state when a control changes nothing`, () => {
    let unchanged = 0;
    for (const c of game.controls) {
      let s = newGame(id);
      for (let press = 0; press < PRESSES; press++) {
        const next = control(s, c.id);
        if (sameValue(next.state, s.state)) {
          expect(next.state).toBe(s.state);
          unchanged++;
          break;
        }
        s = next;
      }
    }
    // Pressed alone, at least one control comes to change nothing: a cursor at an edge
    expect(unchanged).toBeGreaterThan(0);
  });
}
