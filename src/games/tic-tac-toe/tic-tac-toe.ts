import { drawCells } from "../cells";
import type { Cell, CellBoard, Game, Phase } from "../game";
import { MOVES, moveCursor } from "../grid";
import { roll } from "../random";

type Mark = "X" | "O";

export type TicTacToeState = {
  cells: readonly (Mark | null)[];
  cursor: number;
  // Wins in a row; the score
  streak: number;
  // The bot's random source, advanced at each of its moves
  rng: number;
};

const SIDE = 3;
const CENTER = 4;
const CORNERS = [0, 2, 6, 8];
const EDGES = [1, 3, 5, 7];
const LINES: readonly [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const COLORS = {
  X: "#5fafff",
  O: "#ff8787",
  tile: "#2e2e2e",
  cursor: "#5a5a5a",
};

const winner = (cells: TicTacToeState["cells"]): Mark | null => {
  const line = LINES.find(
    ([a, b, c]) => cells[a] && cells[a] === cells[b] && cells[a] === cells[c],
  );
  return line ? (cells[line[0]] ?? null) : null;
};

const phaseOf = (cells: TicTacToeState["cells"]): Phase => {
  const mark = winner(cells);
  if (mark === "X") return "won";
  if (mark === "O") return "lost";
  return cells.every(Boolean) ? "draw" : "playing";
};

// The free cell of a line holding two of `who`
const completing = (cells: TicTacToeState["cells"], who: Mark): number | undefined => {
  for (const line of LINES) {
    const free = line.filter((i) => !cells[i]);
    if (free.length === 1 && line.filter((i) => cells[i] === who).length === 2) return free[0];
  }
  return undefined;
};

// Wins when it can; otherwise, at `mistakeRate`, any free cell; otherwise blocks, then center,
// a corner, a side
const botMove = (cells: TicTacToeState["cells"], rng: number, mistakeRate: number) => {
  const win = completing(cells, "O");
  if (win !== undefined) return { at: win, rng };
  const [mistake, afterMistake] = roll(rng);
  const [pick, next] = roll(afterMistake);
  const free = cells.flatMap((c, i) => (c ? [] : [i]));
  const at =
    mistake < mistakeRate
      ? free[Math.floor(pick * free.length)]
      : (completing(cells, "X") ?? [CENTER, ...CORNERS, ...EDGES].find((i) => !cells[i]));
  return { at, rng: next };
};

const withMark = (cells: TicTacToeState["cells"], at: number, who: Mark): TicTacToeState["cells"] =>
  cells.map((c, i) => (i === at ? who : c));

// The person's X, then the bot's O when the game goes on; the streak settles on the outcome
const place = (s: TicTacToeState, mistakeRate: number): TicTacToeState => {
  if (s.cells[s.cursor]) return s;
  const afterX = withMark(s.cells, s.cursor, "X");
  const bot = phaseOf(afterX) === "playing" ? botMove(afterX, s.rng, mistakeRate) : undefined;
  const cells = bot?.at === undefined ? afterX : withMark(afterX, bot.at, "O");
  const phase = phaseOf(cells);
  const streak = phase === "won" ? s.streak + 1 : phase === "playing" ? s.streak : 0;
  return { ...s, cells, streak, rng: bot?.rng ?? s.rng };
};

const STATUS_LINE: Record<Phase, string> = {
  playing: "Your move",
  won: "You win",
  lost: "The bot wins",
  draw: "Draw",
};

const tile = (s: TicTacToeState, i: number): Cell => {
  const who = s.cells[i];
  const isCursor = i === s.cursor && phaseOf(s.cells) === "playing";
  return {
    ch: who ?? "",
    ...(who && { fg: COLORS[who] }),
    bg: isCursor ? COLORS.cursor : COLORS.tile,
  };
};

const ROWS = [0, 1, 2].map((row) => [0, 1, 2].map((col) => row * SIDE + col));

const init = (seed: number): TicTacToeState => ({
  cells: Array(SIDE * SIDE).fill(null),
  cursor: CENTER,
  streak: 0,
  rng: seed | 0,
});

// `mistakeRate` 0 is the strict bot, beaten only by a fork
export const createTicTacToe = (mistakeRate: number): Game<TicTacToeState, CellBoard> => ({
  controls: [...MOVES, { id: "place", label: "Place", hotkey: "e" }],
  size: { columns: 24, rows: 23 },
  init,
  // A restart after a win keeps the streak; any other restart ends it
  restart: (s, seed) => ({
    ...init(seed),
    streak: phaseOf(s.cells) === "won" ? s.streak : 0,
  }),
  onControl: (s, id) => {
    if (phaseOf(s.cells) !== "playing") return s;
    return id === "place"
      ? place(s, mistakeRate)
      : { ...s, cursor: moveCursor(s.cursor, id, SIDE, SIDE) };
  },
  board: (s) => ({
    cell: { width: 5, height: 3 },
    gap: 1,
    rows: ROWS.map((row) => row.map((i) => tile(s, i))),
  }),
  render: drawCells,
  status: (s) => {
    const phase = phaseOf(s.cells);
    return { phase, score: s.streak, line: STATUS_LINE[phase] };
  },
});

export const ticTacToe = createTicTacToe(1 / 3);
