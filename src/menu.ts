import type { ElementTable, RenderElement } from "claude-code";
import { CATALOG, type CatalogEntry, type GameId } from "./catalog";

export type MenuElements = Pick<ElementTable<"terminal">, "Box" | "Text" | "Button">;

const describe = (entry: CatalogEntry): string =>
  entry.status === "soon" ? `soon · ${entry.tagline}` : entry.tagline;

export function menu(
  { Box, Text, Button }: MenuElements,
  onChoose: (id: GameId) => void,
): RenderElement {
  return Box({
    flexDirection: "column",
    children: CATALOG.map((entry, i) =>
      Box({
        key: `row-${entry.id}`,
        flexDirection: "row",
        columnGap: 2,
        children: [
          Button({
            key: `game-${entry.id}`,
            label: entry.name,
            ...(i === 0 && { autoFocus: true as const }),
            onPress: () => onChoose(entry.id),
          }),
          Text({ dimColor: true, children: [describe(entry)] }),
        ],
      }),
    ),
  });
}
