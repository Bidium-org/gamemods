import type { Mounted } from "claude-code/testing";
import { twentyFortyEight } from "../../src/games/2048/2048";
import type { GameId } from "../../src/games/index";
import { chooseGame, initialSession, type Session } from "../../src/session";
import { isMoving } from "../games/2048/fixture";
import { SEED } from "./engine";

// The reference game with an animation: 2048
export const ANIMATED: GameId = "2048";

const { animation, controls } = twentyFortyEight;
if (!animation) throw new Error("the animated game has no animation");

// How long a move's motion is drawn
export const MOTION_MS = animation.ms;

const START = twentyFortyEight.init(SEED);
const ids = controls.map((c) => c.id);
const moves = (s: typeof START, id: string) => animation.play(s, id).state !== s;

// From the start, MOVE moves; after it, AGAIN moves again and STILL moves nothing
const pickControls = () => {
  for (const move of ids.filter((id) => moves(START, id))) {
    const after = animation.play(START, move).state;
    const again = ids.find((id) => moves(after, id));
    const still = ids.find((id) => !moves(after, id));
    if (again && still) return { MOVE: move, AGAIN: again, STILL: still };
  }
  throw new Error(`no move from SEED leaves a control that moves nothing`);
};
export const { MOVE, AGAIN, STILL } = pickControls();

// The animated game, just chosen
export const animated = (): Session => chooseGame(initialSession, ANIMATED, SEED);

// Whether the board drawn on a Desktop pane is in motion
export const isBoardMoving = async (ui: Mounted<"desktop", "Pane">) =>
  isMoving(String((await ui.find({ type: "Svg" }))?.props.source));
