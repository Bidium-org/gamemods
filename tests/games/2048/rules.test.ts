import { expect, test } from "claude-code/testing";
import {
  type Direction,
  hasMovesLeft,
  move,
  newGame,
  type Roll,
} from "../../../src/games/2048/rules";
import { _, alwaysTwoFirstCell, EMPTY_ROW, state } from "./fixture";

const sequence =
  (...values: number[]): Roll =>
  (rng) => [values[rng % values.length] ?? 0, rng + 1];

const oneRow = (row: number[], direction: Direction) => {
  const { state: after } = move(
    state([row, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW]),
    direction,
    alwaysTwoFirstCell,
  );
  return { row: after.grid[0], score: after.score };
};

const cell = (row: number, col: number) => ({ row, col });

const ALMOST_FULL = [
  [2, 4, 2, 4],
  [4, 2, 4, 2],
  [2, 4, 2, 4],
  [_, 8, 16, 32],
];

test("a new game starts with exactly two tiles", () => {
  const tiles = newGame(1)
    .grid.flat()
    .filter((value) => value !== 0);
  expect(tiles).toHaveLength(2);
});

test("a new game draws its two tiles from the random source", () => {
  expect(newGame(0, sequence(0, 0, 0.95, 0.99)).grid).toEqual([
    [2, _, _, _],
    EMPTY_ROW,
    EMPTY_ROW,
    [_, _, _, 4],
  ]);
});

test("the same seed starts the same game", () => {
  expect(newGame(42)).toEqual(newGame(42));
});

test("merges follow the original reference cases", () => {
  expect(oneRow([2, 2, 2, 2], "left").row).toEqual([4, 4, 2, _]);
  expect(oneRow([2, 2, 2, _], "left").row).toEqual([4, 2, 2, _]);
  expect(oneRow([2, 2, 2, _], "right").row).toEqual([2, _, 2, 4]);
  expect(oneRow([4, 2, 2, _], "left").row).toEqual([4, 4, 2, _]);
  expect(oneRow([4, 4, 8, 8], "left").row).toEqual([8, 16, 2, _]);
  expect(oneRow([2, _, _, 2], "left").row).toEqual([4, 2, _, _]);
});

test("score grows by the value of each merged tile", () => {
  expect(oneRow([2, 2, 2, 2], "left").score).toBe(8);
  expect(oneRow([4, 4, 8, 8], "left").score).toBe(24);
});

test("a move that slides nothing spawns nothing and keeps the state", () => {
  const start = state([[2, 4, _, _], EMPTY_ROW, EMPTY_ROW, EMPTY_ROW]);
  const turn = move(start, "left", alwaysTwoFirstCell);
  expect(turn.state).toBe(start);
  expect(turn.motion).toBeUndefined();
});

test("a move advances the random source", () => {
  const start = state([[2, _, _, 2], EMPTY_ROW, EMPTY_ROW, EMPTY_ROW]);
  expect(move(start, "left", sequence(0, 0)).state.rng).toBe(2);
});

test("merging past 2048 keeps going", () => {
  const { state: past } = move(
    state([[2048, 2048, _, _], EMPTY_ROW, EMPTY_ROW, EMPTY_ROW]),
    "left",
    alwaysTwoFirstCell,
  );
  expect(past.grid[0]?.[0]).toBe(4096);
  expect(past.score).toBe(4096);
});

test("a full grid with no adjacent pair has no move left", () => {
  const { state: lost } = move(state(ALMOST_FULL), "left", sequence(0.5, 0));
  expect(lost.grid[3]).toEqual([8, 16, 32, 2]);
  expect(hasMovesLeft(lost.grid)).toBe(false);
  for (const direction of ["up", "left", "down", "right"] as const) {
    const turn = move(lost, direction, alwaysTwoFirstCell);
    expect(turn.state).toBe(lost);
    expect(turn.motion).toBeUndefined();
  }
});

test("a full grid with one mergeable pair still has a move", () => {
  const { state: alive } = move(state(ALMOST_FULL), "left", sequence(0.95, 0));
  expect(alive.grid[3]).toEqual([8, 16, 32, 4]);
  expect(hasMovesLeft(alive.grid)).toBe(true);
});

test("a move describes each merge with its two source tiles", () => {
  const { motion } = move(
    state([[2, 2, 2, 2], EMPTY_ROW, EMPTY_ROW, EMPTY_ROW]),
    "left",
    alwaysTwoFirstCell,
  );
  expect(motion?.merges).toEqual([
    { from: [cell(0, 0), cell(0, 1)], at: cell(0, 0), value: 4 },
    { from: [cell(0, 2), cell(0, 3)], at: cell(0, 1), value: 4 },
  ]);
  expect(motion?.slides.map(({ from }) => from)).toEqual([
    cell(0, 0),
    cell(0, 1),
    cell(0, 2),
    cell(0, 3),
  ]);
  expect(motion?.slides.map(({ to }) => to)).toEqual([
    cell(0, 0),
    cell(0, 0),
    cell(0, 1),
    cell(0, 1),
  ]);
  expect(motion?.gain).toBe(8);
});

test("a move describes where each tile travels, in every direction", () => {
  const left = move(
    state([[2, _, _, 2], EMPTY_ROW, EMPTY_ROW, EMPTY_ROW]),
    "left",
    alwaysTwoFirstCell,
  );
  expect(left.motion?.slides).toContainEqual({ from: cell(0, 3), to: cell(0, 0), value: 2 });

  const down = move(
    state([[2, _, _, _], EMPTY_ROW, EMPTY_ROW, [4, _, _, _]]),
    "down",
    alwaysTwoFirstCell,
  );
  expect(down.motion?.slides).toEqual([
    { from: cell(3, 0), to: cell(3, 0), value: 4 },
    { from: cell(0, 0), to: cell(2, 0), value: 2 },
  ]);
  expect(down.motion?.merges).toEqual([]);
});

test("a move describes the spawned tile", () => {
  const { state: after, motion } = move(
    state([[2, 2, 2, 2], EMPTY_ROW, EMPTY_ROW, EMPTY_ROW]),
    "left",
    alwaysTwoFirstCell,
  );
  expect(motion?.spawned).toEqual({ at: cell(0, 2), value: 2 });
  expect(after.grid[0]?.[2]).toBe(2);
});

test("a spawn is a 4 one time in ten", () => {
  const start = state([[2, _, _, _], EMPTY_ROW, EMPTY_ROW, EMPTY_ROW]);
  expect(move(start, "right", sequence(0.89, 0)).motion?.spawned?.value).toBe(2);
  expect(move(start, "right", sequence(0.9, 0)).motion?.spawned?.value).toBe(4);
});
