import { expect, test } from "claude-code/testing";
import { GAME_IDS, GAMES, type GameId } from "../../src/games/index";
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
  settle,
  toggleBand,
  togglePause,
} from "../../src/session";
import {
  ANIMATED,
  animated,
  FIRST_MOVE,
  MOTION_MS,
  NO_MOVE,
  SECOND_MOVE,
} from "../fixtures/animated";
import { SEED } from "../fixtures/engine";
import { DRAW_CONTROLS, MOVE, TURN_BASED, turnBased, WIN_SCORE, won } from "../fixtures/turn-based";

const { game } = GAMES[TURN_BASED];

// Any game but `id`
const otherThan = (id: GameId) => GAME_IDS.find((other) => other !== id) as GameId;

const moved = () => control(animated(), FIRST_MOVE);

test("the band folds and unfolds", () => {
  const open = toggleBand(initialSession);
  expect(open.bandExpanded).toBe(true);
  expect(toggleBand(open).bandExpanded).toBe(false);
});

test("choosing a game folds the band and starts it unpaused", () => {
  const s = chooseGame(toggleBand(initialSession), TURN_BASED, SEED);
  expect(s).toMatchObject({ screen: "game", bandExpanded: false, gameId: TURN_BASED, pause: null });
  expect(s.state).toEqual(game.init(SEED));
});

test("opening the menu pauses the game and keeps it", () => {
  const s = openMenu(control(turnBased(), MOVE));
  expect(s).toMatchObject({ screen: "menu", gameId: TURN_BASED, pause: "menu" });
});

test("choosing the same game brings it back as it was left, paused", () => {
  const left = openMenu(control(turnBased(), MOVE));
  const back = chooseGame(left, TURN_BASED, SEED);
  expect(back).toEqual({ ...left, screen: "game" });
});

test("choosing another game abandons the running one", () => {
  const other = chooseGame(openMenu(won()), otherThan(TURN_BASED), SEED);
  const again = chooseGame(other, TURN_BASED, SEED);
  expect(again.state).toEqual(game.init(SEED));
});

test("closing the pane pauses the game and keeps it in memory", () => {
  const s = closePane(control(turnBased(), MOVE));
  expect(s).toMatchObject({ screen: "closed", gameId: TURN_BASED, pause: "menu" });
});

// Else the next opening, never focused on Desktop, would read as a focus loss
test("closing the pane forgets its focus", () => {
  const s = closePane(observeFocus(turnBased(), true));
  expect(s.hasFocus).toBe(false);
});

test("a key the game ignores leaves the session as it was", () => {
  const s = won();
  expect(control(s, MOVE)).toBe(s);
});

test("hiding the band keeps the screen and the game", () => {
  const playing = turnBased();
  expect(hideBand(playing)).toEqual({ ...playing, bandHidden: true });
});

test("the first pause reason wins", () => {
  const s = pause(pause(turnBased(), "permission"), "focus");
  expect(s.pause).toBe("permission");
});

test("nothing pauses without a game", () => {
  expect(pause(initialSession, "turn-end")).toBe(initialSession);
});

test("p pauses, and only p resumes", () => {
  const paused = togglePause(turnBased());
  expect(paused.pause).toBe("manual");
  expect(togglePause(pause(turnBased(), "turn-end")).pause).toBeNull();
  expect(togglePause(paused).pause).toBeNull();
});

test("a paused game ignores its keys", () => {
  const paused = pause(turnBased(), "permission");
  expect(control(paused, MOVE)).toBe(paused);
});

test("a running game takes its keys", () => {
  const s = turnBased();
  expect(control(s, MOVE).state).toEqual(game.onControl(s.state, MOVE));
});

test("the best score follows the score up and never down", () => {
  const s = won();
  expect(s.best).toEqual({ [TURN_BASED]: WIN_SCORE });
  const after = DRAW_CONTROLS.reduce(control, restart(s, SEED));
  expect(game.status(after.state).score).toBeLessThan(WIN_SCORE);
  expect(after.best).toEqual({ [TURN_BASED]: WIN_SCORE });
});

test("a restart resumes the game through the game's own restart", () => {
  const s = pause(won(), "turn-end");
  const again = restart(s, SEED);
  expect(again.pause).toBeNull();
  expect(again.state).toEqual(game.restart?.(s.state, SEED));
});

test("losing the focus pauses; getting it back does not resume", () => {
  const focused = observeFocus(turnBased(), true);
  expect(focused).toMatchObject({ hasFocus: true, pause: null });
  const lost = observeFocus(focused, false);
  expect(lost).toMatchObject({ hasFocus: false, pause: "focus" });
  expect(observeFocus(lost, true)).toMatchObject({ hasFocus: true, pause: "focus" });
});

test("a game opened without the focus is not paused", () => {
  const s = turnBased();
  expect(observeFocus(s, false)).toBe(s);
});

test("an animated move keeps its motion; a move without animation has none", () => {
  expect(moved().motion).not.toBeNull();
  expect(control(turnBased(), MOVE).motion).toBeNull();
});

test("only a move that changes the state counts as a new move", () => {
  const s = moved();
  expect(s.moveId).toBe(1);
  expect(control(s, NO_MOVE)).toBe(s);
  const again = control(s, SECOND_MOVE);
  expect(again.moveId).toBe(2);
  expect(control(togglePause(again), FIRST_MOVE).moveId).toBe(2);
  expect(control(turnBased(), MOVE).moveId).toBe(1);
});

test("settling, restart and the menu leave the move count as it was", () => {
  const s = moved();
  expect(settle(s).moveId).toBe(1);
  expect(restart(s, SEED).moveId).toBe(1);
  expect(chooseGame(openMenu(s), ANIMATED, SEED).moveId).toBe(1);
});

test("settling clears the motion only, and twice changes nothing", () => {
  const s = moved();
  const settled = settle(s);
  expect(settled).toEqual({ ...s, motion: null });
  expect(settle(settled)).toBe(settled);
});

test("a pause keeps the motion", () => {
  const s = moved();
  expect(togglePause(s).motion).toBe(s.motion);
  expect(pause(s, "focus").motion).toBe(s.motion);
});

test("restart, menu, closing and switching game clear the motion", () => {
  const s = moved();
  expect(restart(s, SEED).motion).toBeNull();
  expect(openMenu(s).motion).toBeNull();
  expect(closePane(s).motion).toBeNull();
  expect(chooseGame(s, otherThan(ANIMATED), SEED).motion).toBeNull();
});

test("the motion is drawn for the game's animation time, a game without one never", () => {
  expect(motionMs(moved())).toBe(MOTION_MS);
  expect(motionMs(settle(moved()))).toBeNull();
  expect(motionMs({ ...turnBased(), motion: {} })).toBeNull();
});
