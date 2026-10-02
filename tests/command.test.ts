import { expect, test } from "claude-code/testing";
import { WIDEN } from "../src/band";
import { parseArgs } from "../src/command";
import { gameboy, stubEngine } from "./engine";

test("no argument opens the menu", () => {
  expect(parseArgs("")).toEqual({ kind: "menu" });
  expect(parseArgs("   ")).toEqual({ kind: "menu" });
});

test("a known game id targets that game", () => {
  expect(parseArgs("morpion")).toEqual({ kind: "game", id: "morpion" });
  expect(parseArgs("  Snake ")).toEqual({ kind: "game", id: "snake" });
});

test("stop closes the pane", () => {
  expect(parseArgs("stop")).toEqual({ kind: "stop" });
  expect(parseArgs("STOP")).toEqual({ kind: "stop" });
});

test("an unknown id opens the menu", () => {
  expect(parseArgs("pong")).toEqual({ kind: "menu" });
});

test("only the first word counts", () => {
  expect(parseArgs("tetris now")).toEqual({ kind: "game", id: "tetris" });
  expect(parseArgs("pong morpion")).toEqual({ kind: "menu" });
});

const BAND = {
  plugin: "gameboy",
  component: "AbovePrompt",
  requestId: "above-prompt",
  viewport: { columns: 106, rows: 52, isFullscreen: true },
  props: {
    hasSurvey: false,
    isWorking: true,
    maxRows: 12,
    bodyColumns: 95,
    scroll: { offset: 0, bodyRows: 12 },
    view: {},
  },
} as const;

const PANE = {
  plugin: "gameboy",
  component: "Pane",
  requestId: "gameboy",
  viewport: { columns: 106, rows: 52, isFullscreen: true },
  props: {
    title: "Gameboy",
    isFocused: true,
    bodyColumns: 38,
    placement: "dock",
    scroll: { offset: 0, bodyRows: 46 },
    view: {},
  },
} as const;

for (const surface of ["desktop", "terminal"] as const) {
  test(`the command registers as immediate on ${surface}`, async ($, on) => {
    const engine = stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    expect(engine.registered).toEqual([
      expect.objectContaining({ name: "gameboy", immediate: true, argumentHint: "[game|stop]" }),
    ]);
  });

  test(`/gameboy opens the pane on its menu on ${surface}`, async ($, on) => {
    const engine = stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await gameboy($);
    expect(engine.opened).toEqual([{ id: "gameboy", title: "Gameboy", focus: true }]);

    const ui = await $.ui.mount({ ...PANE, surface });
    for (const id of ["morpion", "snake", "tetris", "sudoku"]) {
      expect(await ui.find({ key: `game-${id}` })).toBeDefined();
    }
    await ui.unmount();
  });

  test(`/gameboy <id> opens that game, soon or not, on ${surface}`, async ($, on) => {
    const engine = stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await gameboy($, "tetris");
    expect(engine.opened).toHaveLength(1);

    const ui = await $.ui.mount({ ...PANE, surface });
    expect(await ui.find({ type: "Text", text: "Tetris" })).toBeDefined();
    expect(await ui.find({ type: "Text", text: /^Coming soon/ })).toBeDefined();
    await ui.unmount();
  });

  test(`/gameboy with an unknown id opens the menu on ${surface}`, async ($, on) => {
    stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await gameboy($, "pong");

    const ui = await $.ui.mount({ ...PANE, surface });
    expect(await ui.find({ key: "game-snake" })).toBeDefined();
    expect(await ui.find({ key: "pane-back" })).toBeUndefined();
    await ui.unmount();
  });

  test(`/gameboy stop closes the pane and keeps the game on ${surface}`, async ($, on) => {
    const engine = stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await gameboy($, "snake");
    await gameboy($, "stop");
    expect(engine.closed).toEqual(["gameboy"]);

    // Closed: the engine draws the pane itself
    const closed = await $.ui.mount({ ...PANE, surface });
    expect(await closed.find({ key: "pane-back" })).toBeUndefined();
    await closed.unmount();

    // Reopening on the menu finds the same game waiting
    await gameboy($);
    const reopened = await $.ui.mount({ ...PANE, surface });
    expect(await reopened.find({ key: "game-snake" })).toBeDefined();
    await reopened.unmount();
  });

  test(`an unplaced pane is explained in the band on ${surface}`, async ($, on) => {
    const engine = stubEngine(on, { isPlaced: false });
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await gameboy($, "morpion");
    expect(engine.toasts).toEqual([]);

    const ui = await $.ui.mount({ ...BAND, surface });
    expect(await ui.find({ type: "Text", text: WIDEN })).toBeDefined();
    await ui.unmount();
  });

  test(`an unplaced pane toasts when the band is hidden on ${surface}`, async ($, on) => {
    const engine = stubEngine(on, { isPlaced: false });
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    const band = await $.ui.mount({ ...BAND, surface });
    await band.press({ key: "band-close" });
    await band.unmount();

    await gameboy($, "morpion");
    expect(engine.toasts).toEqual([WIDEN]);
  });
}
