import type { GameId } from "./catalog";

export type Screen = "closed" | "menu" | "game";

export type Session = {
  screen: Screen;
  bandExpanded: boolean;
  // Hidden by the band's close button, until the session ends
  bandHidden: boolean;
  gameId: GameId | null;
};

export const initialSession: Session = {
  screen: "closed",
  bandExpanded: false,
  bandHidden: false,
  gameId: null,
};

export const toggleBand = (s: Session): Session => ({ ...s, bandExpanded: !s.bandExpanded });

export const hideBand = (s: Session): Session => ({ ...s, bandHidden: true });

export const chooseGame = (s: Session, id: GameId): Session => ({
  ...s,
  screen: "game",
  bandExpanded: false,
  gameId: id,
});

export const backToMenu = (s: Session): Session => ({ ...s, screen: "menu" });

export const openMenu = (s: Session): Session => ({ ...s, screen: "menu" });

// The game stays in memory: only the pane goes away
export const closePane = (s: Session): Session => ({ ...s, screen: "closed" });
