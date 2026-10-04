import { type Engine, expect, test } from "claude-code/testing";
import { claudeState } from "../../src/band";
import { GAMES } from "../../src/games/index";
import { PAUSE_COLOR, pauseLabel, pauseLine } from "../../src/pane";
import { frameColor, openGame, PANE, SURFACES, UNFOCUSED } from "../fixtures/engine";
import { MOVE, TURN_BASED, turnBased } from "../fixtures/turn-based";

// What the game says at its start, unpaused
const START_LINE = GAMES[TURN_BASED].game.status(turnBased().state).line;

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
  test(`a paused game ignores its keys until p on ${surface}`, async ($, on) => {
    const { ui } = await openGame($, on, surface, TURN_BASED);
    expect(await frameColor(ui)).toBeUndefined();

    await ui.press({ key: "pane-pause" });
    expect(await ui.find({ type: "Text", text: pauseLine("manual") })).toBeDefined();
    expect(await ui.find({ type: "Button", text: pauseLabel(true) })).toBeDefined();
    expect(await frameColor(ui)).toBe(PAUSE_COLOR);
    const paused = await ui.drawn();
    await ui.press({ key: `control-${MOVE}` });
    expect(await ui.drawn()).toEqual(paused);

    await ui.press({ key: "pane-pause" });
    const resumed = await ui.drawn();
    await ui.press({ key: `control-${MOVE}` });
    expect(await ui.drawn()).not.toEqual(resumed);
    await ui.unmount();
  });

  test(`a permission dialog pauses the game on ${surface}`, async ($, on) => {
    const { ui } = await openGame($, on, surface, TURN_BASED);
    await permissionAsked($);
    expect(await ui.find({ type: "Text", text: pauseLine("permission") })).toBeDefined();
    await ui.unmount();
  });

  test(`the dialog's reason stays when the pane then loses the focus on ${surface}`, async ($, on) => {
    const { ui } = await openGame($, on, surface, TURN_BASED);
    await permissionAsked($);
    await ui.redraw(UNFOCUSED.props);
    expect(await ui.find({ type: "Text", text: pauseLine("permission") })).toBeDefined();
    await ui.unmount();
  });

  test(`an unfocused redraw pauses the game on ${surface}`, async ($, on) => {
    const { ui } = await openGame($, on, surface, TURN_BASED);
    await ui.redraw(UNFOCUSED.props);
    expect(await ui.find({ type: "Text", text: pauseLine("focus") })).toBeDefined();
    await ui.unmount();
  });

  test(`a game opened without the focus is not paused on ${surface}`, async ($, on) => {
    const { ui } = await openGame($, on, surface, TURN_BASED, { pane: UNFOCUSED });
    expect(await ui.find({ type: "Text", text: START_LINE })).toBeDefined();

    await ui.redraw(PANE.props);
    const focused = await ui.drawn();
    await ui.press({ key: `control-${MOVE}` });
    expect(await ui.drawn()).not.toEqual(focused);
    await ui.unmount();
  });

  test(`the end of Claude's turn pauses the game, a subagent's does not, on ${surface}`, async ($, on) => {
    const { ui } = await openGame($, on, surface, TURN_BASED);

    await $.turn.start({ text: "work", turnId: "t1" });
    expect(await ui.find({ type: "Text", text: claudeState(true) })).toBeDefined();

    await turnEnds($, "agent-1");
    expect(await ui.find({ type: "Text", text: START_LINE })).toBeDefined();

    await turnEnds($);
    expect(await ui.find({ type: "Text", text: pauseLine("turn-end") })).toBeDefined();
    expect(await ui.find({ type: "Text", text: claudeState(false) })).toBeDefined();
    await ui.unmount();
  });
}
