import { expect, test } from "claude-code/testing";
import { BAND, mountDrawn, PANE_OPENED, SURFACES, startSession } from "../fixtures/engine";

const SURVEY = { ...BAND, props: { ...BAND.props, hasSurvey: true } } as const;

for (const surface of SURFACES) {
  test(`the band folds, unfolds and opens a game on ${surface}`, async ($, on) => {
    const engine = await startSession($, on, surface);

    const ui = await $.ui.mount({ ...BAND, surface });
    expect(await ui.find({ type: "Text", text: "GAMEMODS" })).toBeDefined();
    expect(await ui.find({ type: "Text", text: "Claude is waiting" })).toBeDefined();
    expect(await ui.find({ type: "Text", text: "engine band" })).toBeDefined();
    expect(await ui.find({ key: "game-morpion" })).toBeUndefined();

    await ui.press({ key: "band-toggle" });
    expect(await ui.find({ key: "game-morpion" })).toBeDefined();
    expect(await ui.find({ type: "Button", text: "Fold" })).toBeDefined();

    await ui.press({ key: "game-morpion" });
    expect(engine.opened).toEqual([PANE_OPENED]);
    expect(await ui.find({ key: "game-morpion" })).toBeUndefined();
    await ui.unmount();
  });

  test(`the close button hides the band on ${surface}`, async ($, on) => {
    await startSession($, on, surface);

    const ui = await $.ui.mount({ ...BAND, surface });
    await ui.press({ key: "band-close" });
    expect(await ui.find({ type: "Text", text: "engine band" })).toBeDefined();
    expect(await ui.find({ key: "band-toggle" })).toBeUndefined();
    await ui.unmount();
  });

  test(`the band gives way to a survey on ${surface}`, async ($, on) => {
    const ui = await mountDrawn(
      $,
      on,
      surface,
      () => ({ type: "Text", props: {}, children: ["engine survey"] }),
      SURVEY,
    );
    expect(await ui.find({ type: "Text", text: "engine survey" })).toBeDefined();
    expect(await ui.find({ type: "Text", text: "GAMEMODS" })).toBeUndefined();
    await ui.unmount();
  });
}
