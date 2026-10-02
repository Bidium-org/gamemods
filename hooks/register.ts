import type { EngineInterface, Register } from "claude-code";
import { band, WIDEN } from "../src/band";
import { parseArgs } from "../src/command";
import { pane } from "../src/pane";
import {
  chooseGame,
  closePane,
  hideBand,
  initialSession,
  openMenu,
  type Session,
  toggleBand,
} from "../src/session";

const PANE_ID = "gameboy";

let session = initialSession;

// The engine reads `$` only at `$.noun.event(...)` call sites and in top-level functions like this
function commit($: EngineInterface, next: Session) {
  session = next;
  $.ui.invalidate("ui.render");
}

// An unplaced pane is open but undrawn: the band says why, and a toast covers a hidden band
async function openPane($: EngineInterface) {
  const opened = await $.ui.open({ id: PANE_ID, title: "Gameboy", focus: true });
  if (opened.isPlaced) return;
  $.ui.invalidate("ui.render");
  if (session.bandHidden) $.ui.toast(WIDEN);
}

export const register: Register = (on) => {
  on("session.start", async ($, e, next) => {
    await $.command.register({
      name: "gameboy",
      description: "Open the game console, or a game by id; stop closes it",
      argumentHint: "[game|stop]",
      immediate: true,
    });
    return next(e);
  });

  on("command.run", { command: "gameboy" }, async ($, e) => {
    const command = parseArgs(e.args);
    if (command.kind === "stop") {
      await $.ui.close({ id: PANE_ID });
      commit($, closePane(session));
      return {};
    }
    commit($, command.kind === "game" ? chooseGame(session, command.id) : openMenu(session));
    await openPane($);
    return {};
  });

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    if (e.props.hasSurvey || session.bandHidden) return next(e);
    const theirs = await next(e);
    const panes = await $.ui.panes();
    const view = {
      isWorking: e.props.isWorking,
      isPaneUnplaced: panes.some((p) => p.id === PANE_ID && !p.isPlaced),
    };
    return band($.ui.resolve(e), session, view, theirs, {
      onToggle: () => commit($, toggleBand(session)),
      onChoose: async (id) => {
        commit($, chooseGame(session, id));
        await openPane($);
      },
      onClose: () => commit($, hideBand(session)),
    });
  });

  on("ui.render", { component: "Pane" }, async ($, e, next) => {
    if (e.requestId !== PANE_ID || session.screen === "closed") return next(e);
    const view = { isFocused: e.props.isFocused, bodyRows: e.props.scroll.bodyRows };
    return pane($.ui.resolve(e), session, view, {
      onChoose: (id) => commit($, chooseGame(session, id)),
      onBack: () => commit($, openMenu(session)),
    });
  });
};
