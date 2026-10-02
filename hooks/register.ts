import type { EngineInterface, Register } from "claude-code";
import { band } from "../src/band";
import { pane } from "../src/pane";
import { backToMenu, chooseGame, initialSession, type Session, toggleBand } from "../src/session";

const PANE_ID = "gameboy";

let session = initialSession;

// The engine reads `$` only at `$.noun.event(...)` call sites and in top-level functions like this
function commit($: EngineInterface, next: Session) {
  session = next;
  $.ui.invalidate("ui.render");
}

export const register: Register = (on) => {
  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e);
    const theirs = await next(e);
    return band($.ui.resolve(e), session, e.props.isWorking, theirs, {
      onToggle: () => commit($, toggleBand(session)),
      onChoose: async (id) => {
        commit($, chooseGame(session, id));
        await $.ui.open({ id: PANE_ID, title: "Gameboy", focus: true });
      },
    });
  });

  on("ui.render", { component: "Pane" }, async ($, e, next) => {
    if (e.requestId !== PANE_ID || session.screen === "closed") return next(e);
    const view = { isFocused: e.props.isFocused, bodyRows: e.props.scroll.bodyRows };
    return pane($.ui.resolve(e), session, view, {
      onChoose: (id) => commit($, chooseGame(session, id)),
      onBack: () => commit($, backToMenu(session)),
    });
  });
};
