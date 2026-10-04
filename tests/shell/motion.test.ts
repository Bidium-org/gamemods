import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { GAME_IDS, GAMES, type GameId } from "../../src/games/index";
import { pauseLine, scoreLine } from "../../src/pane";
import { control } from "../../src/session";
import {
  ANIMATED,
  animated,
  FIRST_MOVE,
  isBoardMoving,
  MOTION_MS,
  NO_MOVE,
  SECOND_MOVE,
} from "../fixtures/animated";
import { gamemods, openGame } from "../fixtures/engine";

// The animated game, open on Desktop, just moved
async function moved($: Engine, on: On) {
  const { engine, ui } = await openGame($, on, "desktop", ANIMATED);
  await ui.press({ key: `control-${FIRST_MOVE}` });
  return {
    engine,
    clock: engine.clock,
    ui,
    drawing: async () => JSON.stringify(await ui.drawn()),
    isMoving: () => isBoardMoving(ui),
  };
}

test("a move's motion is cleared once its animation has played", async ($, on) => {
  const { clock, ui, isMoving } = await moved($, on);
  expect(await isMoving()).toBe(true);

  await clock.advance(MOTION_MS - 1);
  expect(await isMoving()).toBe(true);
  await clock.advance(1);
  expect(await isMoving()).toBe(false);
  await ui.unmount();
});

test("a new move replaces the motion and restarts its clock", async ($, on) => {
  const { clock, ui, drawing, isMoving } = await moved($, on);
  await clock.advance(MOTION_MS - 100);
  const first = await drawing();

  await ui.press({ key: `control-${SECOND_MOVE}` });
  expect(await isMoving()).toBe(true);
  expect(await drawing()).not.toBe(first);

  await clock.advance(200);
  expect(await isMoving()).toBe(true);
  await clock.advance(MOTION_MS - 200);
  expect(await isMoving()).toBe(false);
  await ui.unmount();
});

test("a key that moves nothing keeps the motion and its clock", async ($, on) => {
  const { clock, ui, drawing, isMoving } = await moved($, on);
  await clock.advance(100);
  const motion = await drawing();

  await ui.press({ key: `control-${NO_MOVE}` });
  expect(await drawing()).toBe(motion);
  await clock.advance(MOTION_MS - 101);
  expect(await isMoving()).toBe(true);
  await clock.advance(1);
  expect(await isMoving()).toBe(false);
  await ui.unmount();
});

test("a key ignored while paused keeps the motion and its clock", async ($, on) => {
  const { clock, ui, drawing, isMoving } = await moved($, on);
  await ui.press({ key: "pane-pause" });
  const motion = await drawing();
  await clock.advance(100);

  await ui.press({ key: `control-${SECOND_MOVE}` });
  expect(await drawing()).toBe(motion);
  await clock.advance(MOTION_MS - 101);
  expect(await isMoving()).toBe(true);
  await clock.advance(1);
  expect(await isMoving()).toBe(false);
  await ui.unmount();
});

test("a pause lets the animation play out", async ($, on) => {
  const { clock, ui, isMoving } = await moved($, on);
  await ui.press({ key: "pane-pause" });
  expect(await isMoving()).toBe(true);

  await clock.advance(MOTION_MS);
  expect(await isMoving()).toBe(false);
  expect(await ui.find({ type: "Text", text: pauseLine("manual") })).toBeDefined();
  await ui.unmount();
});

test("a restart clears the motion", async ($, on) => {
  const { ui, isMoving } = await moved($, on);
  await ui.press({ key: "pane-restart" });
  expect(await isMoving()).toBe(false);
  await ui.unmount();
});

test("the menu clears the motion; the game comes back settled", async ($, on) => {
  const { ui, isMoving } = await moved($, on);
  await ui.press({ key: "pane-back" });
  await ui.press({ key: `game-${ANIMATED}` });
  expect(await isMoving()).toBe(false);
  await ui.unmount();
});

test("closing the pane clears the motion", async ($, on) => {
  const { ui, isMoving } = await moved($, on);
  await gamemods($, "stop");
  await gamemods($, ANIMATED);
  expect(await isMoving()).toBe(false);
  await ui.unmount();
});

test("switching game draws the other game, then the animated one settled", async ($, on) => {
  const { ui, isMoving } = await moved($, on);
  const unanimated = GAME_IDS.find((id) => !GAMES[id].game.animation) as GameId;
  await gamemods($, unanimated);
  expect(await ui.find({ type: "Text", text: GAMES[unanimated].name })).toBeDefined();
  await gamemods($, ANIMATED);
  expect(await isMoving()).toBe(false);
  await ui.unmount();
});

test("clearing the motion leaves the score and the best score as they were", async ($, on) => {
  const { engine, clock, ui } = await moved($, on);
  const s = control(animated(), FIRST_MOVE);
  const header = scoreLine(GAMES[ANIMATED].game.status(s.state).score, s.best[ANIMATED] ?? 0);
  const stored = { ...engine.stored };

  await clock.advance(MOTION_MS);
  expect(await ui.find({ type: "Text", text: header })).toBeDefined();
  expect(engine.stored).toEqual(stored);
  await ui.unmount();
});
