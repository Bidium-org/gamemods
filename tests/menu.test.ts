import { expect, test } from "claude-code/testing";
import { menu } from "../src/menu";
import { initialSession } from "../src/session";

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
  test(`the menu draws one button per game on ${surface}, name only`, async ($, on) => {
    on("session.start", () => ({ cwd: "/work" }));
    on("ui.render", ($, e) => menu($.ui.resolve(e), initialSession, () => {}));
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });

    const ui = await $.ui.mount({ ...PANE, surface });
    for (const name of ["Morpion", "Snake", "Tetris", "Sudoku"]) {
      expect(await ui.find({ type: "Button", text: name })).toBeDefined();
    }
    expect(
      await ui.find({ type: "Text", text: "best 0 · Three in a row against a bot" }),
    ).toBeDefined();
    expect(await ui.find({ type: "Text", text: /soon · Eat the apples/ })).toBeDefined();
    await ui.unmount();
  });
}
