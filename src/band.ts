import type { RenderElement } from "claude-code";
import type { GameId } from "./catalog";
import { type MenuElements, menu } from "./menu";
import type { Session } from "./session";

export type BandActions = {
  onToggle: () => void;
  onChoose: (id: GameId) => void;
};

export function band(
  els: MenuElements,
  session: Session,
  isWorking: boolean,
  theirs: RenderElement,
  actions: BandActions,
): RenderElement {
  const { Box, Text, Button } = els;
  return Box({
    flexDirection: "column",
    children: [
      theirs,
      Box({
        flexDirection: "row",
        columnGap: 2,
        children: [
          Text({ bold: true, children: ["GAMEBOY"] }),
          Text({
            dimColor: true,
            children: [isWorking ? "Claude is working" : "Claude is waiting"],
          }),
          Button({
            key: "band-toggle",
            label: session.bandExpanded ? "Fold" : "Games",
            hotkey: "g",
            onPress: actions.onToggle,
          }),
        ],
      }),
      session.bandExpanded ? menu(els, actions.onChoose) : null,
    ],
  });
}
