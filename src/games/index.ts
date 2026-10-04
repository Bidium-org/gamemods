import { twentyFortyEight } from "./2048/2048";
import { echo } from "./echo/echo";
import type { Game } from "./game";
import { hogzzle } from "./hogzzle/hogzzle";
import { morpion } from "./morpion/morpion";

export type GameEntry = { name: string; tagline: string; game: Game<unknown, unknown> };

// The key is the game's id: typed after `/gamemods` and stored with the best score, so it never changes
const ENTRIES = {
  morpion: { name: "Morpion", tagline: "Three in a row against a bot", game: morpion },
  hogzzle: {
    name: "Hogzzle",
    tagline: "Swap the tiles until the hedgehog is whole",
    game: hogzzle,
  },
  echo: { name: "Echo", tagline: "Repeat the sequence, the grid grows", game: echo },
  "2048": { name: "2048", tagline: "Slide the tiles, reach 2048", game: twentyFortyEight },
} satisfies Record<string, GameEntry>;

export type GameId = keyof typeof ENTRIES;

// Widened: one entry type for every id, so the shell calls any game the same way
export const GAMES: Record<GameId, GameEntry> = ENTRIES;

// The menu's order: JS puts an integer-like key ("2048") before the others
export const GAME_IDS = Object.keys(GAMES) as GameId[];
