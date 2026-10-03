export type GameId = "morpion" | "hogzzle" | "echo" | "2048";
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
  {
    id: "echo",
    name: "Echo",
    tagline: "Repeat the sequence, the grid grows",
    status: "available",
  },
  {
    id: "2048",
    name: "2048",
    tagline: "Slide the tiles, reach 2048",
    status: "available",
  },
];
