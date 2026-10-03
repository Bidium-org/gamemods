import type { PictureId } from "./pictures.gen";

// A picture cut into `columns` × `rows` tiles. Slots and pieces are read row by row:
// `slots[i]` is the piece shown in slot i, and the picture is whole when each piece is in its slot
export type PictureBoard = {
  kind: "picture";
  picture: PictureId;
  columns: number;
  rows: number;
  slots: readonly number[];
  cursor: number;
  picked: number | null;
  isSolved: boolean;
};
