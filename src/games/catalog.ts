export type GameId = "morpion" | "hogzzle";
type GameStatus = "available" | "soon";

export type CatalogEntry = {
  id: GameId;
  name: string;
  tagline: string;
  status: GameStatus;
};

export const CATALOG: readonly CatalogEntry[] = [
  {
    id: "morpion",
    name: "Morpion",
    tagline: "Three in a row against a bot",
    status: "available",
  },
  {
    id: "hogzzle",
    name: "Hogzzle",
    tagline: "Swap the tiles until the hedgehog is whole",
    status: "available",
  },
];
