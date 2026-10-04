import type { Game } from "../game";
import { MOVES, moveCursor } from "../grid";
import { roll } from "../random";
import type { PictureBoard } from "./board";
import { type Grid, PICTURES, type Picture } from "./pictures.gen";
import { boardSvg } from "./svg";

export type HogzzleState = {
  // Index in the game's pictures, and in that picture's grids
  picture: number;
  level: number;
  // `slots[i]`: the piece shown in slot i
  slots: readonly number[];
  cursor: number;
  picked: number | null;
  swaps: number;
  // Puzzles solved in a row; the score
  streak: number;
  // The shuffles' random source
  rng: number;
};

// The pictures list is fixed: an index out of it is a bug, not a state to draw
const nth = <T>(list: readonly T[], i: number): T => {
  const item = list[i];
  if (item === undefined) throw new Error(`no item ${i} in a list of ${list.length}`);
  return item;
};

// Each slot shows its own piece or one that looks the same
const looksSolved = ({ looks }: Grid, slots: readonly number[]): boolean =>
  slots.every((piece, slot) => looks[piece] === looks[slot]);

const swap = (slots: readonly number[], a: number, b: number): number[] =>
  slots.map((piece, i) => (i === a ? nth(slots, b) : i === b ? nth(slots, a) : piece));

// Fisher-Yates; a result that looks solved gets two different-looking pieces swapped
const shuffle = (grid: Grid, rng: number): { slots: number[]; rng: number } => {
  let slots = grid.looks.map((_look, i) => i);
  let next = rng;
  for (let i = slots.length - 1; i > 0; i--) {
    const [r, after] = roll(next);
    next = after;
    slots = swap(slots, i, Math.floor(r * (i + 1)));
  }
  if (looksSolved(grid, slots)) {
    const other = slots.findIndex((piece) => grid.looks[piece] !== grid.looks[nth(slots, 0)]);
    if (other > 0) slots = swap(slots, 0, other);
  }
  return { slots, rng: next };
};

export const createHogzzle = (pictures: readonly Picture[]): Game<HogzzleState, PictureBoard> => {
  const pictureOf = (s: HogzzleState) => nth(pictures, s.picture);
  const gridOf = (s: HogzzleState) => nth(pictureOf(s).grids, s.level);
  const isSolved = (s: HogzzleState) => looksSolved(gridOf(s), s.slots);

  // A fresh shuffle of `picture`, at `level` or that picture's hardest when it has fewer
  const puzzle = (picture: number, level: number, streak: number, rng: number): HogzzleState => {
    const grids = nth(pictures, picture).grids;
    const at = Math.min(level, grids.length - 1);
    const shuffled = shuffle(nth(grids, at), rng);
    return {
      picture,
      level: at,
      slots: shuffled.slots,
      cursor: 0,
      picked: null,
      swaps: 0,
      streak,
      rng: shuffled.rng,
    };
  };

  const randomPuzzle = (level: number, streak: number, rng: number) => {
    const [r, next] = roll(rng);
    return puzzle(Math.floor(r * pictures.length), level, streak, next);
  };

  // Leaving an unsolved puzzle gives it up and ends the streak
  const keptStreak = (s: HogzzleState) => (isSolved(s) ? s.streak : 0);

  const pick = (s: HogzzleState): HogzzleState => {
    if (s.picked === null) return { ...s, picked: s.cursor };
    if (s.picked === s.cursor) return { ...s, picked: null };
    const next = {
      ...s,
      slots: swap(s.slots, s.picked, s.cursor),
      picked: null,
      swaps: s.swaps + 1,
    };
    return isSolved(next) ? { ...next, streak: s.streak + 1 } : next;
  };

  return {
    controls: [
      ...MOVES,
      { id: "pick", label: "Pick", hotkey: "e" },
      { id: "picture", label: "Next picture", hotkey: "n" },
      { id: "level", label: "Next level", hotkey: "f" },
    ],
    size: { columns: 24, rows: 23 },
    init: (seed) => randomPuzzle(0, 0, seed | 0),
    restart: (s, seed) => randomPuzzle(s.level, keptStreak(s), seed | 0),
    onControl: (s, id) => {
      if (id === "picture") {
        return puzzle((s.picture + 1) % pictures.length, s.level, keptStreak(s), s.rng);
      }
      if (id === "level") {
        const levels = pictureOf(s).grids.length;
        return puzzle(s.picture, (s.level + 1) % levels, keptStreak(s), s.rng);
      }
      // Solved: the tiles no longer move
      if (isSolved(s)) return s;
      if (id === "pick") return pick(s);
      const { columns, rows } = gridOf(s);
      const cursor = moveCursor(s.cursor, id, columns, rows);
      return cursor === s.cursor ? s : { ...s, cursor };
    },
    board: (s) => {
      const { columns, rows } = gridOf(s);
      return {
        picture: pictureOf(s).id,
        columns,
        rows,
        slots: s.slots,
        cursor: s.cursor,
        picked: s.picked,
        isSolved: isSolved(s),
      };
    },
    // A picture only an `Svg` draws: none on terminal yet
    render: ({ Svg }, board, draw) => (Svg ? boardSvg({ Svg }, board, draw) : null),
    status: (s) => {
      const { columns, rows } = gridOf(s);
      const swaps = `${s.swaps} ${s.swaps === 1 ? "swap" : "swaps"}`;
      const solved = isSolved(s);
      return {
        phase: solved ? "won" : "playing",
        score: s.streak,
        line: [pictureOf(s).name, `${columns}×${rows}`, solved ? `Solved in ${swaps}` : swaps].join(
          " · ",
        ),
      };
    },
  };
};

export const hogzzle = createHogzzle(PICTURES);
