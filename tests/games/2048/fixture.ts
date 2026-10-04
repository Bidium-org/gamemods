import type { Grid, Roll, TwentyFortyEightState } from "../../../src/games/2048/rules";

export const _ = 0;
export const EMPTY_ROW = [_, _, _, _];

// A game on `grid`, score zero
export const state = (grid: Grid, rng = 0): TwentyFortyEightState => ({ grid, score: 0, rng });

// The spawn always lands on the first empty cell, as a 2
export const alwaysTwoFirstCell: Roll = (rng) => [0, rng];

// The tiles a Desktop Svg slides: one `@keyframes` each
export const slideCount = (source: string) => source.match(/@keyframes s\d+ /g)?.length ?? 0;

// A board in motion slides at least one tile
export const isMoving = (source: string) => slideCount(source) > 0;
