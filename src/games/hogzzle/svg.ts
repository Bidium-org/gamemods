import type { RenderElement } from "claude-code";
import type { SvgElements } from "../game";
import type { PictureBoard } from "./board";
import { PICTURE_IMAGES } from "./images.gen";

// The types give Svg no `key`, yet Desktop reads one: it keeps the first drawing of a key
type KeyedSvg = (props: Parameters<SvgElements["Svg"]>[0] & { key: string }) => RenderElement;

// The engine refuses a longer source
export const SVG_MAX = 131_072;
// CSS pixels; the Desktop dock pane fits 300
const DRAW_WIDTH = 300;

const COLORS = {
  background: "#ffffff",
  grid: "#000000",
  cursor: "#ffcc00",
  picked: "#00b4ff",
  solved: "#2ecc40",
  pause: "#000000",
};

// FNV-1a: Desktop keeps the first drawing of an Svg key whatever its source becomes, and a counter
// replays old drawings after /reload-plugins, so the key comes from the source itself
const hash = (text: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16);
};

const num = (x: number) => Math.round(x * 100) / 100;

const rect = (attrs: Record<string, number | string>) =>
  `<rect ${Object.entries(attrs)
    .map(([k, v]) => `${k}="${typeof v === "number" ? num(v) : v}"`)
    .join(" ")}/>`;

// The picture once in <defs>; each slot is a nested <svg> whose viewBox shows its piece
export function pictureSource(board: PictureBoard, { dimmed = false } = {}): string {
  const { href, width: w, height: h } = PICTURE_IMAGES[board.picture];
  const { columns, rows } = board;
  const tw = w / columns;
  const th = h / rows;
  const line = w / DRAW_WIDTH;
  const origin = (i: number) => ({ x: (i % columns) * tw, y: Math.floor(i / columns) * th });

  const tiles = board.slots.map((piece, slot) => {
    const at = origin(slot);
    const from = origin(piece);
    return `<svg x="${num(at.x)}" y="${num(at.y)}" width="${num(tw)}" height="${num(th)}" viewBox="${num(from.x)} ${num(from.y)} ${num(tw)} ${num(th)}"><use href="#p"/></svg>`;
  });
  const inset = (i: number, by: number) => {
    const at = origin(i);
    return { x: at.x + by, y: at.y + by, width: tw - by * 2, height: th - by * 2 };
  };
  const mark = (i: number, color: string, dash: boolean) =>
    rect({
      ...inset(i, line * 2),
      fill: "none",
      stroke: color,
      "stroke-width": line * 4,
      ...(dash && { "stroke-dasharray": num(line * 8) }),
    });
  const grid = [
    ...Array.from({ length: columns - 1 }, (_none, c) => `M${num((c + 1) * tw)} 0V${h}`),
    ...Array.from({ length: rows - 1 }, (_none, r) => `M0 ${num((r + 1) * th)}H${w}`),
  ].join("");
  const marks = board.isSolved
    ? [
        rect({
          x: line * 3,
          y: line * 3,
          width: w - line * 6,
          height: h - line * 6,
          fill: "none",
          stroke: COLORS.solved,
          "stroke-width": line * 6,
        }),
      ]
    : [
        `<path d="${grid}" stroke="${COLORS.grid}" stroke-opacity=".35" stroke-width="${num(line)}"/>`,
        board.picked === null ? "" : mark(board.picked, COLORS.picked, true),
        mark(board.cursor, COLORS.cursor, false),
      ];
  const veil = dimmed
    ? rect({ width: w, height: h, fill: COLORS.pause, "fill-opacity": ".55" })
    : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">`,
    `<defs><image id="p" width="${w}" height="${h}" href="${href}"/></defs>`,
    rect({ width: w, height: h, fill: COLORS.background }),
    ...tiles,
    ...marks,
    veil,
    "</svg>",
  ].join("");
}

export function boardSvg(
  { Svg }: SvgElements,
  board: PictureBoard,
  { dimmed = false } = {},
): RenderElement {
  const source = pictureSource(board, { dimmed });
  const { width, height } = PICTURE_IMAGES[board.picture];
  return (Svg as KeyedSvg)({
    key: `picture-${hash(source)}`,
    alt: `Picture puzzle, ${board.columns} by ${board.rows}${board.isSolved ? ", solved" : ""}`,
    width: DRAW_WIDTH,
    height: Math.round((DRAW_WIDTH * height) / width),
    source,
  });
}
