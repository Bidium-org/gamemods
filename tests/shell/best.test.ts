import { expect, test } from "claude-code/testing";
import { scoreLine } from "../../src/pane";
import { bestKey } from "../../src/session";
import { openGame, pressControls, SURFACES } from "../fixtures/engine";
import { TURN_BASED, WIN_SCORE, WINNING_CONTROLS } from "../fixtures/turn-based";

const KEY = bestKey(TURN_BASED);

for (const surface of SURFACES) {
  test(`the best score is read from the store at start on ${surface}`, async ($, on) => {
    const { ui } = await openGame($, on, surface, TURN_BASED, { stored: { [KEY]: 3 } });
    expect(await ui.find({ type: "Text", text: scoreLine(0, 3) })).toBeDefined();
    await ui.unmount();
  });

  test(`a new best score is written to the store on ${surface}`, async ($, on) => {
    const { engine, ui } = await openGame($, on, surface, TURN_BASED);
    await pressControls(ui, WINNING_CONTROLS);
    expect(engine.stored).toEqual({ [KEY]: WIN_SCORE });
    await ui.unmount();
  });

  test(`a higher score written by another session is never lowered on ${surface}`, async ($, on) => {
    const { engine, ui } = await openGame($, on, surface, TURN_BASED);
    engine.stored[KEY] = WIN_SCORE + 1;

    await pressControls(ui, WINNING_CONTROLS);
    expect(engine.stored).toEqual({ [KEY]: WIN_SCORE + 1 });
    await ui.unmount();
  });
}
