import { expect, test } from "claude-code/testing";
import type { MorpionState } from "../src/games/morpion";
import {
  chooseGame,
  closePane,
  control,
  hideBand,
  initialSession,
  observeFocus,
  openMenu,
  pause,
  restart,
  type Session,
  toggleBand,
  togglePause,
} from "../src/session";

const SEED = 1;

const morpion = () => chooseGame(initialSession, "morpion", SEED);

// The person places X on cell `i` of the running Morpion
const placeAt = (s: Session, i: number) =>
  control({ ...s, state: { ...(s.state as MorpionState), cursor: i } }, "place");

const winOnce = (s: Session) => [0, 8, 6, 3].reduce(placeAt, s);

const morpionState = (s: Session) => s.state as MorpionState;

test("the band folds and unfolds", () => {
  const open = toggleBand(initialSession);
  expect(open.bandExpanded).toBe(true);
  expect(toggleBand(open).bandExpanded).toBe(false);
});

test("choosing a game folds the band and starts it unpaused", () => {
  const s = chooseGame(toggleBand(initialSession), "morpion", SEED);
  expect(s).toMatchObject({ screen: "game", bandExpanded: false, gameId: "morpion", pause: null });
  expect(morpionState(s).cursor).toBe(4);
});

test("a game not playable yet has no state", () => {
  expect(chooseGame(initialSession, "tetris", SEED)).toMatchObject({
    gameId: "tetris",
    state: null,
  });
});

test("opening the menu pauses the game and keeps it", () => {
  const s = openMenu(placeAt(morpion(), 0));
  expect(s).toMatchObject({ screen: "menu", gameId: "morpion", pause: "menu" });
});

test("choosing the same game brings it back as it was left, paused", () => {
  const left = openMenu(placeAt(morpion(), 0));
  const back = chooseGame(left, "morpion", SEED);
  expect(back).toEqual({ ...left, screen: "game" });
});

test("choosing another game abandons the running one and its streak", () => {
  const won = winOnce(morpion());
  const other = chooseGame(openMenu(won), "snake", SEED);
  const again = chooseGame(other, "morpion", SEED);
  expect(morpionState(again).streak).toBe(0);
});

test("closing the pane pauses the game and keeps it in memory", () => {
  const s = closePane(placeAt(morpion(), 0));
  expect(s).toMatchObject({ screen: "closed", gameId: "morpion", pause: "menu" });
});

// Else the next opening, never focused on Desktop, would read as a focus loss
test("closing the pane forgets its focus", () => {
  const s = closePane(observeFocus(morpion(), true));
  expect(s.hasFocus).toBe(false);
});

test("a key the game ignores leaves the session as it was", () => {
  const won = winOnce(morpion());
  expect(control(won, "up")).toBe(won);
});

test("hiding the band keeps the screen and the game", () => {
  const playing = morpion();
  expect(hideBand(playing)).toEqual({ ...playing, bandHidden: true });
});

test("the first pause reason wins", () => {
  const s = pause(pause(morpion(), "permission"), "focus");
  expect(s.pause).toBe("permission");
});

test("nothing pauses without a game", () => {
  expect(pause(initialSession, "turn-end")).toBe(initialSession);
  expect(pause(chooseGame(initialSession, "sudoku", SEED), "turn-end").pause).toBeNull();
});

test("p pauses, and only p resumes", () => {
  const paused = togglePause(morpion());
  expect(paused.pause).toBe("manual");
  expect(togglePause(pause(morpion(), "turn-end")).pause).toBeNull();
  expect(togglePause(paused).pause).toBeNull();
});

test("a paused game ignores its keys", () => {
  const paused = pause(morpion(), "permission");
  expect(control(paused, "up")).toBe(paused);
  expect(placeAt(paused, 0).state).toEqual({ ...morpionState(paused), cursor: 0 });
});

test("a running game takes its keys", () => {
  expect(morpionState(control(morpion(), "up")).cursor).toBe(1);
});

test("the best score follows the streak up and never down", () => {
  const won = winOnce(morpion());
  expect(won.best).toEqual({ morpion: 1 });
  const lost = [4, 2, 3, 1, 8].reduce(placeAt, restart(won, SEED));
  expect(morpionState(lost).streak).toBe(0);
  expect(lost.best).toEqual({ morpion: 1 });
});

test("a restart resumes the game and lets it keep a won streak", () => {
  const won = pause(winOnce(morpion()), "turn-end");
  const again = restart(won, SEED);
  expect(again.pause).toBeNull();
  expect(morpionState(again)).toMatchObject({ streak: 1, cursor: 4 });
});

test("losing the focus pauses; getting it back does not resume", () => {
  const focused = observeFocus(morpion(), true);
  expect(focused).toMatchObject({ hasFocus: true, pause: null });
  const lost = observeFocus(focused, false);
  expect(lost).toMatchObject({ hasFocus: false, pause: "focus" });
  expect(observeFocus(lost, true)).toMatchObject({ hasFocus: true, pause: "focus" });
});

test("a game opened without the focus is not paused", () => {
  const s = morpion();
  expect(observeFocus(s, false)).toBe(s);
});
