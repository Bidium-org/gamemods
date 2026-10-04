import { expect, test } from "claude-code/testing";
import { GAME_IDS, GAMES, type GameId } from "../../src/games/index";
import { pauseLine, scoreLine } from "../../src/pane";
import {
  chooseGame,
  clockMs,
  control,
  gameView,
  initialSession,
  openMenu,
  pause,
  type Session,
  tick,
  togglePause,
} from "../../src/session";
import {
  ANSWER_CONTROLS,
  CLOCKED,
  clocked,
  END_MS,
  PERIOD,
  PLAYBACK_MS,
  runClock,
} from "../fixtures/clocked";
import { openGame, pressControls, SEED, SURFACES } from "../fixtures/engine";

const { game } = GAMES[CLOCKED];

// The line the clocked game shows in `s`
const lineOf = (s: Session) => game.status(s.state).line;

test("the clock runs only for a game with a period, on its screen, unpaused, not over", () => {
  const unclocked = GAME_IDS.find((id) => !GAMES[id].game.tickMs) as GameId;
  expect(clockMs(clocked())).toBe(PERIOD);
  expect(clockMs(chooseGame(initialSession, unclocked, SEED))).toBeNull();
  expect(clockMs(openMenu(clocked()))).toBeNull();
  expect(clockMs(pause(clocked(), "focus"))).toBeNull();
  expect(clockMs(initialSession)).toBeNull();
  expect(clockMs(runClock(clocked(), END_MS))).toBeNull();
});

test("a tick advances a running game and leaves a paused one untouched", () => {
  const s = clocked();
  expect(tick(s).state).toEqual(game.tick?.(s.state));
  const paused = pause(s, "manual");
  expect(tick(paused)).toBe(paused);
});

test("a tick changes the game view only when it changes what the game shows", () => {
  const answering = runClock(clocked(), PLAYBACK_MS);
  const next = tick(answering);
  expect(next.state).not.toEqual(answering.state);
  expect(gameView(next)).toBe(gameView(answering));
  expect(gameView(answering)).not.toBe(gameView(runClock(clocked(), PLAYBACK_MS - PERIOD)));
});

test("lifting the pause hands the state to the game's resume", () => {
  const s = runClock(clocked(), PLAYBACK_MS);
  const resumed = togglePause(togglePause(s));
  expect(resumed.pause).toBeNull();
  expect(resumed.state).toEqual(game.resume?.(s.state));
});

for (const surface of SURFACES) {
  test(`the clock runs a game on screen until it ends on ${surface}`, async ($, on) => {
    const {
      engine: { clock },
      ui,
    } = await openGame($, on, surface, CLOCKED);
    await clock.advance(PLAYBACK_MS);
    expect(
      await ui.find({ type: "Text", text: lineOf(runClock(clocked(), PLAYBACK_MS)) }),
    ).toBeDefined();
    await clock.advance(END_MS - PLAYBACK_MS);
    expect(
      await ui.find({ type: "Text", text: lineOf(runClock(clocked(), END_MS)) }),
    ).toBeDefined();
    await ui.unmount();
  });

  test(`a paused game's clock loses no time on ${surface}`, async ($, on) => {
    const {
      engine: { clock },
      ui,
    } = await openGame($, on, surface, CLOCKED);
    const ms = PLAYBACK_MS + 10 * PERIOD;
    await clock.advance(ms);
    await ui.press({ key: "pane-pause" });
    await clock.advance(END_MS);
    expect(await ui.find({ type: "Text", text: pauseLine("manual") })).toBeDefined();

    await ui.press({ key: "pane-pause" });
    const resumed = togglePause(togglePause(runClock(clocked(), ms)));
    expect(await ui.find({ type: "Text", text: lineOf(resumed) })).toBeDefined();
    await clock.advance(PLAYBACK_MS);
    expect(
      await ui.find({ type: "Text", text: lineOf(runClock(resumed, PLAYBACK_MS)) }),
    ).toBeDefined();
    await ui.unmount();
  });

  test(`a clocked game takes its keys between ticks on ${surface}`, async ($, on) => {
    const {
      engine: { clock },
      ui,
    } = await openGame($, on, surface, CLOCKED);
    await clock.advance(PLAYBACK_MS);
    await pressControls(ui, ANSWER_CONTROLS);

    const answered = ANSWER_CONTROLS.reduce(control, runClock(clocked(), PLAYBACK_MS));
    const score = game.status(answered.state).score;
    expect(await ui.find({ type: "Text", text: lineOf(answered) })).toBeDefined();
    expect(
      await ui.find({ type: "Text", text: scoreLine(score, answered.best[CLOCKED] ?? 0) }),
    ).toBeDefined();
    await ui.unmount();
  });
}
