import { expect, test } from "claude-code/testing";
import { PALETTE } from "../src/games/2048/palette";
import { type Grid, move, type Roll, type TwentyFortyEightState } from "../src/games/2048/rules";
import { tilesSource } from "../src/games/2048/svg";

const _ = 0;
const alwaysTwoFirstCell: Roll = (rng) => [0, rng];

const state = (grid: Grid, score = 0): TwentyFortyEightState => ({ grid, score, rng: 0 });

const DIGIT_HEIGHT = 0.75;

const count = (source: string, pattern: RegExp) => source.match(pattern)?.length ?? 0;

const START = state([
  [2, 2, _, 4],
  [_, _, _, _],
  [_, 8, _, _],
  [_, _, _, _],
]);

const EVERY_TILE = state([
  [2, 4, 8, 16],
  [32, 64, 128, 256],
  [512, 1024, 2048, 4096],
  [8192, 16384, 65536, 131072],
]);

test("a settled board draws one tile per filled cell and no animation", () => {
  const source = tilesSource(START.grid, null);
  expect(count(source, /url\(#lift\)/g)).toBe(4);
  expect(count(source, /@keyframes s\d+/g)).toBe(0);
  expect(count(source, /class="(show|pop|spawn)"/g)).toBe(0);
  expect(source.includes('class="gain"')).toBe(false);
});

test("a move slides every moved tile, pops merges and grows the spawn", () => {
  const { state: after, motion } = move(START, "left", alwaysTwoFirstCell);
  if (!motion) throw new Error("the move should slide");
  const source = tilesSource(after.grid, motion);
  expect(count(source, /@keyframes s\d+ /g)).toBe(motion.slides.length);
  expect(count(source, /class="spawn"/g)).toBe(1);
  expect(count(source, /class="pop"/g)).toBe(motion.merges.length);
});

test("the gain of a move floats; the score and end notices are the session's", () => {
  const { state: after, motion } = move(START, "left", alwaysTwoFirstCell);
  const source = tilesSource(after.grid, motion ?? null);
  expect(source.includes(`>+${motion?.gain}<`)).toBe(true);
  expect(source.includes("Score")).toBe(false);
  expect(tilesSource(EVERY_TILE.grid, null).includes("Game over")).toBe(false);
});

test("the board and every tile are painted from the light palette", () => {
  const source = tilesSource(EVERY_TILE.grid, null);
  const colors = [PALETTE.board, PALETTE.empty, PALETTE.super, ...Object.values(PALETTE.tiles)];
  expect(colors.filter((color) => !source.includes(color))).toEqual([]);
});

test("a full board in motion stays under the Svg source limit", () => {
  const full = tilesSource(EVERY_TILE.grid, {
    slides: EVERY_TILE.grid.flatMap((row, r) =>
      row.map((value, c) => ({ from: { row: r, col: c }, to: { row: r, col: c }, value })),
    ),
    merges: [],
    gain: 131072,
  });
  expect(full.length).toBeLessThan(131072);
});

test("the gain stays inside the image at the top of its float", () => {
  const { state: after, motion } = move(START, "left", alwaysTwoFirstCell);
  const source = tilesSource(after.grid, motion ?? null);
  const gain = source.match(/<text class="gain"[^>]* y="(\d+)"[^>]* font-size="(\d+)"/);
  const float = Number(source.match(/translateY\(-(\d+)px\)/)?.[1]);
  const [baseline, fontSize] = [Number(gain?.[1]), Number(gain?.[2])];
  expect(baseline - float).toBeGreaterThanOrEqual(fontSize * DIGIT_HEIGHT);
});

test("a pause veils the board, its tiles still drawn", () => {
  const veil = /fill-opacity=".55"/;
  expect(veil.test(tilesSource(START.grid, null))).toBe(false);
  const dimmed = tilesSource(START.grid, null, { dimmed: true });
  expect(veil.test(dimmed)).toBe(true);
  expect(count(dimmed, /url\(#lift\)/g)).toBe(4);
});
