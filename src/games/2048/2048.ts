import { drawCells } from "../cells";
import type { Game, Play } from "../game";
import { MOVES } from "../grid";
import type { TileBoard } from "./board";
import { cellBoard } from "./cells";
import {
  DIRECTIONS,
  type Direction,
  hasMovesLeft,
  hasReachedGoal,
  type Motion,
  move,
  newGame,
  type TwentyFortyEightState,
} from "./rules";
import { ANIMATION_MS, tilesSvg } from "./svg";
import { tilesClient } from "./terminal";

const isDirection = (id: string): id is Direction => DIRECTIONS.some((d) => d === id);

const play = (s: TwentyFortyEightState, id: string): Play<TwentyFortyEightState, Motion> => {
  if (!isDirection(id)) return { state: s, motion: null };
  const { state, motion } = move(s, id);
  return { state, motion: motion ?? null };
};

export const twentyFortyEight: Game<TwentyFortyEightState, TileBoard, Motion> = {
  controls: MOVES,
  size: { columns: 38, rows: 26 },
  init: (seed) => newGame(seed),
  onControl: (s, id) => play(s, id).state,
  animation: { ms: ANIMATION_MS, play },
  board: (s) => ({ grid: s.grid, score: s.score }),
  // Tiles that slide: a `Client` on terminal, an `Svg` on Desktop, cells elsewhere
  render: ({ Client, Svg, ...els }, board, draw) => {
    if (Client) return tilesClient({ Client }, board, draw);
    if (Svg) return tilesSvg({ Svg }, board, draw);
    return drawCells(els, cellBoard(board.grid), draw);
  },
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
