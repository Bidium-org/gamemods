import { expect, test } from "claude-code/testing";
import { BAND_TITLE, claudeState, pausedMention, toggleLabel } from "../../src/band";
import { GAMES } from "../../src/games/index";
import {
  A_GAME,
  BAND,
  mountDrawn,
  openGame,
  PANE_OPENED,
  SURFACES,
  startSession,
} from "../fixtures/engine";

const SURVEY = { ...BAND, props: { ...BAND.props, hasSurvey: true } } as const;

for (const surface of SURFACES) {
  test(`the band folds, unfolds and opens a game on ${surface}`, async ($, on) => {
    const engine = await startSession($, on, surface);

    const ui = await $.ui.mount({ ...BAND, surface });
    expect(await ui.find({ type: "Text", text: BAND_TITLE })).toBeDefined();
    expect(await ui.find({ type: "Text", text: claudeState(false) })).toBeDefined();
    expect(await ui.find({ type: "Text", text: "engine band" })).toBeDefined();
    expect(await ui.find({ type: "Button", text: toggleLabel(false) })).toBeDefined();
    expect(await ui.find({ key: `game-${A_GAME}` })).toBeUndefined();

    await ui.press({ key: "band-toggle" });
    expect(await ui.find({ key: `game-${A_GAME}` })).toBeDefined();
    expect(await ui.find({ type: "Button", text: toggleLabel(true) })).toBeDefined();

    await ui.press({ key: `game-${A_GAME}` });
    expect(engine.opened).toEqual([PANE_OPENED]);
    expect(await ui.find({ key: `game-${A_GAME}` })).toBeUndefined();
    await ui.unmount();
  });

  test(`the band names the paused game on ${surface}`, async ($, on) => {
    const { ui } = await openGame($, on, surface, A_GAME);
    await ui.press({ key: "pane-back" });
    await ui.unmount();

    const band = await $.ui.mount({ ...BAND, surface });
    expect(
      await band.find({ type: "Text", text: pausedMention(GAMES[A_GAME].name) }),
    ).toBeDefined();
    await band.unmount();
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
    expect(await ui.find({ type: "Text", text: BAND_TITLE })).toBeUndefined();
    await ui.unmount();
  });
}
