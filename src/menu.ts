import type { ElementTable, RenderElement } from "claude-code";
import { CATALOG, type CatalogEntry, type GameId } from "./games/catalog";
import { pausedGameId, type Session } from "./session";

export type MenuElements = Pick<ElementTable<"terminal">, "Box" | "Text" | "Button">;

const describe = (entry: CatalogEntry, session: Session): string => {
  if (entry.status === "soon") return `soon · ${entry.tagline}`;
  const paused = pausedGameId(session) === entry.id ? ["paused"] : [];
  return [...paused, `best ${session.best[entry.id] ?? 0}`, entry.tagline].join(" · ");
};

export function menu(
  { Box, Text, Button }: MenuElements,
  session: Session,
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
          Text({ dimColor: true, children: [describe(entry, session)] }),
        ],
      }),
    ),
  });
}
