import { expect, test } from "claude-code/testing";
import { GAME_IDS, GAMES } from "../../src/games/index";
import { describe, menu } from "../../src/menu";
import { initialSession, openMenu } from "../../src/session";
import { mountDrawn, SURFACES } from "../fixtures/engine";
import { TURN_BASED, WIN_SCORE, won } from "../fixtures/turn-based";

test("a game's description gives its best score and tagline, led by paused when it is", () => {
  const s = openMenu(won());
  expect(describe(TURN_BASED, s)).toBe(`paused · best ${WIN_SCORE} · ${GAMES[TURN_BASED].tagline}`);
  for (const id of GAME_IDS.filter((other) => other !== TURN_BASED)) {
    expect(describe(id, s)).toBe(`best 0 · ${GAMES[id].tagline}`);
  }
});

for (const surface of SURFACES) {
  test(`the menu draws every game, its name on its button, on ${surface}`, async ($, on) => {
    const ui = await mountDrawn($, on, surface, ($, e) =>
      menu($.ui.resolve(e), initialSession, () => {}),
    );
    for (const id of GAME_IDS) {
      expect(await ui.find({ type: "Button", text: GAMES[id].name })).toBeDefined();
      expect(await ui.find({ type: "Text", text: describe(id, initialSession) })).toBeDefined();
    }
    await ui.unmount();
  });
}
