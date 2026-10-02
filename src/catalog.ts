export type GameId = "morpion" | "snake" | "tetris" | "sudoku";

export type CatalogEntry = {
  id: GameId;
  name: string;
  tagline: string;
  status: "available" | "soon";
};

export const CATALOG: readonly CatalogEntry[] = [
  { id: "morpion", name: "Morpion", tagline: "Three in a row against a bot", status: "soon" },
  { id: "snake", name: "Snake", tagline: "Eat the apples, avoid the walls", status: "soon" },
  { id: "tetris", name: "Tetris", tagline: "Stack the pieces, clear the lines", status: "soon" },
  { id: "sudoku", name: "Sudoku", tagline: "Fill the grid with 1 to 9", status: "soon" },
];
