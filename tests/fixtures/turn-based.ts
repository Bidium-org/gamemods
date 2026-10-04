import { GAMES, type GameId } from "../../src/games/index";
import { morpion } from "../../src/games/morpion/morpion";
import { chooseGame, control, initialSession, type Session } from "../../src/session";
import { DRAW, WIN } from "../games/morpion/fixture";
import { SEED } from "./engine";
import { movesTo } from "./grid";

// The reference game without a clock or an animation: Morpion
export const TURN_BASED: GameId = "morpion";

const START = morpion.init(SEED);
const SIDE = morpion.board(START).rows.length;

// The controls that place X on `cells` in turn; placing leaves the cursor where it is
const controlsFor = (cells: number[]): string[] => {
  let cursor = START.cursor;
  return cells.flatMap((cell) => {
    const moves = movesTo(cursor, cell, SIDE);
    cursor = cell;
    return [...moves, "place"];
  });
};

// Wins from the start. The bot errs at random: it lets this fork through from SEED, the seed the
// mock clock gives a game at its start or restart
export const WINNING_CONTROLS = controlsFor(WIN);

// Ends the game without a win, from a start or a restart at SEED
export const DRAW_CONTROLS = controlsFor(DRAW);

// Places X under the cursor: changes the board from the start
export const MOVE = "place";

// The turn-based game, just chosen
export const turnBased = (): Session => chooseGame(initialSession, TURN_BASED, SEED);

// The turn-based game, won
export const won = (): Session => WINNING_CONTROLS.reduce(control, turnBased());

// The game's own score once won
export const WIN_SCORE = GAMES[TURN_BASED].game.status(won().state).score;
