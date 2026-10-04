import { expect, test } from "claude-code/testing";
import { WIDEN } from "../../src/band";
import { parseArgs } from "../../src/command";
import { GAME_IDS, GAMES } from "../../src/games/index";
import { pauseLine } from "../../src/pane";
import {
  A_GAME,
  BAND,
  gamemods,
  PANE,
  PANE_OPENED,
  SURFACES,
  startSession,
} from "../fixtures/engine";
import { TURN_BASED } from "../fixtures/turn-based";

const UNKNOWN = "not-a-game";

test("no argument opens the menu", () => {
  expect(parseArgs("")).toEqual({ kind: "menu" });
  expect(parseArgs("   ")).toEqual({ kind: "menu" });
});

test("every game id targets that game, case and surrounding spaces ignored", () => {
  for (const id of GAME_IDS) {
    expect(parseArgs(id)).toEqual({ kind: "game", id });
    expect(parseArgs(`  ${id.toUpperCase()} `)).toEqual({ kind: "game", id });
  }
});

test("stop closes the pane", () => {
  expect(parseArgs("stop")).toEqual({ kind: "stop" });
  expect(parseArgs("STOP")).toEqual({ kind: "stop" });
});

test("an unknown id opens the menu", () => {
  expect(GAME_IDS).not.toContain(UNKNOWN);
  expect(parseArgs(UNKNOWN)).toEqual({ kind: "menu" });
});

test("only the first word counts", () => {
  for (const id of GAME_IDS) {
    expect(parseArgs(`${id} now`)).toEqual({ kind: "game", id });
    expect(parseArgs(`${UNKNOWN} ${id}`)).toEqual({ kind: "menu" });
  }
});

for (const surface of SURFACES) {
  test(`the command registers as immediate on ${surface}`, async ($, on) => {
    const engine = await startSession($, on, surface);
    expect(engine.registered).toEqual([
      expect.objectContaining({ name: "gamemods", immediate: true, argumentHint: "[game|stop]" }),
    ]);
  });

  test(`/gamemods opens the pane on its menu on ${surface}`, async ($, on) => {
    const engine = await startSession($, on, surface);
    await gamemods($);
    expect(engine.opened).toEqual([PANE_OPENED]);

    const ui = await $.ui.mount({ ...PANE, surface });
    for (const id of GAME_IDS) {
      expect(await ui.find({ key: `game-${id}` })).toBeDefined();
    }
    await ui.unmount();
  });

  test(`/gamemods <id> opens that game on ${surface}`, async ($, on) => {
    const engine = await startSession($, on, surface);
    for (const id of GAME_IDS) {
      await gamemods($, id);
      expect(engine.opened.at(-1)).toEqual(PANE_OPENED);

      const ui = await $.ui.mount({ ...PANE, surface });
      expect(await ui.find({ type: "Text", text: GAMES[id].name })).toBeDefined();
      expect(await ui.find({ key: "pane-back" })).toBeDefined();
      await ui.unmount();
    }
  });

  test(`/gamemods with an unknown id opens the menu on ${surface}`, async ($, on) => {
    await startSession($, on, surface);
    await gamemods($, UNKNOWN);

    const ui = await $.ui.mount({ ...PANE, surface });
    expect(await ui.find({ key: `game-${A_GAME}` })).toBeDefined();
    expect(await ui.find({ key: "pane-back" })).toBeUndefined();
    await ui.unmount();
  });

  // The kit cannot raise the person's close mark: `/gamemods stop` takes the same transition
  test(`/gamemods stop closes the pane and keeps the game, paused, on ${surface}`, async ($, on) => {
    const engine = await startSession($, on, surface);
    await gamemods($, TURN_BASED);
    await gamemods($, "stop");
    expect(engine.closed).toEqual(["gamemods"]);

    // Closed: the engine draws the pane itself
    const closed = await $.ui.mount({ ...PANE, surface });
    expect(await closed.find({ type: "Text", text: "engine band" })).toBeDefined();
    expect(await closed.find({ key: "pane-back" })).toBeUndefined();
    await closed.unmount();

    await gamemods($, TURN_BASED);
    const reopened = await $.ui.mount({ ...PANE, surface });
    expect(await reopened.find({ type: "Text", text: pauseLine("menu") })).toBeDefined();
    await reopened.unmount();
  });

  test(`an unplaced pane is explained in the band on ${surface}`, async ($, on) => {
    const engine = await startSession($, on, surface, { isPlaced: false });
    await gamemods($, A_GAME);
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

    await gamemods($, A_GAME);
    expect(engine.toasts).toEqual([WIDEN]);
  });
}
