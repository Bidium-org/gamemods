import { expect, test } from "claude-code/testing";
import { COLORS, type EchoState, echo } from "../../../src/games/echo/echo";
import { SEED } from "../../fixtures/engine";
import { ticks, ticksUntilAnswer, toAnswer } from "./fixture";

const LEAD = 8;
const ANSWER = 300;

// Selects `cell`, the cursor moved there directly
const selectAt = (s: EchoState, cell: number) => echo.onControl({ ...s, cursor: cell }, "select");

// Watches the playback, then repeats it
const passRound = (s: EchoState) => toAnswer(s).sequence.reduce(selectAt, toAnswer(s));

const passRounds = (n: number, s = echo.init(SEED)) =>
  Array.from({ length: n }).reduce<EchoState>((acc) => passRound(acc), s);

const side = (s: EchoState) => echo.board(s).rows.length;

const bgAt = (s: EchoState, cell: number) => echo.board(s).rows.flat()[cell]?.bg;

// A cell of the grid that is not `cell`
const otherThan = (cell: number) => (cell === 0 ? 1 : 0);

test("a game starts on 2×2 with one step to watch, score zero", () => {
  const s = echo.init(SEED);
  expect(side(s)).toBe(2);
  expect(s.sequence).toHaveLength(1);
  expect(s.cursor).toBe(0);
  expect(echo.status(s)).toEqual({ phase: "playing", score: 0, line: "Watch · round 1 · 2×2" });
});

test("the same seed plays the same game", () => {
  expect(passRounds(5).sequence).toEqual(passRounds(5).sequence);
});

test("a step is lit 400 ms then dark 200 ms, after the lead-in", () => {
  const s = echo.init(SEED);
  const [first] = s.sequence;
  if (first === undefined) throw new Error("empty sequence");
  expect(bgAt(ticks(s, LEAD - 1), first)).not.toBe(COLORS.lit);
  expect(bgAt(ticks(s, LEAD), first)).toBe(COLORS.lit);
  expect(bgAt(ticks(s, LEAD + 3), first)).toBe(COLORS.lit);
  expect(bgAt(ticks(s, LEAD + 4), first)).not.toBe(COLORS.lit);
  expect(ticksUntilAnswer(s).count).toBe(LEAD + 6);
});

test("input is ignored and the cursor hidden during the playback", () => {
  const s = echo.init(SEED);
  for (const id of ["select", "right", "down"]) {
    expect(echo.onControl(s, id)).toBe(s);
  }
  expect(bgAt(s, s.cursor)).toBe(COLORS.tile);
  expect(bgAt(toAnswer(s), s.cursor)).toBe(COLORS.cursor);
});

test("the cursor moves with w a s d, stops at the edges, and e selects under it", () => {
  const s = toAnswer(echo.init(SEED));
  const press = (state: EchoState, ids: string[]) => ids.reduce(echo.onControl, state);
  expect(press(s, ["up", "left"]).cursor).toBe(0);
  expect(press(s, ["right", "right", "down", "down"]).cursor).toBe(3);
  const [first = 0] = s.sequence;
  expect(press({ ...s, cursor: first }, ["select"]).round).toBe(2);
});

test("on the same grid the sequence keeps its steps and gains one", () => {
  const one = toAnswer(echo.init(SEED));
  const two = passRound(one);
  expect(two.round).toBe(2);
  expect(two.sequence).toHaveLength(2);
  expect(two.sequence.slice(0, 1)).toEqual(one.sequence);
  expect(echo.status(two).score).toBe(1);
});

test("the grid splits every 3 rounds passed, with a new sequence, up to 6×6", () => {
  const sides = [0, 3, 6, 9, 12, 15].map((passed) => side(passRounds(passed)));
  expect(sides).toEqual([2, 3, 4, 5, 6, 6]);

  const split = passRounds(3);
  expect(split.round).toBe(4);
  expect(split.sequence).toHaveLength(4);
  expect(split.sequence.every((cell) => cell < 9)).toBe(true);
  expect(echo.status(split).line).toBe("Watch · round 4 · 3×3");
});

test("the cursor goes back top-left when the grid splits", () => {
  const beforeSplit = toAnswer(passRounds(2));
  const last = beforeSplit.sequence.at(-1) ?? 0;
  const ready = { ...beforeSplit, cursor: last };
  expect(passRound(ready).cursor).toBe(0);
});

test("on the largest grid every 3 rounds speed up the playback, down to a floor", () => {
  // Steps of 600, 500, then 300 ms from the 6×6 grid on
  const playback = (passed: number) => ticksUntilAnswer(passRounds(passed)).count - LEAD;
  expect(playback(12)).toBe(13 * 6);
  expect(playback(15)).toBe(16 * 5);
  expect(playback(18)).toBe(19 * 3);
  expect(playback(21)).toBe(22 * 3);
});

test("a selected cell lights up briefly", () => {
  const s = passRounds(1);
  const answering = toAnswer(s);
  const [first = 0] = answering.sequence;
  const selected = selectAt(answering, first);
  expect(bgAt(selected, first)).toBe(COLORS.lit);
  expect(bgAt(ticks(selected, 3), first)).not.toBe(COLORS.lit);
});

test("a wrong cell ends the game and shows the expected cell in red", () => {
  const s = toAnswer(passRounds(2));
  const [expected = 0] = s.sequence;
  const over = selectAt(s, otherThan(expected));
  expect(echo.status(over)).toEqual({
    phase: "lost",
    score: 2,
    line: "Wrong cell · round 3 · 2×2",
  });
  expect(bgAt(over, expected)).toBe(COLORS.wrong);
  expect(echo.onControl(over, "select")).toBe(over);
  expect(echo.tick?.(over)).toBe(over);
});

test("the answer has 30 seconds, then the game ends on the next expected cell", () => {
  const s = toAnswer(echo.init(SEED));
  expect(echo.status(s).line).toBe("Your turn · 30s · round 1 · 2×2");
  expect(echo.status(ticks(s, ANSWER - 1)).line).toBe("Your turn · 1s · round 1 · 2×2");
  const late = ticks(s, ANSWER);
  expect(echo.status(late)).toMatchObject({ phase: "lost", line: "Time's up · round 1 · 2×2" });
  expect(bgAt(late, s.sequence[0] ?? 0)).toBe(COLORS.wrong);
});

test("a selection does not reset the 30 seconds", () => {
  const s = toAnswer(passRounds(1));
  const [first = 0, second = 0] = s.sequence;
  const oneGiven = selectAt(ticks(s, 100), first);
  const late = ticks(oneGiven, ANSWER - 100);
  expect(late.moment).toEqual({ kind: "over", reason: "timeout", expected: second });
});

test("resuming mid-round replays from the first step with a full answer time", () => {
  const s = toAnswer(passRounds(1));
  const [first = 0] = s.sequence;
  const halfway = selectAt(ticks(s, 200), first);
  const resumed = echo.resume?.(halfway) ?? halfway;
  expect(resumed.moment).toEqual({ kind: "watch", at: -LEAD });
  expect(ticksUntilAnswer(resumed).s.moment).toEqual({ kind: "answer", given: 0, left: ANSWER });
});

test("resuming an ended game changes nothing", () => {
  const s = toAnswer(echo.init(SEED));
  const over = selectAt(s, otherThan(s.sequence[0] ?? 0));
  expect(echo.resume?.(over)).toBe(over);
});
