import type { ElementTable, RenderElement } from "claude-code";
import type { Cell, CellBoard } from "../games/game";

export type TextElements = Pick<ElementTable<"terminal">, "Box" | "Text">;

export function boardText(
  { Box, Text }: TextElements,
  board: CellBoard,
  { dimmed = false } = {},
): RenderElement {
  const { cell, gap = 0 } = board;
  const tile = ({ ch, fg, bg }: Cell) =>
    Box({
      width: cell.width,
      height: cell.height,
      justifyContent: "center",
      alignItems: "center",
      ...(bg && { backgroundColor: bg }),
      children: ch
        ? [
            Text({
              bold: true,
              ...(dimmed && { dimColor: true }),
              ...(fg && { color: fg }),
              children: [ch],
            }),
          ]
        : [],
    });
  return Box({
    flexDirection: "column",
    rowGap: gap,
    children: board.rows.map((row, i) =>
      Box({ key: `board-row-${i}`, flexDirection: "row", columnGap: gap, children: row.map(tile) }),
    ),
  });
}
