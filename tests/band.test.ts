import { expect, test } from "claude-code/testing";

const BAND = {
  plugin: "gameboy",
  component: "AbovePrompt",
  requestId: "above-prompt",
  viewport: { columns: 106, rows: 52, isFullscreen: true },
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 12,
    bodyColumns: 95,
    scroll: { offset: 0, bodyRows: 12 },
    view: {},
  },
} as const;

const SURVEY = { ...BAND, props: { ...BAND.props, hasSurvey: true } } as const;

for (const surface of ["desktop", "terminal"] as const) {
  test(`the band folds, unfolds and opens a game on ${surface}`, async ($, on) => {
    const opened: unknown[] = [];
    on("session.start", () => ({ cwd: "/work" }));
    on("ui.render", () => ({ type: "Text", props: {}, children: ["engine band"] }));
    on("ui.open", (_$, e) => {
      opened.push(e);
      return { value: { isPlaced: true } };
    });
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });

    const ui = await $.ui.mount({ ...BAND, surface });
    expect(await ui.find({ type: "Text", text: "GAMEBOY" })).toBeDefined();
    expect(await ui.find({ type: "Text", text: "Claude is waiting" })).toBeDefined();
    expect(await ui.find({ type: "Text", text: "engine band" })).toBeDefined();
    expect(await ui.find({ key: "game-morpion" })).toBeUndefined();

    await ui.press({ key: "band-toggle" });
    expect(await ui.find({ key: "game-morpion" })).toBeDefined();
    expect(await ui.find({ type: "Button", text: "Fold" })).toBeDefined();

    await ui.press({ key: "game-morpion" });
    expect(opened).toEqual([{ id: "gameboy", title: "Gameboy", focus: true }]);
    expect(await ui.find({ key: "game-morpion" })).toBeUndefined();
    await ui.unmount();
  });

  test(`the close button hides the band on ${surface}`, async ($, on) => {
    on("session.start", () => ({ cwd: "/work" }));
    on("ui.render", () => ({ type: "Text", props: {}, children: ["engine band"] }));
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });

    const ui = await $.ui.mount({ ...BAND, surface });
    await ui.press({ key: "band-close" });
    expect(await ui.find({ type: "Text", text: "engine band" })).toBeDefined();
    expect(await ui.find({ key: "band-toggle" })).toBeUndefined();
    await ui.unmount();
  });

  test(`the band gives way to a survey on ${surface}`, async ($, on) => {
    on("session.start", () => ({ cwd: "/work" }));
    on("ui.render", () => ({ type: "Text", props: {}, children: ["engine survey"] }));
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });

    const ui = await $.ui.mount({ ...SURVEY, surface });
    expect(await ui.find({ type: "Text", text: "engine survey" })).toBeDefined();
    expect(await ui.find({ type: "Text", text: "GAMEBOY" })).toBeUndefined();
    await ui.unmount();
  });
}
