import { expect, test } from "claude-code/testing";
import { ANIMATION_MS } from "../../src/games/2048/svg";
import type { MorpionState } from "../../src/games/morpion/morpion";
import {
  chooseGame,
  closePane,
  control,
  hideBand,
  initialSession,
  motionMs,
  observeFocus,
  openMenu,
  pause,
  restart,
  type Session,
  settle,
  toggleBand,
  togglePause,
} from "../../src/session";
import { SEED } from "../fixtures/engine";

const morpion = () => chooseGame(initialSession, "morpion", SEED);

// The person places X on cell `i` of the running Morpion
const placeAt = (s: Session, i: number) =>
  control({ ...s, state: { ...(s.state as MorpionState), cursor: i } }, "place");

const winOnce = (s: Session) => [0, 8, 6, 3].reduce(placeAt, s);

const morpionState = (s: Session) => s.state as MorpionState;

const moved2048 = () => control(chooseGame(initialSession, "2048", SEED), "up");

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
  const other = chooseGame(openMenu(won), "hogzzle", SEED);
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

test("a 2048 move keeps its motion; a Morpion move has none", () => {
  expect(moved2048().motion).toMatchObject({ slides: expect.any(Array) });
  expect(control(morpion(), "up").motion).toBeNull();
});

test("only a move that changes the state counts as a new move", () => {
  const moved = moved2048();
  expect(moved.moveId).toBe(1);
  expect(control(moved, "place")).toBe(moved);
  const again = control(moved, "left");
  expect(again.moveId).toBe(2);
  expect(control(again, "left")).toBe(again);
  expect(control(togglePause(again), "down").moveId).toBe(2);
  expect(control(morpion(), "up").moveId).toBe(1);
});

test("settling, restart and the menu leave the move count as it was", () => {
  const moved = moved2048();
  expect(settle(moved).moveId).toBe(1);
  expect(restart(moved, SEED).moveId).toBe(1);
  expect(chooseGame(openMenu(moved), "2048", SEED).moveId).toBe(1);
});

test("settling clears the motion only, and twice changes nothing", () => {
  const moved = moved2048();
  const settled = settle(moved);
  expect(settled).toEqual({ ...moved, motion: null });
  expect(settle(settled)).toBe(settled);
});

test("a pause keeps the motion", () => {
  const moved = moved2048();
  expect(togglePause(moved).motion).toBe(moved.motion);
  expect(pause(moved, "focus").motion).toBe(moved.motion);
});

test("restart, menu, closing and switching game clear the motion", () => {
  const moved = moved2048();
  expect(restart(moved, SEED).motion).toBeNull();
  expect(openMenu(moved).motion).toBeNull();
  expect(closePane(moved).motion).toBeNull();
  expect(chooseGame(moved, "morpion", SEED).motion).toBeNull();
});

test("the motion is drawn for the game's animation time, a game without one never", () => {
  expect(motionMs(moved2048())).toBe(ANIMATION_MS);
  expect(motionMs(settle(moved2048()))).toBeNull();
  expect(motionMs({ ...morpion(), motion: {} })).toBeNull();
});
