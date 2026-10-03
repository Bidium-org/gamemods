import { expect, test } from "claude-code/testing";
import type { Board } from "../src/games/game";
import { morpion } from "../src/games/morpion";
import { boardText } from "../src/render/text";

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

const BOARD: Board = {
  cell: { width: 2, height: 1 },
  gap: 1,
  rows: [
    [
      { ch: "", bg: "#ff0000" },
      { ch: "a", fg: "#00ff00" },
    ],
    [{ ch: "b" }, { ch: "", bg: "#444444" }],
  ],
};

for (const surface of ["desktop", "terminal"] as const) {
  test(`a board draws one fixed-size tile per cell on ${surface}`, async ($, on) => {
    on("session.start", () => ({ cwd: "/work" }));
    on("ui.render", ($, e) => boardText($.ui.resolve(e), BOARD));
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });

    const ui = await $.ui.mount({ ...PANE, surface });
    const tile = { type: "Box", props: { width: 2, height: 1 } };
    expect(await ui.drawn()).toMatchObject({
      type: "Box",
      props: { rowGap: 1 },
      children: [
        {
          type: "Box",
          props: { columnGap: 1 },
          children: [
            { ...tile, props: { ...tile.props, backgroundColor: "#ff0000" } },
            { ...tile, children: [{ type: "Text", props: { color: "#00ff00" }, children: ["a"] }] },
          ],
        },
        {
          type: "Box",
          children: [
            { ...tile, children: [{ type: "Text", children: ["b"] }] },
            { ...tile, props: { ...tile.props, backgroundColor: "#444444" } },
          ],
        },
      ],
    });
    await ui.unmount();
  });

  test(`the Morpion board draws as a valid tree on ${surface}`, async ($, on) => {
    on("session.start", () => ({ cwd: "/work" }));
    on("ui.render", ($, e) => boardText($.ui.resolve(e), morpion.board(morpion.init(1))));
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });

    const ui = await $.ui.mount({ ...PANE, surface });
    expect(await ui.findAll({ type: "Box" })).toHaveLength(1 + 3 + 9);
    await ui.unmount();
  });
}
