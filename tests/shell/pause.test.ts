import { type Engine, expect, test } from "claude-code/testing";
import {
  gamemods,
  openFromBand,
  openGame,
  PANE,
  paneWith,
  SURFACES,
  startSession,
} from "../fixtures/engine";

const UNFOCUSED = paneWith({ isFocused: false });

// Claude asks for a permission: the engine is about to show the dialog
const permissionAsked = ($: Engine) =>
  $.classic.PermissionRequest({
    tool_name: "Bash",
    tool_input: { command: "touch /tmp/x" },
  });

const turnEnds = ($: Engine, agentId?: string) =>
  $.turn.complete({
    answer: "done",
    durationMs: 1000,
    isAborted: false,
    turnId: "t1",
    reason: "answer",
    ...(agentId && { agentId }),
  });

for (const surface of SURFACES) {
  test(`a permission dialog pauses the game and its keys on ${surface}`, async ($, on) => {
    const { ui } = await openGame($, on, surface, "morpion");

    await permissionAsked($);
    expect(
      await ui.find({ type: "Text", text: /^Paused: permission requested · P to resume$/ }),
    ).toBeDefined();
    await ui.press({ key: "control-place" });
    expect(await ui.find({ type: "Text", text: "X" })).toBeUndefined();

    await ui.press({ key: "pane-pause" });
    await ui.press({ key: "control-place" });
    expect(await ui.find({ type: "Text", text: "X" })).toBeDefined();
    await ui.unmount();
  });

  test(`the dialog's reason stays when the pane then loses the focus on ${surface}`, async ($, on) => {
    const { ui } = await openGame($, on, surface, "morpion");

    await permissionAsked($);
    await ui.redraw(UNFOCUSED.props);
    expect(
      await ui.find({ type: "Text", text: /^Paused: permission requested · P to resume$/ }),
    ).toBeDefined();
    await ui.unmount();
  });

  test(`losing the focus pauses, getting it back does not resume, on ${surface}`, async ($, on) => {
    const { ui } = await openGame($, on, surface, "morpion");

    await ui.redraw(UNFOCUSED.props);
    expect(
      await ui.find({ type: "Text", text: /^Paused: the game lost the keyboard/ }),
    ).toBeDefined();
    await ui.redraw(PANE.props);
    expect(
      await ui.find({ type: "Text", text: /^Paused: the game lost the keyboard/ }),
    ).toBeDefined();
    await ui.unmount();
  });

  test(`a game opened without the focus is not paused on ${surface}`, async ($, on) => {
    const { ui } = await openGame($, on, surface, "morpion", { pane: UNFOCUSED });

    expect(await ui.find({ type: "Text", text: "Your move" })).toBeDefined();
    await ui.redraw(PANE.props);
    await ui.press({ key: "control-place" });
    expect(await ui.find({ type: "Text", text: "X" })).toBeDefined();
    await ui.unmount();
  });

  test(`the end of Claude's turn pauses the game, a subagent's does not, on ${surface}`, async ($, on) => {
    const { ui } = await openGame($, on, surface, "morpion");

    await $.turn.start({ text: "work", turnId: "t1" });
    expect(await ui.find({ type: "Text", text: "Claude is working" })).toBeDefined();

    await turnEnds($, "agent-1");
    expect(await ui.find({ type: "Text", text: "Your move" })).toBeDefined();

    await turnEnds($);
    expect(await ui.find({ type: "Text", text: /^Paused: Claude answered/ })).toBeDefined();
    expect(await ui.find({ type: "Text", text: "Claude is waiting" })).toBeDefined();
    await ui.unmount();
  });

  // The kit cannot raise the person's close mark: `/gamemods stop` takes the same transition
  test(`closing the pane pauses the game on ${surface}`, async ($, on) => {
    await startSession($, on, surface);
    await openFromBand($, surface, "morpion");

    await gamemods($, "stop");
    const closed = await $.ui.mount({ ...PANE, surface });
    expect(await closed.find({ type: "Text", text: "engine band" })).toBeDefined();
    await closed.unmount();

    await gamemods($, "morpion");
    const reopened = await $.ui.mount({ ...PANE, surface });
    expect(await reopened.find({ type: "Text", text: "Paused · P to resume" })).toBeDefined();
    await reopened.unmount();
  });
}
