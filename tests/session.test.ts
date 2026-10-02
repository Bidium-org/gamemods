import { expect, test } from "claude-code/testing";
import {
  chooseGame,
  closePane,
  hideBand,
  initialSession,
  openMenu,
  toggleBand,
} from "../src/session";

test("the band folds and unfolds", () => {
  const open = toggleBand(initialSession);
  expect(open.bandExpanded).toBe(true);
  expect(toggleBand(open).bandExpanded).toBe(false);
});

test("choosing a game folds the band and shows the game screen", () => {
  const s = chooseGame(toggleBand(initialSession), "morpion");
  expect(s).toEqual({ screen: "game", bandExpanded: false, bandHidden: false, gameId: "morpion" });
});

test("opening the menu keeps the chosen game", () => {
  const s = openMenu(chooseGame(initialSession, "snake"));
  expect(s).toEqual({ screen: "menu", bandExpanded: false, bandHidden: false, gameId: "snake" });
});

test("hiding the band keeps the screen and the chosen game", () => {
  const playing = chooseGame(initialSession, "tetris");
  expect(hideBand(playing)).toEqual({ ...playing, bandHidden: true });
});

test("closing the pane keeps the game in memory", () => {
  const s = closePane(chooseGame(initialSession, "morpion"));
  expect(s).toMatchObject({ screen: "closed", gameId: "morpion" });
});
