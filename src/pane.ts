import type { RenderElement, RenderSurface } from "claude-code";
import { claudeState } from "./band";
import type { BoardElements } from "./games/game";
import { GAMES, type GameId } from "./games/index";
import { type MenuElements, menu } from "./menu";
import type { PauseReason, Session } from "./session";

export const WIDEN_PANE = "Widen the window to play";
export const NOT_ON_SURFACE = "This game is not playable here yet. Play it in Claude Code Desktop.";
// Shown while the pane has no keyboard
export const CLICK_TO_PLAY = "Click the game to play";
export const CLICK_FOR_KEYBOARD = "Click here to use the keyboard";

export type PaneActions = {
  onChoose: (id: GameId) => void;
  onBack: () => void;
  onControl: (id: string) => void;
  onPause: () => void;
  onRestart: () => void;
};

export type PaneElements = MenuElements & Partial<Pick<BoardElements, "Svg" | "Client">>;

export type PaneView = {
  surface: RenderSurface;
  isFocused: boolean;
  bodyColumns: number;
  bodyRows: number;
};

// Anthropic's orange: a paused game must read as paused at a glance
export const PAUSE_COLOR = "#d97757";

// Header, frame and legend around the board, with the gaps between them
const CHROME_ROWS = 9;
// The "click to play" hint and its gap
const HINT_ROWS = 2;

const PAUSE_LINE: Record<PauseReason, string> = {
  manual: "Paused",
  focus: "Paused: the game lost the keyboard",
  permission: "Paused: permission requested",
  "turn-end": "Paused: Claude answered",
  menu: "Paused",
};

export const pauseLine = (reason: PauseReason): string => `${PAUSE_LINE[reason]} · P to resume`;

export const pauseLabel = (isPaused: boolean): string => (isPaused ? "Resume" : "Pause");

export const scoreLine = (score: number, best: number): string => `score ${score} · best ${best}`;

// Svg draws only off the terminal; Client loads only on it, although Desktop's table lists one
const boardElements = (
  { Box, Text, Svg, Client }: PaneElements,
  surface: RenderSurface,
): BoardElements => ({
  Box,
  Text,
  ...(surface !== "terminal" && Svg && { Svg }),
  ...(surface === "terminal" && Client && { Client }),
});

const backButton = (Button: MenuElements["Button"], onBack: () => void): RenderElement =>
  Button({ key: "pane-back", label: "Menu", hotkey: "q", plain: true, onPress: onBack });

function gameScreen(
  els: MenuElements,
  session: Session,
  id: GameId,
  drawn: RenderElement,
  actions: PaneActions,
): RenderElement[] {
  const { Box, Text, Button } = els;
  const { name, game } = GAMES[id];
  const status = game.status(session.state);
  const header = Box({
    flexDirection: "column",
    children: [
      Box({
        flexDirection: "row",
        columnGap: 2,
        children: [
          Text({ bold: true, children: [name] }),
          Text({
            dimColor: true,
            children: [scoreLine(status.score, session.best[id] ?? 0)],
          }),
        ],
      }),
      session.pause
        ? Text({
            bold: true,
            color: PAUSE_COLOR,
            children: [pauseLine(session.pause)],
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
            label: pauseLabel(session.pause !== null),
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
          backButton(Button, actions.onBack),
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
  const id = session.screen === "game" ? session.gameId : null;
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

  if (!id) {
    return root([hint(CLICK_FOR_KEYBOARD), menu(els, session, actions.onChoose)]);
  }
  const { name, game } = GAMES[id];
  const title = Text({ bold: true, children: [name] });
  const back = backButton(Button, actions.onBack);
  const drawn = game.render(boardElements(els, view.surface), game.board(session.state), {
    dimmed: session.pause !== null,
    motion: session.motion,
    moveId: session.moveId,
    room: {
      columns: view.bodyColumns - 2,
      rows: view.bodyRows - CHROME_ROWS - (view.isFocused ? 0 : HINT_ROWS),
    },
  });
  if (!drawn) {
    return root([hint(CLICK_TO_PLAY), title, Text({ children: [NOT_ON_SURFACE] }), back]);
  }
  if (view.bodyColumns < game.size.columns || view.bodyRows < game.size.rows) {
    return root([title, Text({ children: [WIDEN_PANE] }), back]);
  }
  return root([hint(CLICK_TO_PLAY), ...gameScreen(els, session, id, drawn, actions)]);
}
