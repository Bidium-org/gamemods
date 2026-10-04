import { expect, test } from "claude-code/testing";
import { twentyFortyEight as game } from "../../../src/games/2048/2048";
import { cellBoard } from "../../../src/games/2048/cells";
import type { TwentyFortyEightState } from "../../../src/games/2048/rules";
import { SEED } from "../../fixtures/engine";
import { _, EMPTY_ROW, state } from "./fixture";

const tileCount = (s: TwentyFortyEightState) => s.grid.flat().filter(Boolean).length;

test("a game starts with two tiles", () => {
  const s = game.init(SEED);
  expect(tileCount(s)).toBe(2);
  expect(game.status(s).line).toBe("Merge the tiles to reach 2048");
});

test("a move slides the tiles and spawns one", () => {
  const s = state([[_, _, _, 2], EMPTY_ROW, EMPTY_ROW, EMPTY_ROW], SEED);
  const after = game.onControl(s, "left");
  expect(after.grid[0]?.[0]).toBe(2);
  expect(tileCount(after)).toBe(2);
  expect(after.rng).not.toBe(s.rng);
});

test("a merge adds the merged value to the score", () => {
  const after = game.onControl(
    state([[4, 4, 2, 2], EMPTY_ROW, EMPTY_ROW, EMPTY_ROW], SEED),
    "left",
  );
  expect(after.grid[0]?.slice(0, 2)).toEqual([8, 4]);
  expect(game.status(after).score).toBe(12);
});

test("keys other than w a s d do nothing", () => {
  const s = game.init(SEED);
  expect(game.onControl(s, "place")).toBe(s);
});

test("reaching 2048 keeps the game going", () => {
  const won = game.onControl(
    state([[1024, 1024, _, _], EMPTY_ROW, EMPTY_ROW, EMPTY_ROW], SEED),
    "left",
  );
  expect(won.grid[0]?.[0]).toBe(2048);
  expect(game.status(won)).toEqual({
    phase: "playing",
    score: 2048,
    line: "2048 reached! Keep going",
  });
  const next = game.onControl(won, "right");
  expect(next).not.toBe(won);
  expect(next.grid.flat()).toContain(2048);
  expect(game.status(next).line).toBe("2048 reached! Keep going");
});

test("a grid with no move left is lost and ignores the keys", () => {
  const lost: TwentyFortyEightState = {
    grid: [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 8, 16, 32],
    ],
    score: 120,
    rng: SEED,
  };
  expect(game.status(lost)).toEqual({
    phase: "lost",
    score: 120,
    line: "No moves left · R to play again",
  });
  for (const id of ["up", "left", "down", "right"]) {
    expect(game.onControl(lost, id)).toBe(lost);
  }
});

test("the board is the grid and the score", () => {
  const s = game.init(SEED);
  expect(game.board(s)).toEqual({ grid: s.grid, score: 0 });
});

test("a move animates; a key that moves nothing does not", () => {
  const s = state([[_, _, _, 2], EMPTY_ROW, EMPTY_ROW, EMPTY_ROW], SEED);
  const moved = game.animation?.play(s, "left");
  expect(moved?.state).toEqual(game.onControl(s, "left"));
  expect(moved?.motion).toMatchObject({ slides: [{ value: 2 }] });
  const stuck = state([[2, 4, _, _], EMPTY_ROW, EMPTY_ROW, EMPTY_ROW], SEED);
  expect(game.animation?.play(stuck, "left")).toEqual({ state: stuck, motion: null });
  expect(game.animation?.play(s, "place")).toEqual({ state: s, motion: null });
});

test("the cell fallback: 4 by 4 tiles, the value as glyph, empty cells blank", () => {
  const board = cellBoard([[2, _, _, _], EMPTY_ROW, EMPTY_ROW, [_, _, _, 131072]]);
  expect(board.rows.map((row) => row.map((c) => c.ch))).toEqual([
    ["2", "", "", ""],
    ["", "", "", ""],
    ["", "", "", ""],
    ["", "", "", "131072"],
  ]);
  expect(board.rows[0]?.[1]?.fg).toBeUndefined();
  expect(board.rows[0]?.[0]?.bg).not.toBe(board.rows[0]?.[1]?.bg);
  expect(board.rows[0]?.[0]?.fg).not.toBe(board.rows[3]?.[3]?.fg);
  expect(board.cell.width).toBeGreaterThanOrEqual("131072".length);
});
