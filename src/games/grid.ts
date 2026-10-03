import type { Control } from "./game";

export const MOVES: Control[] = [
  { id: "up", label: "Up", hotkey: "w" },
  { id: "left", label: "Left", hotkey: "a" },
  { id: "down", label: "Down", hotkey: "s" },
  { id: "right", label: "Right", hotkey: "d" },
];

// A cursor over a grid read row by row, moved by one of MOVES; it stops at the edges
export const moveCursor = (cursor: number, id: string, columns: number, rows: number): number => {
  const row = Math.floor(cursor / columns);
  const col = cursor % columns;
  if (id === "up" && row > 0) return cursor - columns;
  if (id === "down" && row < rows - 1) return cursor + columns;
  if (id === "left" && col > 0) return cursor - 1;
  if (id === "right" && col < columns - 1) return cursor + 1;
  return cursor;
};
