import type { Grid } from "./rules";

// Drawn as tiles that slide: an `Svg` on Desktop, a `Client` on terminal, cells elsewhere
export type TileBoard = { kind: "tiles"; grid: Grid; score: number };
