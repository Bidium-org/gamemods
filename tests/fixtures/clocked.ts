import { echo } from "../../src/games/echo/echo";
import type { GameId } from "../../src/games/index";
import { chooseGame, clockMs, initialSession, type Session, tick } from "../../src/session";
import { ticksUntilAnswer, toAnswer } from "../games/echo/fixture";
import { SEED } from "./engine";
import { movesTo } from "./grid";

// The reference game with a clock: Echo
export const CLOCKED: GameId = "echo";

const START = echo.init(SEED);

if (echo.tickMs === undefined) throw new Error("the clocked game has no tickMs");
export const PERIOD = echo.tickMs;

// From the start to the first answer: the round's playback
export const PLAYBACK_MS = ticksUntilAnswer(START).count * PERIOD;

// Answers the round's first step, once the playback is over
const ANSWERING = toAnswer(START);
const SIDE = echo.board(ANSWERING).rows.length;
const [FIRST_STEP = 0] = ANSWERING.sequence;
export const ANSWER_CONTROLS = [...movesTo(ANSWERING.cursor, FIRST_STEP, SIDE), "select"];

// The clocked game, just chosen
export const clocked = (): Session => chooseGame(initialSession, CLOCKED, SEED);

// The clocked game after `ms` of clock
export const clockedAfter = (ms: number): Session =>
  Array.from({ length: ms / PERIOD }).reduce<Session>((s) => tick(s), clocked());

// The clock time a game left unanswered runs until it ends, its clock stopped
export const END_MS = (() => {
  let s = clocked();
  let ms = 0;
  while (clockMs(s) !== null) {
    s = tick(s);
    ms += PERIOD;
  }
  return ms;
})();
