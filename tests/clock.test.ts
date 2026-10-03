import { expect, test } from "claude-code/testing";
import { type EchoState, echo } from "../src/games/echo/echo";
import {
  chooseGame,
  clockMs,
  initialSession,
  openMenu,
  pause,
  type Session,
  tick,
  togglePause,
} from "../src/session";
import { openFromBand, PANE, stubEngine } from "./engine";

const SEED = 1;

const echoGame = () => chooseGame(initialSession, "echo", SEED);

const echoState = (s: Session) => s.state as EchoState;

// The playback of round 1: the lead-in, then one step of 600 ms
const PLAYBACK_MS = 1400;

const FIRST_CELL = echo.init(SEED).sequence[0] ?? 0;

test("the clock runs only for a game with a period, on its screen, unpaused", () => {
  expect(clockMs(echoGame())).toBe(100);
  expect(clockMs(chooseGame(initialSession, "morpion", SEED))).toBeNull();
  expect(clockMs(openMenu(echoGame()))).toBeNull();
  expect(clockMs(pause(echoGame(), "focus"))).toBeNull();
  expect(clockMs(initialSession)).toBeNull();
  const ended: EchoState = {
    ...echo.init(SEED),
    moment: { kind: "over", reason: "wrong", expected: 0 },
  };
  const over = { ...echoGame(), state: ended };
  expect(clockMs(over)).toBeNull();
});

test("a tick advances a running game and leaves a paused one untouched", () => {
  const s = echoGame();
  expect(echoState(tick(s)).moment).toEqual({ kind: "watch", at: -7 });
  const paused = pause(s, "manual");
  expect(tick(paused)).toBe(paused);
});

test("lifting the pause lets the game resume: Echo replays its round", () => {
  const answering = Array.from({ length: 14 }).reduce<Session>((acc) => tick(acc), echoGame());
  expect(echoState(answering).moment.kind).toBe("answer");
  const resumed = togglePause(togglePause(answering));
  expect(resumed.pause).toBeNull();
  expect(echoState(resumed).moment).toEqual({ kind: "watch", at: -8 });
});

for (const surface of ["desktop", "terminal"] as const) {
  test(`an Echo round is watched, then answered by a click on ${surface}`, async ($, on) => {
    const { clock } = stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await openFromBand($, surface, "echo");

    const ui = await $.ui.mount({ ...PANE, surface });
    expect(await ui.find({ type: "Text", text: "Watch · round 1 · 2×2" })).toBeDefined();
    expect(await ui.find({ key: `board-cell-${FIRST_CELL}` })).toBeUndefined();

    await clock.advance(PLAYBACK_MS);
    expect(await ui.find({ type: "Text", text: "Your turn · 30s · round 1 · 2×2" })).toBeDefined();
    await ui.press({ key: `board-cell-${FIRST_CELL}` });
    expect(await ui.find({ type: "Text", text: "Watch · round 2 · 2×2" })).toBeDefined();
    expect(await ui.find({ type: "Text", text: "score 1 · best 1" })).toBeDefined();
    await ui.unmount();
  });

  test(`an Echo answer runs out after 30 seconds on ${surface}`, async ($, on) => {
    const { clock } = stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await openFromBand($, surface, "echo");

    const ui = await $.ui.mount({ ...PANE, surface });
    await clock.advance(PLAYBACK_MS + 29_900);
    expect(await ui.find({ type: "Text", text: "Your turn · 1s · round 1 · 2×2" })).toBeDefined();
    await clock.advance(100);
    expect(await ui.find({ type: "Text", text: "Time's up · round 1 · 2×2" })).toBeDefined();
    await ui.unmount();
  });

  test(`a paused Echo loses no time and replays its round on ${surface}`, async ($, on) => {
    const { clock } = stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await openFromBand($, surface, "echo");

    const ui = await $.ui.mount({ ...PANE, surface });
    await clock.advance(PLAYBACK_MS + 10_000);
    await ui.press({ key: "pane-pause" });
    await clock.advance(60_000);
    expect(await ui.find({ type: "Text", text: "Paused · P to resume" })).toBeDefined();

    await ui.press({ key: "pane-pause" });
    expect(await ui.find({ type: "Text", text: "Watch · round 1 · 2×2" })).toBeDefined();
    await clock.advance(PLAYBACK_MS);
    expect(await ui.find({ type: "Text", text: "Your turn · 30s · round 1 · 2×2" })).toBeDefined();
    await ui.unmount();
  });

  test(`Echo is played by keys on ${surface}`, async ($, on) => {
    const { clock } = stubEngine(on);
    await $.session.start({ surface, isInteractive: true, cwd: "/work" });
    await openFromBand($, surface, "echo");

    const ui = await $.ui.mount({ ...PANE, surface });
    await clock.advance(PLAYBACK_MS);
    const moves = [["right"], ["down"], ["right", "down"]][FIRST_CELL - 1] ?? [];
    for (const id of [...moves, "select"]) await ui.press({ key: `control-${id}` });
    expect(await ui.find({ type: "Text", text: "Watch · round 2 · 2×2" })).toBeDefined();
    await ui.unmount();
  });
}
