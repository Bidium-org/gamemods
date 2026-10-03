import type { RenderElement, RenderSurface } from "claude-code";
import type { Board } from "../games/game";
import { boardSvg, type SvgElements } from "../games/hogzzle/svg";
import { boardText, type CellBoardOptions, type TextElements } from "./text";

// Every surface has the text elements; only the remote ones have Svg
export type BoardElements = TextElements & Partial<SvgElements>;

// The board as the surface draws it; null when the surface has no renderer for its kind
export function drawBoard(
  els: BoardElements,
  surface: RenderSurface,
  board: Board,
  { dimmed, onPress }: { dimmed: boolean } & Pick<CellBoardOptions, "onPress">,
): RenderElement | null {
  switch (board.kind) {
    case "cells":
      return boardText(els, board, { dimmed, onPress });
    case "picture":
      return surface !== "terminal" && els.Svg
        ? boardSvg({ Svg: els.Svg }, board, { dimmed })
        : null;
  }
}
