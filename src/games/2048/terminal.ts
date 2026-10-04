import type { ElementTable, RenderElement } from "claude-code";
import type { Draw } from "../game";
import type { TileBoard } from "./board";
import type { BoardProps } from "./client";
import type { Motion } from "./rules";

export type ClientElements = Pick<ElementTable<"terminal">, "Client">;

// `module` is read off this file's source: a literal, relative to this file
export const tilesClient = (
  { Client }: ClientElements,
  board: TileBoard,
  { dimmed, motion, moveId, room }: Draw<Motion>,
): RenderElement =>
  Client({
    key: "board-2048",
    module: "./client.ts",
    props: {
      grid: board.grid,
      motion,
      moveId,
      rows: room.rows,
      dimmed,
    } satisfies BoardProps,
  });
