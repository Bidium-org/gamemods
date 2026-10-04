export type GameId = "morpion" | "hogzzle" | "echo" | "2048";

export type CatalogEntry = {
  id: GameId;
  name: string;
  tagline: string;
};

export const CATALOG: readonly CatalogEntry[] = [
  {
    id: "morpion",
    name: "Morpion",
    tagline: "Three in a row against a bot",
  },
  {
    id: "hogzzle",
    name: "Hogzzle",
    tagline: "Swap the tiles until the hedgehog is whole",
  },
  {
    id: "echo",
    name: "Echo",
    tagline: "Repeat the sequence, the grid grows",
  },
  {
    id: "2048",
    name: "2048",
    tagline: "Slide the tiles, reach 2048",
  },
];
