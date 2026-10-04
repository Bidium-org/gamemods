import { echo } from "../../src/games/echo/echo";
import { GAMES, type GameId } from "../../src/games/index";
import { chooseGame, initialSession, type Session, tick } from "../../src/session";
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

// `s` after `ms` of clock
export const runClock = (s: Session, ms: number): Session =>
  Array.from({ length: ms / PERIOD }).reduce<Session>((acc) => tick(acc), s);

// The clock time a game left unanswered takes to end
export const END_MS = (() => {
  let s = clocked();
  let ms = 0;
  while (GAMES[CLOCKED].game.status(s.state).phase === "playing") {
    s = tick(s);
    ms += PERIOD;
  }
  return ms;
})();
