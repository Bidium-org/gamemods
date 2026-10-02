import { expect, test } from "claude-code/testing";
import { stubEngine } from "./engine";

const BAND = {
  plugin: "gameboy",
  component: "AbovePrompt",
  requestId: "above-prompt",
  viewport: { columns: 106, rows: 52, isFullscreen: true },
  props: {
    hasSurvey: false,
    isWorking: false,
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

const UNFOCUSED = { ...PANE, props: { ...PANE.props, isFocused: false } } as const;

for (const surface of ["desktop", "terminal"] as const) {
  test(`the pane goes from the menu to a game and back on ${surface}`, async ($, on) => {
    stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });

    // The band opens a game, as in a session
    const band = await $.ui.mount({ ...BAND, surface });
    await band.press({ key: "band-toggle" });
    await band.press({ key: "game-morpion" });
    await band.unmount();

    const ui = await $.ui.mount({ ...PANE, surface });
    expect(await ui.find({ type: "Text", text: "Morpion" })).toBeDefined();
    expect(await ui.find({ type: "Text", text: /^Coming soon/ })).toBeDefined();
    expect(await ui.find({ key: "game-snake" })).toBeUndefined();

    await ui.press({ key: "pane-back" });
    for (const id of ["morpion", "snake", "tetris", "sudoku"]) {
      expect(await ui.find({ key: `game-${id}` })).toBeDefined();
    }

    await ui.press({ key: "game-snake" });
    expect(await ui.find({ type: "Text", text: "Snake" })).toBeDefined();
    expect(await ui.find({ key: "pane-back" })).toBeDefined();
    await ui.unmount();
  });

  test(`the pane asks for a click when it has no keyboard on ${surface}`, async ($, on) => {
    stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });

    const band = await $.ui.mount({ ...BAND, surface });
    await band.press({ key: "band-toggle" });
    await band.press({ key: "game-tetris" });
    await band.unmount();

    const ui = await $.ui.mount({ ...UNFOCUSED, surface });
    expect(await ui.find({ type: "Text", text: "Click the game to play" })).toBeDefined();
    await ui.press({ key: "pane-back" });
    expect(await ui.find({ type: "Text", text: "Click here to use the keyboard" })).toBeDefined();
    await ui.unmount();
  });
}
