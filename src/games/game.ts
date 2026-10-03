import type { PictureBoard } from "./hogzzle/board";

export type Control = { id: string; label: string; hotkey: string };
export type Cell = { ch: string; fg?: string; bg?: string };

// Every tile is `cell` wide and high, in layout cells, `gap` apart. Desktop draws text in a
// proportional font: only fixed-size tiles keep a grid aligned there
export type CellBoard = {
  kind: "cells";
  cell: { width: number; height: number };
  gap?: number;
  rows: Cell[][];
};

export type Board = CellBoard | PictureBoard;

export type Phase = "playing" | "won" | "lost" | "draw";

export type GameStatus = { phase: Phase; score: number; line: string };

export interface Game<S, B extends Board = Board> {
  controls: Control[];
  // Pane body below which the game shows "Widen the window"
  size: { columns: number; rows: number };
  // A multiple of 100; absent for a turn-based game
  tickMs?: number;
  init(seed: number): S;
  // `r`; absent, the session calls `init(seed)`
  restart?(s: S, seed: number): S;
  onControl(s: S, id: string): S;
  tick?(s: S): S;
  board(s: S): B;
  status(s: S): GameStatus;
}
