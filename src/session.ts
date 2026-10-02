import type { GameId } from "./catalog";

export type Screen = "closed" | "menu" | "game";

export type Session = {
  screen: Screen;
  bandExpanded: boolean;
  gameId: GameId | null;
};

export const initialSession: Session = { screen: "closed", bandExpanded: false, gameId: null };

export const toggleBand = (s: Session): Session => ({ ...s, bandExpanded: !s.bandExpanded });

export const chooseGame = (s: Session, id: GameId): Session => ({
  ...s,
  screen: "game",
  bandExpanded: false,
  gameId: id,
});

export const backToMenu = (s: Session): Session => ({ ...s, screen: "menu" });
