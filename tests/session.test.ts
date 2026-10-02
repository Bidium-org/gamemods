import { expect, test } from "claude-code/testing";
import { backToMenu, chooseGame, initialSession, toggleBand } from "../src/session";

test("the band folds and unfolds", () => {
  const open = toggleBand(initialSession);
  expect(open.bandExpanded).toBe(true);
  expect(toggleBand(open).bandExpanded).toBe(false);
});

test("choosing a game folds the band and shows the game screen", () => {
  const s = chooseGame(toggleBand(initialSession), "morpion");
  expect(s).toEqual({ screen: "game", bandExpanded: false, gameId: "morpion" });
});

test("going back to the menu keeps the chosen game", () => {
  const s = backToMenu(chooseGame(initialSession, "snake"));
  expect(s).toEqual({ screen: "menu", bandExpanded: false, gameId: "snake" });
});
