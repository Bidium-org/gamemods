import type { GameId } from "../catalog";
import type { Game } from "./game";
import { morpion } from "./morpion";

export const GAMES: Partial<Record<GameId, Game<unknown>>> = { morpion };
