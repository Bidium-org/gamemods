import { expect, test } from "claude-code/testing";
import { GAME_IDS, GAMES } from "../../src/games/index";
import {
  CLICK_FOR_KEYBOARD,
  CLICK_TO_PLAY,
  NOT_ON_SURFACE,
  scoreLine,
  WIDEN_PANE,
} from "../../src/pane";
import { restart } from "../../src/session";
import {
  A_GAME,
  openGame,
  PANE,
  paneWith,
  pressControls,
  SEED,
  SURFACES,
  UNFOCUSED,
} from "../fixtures/engine";
import { TURN_BASED, WIN_SCORE, WINNING_CONTROLS, won } from "../fixtures/turn-based";

for (const surface of SURFACES) {
  test(`the pane goes from a game to the menu and to every game on ${surface}`, async ($, on) => {
    const { ui } = await openGame($, on, surface, A_GAME);
    for (const id of GAME_IDS) {
      await ui.press({ key: "pane-back" });
      for (const listed of GAME_IDS) {
        expect(await ui.find({ key: `game-${listed}` })).toBeDefined();
      }

      await ui.press({ key: `game-${id}` });
      expect(await ui.find({ type: "Text", text: GAMES[id].name })).toBeDefined();
      expect(await ui.find({ key: "pane-back" })).toBeDefined();
    }
    await ui.unmount();
  });

  test(`the header shows the best score after a win, and keeps it after a restart on ${surface}`, async ($, on) => {
    const { ui } = await openGame($, on, surface, TURN_BASED);
    await pressControls(ui, WINNING_CONTROLS);
    expect(await ui.find({ type: "Text", text: scoreLine(WIN_SCORE, WIN_SCORE) })).toBeDefined();

    await ui.press({ key: "pane-restart" });
    const again = restart(won(), SEED);
    const score = GAMES[TURN_BASED].game.status(again.state).score;
    expect(await ui.find({ type: "Text", text: scoreLine(score, WIN_SCORE) })).toBeDefined();
    await ui.unmount();
  });

  for (const id of GAME_IDS) {
    const { name, game } = GAMES[id];
    test(`a pane below ${name}'s size hides it, asking for a wider window if ${surface} draws it`, async ($, on) => {
      const pane = paneWith({ bodyRows: game.size.rows - 1 });
      const { ui } = await openGame($, on, surface, id, { pane });
      // A game this surface cannot draw says so instead, whatever the room
      const isDrawn = !(await ui.find({ type: "Text", text: NOT_ON_SURFACE }));
      expect(Boolean(await ui.find({ type: "Text", text: WIDEN_PANE }))).toBe(isDrawn);
      for (const control of game.controls) {
        expect(await ui.find({ key: `control-${control.id}` })).toBeUndefined();
      }
      await ui.press({ key: "pane-back" });
      expect(await ui.find({ key: `game-${id}` })).toBeDefined();
      await ui.unmount();
    });
  }

  test(`the pane root fills the body on both screens on ${surface}`, async ($, on) => {
    const { ui } = await openGame($, on, surface, A_GAME);
    const filled = { type: "Box", props: { minHeight: PANE.props.scroll.bodyRows } };
    expect(await ui.drawn()).toMatchObject(filled);

    await ui.press({ key: "pane-back" });
    expect(await ui.drawn()).toMatchObject(filled);
    await ui.unmount();
  });

  test(`the pane asks for a click when it has no keyboard on ${surface}`, async ($, on) => {
    const { ui } = await openGame($, on, surface, A_GAME, { pane: UNFOCUSED });
    expect(await ui.find({ type: "Text", text: CLICK_TO_PLAY })).toBeDefined();
    await ui.press({ key: "pane-back" });
    expect(await ui.find({ type: "Text", text: CLICK_FOR_KEYBOARD })).toBeDefined();
    await ui.unmount();
  });
}
