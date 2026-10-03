import type { Cell, CellBoard, Game } from "../game";
import { MOVES, moveCursor } from "../grid";
import { roll } from "../random";

// Time is counted in ticks of TICK_MS
const TICK_MS = 100;
const ANSWER_TICKS = 300;
const FLASH_TICKS = 3;
// The dark lead-in before a playback: after a correct answer, at the start, on resume
const LEAD_TICKS = 8;
const ROUNDS_PER_STAGE = 3;

type Grid = { side: number; width: number; height: number };
type Speed = { lit: number; dark: number };

// One entry per grid, smallest first; tiles shrink as the grid grows. The last is the largest
const GRIDS: readonly [Grid, ...Grid[]] = [
  { side: 2, width: 11, height: 5 },
  { side: 3, width: 9, height: 5 },
  { side: 4, width: 7, height: 3 },
  { side: 5, width: 6, height: 3 },
  { side: 6, width: 5, height: 3 },
];

// Playback speeds on the largest grid, slowest first, in ticks
const SPEEDS: readonly [Speed, ...Speed[]] = [
  { lit: 4, dark: 2 },
  { lit: 3, dark: 2 },
  { lit: 2, dark: 1 },
];

const COLORS = {
  tile: "#2e2e2e",
  cursor: "#5a5a5a",
  lit: "#5fafff",
  wrong: "#ff5f5f",
};

type Moment =
  // Ticks since the playback began; negative during the lead-in
  | { kind: "watch"; at: number }
  // Steps already repeated, ticks left to repeat the rest
  | { kind: "answer"; given: number; left: number }
  | { kind: "over"; reason: "wrong" | "timeout"; expected: number };

export type EchoState = {
  // 1 at the start; the rounds passed are `round - 1`
  round: number;
  // Cell indexes on the current grid, one per step
  sequence: readonly number[];
  moment: Moment;
  cursor: number;
  // The cell last selected, lit for `left` more ticks
  flash: { cell: number; left: number } | null;
  rng: number;
};

const stage = (round: number) => Math.floor((round - 1) / ROUNDS_PER_STAGE);

// The entry at `i`, the last one past the end
const capped = <T>(list: readonly [T, ...T[]], i: number): T =>
  list[Math.min(i, list.length - 1)] ?? list[0];

const gridOf = (round: number) => capped(GRIDS, stage(round));

// Speeds up once the grid is at its largest
const speedOf = (round: number) => {
  const pastLargest = Math.max(stage(round) - (GRIDS.length - 1), 0);
  return capped(SPEEDS, pastLargest);
};

// `count` random cells of a grid of `side`, appended to `sequence`
const extend = (sequence: readonly number[], count: number, side: number, rng: number) => {
  const cells = [...sequence];
  let state = rng;
  for (let i = 0; i < count; i++) {
    const [r, next] = roll(state);
    cells.push(Math.floor(r * side * side));
    state = next;
  }
  return { sequence: cells, rng: state };
};

const watch = (): Moment => ({ kind: "watch", at: -LEAD_TICKS });

const init = (seed: number): EchoState => ({
  round: 1,
  ...extend([], 1, gridOf(1).side, seed | 0),
  moment: watch(),
  cursor: 0,
  flash: null,
});

// Same grid: one more step. A split: a new sequence on the new grid, cursor back top-left
const nextRound = (s: EchoState): EchoState => {
  const round = s.round + 1;
  const { side } = gridOf(round);
  const isSplit = side !== gridOf(s.round).side;
  const kept = isSplit ? [] : s.sequence;
  return {
    ...s,
    round,
    ...extend(kept, round - kept.length, side, s.rng),
    moment: watch(),
    ...(isSplit && { cursor: 0, flash: null }),
  };
};

