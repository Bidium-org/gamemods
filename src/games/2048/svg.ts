import type { ElementTable, RenderElement } from "claude-code";
import type { Draw } from "../../render/board";
import type { TileBoard } from "./board";
import { digitColor, PALETTE, tileFill } from "./palette";
import type { Grid, Motion, Position } from "./rules";

export type SvgElements = Pick<ElementTable<"desktop">, "Svg">;

const SIZE = 90;
const GAP = 12;
const BOARD = 4 * SIZE + 5 * GAP;
const GAIN_ROOM = 50;

const SVG_WIDTH = BOARD;
const SVG_HEIGHT = BOARD + GAIN_ROOM;

const DELAY_MS = 150;
const SLIDE_MS = 120;
const APPEAR_MS = 200;
const GAIN_MS = 600;

export const ANIMATION_MS = DELAY_MS + SLIDE_MS + Math.max(APPEAR_MS, GAIN_MS);

const FONT_SIZES = [42, 42, 36, 30, 26, 22];

const offset = (index: number) => GAP + index * (SIZE + GAP);
const at = ({ row, col }: Position) => `${offset(col)}px, ${offset(row) + GAIN_ROOM}px`;

const isAt = (a: Position, b: Position) => a.row === b.row && a.col === b.col;

function tile(value: number): string {
  const fill = tileFill(value);
  const fontSize = FONT_SIZES[String(value).length - 1] ?? 18;
  return `<g filter="url(#lift)"><rect width="${SIZE}" height="${SIZE}" rx="12" fill="${fill}"/></g>
<text x="${SIZE / 2}" y="${SIZE / 2}" dy="0.35em" text-anchor="middle" font-size="${fontSize}" font-weight="800" fill="${digitColor(fill)}">${value}</text>`;
}

const placed = (position: Position, body: string, className: string) =>
  `<g style="transform: translate(${at(position)})"><g class="${className}">${body}</g></g>`;

const effect = (position: Position, motion: Motion | null): string => {
  if (!motion) return "";
  if (motion.spawned && isAt(motion.spawned.at, position)) return "spawn";
  return motion.merges.some((merge) => isAt(merge.at, position)) ? "pop" : "show";
};

export function tilesSource(grid: Grid, motion: Motion | null, { dimmed = false } = {}): string {
  const settle = motion ? DELAY_MS + SLIDE_MS : 0;
  const slides = motion?.slides ?? [];
  const keyframes = slides.map(
    ({ from, to }, i) =>
      `@keyframes s${i} { from { transform: translate(${at(from)}) } to { transform: translate(${at(to)}) } }`,
  );
  const sliding = slides.map(
    ({ value }, i) =>
      `<g style="animation: s${i} ${SLIDE_MS}ms ease-out ${DELAY_MS}ms both, hide 1ms linear ${settle}ms forwards">${tile(value)}</g>`,
  );
  const tiles = grid.flatMap((values, row) =>
    values.flatMap((value, col) =>
      value === 0 ? [] : [placed({ row, col }, tile(value), effect({ row, col }, motion))],
    ),
  );
  const cells = [0, 1, 2, 3].flatMap((row) =>
    [0, 1, 2, 3].map(
      (col) =>
        `<rect x="${offset(col)}" y="${offset(row) + GAIN_ROOM}" width="${SIZE}" height="${SIZE}" rx="10" fill="${PALETTE.empty}"/>`,
    ),
  );
  const gain = motion?.gain ?? 0;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" font-family="ui-rounded, 'SF Pro Rounded', Nunito, system-ui, sans-serif">
<style>
${keyframes.join("\n")}
@keyframes hide { to { opacity: 0 } }
@keyframes show { from { opacity: 0 } to { opacity: 1 } }
@keyframes pop { 0% { transform: scale(1.18) } 100% { transform: scale(1) } }
@keyframes spawn { from { opacity: 0; transform: scale(0.3) } to { opacity: 1; transform: scale(1) } }
@keyframes gain { from { opacity: 1; transform: translateY(0) } to { opacity: 0; transform: translateY(-18px) } }
.show, .pop, .spawn { transform-box: fill-box; transform-origin: center }
.show { animation: show 1ms linear ${settle}ms both }
.pop { animation: show 1ms linear ${settle}ms both, pop ${APPEAR_MS}ms ease-out ${settle}ms both }
.spawn { animation: spawn ${APPEAR_MS}ms ease-out ${settle}ms both }
.gain { animation: gain ${GAIN_MS}ms ease-out ${DELAY_MS}ms both }
</style>
<defs><filter id="lift" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="${PALETTE.shadow}" flood-opacity="0.25"/></filter></defs>
${gain > 0 ? `<text class="gain" x="${SVG_WIDTH - 4}" y="${GAIN_ROOM - 10}" text-anchor="end" font-size="26" font-weight="800" fill="${PALETTE.gain}">+${gain}</text>` : ""}
<rect y="${GAIN_ROOM}" width="${BOARD}" height="${BOARD}" rx="20" fill="${PALETTE.board}"/>
${cells.join("\n")}
${sliding.join("\n")}
${tiles.join("\n")}
${dimmed ? `<rect y="${GAIN_ROOM}" width="${BOARD}" height="${BOARD}" rx="20" fill="${PALETTE.veil}" fill-opacity=".55"/>` : ""}
</svg>`;
}

// Unkeyed: Desktop 2.19675.0 redrew an unkeyed Svg at each new source, unlike a keyed one
export const tilesSvg = (
  { Svg }: SvgElements,
  board: TileBoard,
  { dimmed, motion }: Draw,
): RenderElement =>
  Svg({
    source: tilesSource(board.grid, motion as Motion | null, { dimmed }),
    alt: `2048 board, score ${board.score}`,
  });
