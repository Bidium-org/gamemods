import { expect, test } from "claude-code/testing";
import { createHogzzle, type HogzzleState } from "../src/games/hogzzle/hogzzle";
import { type Grid, PICTURES, type Picture } from "../src/games/hogzzle/pictures.gen";

const SEED = 1;

const grid = (columns: number, rows: number, looks?: number[]): Grid => ({
  columns,
  rows,
  looks: looks ?? Array.from({ length: columns * rows }, (_none, i) => i),
});

// Pieces 0 and 1 of the 4×4 look the same, like two blank corners
const SQUARE: Picture = {
  id: "professor",
  name: "Square",
  grids: [grid(3, 3), grid(4, 4, [0, 0, ...Array.from({ length: 14 }, (_none, i) => i + 2)])],
};
const WIDE: Picture = { id: "phone", name: "Wide", grids: [grid(4, 2)] };

const hogzzle = createHogzzle([SQUARE, WIDE]);

// A puzzle of `picture` at `level`, reached by n then f from the other picture
const puzzle = (picture: number, level: number, streak = 0): HogzzleState => {
  const other = { ...hogzzle.init(SEED), picture: (picture + 1) % 2, level: 0 };
  const shown = hogzzle.onControl(other, "picture");
  const leveled = Array.from({ length: level }).reduce<HogzzleState>(
    (s) => hogzzle.onControl(s, "level"),
    shown,
  );
  return { ...leveled, streak };
};

const pickAt = (s: HogzzleState, slot: number) => hogzzle.onControl({ ...s, cursor: slot }, "pick");

// Puts every piece back in its own slot through pick and swap
const solve = (s: HogzzleState): HogzzleState =>
  s.slots.reduce((acc, _piece, slot) => {
    const from = acc.slots.indexOf(slot);
    return from === slot ? acc : pickAt(pickAt(acc, slot), from);
  }, s);

test("a game starts shuffled at the easiest level, cursor on the first tile", () => {
  const s = hogzzle.init(SEED);
  expect(s).toMatchObject({ level: 0, cursor: 0, picked: null, swaps: 0, streak: 0 });
  expect(s.slots.some((piece, slot) => piece !== slot)).toBe(true);
  expect(hogzzle.status(s)).toMatchObject({ phase: "playing", score: 0 });
});

test("the status line names the picture, the grid and the swaps", () => {
  const s = puzzle(1, 0);
  expect(hogzzle.status(s).line).toBe("Wide · 4×2 · 0 swaps");
  expect(hogzzle.status(pickAt(pickAt(s, 0), 1)).line).toBe("Wide · 4×2 · 1 swap");
});

test("the same seed deals the same puzzle", () => {
  expect(hogzzle.init(42)).toEqual(hogzzle.init(42));
  expect(hogzzle.init(42)).not.toEqual(hogzzle.init(43));
});

test("a shuffle never looks solved, even with most tiles alike", () => {
  const alike: Picture = {
    id: "diary",
    name: "Alike",
    grids: [grid(3, 3, [0, 0, 0, 0, 0, 0, 0, 7, 8])],
  };
  const games = [createHogzzle([alike]), createHogzzle(PICTURES)];
  for (const game of games) {
    for (let seed = 0; seed < 300; seed++) {
      expect(game.status(game.init(seed)).phase).toBe("playing");
    }
  }
});

test("every picture's shuffle keeps each piece exactly once", () => {
  const game = createHogzzle(PICTURES);
  let s = game.init(SEED);
  for (let i = 0; i < 20; i++) {
    const sorted = [...s.slots].sort((a, b) => a - b);
    expect(sorted).toEqual(s.slots.map((_piece, k) => k));
    s = game.onControl(s, i % 3 === 0 ? "picture" : "level");
  }
});

