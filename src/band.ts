import type { RenderElement } from "claude-code";
import { CATALOG, type GameId } from "./catalog";
import { type MenuElements, menu } from "./menu";
import { pausedGameId, type Session } from "./session";

export const WIDEN = "Widen the window to open the game";

export const claudeState = (isWorking: boolean): string =>
  isWorking ? "Claude is working" : "Claude is waiting";

export type BandActions = {
  onToggle: () => void;
  onChoose: (id: GameId) => void;
  onClose: () => void;
};

export type BandView = {
  isWorking: boolean;
  // The pane is open but waits undrawn (window too narrow)
  isPaneUnplaced: boolean;
};

export function band(
  els: MenuElements,
  session: Session,
  view: BandView,
  theirs: RenderElement,
  actions: BandActions,
): RenderElement {
  const { Box, Text, Button } = els;
  const paused = CATALOG.find((g) => g.id === pausedGameId(session));
  return Box({
    flexDirection: "column",
    children: [
      theirs,
      Box({
        flexDirection: "row",
        justifyContent: "space-between",
        children: [
          Box({
            flexDirection: "row",
            columnGap: 2,
            children: [
              Text({ bold: true, children: ["GAMEBOY"] }),
              Text({ dimColor: true, children: [claudeState(view.isWorking)] }),
              paused ? Text({ children: [`${paused.name} paused`] }) : null,
              Button({
                key: "band-toggle",
                label: session.bandExpanded ? "Fold" : "Games",
                onPress: actions.onToggle,
              }),
            ],
          }),
          // Plain and dim at the trailing edge, as the close mark of the engine's own bars
          Button({
            key: "band-close",
            label: "✕",
            role: "dismiss",
            plain: true,
            dimColor: true,
            onPress: actions.onClose,
          }),
        ],
      }),
      view.isPaneUnplaced ? Text({ dimColor: true, children: [WIDEN] }) : null,
      session.bandExpanded ? menu(els, session, actions.onChoose) : null,
    ],
  });
}
