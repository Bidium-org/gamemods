import type { ClientModule, ClientSurface } from "claude-code";
import { digitColor, mix, PALETTE, tileFill, vivid } from "./palette";
import type { Grid, Motion, Position } from "./rules";

const TICK_MS = 25;
const SLIDE_MS = 100;
const APPEAR_MS = 200;
export const GAIN_MS = 600;

const SIZE = 4;
const TILE_WIDTH = 8;
const TILE_GAP = 1;
const GAIN_ROWS = 1;
const DIM = 0.6;

type Layout = { tileHeight: number; rowGap: number };

const COMPACT: Layout = { tileHeight: 1, rowGap: 0 };

const LAYOUTS: Layout[] = [{ tileHeight: 3, rowGap: 1 }, { tileHeight: 3, rowGap: 0 }, COMPACT];

export const layoutHeight = ({ tileHeight, rowGap }: Layout): number =>
  GAIN_ROWS + SIZE * tileHeight + (SIZE - 1) * rowGap;

export const fitLayout = (rows: number): Layout =>
  LAYOUTS.find((layout) => layoutHeight(layout) <= rows) ?? COMPACT;

export type BoardProps = {
  grid: Grid;
  motion: Motion | null;
  moveId: number;
  rows: number;
  dimmed: boolean;
};

type Animation = { motion: Motion; elapsed: number };

type State = { moveId: number; animation?: Animation };

// State changes only on mount, a new moveId or a tick: the engine unmounts a render loop
function start(surface: ClientSurface<State>, moveId: number): State {
  const state: State = { moveId };
  surface.setState(state);
  surface.every(TICK_MS, () => {
    const current = surface.state;
    if (!current?.animation) return;
    const elapsed = current.animation.elapsed + TICK_MS;
    surface.setState(
      elapsed < GAIN_MS
        ? { ...current, animation: { ...current.animation, elapsed } }
        : { moveId: current.moveId },
    );
  });
  return state;
}

function follow(surface: ClientSurface<State>, state: State, props: BoardProps): State {
  if (props.moveId === state.moveId) return state;
  const next: State = props.motion
    ? { moveId: props.moveId, animation: { motion: props.motion, elapsed: 0 } }
    : { moveId: props.moveId };
  surface.setState(next);
  return next;
}

const progress = (elapsed: number, from: number, duration: number) =>
  Math.min(Math.max((elapsed - from) / duration, 0), 1);

const isAt = (a: Position, b: Position) => a.row === b.row && a.col === b.col;

type Look = { background: string; digit: string };

function tileLook(value: number, at: Position, animation: Animation | undefined): Look {
  const background = value === 0 ? PALETTE.empty : tileFill(value);
  const digit = digitColor(background);
  const appeared = animation ? progress(animation.elapsed, SLIDE_MS, APPEAR_MS) : 1;
  if (!animation || appeared >= 1) return { background, digit };
  const { spawned, merges } = animation.motion;
  if (spawned && isAt(spawned.at, at)) {
    return {
      background: mix(PALETTE.empty, background, appeared),
      digit: mix(PALETTE.empty, digit, appeared),
    };
  }
  if (merges.some((merge) => isAt(merge.at, at))) {
    const popped = mix(vivid(background), background, appeared);
    return { background: popped, digit: digitColor(popped) };
  }
  return { background, digit };
}

const Board: ClientModule<BoardProps, State> = (props, surface) => {
  const { Box, Text } = surface.elements;
  const state = follow(surface, surface.state ?? start(surface, props.moveId), props);
  const animation = props.motion ? state.animation : undefined;
  const elapsed = animation?.elapsed ?? GAIN_MS;
  const slid = progress(elapsed, 0, SLIDE_MS);
  const isSliding = animation !== undefined && slid < 1;
  const gain = animation?.motion.gain ?? 0;
  const { tileHeight, rowGap } = fitLayout(props.rows);
  const shade = (color: string) => (props.dimmed ? mix(color, PALETTE.board, DIM) : color);

  const tile = (value: number, look: Look, offset?: { top: number; left: number }) =>
    Box({
      width: TILE_WIDTH,
      height: tileHeight,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: shade(look.background),
      ...(offset && { position: "absolute" as const, ...offset }),
      children: value
        ? [Text({ bold: true, color: shade(look.digit), children: [String(value)] })]
        : [],
    });

  const along = (from: number, to: number, step: number) =>
    Math.round((from + (to - from) * slid) * step);

  const rows = props.grid.map((values, row) =>
    Box({
      key: `row-${row}`,
      flexDirection: "row",
      columnGap: TILE_GAP,
      children: values.map((value, col) => {
        const shown = isSliding ? 0 : value;
        return tile(shown, tileLook(shown, { row, col }, animation));
      }),
    }),
  );
  const sliding = isSliding
    ? animation.motion.slides.map(({ from, to, value }) =>
        tile(value, tileLook(value, from, undefined), {
          top: along(from.row, to.row, tileHeight + rowGap),
          left: along(from.col, to.col, TILE_WIDTH + TILE_GAP),
        }),
      )
    : [];

  return Box({
    flexDirection: "column",
    backgroundColor: PALETTE.board,
    children: [
      Box({
        height: GAIN_ROWS,
        justifyContent: "flex-end",
        children:
          gain > 0
            ? [
                Text({
                  bold: true,
                  color: mix(PALETTE.gain, PALETTE.board, progress(elapsed, 0, GAIN_MS)),
                  children: [`+${gain}`],
                }),
              ]
            : [],
      }),
      Box({ flexDirection: "column", rowGap, children: [...rows, ...sliding] }),
    ],
  });
};

export default Board;
