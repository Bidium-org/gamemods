import type { Grid, Roll, TwentyFortyEightState } from "../../../src/games/2048/rules";

export const _ = 0;
export const EMPTY_ROW = [_, _, _, _];

// A game on `grid`, score zero
export const state = (grid: Grid, rng = 0): TwentyFortyEightState => ({ grid, score: 0, rng });

// The spawn always lands on the first empty cell, as a 2
export const alwaysTwoFirstCell: Roll = (rng) => [0, rng];
