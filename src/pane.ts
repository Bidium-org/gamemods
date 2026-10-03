import type { RenderElement, RenderSurface } from "claude-code";
import { claudeState } from "./band";
import { CATALOG, type CatalogEntry, type GameId } from "./games/catalog";
import type { Game } from "./games/game";
import { type MenuElements, menu } from "./menu";
import { type BoardElements, drawBoard } from "./render/board";
import { currentGame, type PauseReason, type Session } from "./session";

export const WIDEN_PANE = "Widen the window to play";
export const NOT_ON_SURFACE = "This game is not playable here yet. Play it in Claude Code Desktop.";

export type PaneActions = {
  onChoose: (id: GameId) => void;
  onBack: () => void;
  onControl: (id: string) => void;
  onPause: () => void;
  onRestart: () => void;
};

export type PaneElements = MenuElements & BoardElements;

export type PaneView = {
  surface: RenderSurface;
  isFocused: boolean;
  bodyColumns: number;
  bodyRows: number;
};

// Anthropic's orange: a paused game must read as paused at a glance
const PAUSE_COLOR = "#d97757";

const PAUSE_LINE: Record<PauseReason, string> = {
  manual: "Paused",
  focus: "Paused: the game lost the keyboard",
  permission: "Paused: permission requested",
  "turn-end": "Paused: Claude answered",
  menu: "Paused",
};

function gameScreen(
  els: MenuElements,
  session: Session,
  entry: CatalogEntry,
  game: Game<unknown>,
  drawn: RenderElement,
  actions: PaneActions,
): RenderElement[] {
  const { Box, Text, Button } = els;
  const status = game.status(session.state);
  const header = Box({
    flexDirection: "column",
    children: [
      Box({
        flexDirection: "row",
        columnGap: 2,
        children: [
          Text({ bold: true, children: [entry.name] }),
          Text({
            dimColor: true,
            children: [`score ${status.score} · best ${session.best[entry.id] ?? 0}`],
          }),
        ],
      }),
      session.pause
        ? Text({
            bold: true,
            color: PAUSE_COLOR,
            children: [`${PAUSE_LINE[session.pause]} · P to resume`],
          })
        : Text({ children: [status.line] }),
      Text({ dimColor: true, children: [claudeState(session.isWorking)] }),
    ],
  });
  const legend = Box({
    flexDirection: "column",
    children: [
      Box({
        flexDirection: "row",
        flexWrap: "wrap",
        columnGap: 1,
        children: game.controls.map((c) =>
          Button({
            key: `control-${c.id}`,
            label: c.label,
            hotkey: c.hotkey,
            plain: true,
            onPress: () => actions.onControl(c.id),
          }),
        ),
      }),
      Box({
        flexDirection: "row",
        flexWrap: "wrap",
        columnGap: 1,
        children: [
          Button({
            key: "pane-pause",
            label: session.pause ? "Resume" : "Pause",
            hotkey: "p",
            plain: true,
            onPress: actions.onPause,
          }),
          Button({
            key: "pane-restart",
            label: "Restart",
            hotkey: "r",
            plain: true,
            onPress: actions.onRestart,
          }),
          Button({
            key: "pane-back",
            label: "Menu",
            hotkey: "q",
            plain: true,
            onPress: actions.onBack,
          }),
        ],
      }),
    ],
  });
  // Always framed, so pausing recolors the frame without moving the layout
  const board = Box({
    alignSelf: "flex-start",
    borderStyle: "round",
    ...(session.pause ? { borderColor: PAUSE_COLOR } : { borderDimColor: true }),
    children: [drawn],
  });
  return [header, board, legend];
}

export function pane(
  els: PaneElements,
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
    Box({
      flexDirection: "column",
      rowGap: 1,
      minHeight: view.bodyRows,
      children,
    });

  if (!entry) {
    return root([hint("Click here to use the keyboard"), menu(els, session, actions.onChoose)]);
  }
  const title = Text({ bold: true, children: [entry.name] });
  const back = Button({
    key: "pane-back",
    label: "Menu",
    hotkey: "q",
    plain: true,
    onPress: actions.onBack,
  });
  const game = currentGame(session);
  if (!game) {
    return root([
      hint("Click the game to play"),
      title,
      Text({ children: ["Coming soon. This game is not playable yet."] }),
      back,
    ]);
  }
  const drawn = drawBoard(els, view.surface, game.board(session.state), {
    dimmed: session.pause !== null,
  });
  if (!drawn) {
    return root([
      hint("Click the game to play"),
      title,
      Text({ children: [NOT_ON_SURFACE] }),
      back,
    ]);
  }
  if (view.bodyColumns < game.size.columns || view.bodyRows < game.size.rows) {
    return root([title, Text({ children: [WIDEN_PANE] }), back]);
  }
  return root([
    hint("Click the game to play"),
    ...gameScreen(els, session, entry, game, drawn, actions),
  ]);
}