test("the cursor moves with w a s d and stops at the edges", () => {
  const s = puzzle(1, 0);
  const press = (ids: string[]) => ids.reduce(hogzzle.onControl, s).cursor;
  expect(press(["up", "left"])).toBe(0);
  expect(press(["right", "right", "right", "right", "right"])).toBe(3);
  expect(press(["down", "down"])).toBe(4);
  expect(press(["down", "right", "right"])).toBe(6);
});

test("e picks a tile, e on another swaps them, e on the same drops the pick", () => {
  const s = puzzle(0, 0);
  const picked = pickAt(s, 0);
  expect(picked.picked).toBe(0);
  expect(pickAt(picked, 0)).toEqual({ ...picked, picked: null });

  const swapped = pickAt(picked, 4);
  expect(swapped.slots[0]).toBe(s.slots[4]);
  expect(swapped.slots[4]).toBe(s.slots[0]);
  expect(swapped).toMatchObject({ picked: null, swaps: 1, cursor: 4 });
});

test("putting every tile back solves the puzzle and locks the tiles", () => {
  const solved = solve(puzzle(0, 0, 2));
  expect(solved.slots).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  expect(hogzzle.status(solved)).toEqual({
    phase: "won",
    score: 3,
    line: `Square · 3×3 · Solved in ${solved.swaps} swaps`,
  });
  for (const id of ["up", "left", "down", "right", "pick"]) {
    expect(hogzzle.onControl(solved, id)).toBe(solved);
  }
  expect(hogzzle.board(solved)).toMatchObject({ isSolved: true });
});

test("two tiles that look the same count as solved in each other's slot", () => {
  const s = solve(puzzle(0, 1));
  const crossed = { ...s, slots: [1, 0, ...s.slots.slice(2)], streak: 0 };
  expect(hogzzle.status(crossed).phase).toBe("won");
  expect(hogzzle.status({ ...s, slots: [2, 1, 0, ...s.slots.slice(3)] }).phase).toBe("playing");
});

test("f goes to the next level and back to the easiest after the hardest", () => {
  const s = puzzle(0, 0);
  const harder = hogzzle.onControl(s, "level");
  expect(hogzzle.board(harder)).toMatchObject({ columns: 4, rows: 4, isSolved: false });
  expect(harder).toMatchObject({ level: 1, swaps: 0, cursor: 0 });
  expect(hogzzle.onControl(harder, "level").level).toBe(0);
});

test("n goes to the next picture, its hardest level when it has fewer", () => {
  const s = hogzzle.onControl(puzzle(0, 1), "picture");
  expect(s).toMatchObject({ picture: 1, level: 0 });
  const back = hogzzle.onControl(s, "picture");
  expect(back).toMatchObject({ picture: 0, level: 0 });
  expect(hogzzle.onControl(puzzle(1, 0), "picture")).toMatchObject({ picture: 0, level: 0 });
});

test("n, f and r on an unsolved puzzle end the streak; after a win they keep it", () => {
  const playing = puzzle(0, 0, 4);
  const won = solve(playing);
  for (const id of ["picture", "level"]) {
    expect(hogzzle.onControl(playing, id).streak).toBe(0);
    expect(hogzzle.onControl(won, id).streak).toBe(5);
  }
  expect(hogzzle.restart?.(playing, SEED).streak).toBe(0);
  expect(hogzzle.restart?.(won, SEED).streak).toBe(5);
});

test("r deals a random picture at the current level when it has it", () => {
  const levels = Array.from({ length: 40 }, (_none, seed) => hogzzle.restart?.(puzzle(0, 1), seed));
  const pictures = new Set(levels.map((s) => s?.picture));
  expect(pictures).toEqual(new Set([0, 1]));
  for (const s of levels) expect(s?.level).toBe(s?.picture === 0 ? 1 : 0);
});

test("the board shows the slots, the cursor and the pick", () => {
  const s = hogzzle.onControl(pickAt(puzzle(1, 0), 2), "down");
  expect(hogzzle.board(s)).toEqual({
    picture: "phone",
    columns: 4,
    rows: 2,
    slots: s.slots,
    cursor: 6,
    picked: 2,
    isSolved: false,
  });
});
