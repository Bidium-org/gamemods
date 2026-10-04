import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { ANIMATION_MS } from "../../src/games/2048/svg";
import { gamemods, openGame } from "../fixtures/engine";

const isMoving = (source: string) => /@keyframes s\d+/.test(source);

async function moved($: Engine, on: On) {
  const { engine, ui } = await openGame($, on, "desktop", "2048");
  const board = async () => String((await ui.find({ type: "Svg" }))?.props.source);
  await ui.press({ key: "control-up" });
  return { engine, clock: engine.clock, ui, board };
}

test("a move's motion is cleared once its animation has played", async ($, on) => {
  const { clock, ui, board } = await moved($, on);
  expect(isMoving(await board())).toBe(true);

  await clock.advance(ANIMATION_MS - 1);
  expect(isMoving(await board())).toBe(true);
  await clock.advance(1);
  expect(isMoving(await board())).toBe(false);
  await ui.unmount();
});

test("a new move replaces the motion and restarts its clock", async ($, on) => {
  const { clock, ui, board } = await moved($, on);
  await clock.advance(ANIMATION_MS - 100);
  const first = await board();

  await ui.press({ key: "control-left" });
  const second = await board();
  expect(isMoving(second)).toBe(true);
  expect(second).not.toBe(first);

  await clock.advance(200);
  expect(isMoving(await board())).toBe(true);
  await clock.advance(ANIMATION_MS - 200);
  expect(isMoving(await board())).toBe(false);
  await ui.unmount();
});

test("a key that moves nothing keeps the motion and its clock", async ($, on) => {
  const { clock, ui, board } = await moved($, on);
  await ui.press({ key: "control-left" });
  const motion = await board();
  await clock.advance(100);

  await ui.press({ key: "control-left" });
  expect(await board()).toBe(motion);
  await clock.advance(ANIMATION_MS - 101);
  expect(isMoving(await board())).toBe(true);
  await clock.advance(1);
  expect(isMoving(await board())).toBe(false);
  await ui.unmount();
});

test("a key ignored while paused keeps the motion and its clock", async ($, on) => {
  const { clock, ui, board } = await moved($, on);
  await ui.press({ key: "pane-pause" });
  const motion = await board();
  await clock.advance(100);

  await ui.press({ key: "control-down" });
  expect(await board()).toBe(motion);
  await clock.advance(ANIMATION_MS - 101);
  expect(isMoving(await board())).toBe(true);
  await clock.advance(1);
  expect(isMoving(await board())).toBe(false);
  await ui.unmount();
});

test("a pause lets the animation play out", async ($, on) => {
  const { clock, ui, board } = await moved($, on);
  await ui.press({ key: "pane-pause" });
  expect(isMoving(await board())).toBe(true);

  await clock.advance(ANIMATION_MS);
  expect(isMoving(await board())).toBe(false);
  expect(await ui.find({ type: "Text", text: "Paused · P to resume" })).toBeDefined();
  await ui.unmount();
});

test("a restart clears the motion", async ($, on) => {
  const { ui, board } = await moved($, on);
  await ui.press({ key: "pane-restart" });
  expect(isMoving(await board())).toBe(false);
  await ui.unmount();
});

test("the menu clears the motion; the game comes back settled", async ($, on) => {
  const { ui, board } = await moved($, on);
  await ui.press({ key: "pane-back" });
  await ui.press({ key: "game-2048" });
  expect(isMoving(await board())).toBe(false);
  await ui.unmount();
});

test("closing the pane clears the motion", async ($, on) => {
  const { ui, board } = await moved($, on);
  await gamemods($, "stop");
  await gamemods($, "2048");
  expect(isMoving(await board())).toBe(false);
  await ui.unmount();
});

test("switching game draws the other game, then 2048 settled", async ($, on) => {
  const { ui, board } = await moved($, on);
  await gamemods($, "morpion");
  expect(await ui.find({ type: "Svg" })).toBeUndefined();
  await gamemods($, "2048");
  expect(isMoving(await board())).toBe(false);
  await ui.unmount();
});

test("clearing the motion leaves the score and the best score as they were", async ($, on) => {
  const { engine, clock, ui } = await moved($, on);
  const header = async () => (await ui.find({ type: "Text", text: /^score / }))?.children;
  const before = await header();
  const stored = { ...engine.stored };

  await clock.advance(ANIMATION_MS);
  expect(await header()).toEqual(before);
  expect(engine.stored).toEqual(stored);
  await ui.unmount();
});
