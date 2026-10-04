import { expect, test } from "claude-code/testing";
import { createTicTacToe, type TicTacToeState } from "../../../src/games/tic-tac-toe/tic-tac-toe";
import { SEED } from "../../fixtures/engine";
import { DRAW, WIN } from "./fixture";

const _ = null;

// The strict bot: the rules below hold without its random mistakes
const ticTacToe = createTicTacToe(0);
const careless = createTicTacToe(1);

// The person places X on cell `i`, cursor moved there directly
const playAt = (s: TicTacToeState, i: number, game = ticTacToe) =>
  game.onControl({ ...s, cursor: i }, "place");

const playAll = (cells: number[], s = ticTacToe.init(SEED)) =>
  cells.reduce((acc, i) => playAt(acc, i), s);

test("a game starts empty, cursor on the center", () => {
  const s = ticTacToe.init(SEED);
  expect(s.cells.every((c) => c === null)).toBe(true);
  expect(s.cursor).toBe(4);
  expect(ticTacToe.status(s).line).toBe("Your move");
});

test("the cursor moves with w a s d and stops at the edges", () => {
  const press = (s: TicTacToeState, ids: string[]) => ids.reduce(ticTacToe.onControl, s);
  const s = ticTacToe.init(SEED);
  expect(press(s, ["up"]).cursor).toBe(1);
  expect(press(s, ["up", "up"]).cursor).toBe(1);
  expect(press(s, ["left", "left", "down", "down"]).cursor).toBe(6);
  expect(press(s, ["right", "right", "up", "up"]).cursor).toBe(2);
});

test("placing on an occupied cell does nothing", () => {
  const s = playAt(ticTacToe.init(SEED), 0);
  expect(playAt(s, 0)).toEqual(s);
  expect(playAt(s, 4)).toEqual({ ...s, cursor: 4 });
});

test("the bot answers in the same step: center, else a corner", () => {
  expect(playAt(ticTacToe.init(SEED), 0).cells).toEqual(["X", _, _, _, "O", _, _, _, _]);
  expect(playAt(ticTacToe.init(SEED), 4).cells).toEqual(["O", _, _, _, "X", _, _, _, _]);
});

test("the bot blocks a line of two X", () => {
  expect(playAll([0, 1]).cells).toEqual(["X", "X", "O", _, "O", _, _, _, _]);
});

test("the bot wins rather than blocks", () => {
  const s: TicTacToeState = {
    cells: ["X", _, _, "O", "O", _, _, _, "X"],
    cursor: 4,
    streak: 2,
    rng: SEED,
  };
  const after = playAt(s, 2);
  expect(after.cells[5]).toBe("O");
  expect(ticTacToe.status(after)).toEqual({ phase: "lost", score: 0, line: "The bot wins" });
});

test("a fork beats the bot and the streak grows", () => {
  const s = playAll(WIN);
  expect(s.cells).toEqual(["X", _, "O", "X", "O", _, "X", "O", "X"]);
  expect(ticTacToe.status(s)).toEqual({ phase: "won", score: 1, line: "You win" });
});

test("a full board without a line is a draw and ends the streak", () => {
  const s = playAll(DRAW, { ...ticTacToe.init(SEED), streak: 3 });
  expect(s.cells.every(Boolean)).toBe(true);
  expect(ticTacToe.status(s)).toEqual({ phase: "draw", score: 0, line: "Draw" });
});

test("an ended game ignores the game keys", () => {
  const won = playAll(WIN);
  for (const id of ["up", "left", "down", "right", "place"]) {
    expect(ticTacToe.onControl(won, id)).toBe(won);
  }
  expect(playAt(won, 5)).toEqual({ ...won, cursor: 5 });
});

test("a restart after a win keeps the streak", () => {
  const again = ticTacToe.restart?.(playAll(WIN), SEED);
  expect(again).toEqual({ ...ticTacToe.init(SEED), streak: 1 });
});

test("a restart before the end resets the streak", () => {
  const midGame = playAt({ ...ticTacToe.init(SEED), streak: 4 }, 0);
  expect(ticTacToe.restart?.(midGame, SEED)).toEqual(ticTacToe.init(SEED));
});

test("the board draws 3 by 3 tiles, the cursor's lighter while playing", () => {
  const board = ticTacToe.board(playAt(ticTacToe.init(SEED), 0));
  expect(board.rows.map((row) => row.map((c) => c.ch))).toEqual([
    ["X", "", ""],
    ["", "O", ""],
    ["", "", ""],
  ]);
  const backgrounds = (rows: typeof board.rows) => new Set(rows.flat().map((c) => c.bg));
  expect(backgrounds(board.rows).size).toBe(2);
  expect(board.rows[0]?.[0]?.bg).not.toBe(board.rows[0]?.[1]?.bg);
  expect(backgrounds(ticTacToe.board(playAll(WIN)).rows).size).toBe(1);
});

test("a careless bot still wins when it can", () => {
  const s: TicTacToeState = {
    cells: ["X", _, _, "O", "O", _, _, _, "X"],
    cursor: 4,
    streak: 0,
    rng: 7,
  };
  expect(playAt(s, 2, careless).cells[5]).toBe("O");
});

test("a careless bot sometimes misses a block, always on a free cell", () => {
  // X is about to hold 0 and 1: a strict bot blocks at 2
  const answers = Array.from({ length: 20 }, (_none, seed) => {
    const s: TicTacToeState = {
      cells: ["X", _, _, _, "O", _, _, _, _],
      cursor: 1,
      streak: 0,
      rng: seed,
    };
    return playAt(s, 1, careless).cells.findIndex((c, i) => c === "O" && i !== 4);
  });
  expect(answers.every((i) => [2, 3, 5, 6, 7, 8].includes(i))).toBe(true);
  expect(answers.some((i) => i !== 2)).toBe(true);
});
