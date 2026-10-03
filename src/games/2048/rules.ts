import { roll } from "../random";

export type Grid = readonly (readonly number[])[];
export type Direction = "up" | "left" | "down" | "right";
export type Roll = typeof roll;

export type TwentyFortyEightState = { grid: Grid; score: number; rng: number };

export type Position = { row: number; col: number };
export type Slide = { from: Position; to: Position; value: number };
export type Merge = { from: [Position, Position]; at: Position; value: number };
export type Spawn = { at: Position; value: number };

export type Motion = {
  slides: Slide[];
  merges: Merge[];
  spawned?: Spawn;
  gain: number;
};

export type Turn = { state: TwentyFortyEightState; motion?: Motion };

export const DIRECTIONS: readonly Direction[] = ["up", "left", "down", "right"];

const SIZE = 4;
const GOAL = 2048;
const TWO_ODDS = 0.9;
const INDICES = Array.from({ length: SIZE }, (_, i) => i);

type LineSlide = { from: number; to: number; value: number };
type LineMerge = { from: [number, number]; to: number; value: number };

const positionAt = (direction: Direction, line: number, position: number): Position => {
  const far = SIZE - 1 - position;
  if (direction === "left") return { row: line, col: position };
  if (direction === "right") return { row: line, col: far };
  if (direction === "up") return { row: position, col: line };
  return { row: far, col: line };
};

const toLines = (grid: Grid, direction: Direction): number[][] =>
  INDICES.map((line) =>
    INDICES.map((position) => {
      const { row, col } = positionAt(direction, line, position);
      return grid[row]?.[col] ?? 0;
    }),
  );

const fromLines = (lines: number[][], direction: Direction): Grid => {
  const byIndex = new Map(
    lines.flatMap((values, line) =>
      values.map((value, position) => {
        const { row, col } = positionAt(direction, line, position);
        return [row * SIZE + col, value] as const;
      }),
    ),
  );
  return INDICES.map((row) => INDICES.map((col) => byIndex.get(row * SIZE + col) ?? 0));
};

const isSameGrid = (a: Grid, b: Grid): boolean =>
  a.every((row, r) => row.every((value, c) => value === b[r]?.[c]));

const slide = (line: number[]) => {
  const result: number[] = [];
  const slides: LineSlide[] = [];
  const merges: LineMerge[] = [];
  let mergeableFrom: number | undefined;
  for (const [from, value] of line.entries()) {
    if (value === 0) continue;
    const last = result.length - 1;
    if (mergeableFrom !== undefined && result[last] === value) {
      result[last] = value * 2;
      slides.push({ from, to: last, value });
      merges.push({ from: [mergeableFrom, from], to: last, value: value * 2 });
      mergeableFrom = undefined;
    } else {
      result.push(value);
      slides.push({ from, to: last + 1, value });
      mergeableFrom = from;
    }
  }
  return { line: [...result, ...Array<number>(SIZE - result.length).fill(0)], slides, merges };
};

const spawnTile = (grid: Grid, rng: number, random: Roll) => {
  const [odds, afterOdds] = random(rng);
  const [pick, next] = random(afterOdds);
  const free = grid.flatMap((cells, row) =>
    cells.flatMap((value, col) => (value === 0 ? [{ row, col }] : [])),
  );
  const at = free[Math.floor(pick * free.length)];
  if (!at) return { grid, rng: next };
  const spawned: Spawn = { at, value: odds < TWO_ODDS ? 2 : 4 };
  return {
    grid: grid.map((cells, row) =>
      row === at.row ? cells.map((value, col) => (col === at.col ? spawned.value : value)) : cells,
    ),
    rng: next,
    spawned,
  };
};

export const newGame = (seed: number, random: Roll = roll): TwentyFortyEightState => {
  const empty = INDICES.map(() => INDICES.map(() => 0));
  const first = spawnTile(empty, seed | 0, random);
  const second = spawnTile(first.grid, first.rng, random);
  return { grid: second.grid, score: 0, rng: second.rng };
};

export const hasMovesLeft = (grid: Grid): boolean =>
  grid.some((row, r) =>
    row.some((value, c) => value === 0 || value === row[c + 1] || value === grid[r + 1]?.[c]),
  );

export const hasReachedGoal = (grid: Grid): boolean =>
  grid.some((row) => row.some((value) => value >= GOAL));

export const move = (s: TwentyFortyEightState, direction: Direction, random: Roll = roll): Turn => {
  const slid = toLines(s.grid, direction).map(slide);
  const grid = fromLines(
    slid.map(({ line }) => line),
    direction,
  );
  if (isSameGrid(grid, s.grid)) return { state: s };

  const at = (line: number, position: number) => positionAt(direction, line, position);
  const slides = slid.flatMap(({ slides }, line) =>
    slides.map(({ from, to, value }) => ({ from: at(line, from), to: at(line, to), value })),
  );
  const merges = slid.flatMap(({ merges }, line) =>
    merges.map(
      ({ from: [first, second], to, value }): Merge => ({
        from: [at(line, first), at(line, second)],
        at: at(line, to),
        value,
      }),
    ),
  );
  const gain = merges.reduce((total, { value }) => total + value, 0);
  const spawn = spawnTile(grid, s.rng, random);
  return {
    state: { grid: spawn.grid, score: s.score + gain, rng: spawn.rng },
    motion: { slides, merges, gain, ...(spawn.spawned && { spawned: spawn.spawned }) },
  };
};
