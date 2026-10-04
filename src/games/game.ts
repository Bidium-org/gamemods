import type { ElementTable, JsonValue, RenderElement } from "claude-code";

export type Control = { id: string; label: string; hotkey: string };
export type Cell = { ch: string; fg?: string; bg?: string };

// Every tile is `cell` wide and high, in layout cells, `gap` apart. Desktop draws text in a
// proportional font: only fixed-size tiles keep a grid aligned there
export type CellBoard = {
  cell: { width: number; height: number };
  gap?: number;
  rows: Cell[][];
};

export type Phase = "playing" | "won" | "lost" | "draw";

export type GameStatus = { phase: Phase; score: number; line: string };

// `motion` crosses into a `Client`'s props: plain JSON, null for a move with nothing to animate
export type Play<S, M> = { state: S; motion: M | null };

export type SvgElements = Pick<ElementTable<"desktop">, "Svg">;
export type ClientElements = Pick<ElementTable<"terminal">, "Client">;

// The elements a board can use on the surface it is drawn on: `Svg` only off the terminal,
// `Client` only on it (Desktop's table lists one that never loads)
export type BoardElements = Pick<ElementTable<"terminal">, "Box" | "Text"> &
  Partial<SvgElements> &
  Partial<ClientElements>;

// What the session adds to a board: each renderer reads only what it needs
export type Draw<M> = {
  dimmed: boolean;
  // The game's `Play.motion` while it plays, null once settled
  motion: M | null;
  moveId: number;
  // The pane cells left around the board, so a renderer can fit in them
  room: { columns: number; rows: number };
};

export interface Game<S, B = CellBoard, M extends JsonValue = never> {
  controls: Control[];
  // Pane body below which the game shows "Widen the window"
  size: { columns: number; rows: number };
  // A multiple of 100; absent for a turn-based game
  tickMs?: number;
  init(seed: number): S;
  // `r`; absent, the session calls `init(seed)`
  restart?(s: S, seed: number): S;
  onControl(s: S, id: string): S;
  // Called every `tickMs` while the game runs: never paused, never off the game screen
  tick?(s: S): S;
  // Called when a pause lifts; absent, the game goes on as it was left
  resume?(s: S): S;
  // Absent, a key goes to `onControl` and nothing animates; `ms` is how long a motion is drawn
  animation?: { ms: number; play(s: S, id: string): Play<S, M> };
  // Plain data: an unchanged board draws nothing
  board(s: S): B;
  // `drawCells` for a CellBoard; null when this surface cannot draw the board
  render(els: BoardElements, board: B, draw: Draw<M>): RenderElement | null;
  status(s: S): GameStatus;
}
