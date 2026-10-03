import type { Game, Play } from "../game";
import { MOVES } from "../grid";
import type { TileBoard } from "./board";
import {
  DIRECTIONS,
  type Direction,
  hasMovesLeft,
  hasReachedGoal,
  move,
  newGame,
  type TwentyFortyEightState,
} from "./rules";
import { ANIMATION_MS } from "./svg";

const isDirection = (id: string): id is Direction => DIRECTIONS.some((d) => d === id);

const play = (s: TwentyFortyEightState, id: string): Play<TwentyFortyEightState> => {
  if (!isDirection(id)) return { state: s, motion: null };
  const { state, motion } = move(s, id);
  return { state, motion: motion ?? null };
};

export const twentyFortyEight: Game<TwentyFortyEightState, TileBoard> = {
  controls: MOVES,
  size: { columns: 38, rows: 26 },
  init: (seed) => newGame(seed),
  onControl: (s, id) => play(s, id).state,
  animation: { ms: ANIMATION_MS, play },
  board: (s) => ({ kind: "tiles", grid: s.grid, score: s.score }),
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
