import { expect, test } from "claude-code/testing";
import type { CellBoard } from "../src/games/game";
import type { PictureBoard } from "../src/games/hogzzle/board";
import { PICTURES } from "../src/games/hogzzle/pictures.gen";
import { boardSvg, pictureSource, SVG_MAX } from "../src/games/hogzzle/svg";
import { morpion } from "../src/games/morpion/morpion";
import { boardText } from "../src/render/text";
import { PANE } from "./engine";

const BOARD: CellBoard = {
  kind: "cells",
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

// The heaviest drawing of a grid: every tile out of place, a pick, the cursor, the pause
const worstBoard = (picture: PictureBoard["picture"], columns: number, rows: number) => {
  const count = columns * rows;
  const slots = Array.from({ length: count }, (_none, i) => count - 1 - i);
  const board: PictureBoard = {
    kind: "picture",
    picture,
    columns,
    rows,
    slots,
    cursor: count - 1,
    picked: count - 2,
    isSolved: false,
  };
  return board;
};

test("every picture at every grid stays under the Svg cap", () => {
  for (const { id, grids } of PICTURES) {
    for (const { columns, rows } of grids) {
      const source = pictureSource(worstBoard(id, columns, rows), { dimmed: true });
      expect(source.length).toBeLessThanOrEqual(SVG_MAX);
    }
  }
});

test("a solved picture board shows no grid and no cursor", () => {
  const solved = { ...worstBoard("phone", 4, 2), slots: [0, 1, 2, 3, 4, 5, 6, 7], isSolved: true };
  const source = pictureSource(solved);
  expect(source).not.toContain("<path");
  expect(source).not.toContain('stroke="#ffcc00"');
  expect(pictureSource(worstBoard("phone", 4, 2))).toContain('stroke="#ffcc00"');
});

// The test kit drops Svg's `key` from the drawn tree; Desktop reads it, so it is checked here
test("a picture board's Svg key changes with its drawing, and only with it", () => {
  const keyOf = (board: PictureBoard, dimmed = false) => {
    const Svg = (props: object) => props as never;
    return (boardSvg({ Svg }, board, { dimmed }) as unknown as { key: string }).key;
  };
  const board = worstBoard("builder", 3, 3);
  expect(keyOf(board)).toMatch(/^picture-[0-9a-f]+$/);
  expect(keyOf(board)).toBe(keyOf({ ...board }));
  expect(keyOf({ ...board, cursor: 0 })).not.toBe(keyOf(board));
  expect(keyOf(board, true)).not.toBe(keyOf(board));
});

test("a picture board draws as a valid Svg on desktop", async ($, on) => {
  on("session.start", () => ({ cwd: "/work" }));
  on("ui.render", ($, e) => {
    const { Svg } = $.ui.resolve(e) as { Svg: Parameters<typeof boardSvg>[0]["Svg"] };
    return boardSvg({ Svg }, worstBoard("professor", 6, 6));
  });
  await $.session.start({ surface: "desktop", isInteractive: true, cwd: "/work" });

  const ui = await $.ui.mount({ ...PANE, surface: "desktop" });
  expect(await ui.find({ type: "Svg" })).toBeDefined();
  await ui.unmount();
});

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
