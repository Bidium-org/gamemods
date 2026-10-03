import type { ElementTable, RenderElement } from "claude-code";
import type { Cell, CellBoard } from "../games/game";

export type TextElements = Pick<ElementTable<"terminal">, "Box" | "Text" | "Button">;

export type CellBoardOptions = {
  dimmed?: boolean;
  // Receives the `control` of a pressed cell
  onPress?: (control: string) => void;
};

export function boardText(
  { Box, Text, Button }: TextElements,
  board: CellBoard,
  { dimmed = false, onPress }: CellBoardOptions = {},
): RenderElement {
  const { cell, gap = 0 } = board;
  const glyph = ({ ch, fg }: Cell) =>
    Text({
      bold: true,
      ...(dimmed && { dimColor: true }),
      ...(fg && { color: fg }),
      children: [ch],
    });
  // A Button has no size of its own: a label as wide as the tile gives the click a whole row
  const content = (c: Cell) => {
    if (c.control && onPress) {
      const { control } = c;
      return [
        Button({
          key: `board-${control}`,
          label: c.ch || " ".repeat(cell.width),
          plain: true,
          ...(dimmed && { dimColor: true }),
          onPress: () => onPress(control),
        }),
      ];
    }
    return c.ch ? [glyph(c)] : [];
  };
  const tile = (c: Cell) =>
    Box({
      width: cell.width,
      height: cell.height,
      justifyContent: "center",
      alignItems: "center",
      ...(c.bg && { backgroundColor: c.bg }),
      children: content(c),
    });
  return Box({
    flexDirection: "column",
    rowGap: gap,
    children: board.rows.map((row, i) =>
      Box({ key: `board-row-${i}`, flexDirection: "row", columnGap: gap, children: row.map(tile) }),
    ),
  });
}
