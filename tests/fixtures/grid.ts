// The moves that take a cursor from `from` to `to` on a grid `columns` wide, read row by row:
// the inverse of `moveCursor` in src/games/grid.ts
export const movesTo = (from: number, to: number, columns: number): string[] => {
  const rows = Math.floor(to / columns) - Math.floor(from / columns);
  const cols = (to % columns) - (from % columns);
  return [
    ...Array<string>(Math.abs(rows)).fill(rows < 0 ? "up" : "down"),
    ...Array<string>(Math.abs(cols)).fill(cols < 0 ? "left" : "right"),
  ];
};
