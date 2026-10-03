import type { Cell, CellBoard, Game } from "../game";
import { MOVES } from "../grid";
import { digitColor, PALETTE, tileFill } from "./palette";
import {
  DIRECTIONS,
  type Direction,
  hasMovesLeft,
  hasReachedGoal,
  move,
  newGame,
  type TwentyFortyEightState,
} from "./rules";

const isDirection = (id: string): id is Direction => DIRECTIONS.some((d) => d === id);

const tile = (value: number): Cell => {
  if (value === 0) return { ch: "", bg: PALETTE.empty };
  const fill = tileFill(value);
  return { ch: String(value), fg: digitColor(fill), bg: fill };
};

export const twentyFortyEight: Game<TwentyFortyEightState, CellBoard> = {
  controls: MOVES,
  size: { columns: 38, rows: 26 },
  init: (seed) => newGame(seed),
  onControl: (s, id) => (isDirection(id) ? move(s, id).state : s),
  board: (s) => ({
    kind: "cells",
    cell: { width: 8, height: 3 },
    gap: 1,
    rows: s.grid.map((row) => row.map(tile)),
  }),
  status: (s) => {
    if (!hasMovesLeft(s.grid)) {
      return { phase: "lost", score: s.score, line: "No moves left · R to play again" };
    }
    const line = hasReachedGoal(s.grid)
      ? "2048 reached! Keep going"
      : "Merge the tiles to reach 2048";
    return { phase: "playing", score: s.score, line };
  },
};
