import { expect, test } from "claude-code/testing";
import { drawCells as boardText } from "../../src/games/cells";
import type { CellBoard } from "../../src/games/game";
import { mountDrawn, SURFACES } from "../fixtures/engine";

const BOARD: CellBoard = {
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

for (const surface of SURFACES) {
  test(`a board draws one fixed-size tile per cell on ${surface}`, async ($, on) => {
    const ui = await mountDrawn($, on, surface, ($, e) => boardText($.ui.resolve(e), BOARD));
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
}
