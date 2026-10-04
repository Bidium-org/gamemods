import { GAME_IDS, type GameId } from "./games/index";

export type Command = { kind: "menu" } | { kind: "stop" } | { kind: "game"; id: GameId };

// `/gamemods [game|stop]`: only the first word counts, anything unknown opens the menu
export function parseArgs(args: string): Command {
  const word = args.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (word === "stop") return { kind: "stop" };
  const id = GAME_IDS.find((g) => g === word);
  return id ? { kind: "game", id } : { kind: "menu" };
}
