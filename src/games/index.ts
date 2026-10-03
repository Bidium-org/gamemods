import { twentyFortyEight } from "./2048/2048";
import type { GameId } from "./catalog";
import { echo } from "./echo/echo";
import type { Game } from "./game";
import { hogzzle } from "./hogzzle/hogzzle";
import { morpion } from "./morpion/morpion";

export const GAMES: Partial<Record<GameId, Game<unknown>>> = {
  morpion,
  hogzzle,
  echo,
  "2048": twentyFortyEight,
};
