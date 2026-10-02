import type { RenderElement } from "claude-code";
import { CATALOG, type GameId } from "./catalog";
import { type MenuElements, menu } from "./menu";
import type { Session } from "./session";

export type PaneActions = {
  onChoose: (id: GameId) => void;
  onBack: () => void;
};

export type PaneView = {
  isFocused: boolean;
  bodyRows: number;
};

export function pane(
  els: MenuElements,
  session: Session,
  view: PaneView,
  actions: PaneActions,
): RenderElement {
  const { Box, Text, Button } = els;
  const entry = session.screen === "game" && CATALOG.find((g) => g.id === session.gameId);
  const hint = (text: string) =>
    view.isFocused ? null : Text({ dimColor: true, children: [text] });
  // Fills the pane: on Desktop a click below the tree loses the keys, so hotkeys would go to the prompt
  const root = (children: (RenderElement | null)[]) =>
    Box({ flexDirection: "column", rowGap: 1, minHeight: view.bodyRows, children });

  if (!entry) {
    return root([hint("Click here to use the keyboard"), menu(els, actions.onChoose)]);
  }
  return root([
    hint("Click the game to play"),
    Text({ bold: true, children: [entry.name] }),
    Text({ children: ["Coming soon. This game is not playable yet."] }),
    Button({ key: "pane-back", label: "Menu", hotkey: "q", onPress: actions.onBack }),
  ]);
}
