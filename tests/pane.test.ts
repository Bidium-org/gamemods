import { expect, test } from "claude-code/testing";
import { NOT_ON_SURFACE, WIDEN_PANE } from "../src/pane";
import {
  BAND,
  LOSING_2048_KEYS,
  openFromBand,
  PANE,
  pressAll,
  stubEngine,
  WINNING_KEYS,
} from "./engine";

const UNFOCUSED = { ...PANE, props: { ...PANE.props, isFocused: false } } as const;

const PAUSE_FRAME = '"borderColor":"#d97757"';

const INLINE_SHORT = {
  ...PANE,
  props: { ...PANE.props, placement: "inline", scroll: { offset: 0, bodyRows: 10 } },
} as const;

type Drawn = { type: string; props: { source?: string }; children?: unknown[] };

// The first Svg of the drawn tree
const svgOf = (node: Drawn): Drawn | undefined =>
  node.type === "Svg"
    ? node
    : (node.children ?? [])
        .filter((c): c is Drawn => typeof c === "object" && c !== null)
        .map(svgOf)
        .find(Boolean);

test("Hogzzle draws its picture as an Svg redrawn at each move on desktop", async ($, on) => {
  stubEngine(on);
  await $.session.start({ surface: "desktop", isInteractive: true, cwd: "/work" });
  await openFromBand($, "desktop", "hogzzle");

  const ui = await $.ui.mount({ ...PANE, surface: "desktop" });
  const svg = async () => svgOf((await ui.drawn()) as Drawn);
  const first = await svg();
  expect(first).toBeDefined();
  expect(await ui.find({ key: "control-pick" })).toBeDefined();

  await ui.press({ key: "control-right" });
  const moved = await svg();
  expect(moved?.props.source).not.toBe(first?.props.source);

  await ui.press({ key: "pane-pause" });
  expect((await svg())?.props.source).toContain('fill-opacity=".55"');
  await ui.unmount();
});

test("Hogzzle says it is not playable in the terminal yet", async ($, on) => {
  stubEngine(on);
  await $.session.start({ surface: "terminal", isInteractive: true, cwd: "/work" });
  await openFromBand($, "terminal", "hogzzle");

  const ui = await $.ui.mount({ ...PANE, surface: "terminal" });
  expect(await ui.find({ type: "Text", text: NOT_ON_SURFACE })).toBeDefined();
  expect(await ui.find({ key: "control-pick" })).toBeUndefined();
  await ui.press({ key: "pane-back" });
  expect(await ui.find({ key: "game-hogzzle" })).toBeDefined();
  await ui.unmount();
});

