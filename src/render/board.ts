import type { JsonValue, RenderElement, RenderSurface } from "claude-code";
import { cellBoard } from "../games/2048/cells";
import { tilesSvg } from "../games/2048/svg";
import { type ClientElements, tilesClient } from "../games/2048/terminal";
import type { Board } from "../games/game";
import { boardSvg, type SvgElements } from "../games/hogzzle/svg";
import { boardText, type TextElements } from "./text";

// Every surface has the text elements; only the remote ones have Svg, the terminal Client
export type BoardElements = TextElements & Partial<SvgElements> & Partial<ClientElements>;

// What the session adds to a board: each renderer reads only what it needs
export type Draw = {
  dimmed: boolean;
  // The game's `Play.motion` while it plays, null once settled
  motion: JsonValue;
  moveId: number;
  // The pane cells left around the board, so a renderer can fit in them
  room: { columns: number; rows: number };
};

// The board as the surface draws it; null when the surface has no renderer for its kind
export function drawBoard(
  els: BoardElements,
  surface: RenderSurface,
  board: Board,
  draw: Draw,
): RenderElement | null {
  switch (board.kind) {
    case "cells":
      return boardText(els, board, draw);
    case "picture":
      return surface !== "terminal" && els.Svg ? boardSvg({ Svg: els.Svg }, board, draw) : null;
    case "tiles":
      // Desktop's table has a Client too, but it never loads there
      if (surface === "terminal" && els.Client)
        return tilesClient({ Client: els.Client }, board, draw);
      if (surface !== "terminal" && els.Svg) return tilesSvg({ Svg: els.Svg }, board, draw);
      return boardText(els, cellBoard(board.grid), draw);
  }
}
