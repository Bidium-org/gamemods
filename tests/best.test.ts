import { expect, test } from "claude-code/testing";
import { openFromBand, PANE, pressAll, stubEngine, WINNING_KEYS } from "./engine";

for (const surface of ["desktop", "terminal"] as const) {
  test(`the best score is read from the store at start on ${surface}`, async ($, on) => {
    stubEngine(on, { stored: { "best:morpion": 3 } });
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });

    await openFromBand($, surface, "morpion");
    const ui = await $.ui.mount({ ...PANE, surface });
    expect(await ui.find({ type: "Text", text: "score 0 · best 3" })).toBeDefined();
    await ui.unmount();
  });

  test(`a new best score is written to the store on ${surface}`, async ($, on) => {
    const engine = stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await openFromBand($, surface, "morpion");

    const ui = await $.ui.mount({ ...PANE, surface });
    await pressAll(ui, WINNING_KEYS);
    expect(engine.stored).toEqual({ "best:morpion": 1 });
    await ui.unmount();
  });

  test(`a higher score written by another session is never lowered on ${surface}`, async ($, on) => {
    const engine = stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await openFromBand($, surface, "morpion");
    engine.stored["best:morpion"] = 5;

    const ui = await $.ui.mount({ ...PANE, surface });
    await pressAll(ui, WINNING_KEYS);
    expect(engine.stored).toEqual({ "best:morpion": 5 });
    await ui.unmount();
  });
}
