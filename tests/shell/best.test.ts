import { expect, test } from "claude-code/testing";
import { openGame, pressAll, SURFACES, WINNING_KEYS } from "../fixtures/engine";

for (const surface of SURFACES) {
  test(`the best score is read from the store at start on ${surface}`, async ($, on) => {
    const { ui } = await openGame($, on, surface, "morpion", { stored: { "best:morpion": 3 } });
    expect(await ui.find({ type: "Text", text: "score 0 · best 3" })).toBeDefined();
    await ui.unmount();
  });

  test(`a new best score is written to the store on ${surface}`, async ($, on) => {
    const { engine, ui } = await openGame($, on, surface, "morpion");
    await pressAll(ui, WINNING_KEYS);
    expect(engine.stored).toEqual({ "best:morpion": 1 });
    await ui.unmount();
  });

  test(`a higher score written by another session is never lowered on ${surface}`, async ($, on) => {
    const { engine, ui } = await openGame($, on, surface, "morpion");
    engine.stored["best:morpion"] = 5;

    await pressAll(ui, WINNING_KEYS);
    expect(engine.stored).toEqual({ "best:morpion": 5 });
    await ui.unmount();
  });
}