const select = (s: EchoState): EchoState => {
  if (s.moment.kind !== "answer") return s;
  const cell = s.cursor;
  const expected = s.sequence[s.moment.given] ?? 0;
  if (cell !== expected) {
    return {
      ...s,
      flash: null,
      moment: { kind: "over", reason: "wrong", expected },
    };
  }
  const answered = { ...s, flash: { cell, left: FLASH_TICKS } };
  const given = s.moment.given + 1;
  return given === s.sequence.length
    ? nextRound(answered)
    : { ...answered, moment: { ...s.moment, given } };
};

const onControl = (s: EchoState, id: string): EchoState => {
  if (s.moment.kind !== "answer") return s;
  if (id === "select") return select(s);
  const { side } = gridOf(s.round);
  const cursor = moveCursor(s.cursor, id, side, side);
  return cursor === s.cursor ? s : { ...s, cursor };
};

const advanceMoment = (s: EchoState): Moment => {
  const { moment } = s;
  if (moment.kind === "watch") {
    const { lit, dark } = speedOf(s.round);
    const at = moment.at + 1;
    return at < s.sequence.length * (lit + dark)
      ? { kind: "watch", at }
      : { kind: "answer", given: 0, left: ANSWER_TICKS };
  }
  if (moment.kind === "answer") {
    const left = moment.left - 1;
    if (left > 0) return { ...moment, left };
    return {
      kind: "over",
      reason: "timeout",
      expected: s.sequence[moment.given] ?? 0,
    };
  }
  return moment;
};

const tick = (s: EchoState): EchoState => {
  if (s.moment.kind === "over") return s;
  const flash = s.flash && s.flash.left > 1 ? { ...s.flash, left: s.flash.left - 1 } : null;
  return { ...s, moment: advanceMoment(s), flash };
};

// A paused round starts over from its first step, with a full answer time
const resume = (s: EchoState): EchoState =>
  s.moment.kind === "over" ? s : { ...s, moment: watch(), flash: null };

// The cell the playback lights now, if any
const playbackCell = (s: EchoState): number | undefined => {
  if (s.moment.kind !== "watch" || s.moment.at < 0) return undefined;
  const { lit, dark } = speedOf(s.round);
  const step = Math.floor(s.moment.at / (lit + dark));
  return s.moment.at % (lit + dark) < lit ? s.sequence[step] : undefined;
};

const tile = (s: EchoState, i: number): Cell => {
  const { moment } = s;
  if (moment.kind === "over") {
    return { ch: "", bg: i === moment.expected ? COLORS.wrong : COLORS.tile };
  }
  if (i === playbackCell(s) || i === s.flash?.cell) return { ch: "", bg: COLORS.lit };
  const isCursor = moment.kind === "answer" && i === s.cursor;
  return { ch: "", bg: isCursor ? COLORS.cursor : COLORS.tile };
};

const momentLine = (s: EchoState): string => {
  const { moment } = s;
  if (moment.kind === "over") return moment.reason === "wrong" ? "Wrong cell" : "Time's up";
  if (moment.kind === "watch") return "Watch";
  return `Your turn · ${Math.ceil((moment.left * TICK_MS) / 1000)}s`;
};

export const echo: Game<EchoState, CellBoard> = {
  controls: [...MOVES, { id: "select", label: "Select", hotkey: "e" }],
  size: { columns: 37, rows: 35 },
  tickMs: TICK_MS,
  init,
  onControl,
  tick,
  resume,
  board: (s) => {
    const { side, width, height } = gridOf(s.round);
    const indexes = [...Array(side).keys()];
    return {
      kind: "cells",
      cell: { width, height },
      gap: 1,
      rows: indexes.map((row) => indexes.map((col) => tile(s, row * side + col))),
    };
  },
  status: (s) => {
    const { side } = gridOf(s.round);
    return {
      phase: s.moment.kind === "over" ? "lost" : "playing",
      score: s.round - 1,
      line: `${momentLine(s)} · round ${s.round} · ${side}×${side}`,
    };
  },
};
