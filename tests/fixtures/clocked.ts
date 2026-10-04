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

// From the start to the first answer: the round's playback. Its last tick changes what the game
// shows: the answer starts
export const PLAYBACK_MS = ticksUntilAnswer(START).count * PERIOD;

// The answer counts down in ticks but shows whole seconds: the tick after QUIET_TICK_MS changes
// the state and nothing shown
export const QUIET_TICK_MS = PLAYBACK_MS;

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
  for (let ms = 0; ms <= 10 * 60_000; ms += PERIOD) {
    if (GAMES[CLOCKED].game.status(s.state).phase !== "playing") return ms;
    s = tick(s);
  }
  throw new Error("the clocked game left unanswered does not end within 10 minutes");
})();
