import type { Cell, CellBoard } from "../game";
import { digitColor, PALETTE, tileFill } from "./palette";
import type { Grid } from "./rules";

const tile = (value: number): Cell => {
  if (value === 0) return { ch: "", bg: PALETTE.empty };
  const fill = tileFill(value);
  return { ch: String(value), fg: digitColor(fill), bg: fill };
};

export const cellBoard = (grid: Grid): CellBoard => ({
  kind: "cells",
  cell: { width: 8, height: 3 },
  gap: 1,
  rows: grid.map((row) => row.map(tile)),
});
