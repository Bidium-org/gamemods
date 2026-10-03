import type { GameId } from "./catalog";
import type { Game } from "./game";
import { hogzzle } from "./hogzzle/hogzzle";
import { morpion } from "./morpion/morpion";

export const GAMES: Partial<Record<GameId, Game<unknown>>> = { morpion, hogzzle };
