import { expect, test } from "claude-code/testing";
import type { PictureBoard } from "../../../src/games/hogzzle/board";
import { PICTURES } from "../../../src/games/hogzzle/pictures.gen";
import { boardSvg, pictureSource, SVG_MAX } from "../../../src/games/hogzzle/svg";
import { NOT_ON_SURFACE } from "../../../src/pane";
import { mountDrawn, openGame } from "../../fixtures/engine";

// The heaviest drawing of a grid: every tile out of place, a pick, the cursor, the pause
const worstBoard = (picture: PictureBoard["picture"], columns: number, rows: number) => {
  const count = columns * rows;
  const slots = Array.from({ length: count }, (_none, i) => count - 1 - i);
  const board: PictureBoard = {
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
  const ui = await mountDrawn($, on, "desktop", ($, e) => {
    const { Svg } = $.ui.resolve(e) as { Svg: Parameters<typeof boardSvg>[0]["Svg"] };
    return boardSvg({ Svg }, worstBoard("professor", 6, 6));
  });
  expect(await ui.find({ type: "Svg" })).toBeDefined();
  await ui.unmount();
});

type Drawn = { type: string; props: { source?: string }; children?: unknown[] };

// The first Svg of the drawn tree
const svgOf = (node: Drawn): Drawn | undefined =>
  node.type === "Svg"
    ? node
    : (node.children ?? [])
        .filter((c): c is Drawn => typeof c === "object" && c !== null)
        .map(svgOf)
        .find(Boolean);

test("Hogzzle draws its picture as an Svg redrawn at each move on desktop", async ($, on) => {
  const { ui } = await openGame($, on, "desktop", "hogzzle");
  const svg = async () => svgOf((await ui.drawn()) as Drawn);
  const first = await svg();
  expect(first).toBeDefined();
  expect(await ui.find({ key: "control-pick" })).toBeDefined();

  await ui.press({ key: "control-right" });
  const moved = await svg();
  expect(moved?.props.source).not.toBe(first?.props.source);

  await ui.press({ key: "pane-pause" });
  expect((await svg())?.props.source).toContain('fill-opacity=".55"');
  await ui.unmount();
});

test("Hogzzle says it is not playable in the terminal yet", async ($, on) => {
  const { ui } = await openGame($, on, "terminal", "hogzzle");
  expect(await ui.find({ type: "Text", text: NOT_ON_SURFACE })).toBeDefined();
  expect(await ui.find({ key: "control-pick" })).toBeUndefined();
  await ui.press({ key: "pane-back" });
  expect(await ui.find({ key: "game-hogzzle" })).toBeDefined();
  await ui.unmount();
});
