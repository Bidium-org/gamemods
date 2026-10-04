import { expect, test } from "claude-code/testing";
import { WIDEN } from "../../src/band";
import { parseArgs } from "../../src/command";
import { BAND, gamemods, PANE, PANE_OPENED, SURFACES, startSession } from "../fixtures/engine";

test("no argument opens the menu", () => {
  expect(parseArgs("")).toEqual({ kind: "menu" });
  expect(parseArgs("   ")).toEqual({ kind: "menu" });
});

test("a known game id targets that game", () => {
  expect(parseArgs("morpion")).toEqual({ kind: "game", id: "morpion" });
  expect(parseArgs("  Hogzzle ")).toEqual({ kind: "game", id: "hogzzle" });
  expect(parseArgs("2048")).toEqual({ kind: "game", id: "2048" });
});

test("stop closes the pane", () => {
  expect(parseArgs("stop")).toEqual({ kind: "stop" });
  expect(parseArgs("STOP")).toEqual({ kind: "stop" });
});

test("an unknown id opens the menu", () => {
  expect(parseArgs("pong")).toEqual({ kind: "menu" });
});

test("only the first word counts", () => {
  expect(parseArgs("hogzzle now")).toEqual({ kind: "game", id: "hogzzle" });
  expect(parseArgs("pong morpion")).toEqual({ kind: "menu" });
});

for (const surface of SURFACES) {
  test(`the command registers as immediate on ${surface}`, async ($, on) => {
    const engine = await startSession($, on, surface);
    expect(engine.registered).toEqual([
      expect.objectContaining({ name: "gamemods", immediate: true, argumentHint: "[game|stop]" }),
    ]);
  });

  test(`/gamemodsopens the pane on its menu on ${surface}`, async ($, on) => {
    const engine = await startSession($, on, surface);
    await gamemods($);
    expect(engine.opened).toEqual([PANE_OPENED]);

    const ui = await $.ui.mount({ ...PANE, surface });
    for (const id of ["morpion", "hogzzle", "2048"]) {
      expect(await ui.find({ key: `game-${id}` })).toBeDefined();
    }
    await ui.unmount();
  });

  test(`/gamemods<id> opens that game on ${surface}`, async ($, on) => {
    const engine = await startSession($, on, surface);
    await gamemods($, "hogzzle");
    expect(engine.opened).toHaveLength(1);

    const ui = await $.ui.mount({ ...PANE, surface });
    expect(await ui.find({ type: "Text", text: "Hogzzle" })).toBeDefined();
    expect(await ui.find({ key: "pane-back" })).toBeDefined();
    await ui.unmount();
  });

  test(`/gamemodswith an unknown id opens the menu on ${surface}`, async ($, on) => {
    await startSession($, on, surface);
    await gamemods($, "pong");

    const ui = await $.ui.mount({ ...PANE, surface });
    expect(await ui.find({ key: "game-hogzzle" })).toBeDefined();
    expect(await ui.find({ key: "pane-back" })).toBeUndefined();
    await ui.unmount();
  });

  test(`/gamemodsstop closes the pane and keeps the game on ${surface}`, async ($, on) => {
    const engine = await startSession($, on, surface);
    await gamemods($, "hogzzle");
    await gamemods($, "stop");
    expect(engine.closed).toEqual(["gamemods"]);

    // Closed: the engine draws the pane itself
    const closed = await $.ui.mount({ ...PANE, surface });
    expect(await closed.find({ type: "Text", text: "engine band" })).toBeDefined();
    expect(await closed.find({ key: "pane-back" })).toBeUndefined();
    await closed.unmount();

    // Reopening on the menu finds the same game waiting
    await gamemods($);
    const reopened = await $.ui.mount({ ...PANE, surface });
    expect(await reopened.find({ key: "game-hogzzle" })).toBeDefined();
    await reopened.unmount();
  });

  test(`an unplaced pane is explained in the band on ${surface}`, async ($, on) => {
    const engine = await startSession($, on, surface, { isPlaced: false });
    await gamemods($, "morpion");
    expect(engine.toasts).toEqual([]);

    const ui = await $.ui.mount({ ...BAND, surface });
    expect(await ui.find({ type: "Text", text: WIDEN })).toBeDefined();
    await ui.unmount();
  });

  test(`an unplaced pane toasts when the band is hidden on ${surface}`, async ($, on) => {
    const engine = await startSession($, on, surface, { isPlaced: false });
    const band = await $.ui.mount({ ...BAND, surface });
    await band.press({ key: "band-close" });
    await band.unmount();

    await gamemods($, "morpion");
    expect(engine.toasts).toEqual([WIDEN]);
  });
}
