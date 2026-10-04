import type { ElementTable, RenderElement } from "claude-code";
import { GAME_IDS, GAMES, type GameId } from "./games/index";
import { pausedGameId, type Session } from "./session";

export type MenuElements = Pick<ElementTable<"terminal">, "Box" | "Text" | "Button">;

export const describe = (id: GameId, session: Session): string => {
  const paused = pausedGameId(session) === id ? ["paused"] : [];
  return [...paused, `best ${session.best[id] ?? 0}`, GAMES[id].tagline].join(" · ");
};

export function menu(
  { Box, Text, Button }: MenuElements,
  session: Session,
  onChoose: (id: GameId) => void,
): RenderElement {
  return Box({
    flexDirection: "column",
    children: GAME_IDS.map((id, i) =>
      Box({
        key: `row-${id}`,
        flexDirection: "row",
        columnGap: 2,
        children: [
          Button({
            key: `game-${id}`,
            label: GAMES[id].name,
            ...(i === 0 && { autoFocus: true as const }),
            onPress: () => onChoose(id),
          }),
          Text({ dimColor: true, children: [describe(id, session)] }),
        ],
      }),
    ),
  });
}
