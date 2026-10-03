import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { fitLayout, GAIN_MS, layoutHeight } from "../src/games/2048/client";
import { mix, PALETTE, vivid } from "../src/games/2048/palette";
import { openFromBand, PANE, pressAll, stubEngine } from "./engine";

const KEY = "board-2048";

const LIGHT_COLORS = [PALETTE.empty, PALETTE.super, ...Object.values(PALETTE.tiles)];

const paneWith = (bodyRows: number, isFocused = true) =>
  ({ ...PANE, props: { ...PANE.props, isFocused, scroll: { offset: 0, bodyRows } } }) as const;

async function terminalBoard($: Engine, on: On, pane = paneWith(PANE.props.scroll.bodyRows)) {
  stubEngine(on);
  await $.session.start({ surface: "terminal", isInteractive: true, cwd: "/work" });
  await openFromBand($, "terminal", "2048");
  const ui = await $.ui.mount({ ...pane, surface: "terminal" });
  const tiles = async () =>
    (await ui.findAll({ type: "Box", in: KEY })).filter((box) => box.props.width === 8);
  const sliding = async () => (await tiles()).filter((box) => box.props.position === "absolute");
  const colors = async () => (await tiles()).map((box) => String(box.props.backgroundColor));
  const gain = () => ui.find({ type: "Text", text: /^\+\d+$/, in: KEY });
  return { ui, tiles, sliding, colors, gain };
}

test("the board fits the rows it is given, down to one-row tiles", () => {
  expect(fitLayout(40)).toEqual({ tileHeight: 3, rowGap: 1 });
  expect(layoutHeight(fitLayout(40))).toBe(16);
  expect(fitLayout(15)).toEqual({ tileHeight: 3, rowGap: 0 });
  expect(fitLayout(12)).toEqual({ tileHeight: 1, rowGap: 0 });
  expect(fitLayout(2)).toEqual({ tileHeight: 1, rowGap: 0 });
});

test("mix goes from one color to the other; vivid pushes a color away from grey", () => {
  expect(mix("#000000", "#ffffff", 0)).toBe("#000000");
  expect(mix("#000000", "#ffffff", 1)).toBe("#ffffff");
  expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
  expect(vivid("#808080")).toBe("#808080");
  expect(vivid("#a08060")).toBe("#c08040");
});

test("a move slides its tiles, then the board settles on the grid", async ($, on) => {
  const { ui, tiles, sliding, colors } = await terminalBoard($, on);
  expect(await sliding()).toHaveLength(0);

  await ui.press({ key: "control-up" });
  expect((await sliding()).length).toBeGreaterThan(0);

  await ui.advance(GAIN_MS);
  expect(await sliding()).toHaveLength(0);
  expect(await tiles()).toHaveLength(16);
  expect((await colors()).filter((color) => !LIGHT_COLORS.includes(color))).toEqual([]);
  await ui.unmount();
});

test("the spawn fades in and the merge pops, then both take their own color", async ($, on) => {
  const { ui, colors } = await terminalBoard($, on);
  await pressAll(ui, ["control-up", "control-left"]);
  await ui.advance(200);
  expect((await colors()).filter((color) => !LIGHT_COLORS.includes(color)).length).toBe(2);

  await ui.advance(GAIN_MS);
  expect((await colors()).filter((color) => !LIGHT_COLORS.includes(color))).toEqual([]);
  await ui.unmount();
});

test("the gain of a merge floats, then fades out", async ($, on) => {
  const { ui, gain } = await terminalBoard($, on);
  await ui.press({ key: "control-up" });
  expect(await gain()).toBeUndefined();

  await ui.press({ key: "control-left" });
  const shown = await gain();
  expect(shown?.text).toBe("+4");
  expect(shown?.props.color).toBe(PALETTE.gain);

  await ui.advance(GAIN_MS / 2);
  expect((await gain())?.props.color).not.toBe(PALETTE.gain);
  await ui.advance(GAIN_MS / 2);
  expect(await gain()).toBeUndefined();
  await ui.unmount();
});

test("redraws neither restart nor stop an animation", async ($, on) => {
  const { ui, sliding } = await terminalBoard($, on);
  await ui.press({ key: "control-up" });
  await ui.advance(50);
  await pressAll(ui, ["pane-pause", "pane-pause"]);
  expect((await sliding()).length).toBeGreaterThan(0);

  await ui.advance(50);
  expect(await sliding()).toHaveLength(0);
  await ui.unmount();
});

test("moves in a row with no frame between keep the Client mounted", async ($, on) => {
  const { ui, tiles } = await terminalBoard($, on);
  await pressAll(
    ui,
    ["up", "left", "down", "right", "up", "left", "down", "right"].map((d) => `control-${d}`),
  );
  await pressAll(ui, ["pane-pause", "pane-pause", "pane-pause", "pane-pause"]);
  expect(await ui.drawn({ in: KEY })).toBeDefined();
  await ui.advance(GAIN_MS);
  expect(await tiles()).toHaveLength(16);
  await ui.unmount();
});

test("a restart mid-animation draws the new board settled", async ($, on) => {
  const { ui, sliding, gain, colors } = await terminalBoard($, on);
  await pressAll(ui, ["control-up", "control-left", "pane-restart"]);
  expect(await sliding()).toHaveLength(0);
  expect(await gain()).toBeUndefined();
  expect((await colors()).filter((color) => !LIGHT_COLORS.includes(color))).toEqual([]);
  await ui.unmount();
});

for (const [isFocused, rowGap] of [
  [true, 1],
  [false, 0],
] as const) {
  test(`the board takes the rows the pane leaves it, focused ${isFocused}`, async ($, on) => {
    const { ui, tiles } = await terminalBoard($, on, paneWith(26, isFocused));
    expect((await tiles()).every((tile) => tile.props.height === 3)).toBe(true);
    const grid = (await ui.findAll({ type: "Box", in: KEY })).find(
      (box) => box.props.rowGap !== undefined,
    );
    expect(grid?.props.rowGap).toBe(rowGap);
    await ui.unmount();
  });
}

test("a pause dims every tile and keeps the Client mounted", async ($, on) => {
  const { ui, colors } = await terminalBoard($, on);
  await ui.press({ key: "pane-pause" });
  expect((await colors()).filter((color) => LIGHT_COLORS.includes(color))).toEqual([]);
  expect(await ui.drawn({ in: KEY })).toBeDefined();

  await ui.press({ key: "pane-pause" });
  expect((await colors()).filter((color) => !LIGHT_COLORS.includes(color))).toEqual([]);
  await ui.unmount();
});
