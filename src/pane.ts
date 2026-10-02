import type { RenderElement } from "claude-code";
import { CATALOG, type GameId } from "./catalog";
import { type MenuElements, menu } from "./menu";
import type { Session } from "./session";

export type PaneActions = {
  onChoose: (id: GameId) => void;
  onBack: () => void;
};

export function pane(
  els: MenuElements,
  session: Session,
  isFocused: boolean,
  actions: PaneActions,
): RenderElement {
  const { Box, Text, Button } = els;
  const entry = session.screen === "game" && CATALOG.find((g) => g.id === session.gameId);
  const hint = (text: string) => (isFocused ? null : Text({ dimColor: true, children: [text] }));

  if (!entry) {
    return Box({
      flexDirection: "column",
      rowGap: 1,
      children: [hint("Clique ici pour utiliser le clavier"), menu(els, actions.onChoose)],
    });
  }
  return Box({
    flexDirection: "column",
    rowGap: 1,
    children: [
      hint("Clique le jeu pour jouer"),
      Text({ bold: true, children: [entry.name] }),
      Text({ children: ["À venir. Ce jeu n'est pas encore jouable."] }),
      Button({ key: "pane-back", label: "Menu", hotkey: "q", onPress: actions.onBack }),
    ],
  });
}