for (const surface of ["desktop", "terminal"] as const) {
  test(`the pane goes from a game to the menu and to another game on ${surface}`, async ($, on) => {
    stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await openFromBand($, surface, "morpion");

    const ui = await $.ui.mount({ ...PANE, surface });
    expect(await ui.find({ type: "Text", text: "Your move" })).toBeDefined();
    expect(await ui.find({ key: "board-row-0" })).toBeDefined();
    expect(await ui.find({ key: "control-place" })).toBeDefined();

    await ui.press({ key: "pane-back" });
    for (const id of ["morpion", "hogzzle"]) {
      expect(await ui.find({ key: `game-${id}` })).toBeDefined();
    }

    await ui.press({ key: "game-hogzzle" });
    expect(await ui.find({ type: "Text", text: "Hogzzle" })).toBeDefined();
    expect(await ui.find({ key: "pane-back" })).toBeDefined();
    await ui.unmount();
  });

  test(`a Morpion is played to a win by keys, then replayed on ${surface}`, async ($, on) => {
    stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await openFromBand($, surface, "morpion");

    const ui = await $.ui.mount({ ...PANE, surface });
    await pressAll(ui, WINNING_KEYS);
    expect(await ui.find({ type: "Text", text: "You win" })).toBeDefined();
    expect(await ui.find({ type: "Text", text: "score 1 · best 1" })).toBeDefined();

    await ui.press({ key: "pane-restart" });
    expect(await ui.find({ type: "Text", text: "Your move" })).toBeDefined();
    expect(await ui.find({ type: "Text", text: "score 1 · best 1" })).toBeDefined();
    await ui.unmount();
  });

  test(`a 2048 game opens with its four controls on ${surface}`, async ($, on) => {
    stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await openFromBand($, surface, "2048");

    const ui = await $.ui.mount({ ...PANE, surface });
    expect(await ui.find({ type: "Text", text: "Merge the tiles to reach 2048" })).toBeDefined();
    expect(await ui.find({ key: "board-row-3" })).toBeDefined();
    for (const id of ["up", "left", "down", "right"]) {
      expect(await ui.find({ key: `control-${id}` })).toBeDefined();
    }
    expect(await ui.find({ key: "control-place" })).toBeUndefined();
    await ui.unmount();
  });

  test(`a 2048 game below its size asks for a wider window on ${surface}`, async ($, on) => {
    stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await openFromBand($, surface, "2048");

    const ui = await $.ui.mount({ ...INLINE_SHORT, surface });
    expect(await ui.find({ type: "Text", text: WIDEN_PANE })).toBeDefined();
    expect(await ui.find({ key: "board-row-0" })).toBeUndefined();
    await ui.unmount();
  });

  test(`a 2048 game is played to game over, its best score saved, on ${surface}`, async ($, on) => {
    const engine = stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await openFromBand($, surface, "2048");

    const ui = await $.ui.mount({ ...PANE, surface });
    await pressAll(ui, LOSING_2048_KEYS);
    expect(await ui.find({ type: "Text", text: "No moves left · R to play again" })).toBeDefined();
    expect(await ui.find({ type: "Text", text: "score 3140 · best 3140" })).toBeDefined();
    expect(engine.stored).toEqual({ "best:2048": 3140 });

    await ui.press({ key: "pane-restart" });
    expect(await ui.find({ type: "Text", text: "Merge the tiles to reach 2048" })).toBeDefined();
    expect(await ui.find({ type: "Text", text: "score 0 · best 3140" })).toBeDefined();
    await ui.unmount();
  });

  test(`a paused game ignores its keys until p on ${surface}`, async ($, on) => {
    stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await openFromBand($, surface, "morpion");

    const ui = await $.ui.mount({ ...PANE, surface });
    const isFramedOrange = async () => JSON.stringify(await ui.drawn()).includes(PAUSE_FRAME);
    expect(await isFramedOrange()).toBe(false);
    await ui.press({ key: "pane-pause" });
    expect(await ui.find({ type: "Text", text: "Paused · P to resume" })).toBeDefined();
    expect(await ui.find({ type: "Button", text: "Resume" })).toBeDefined();
    expect(await isFramedOrange()).toBe(true);

    await ui.press({ key: "control-place" });
    expect(await ui.find({ type: "Text", text: "X" })).toBeUndefined();

    await ui.press({ key: "pane-pause" });
    await ui.press({ key: "control-place" });
    expect(await ui.find({ type: "Text", text: "X" })).toBeDefined();
    await ui.unmount();
  });

  test(`the menu shows the best score and the paused game on ${surface}`, async ($, on) => {
    stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await openFromBand($, surface, "morpion");

    const ui = await $.ui.mount({ ...PANE, surface });
    await pressAll(ui, [...WINNING_KEYS, "pane-restart", "pane-back"]);
    expect(
      await ui.find({ type: "Text", text: "paused · best 1 · Three in a row against a bot" }),
    ).toBeDefined();
    await ui.unmount();

    const band = await $.ui.mount({ ...BAND, surface });
    expect(await band.find({ type: "Text", text: "Morpion paused" })).toBeDefined();
    await band.unmount();
  });

  test(`a pane below the game's size asks for a wider window on ${surface}`, async ($, on) => {
    stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await openFromBand($, surface, "morpion");

    const ui = await $.ui.mount({ ...INLINE_SHORT, surface });
    expect(await ui.find({ type: "Text", text: WIDEN_PANE })).toBeDefined();
    expect(await ui.find({ key: "control-place" })).toBeUndefined();
    await ui.press({ key: "pane-back" });
    expect(await ui.find({ key: "game-morpion" })).toBeDefined();
    await ui.unmount();
  });

  test(`the pane root fills the body on both screens on ${surface}`, async ($, on) => {
    stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await openFromBand($, surface, "morpion");

    const ui = await $.ui.mount({ ...PANE, surface });
    expect(await ui.drawn()).toMatchObject({ type: "Box", props: { minHeight: 46 } });

    await ui.press({ key: "pane-back" });
    expect(await ui.drawn()).toMatchObject({ type: "Box", props: { minHeight: 46 } });
    await ui.unmount();
  });

  test(`the pane asks for a click when it has no keyboard on ${surface}`, async ($, on) => {
    stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await openFromBand($, surface, "hogzzle");

    const ui = await $.ui.mount({ ...UNFOCUSED, surface });
    expect(await ui.find({ type: "Text", text: "Click the game to play" })).toBeDefined();
    await ui.press({ key: "pane-back" });
    expect(await ui.find({ type: "Text", text: "Click here to use the keyboard" })).toBeDefined();
    await ui.unmount();
  });
}
