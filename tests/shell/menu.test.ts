import { expect, test } from "claude-code/testing";
import { menu } from "../../src/menu";
import { initialSession } from "../../src/session";
import { mountDrawn, SURFACES } from "../fixtures/engine";

for (const surface of SURFACES) {
  test(`the menu draws one button per game on ${surface}, name only`, async ($, on) => {
    const ui = await mountDrawn($, on, surface, ($, e) =>
      menu($.ui.resolve(e), initialSession, () => {}),
    );
    for (const name of ["Morpion", "Hogzzle", "2048"]) {
      expect(await ui.find({ type: "Button", text: name })).toBeDefined();
    }
    expect(
      await ui.find({ type: "Text", text: "best 0 · Three in a row against a bot" }),
    ).toBeDefined();
    expect(
      await ui.find({ type: "Text", text: "best 0 · Swap the tiles until the hedgehog is whole" }),
    ).toBeDefined();
    expect(
      await ui.find({ type: "Text", text: "best 0 · Slide the tiles, reach 2048" }),
    ).toBeDefined();
    await ui.unmount();
  });
}
