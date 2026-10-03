import { CATALOG, type GameId } from "./games/catalog";

export type Command = { kind: "menu" } | { kind: "stop" } | { kind: "game"; id: GameId };

// `/gameboy [game|stop]`: only the first word counts, anything unknown opens the menu
export function parseArgs(args: string): Command {
  const word = args.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (word === "stop") return { kind: "stop" };
  const entry = CATALOG.find((g) => g.id === word);
  return entry ? { kind: "game", id: entry.id } : { kind: "menu" };
}
