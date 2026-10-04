import { expect, test } from "claude-code/testing";
import { GAME_IDS, GAMES } from "../../src/games/index";
import { NOT_ON_SURFACE } from "../../src/pane";
import { openGame, SURFACES } from "../fixtures/engine";

// Every game opens on every surface in a pane the surface accepts: `drawn` rejects a tree the
// surface refuses, which the engine would replace with the site

for (const surface of SURFACES) {
  for (const id of GAME_IDS) {
    const { name, game } = GAMES[id];
    test(`${name} draws a valid pane with its controls, paused or not, on ${surface}`, async ($, on) => {
      const { ui } = await openGame($, on, surface, id);
      expect(await ui.drawn()).toBeDefined();

      // A board this surface has no renderer for says so, with no control to press
      const isDrawn = !(await ui.find({ type: "Text", text: NOT_ON_SURFACE }));
      for (const c of game.controls) {
        expect(Boolean(await ui.find({ key: `control-${c.id}` }))).toBe(isDrawn);
      }

      if (isDrawn) {
        await ui.press({ key: "pane-pause" });
        expect(await ui.drawn()).toBeDefined();
      }
      await ui.unmount();
    });
  }
}
