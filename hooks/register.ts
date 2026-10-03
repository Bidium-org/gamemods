import type { EngineInterface, Register } from "claude-code";
import { band, WIDEN } from "../src/band";
import { parseArgs } from "../src/command";
import { CATALOG, type GameId } from "../src/games/catalog";
import { pane } from "../src/pane";
import {
  chooseGame,
  closePane,
  control,
  hideBand,
  initialSession,
  observeFocus,
  openMenu,
  pause,
  restart,
  type Session,
  setWorking,
  toggleBand,
  togglePause,
} from "../src/session";

const PANE_ID = "gameboy";

let session = initialSession;

// The engine reads `$` only at `$.noun.event(...)` call sites and in top-level functions like this
function commit($: EngineInterface, next: Session) {
  if (next === session) return;
  session = next;
  $.ui.invalidate("ui.render");
}

// An unplaced pane is open but undrawn: the band says why, and a toast covers a hidden band
async function openPane($: EngineInterface) {
  const opened = await $.ui.open({
    id: PANE_ID,
    title: "Gameboy",
    focus: true,
  });
  if (opened.isPlaced) return;
  $.ui.invalidate("ui.render");
  if (session.bandHidden) $.ui.toast(WIDEN);
}

const bestKey = (id: GameId) => `best:${id}`;

const asScore = (stored: unknown): number => (typeof stored === "number" ? stored : 0);

async function loadBest($: EngineInterface): Promise<Session["best"]> {
  const best: Session["best"] = {};
  for (const { id } of CATALOG.filter((g) => g.status === "available")) {
    best[id] = asScore(await $.store.get(bestKey(id)));
  }
  return best;
}

// The store is shared by every session of the machine: re-read it so a write never lowers a score
async function saveBest($: EngineInterface, id: GameId, score: number) {
  if (asScore(await $.store.get(bestKey(id))) >= score) return;
  await $.store.set(bestKey(id), score);
}

async function play($: EngineInterface, controlId: string) {
  const before = session;
  commit($, control(session, controlId));
  const { gameId, best } = session;
  if (gameId && best[gameId] !== before.best[gameId]) await saveBest($, gameId, best[gameId] ?? 0);
}

export const register: Register = (on) => {
  on("session.start", async ($, e, next) => {
    await $.command.register({
      name: "gameboy",
      description: "Open the game console, or a game by id; stop closes it",
      argumentHint: "[game|stop]",
      immediate: true,
    });
    commit($, { ...session, best: await loadBest($) });
    return next(e);
  });

  on("command.run", { command: "gameboy" }, async ($, e) => {
    const command = parseArgs(e.args);
    if (command.kind === "stop") {
      await $.ui.close({ id: PANE_ID });
      commit($, closePane(session));
      return {};
    }
    commit(
      $,
      command.kind === "game"
        ? chooseGame(session, command.id, await $.clock.now())
        : openMenu(session),
    );
    await openPane($);
    return {};
  });

  // Raised when a permission dialog is about to show, a subagent's included; auto mode's
  // classifier answers without one
  on("classic.PermissionRequest", async ($, e, next) => {
    commit($, pause(session, "permission"));
    return next(e);
  });

  on("turn.start", async ($, e, next) => {
    commit($, setWorking(session, true));
    return next(e);
  });

  on("turn.complete", async ($, e, next) => {
    if (e.agentId === undefined) commit($, setWorking(pause(session, "turn-end"), false));
    return next(e);
  });

  on("ui.close", async ($, e, next) => {
    if (e.id === PANE_ID && e.origin.kind === "person") commit($, closePane(session));
    return next(e);
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
        commit($, chooseGame(session, id, await $.clock.now()));
        await openPane($);
      },
      onClose: () => commit($, hideBand(session)),
    });
  });

  on("ui.render", { component: "Pane" }, async ($, e, next) => {
    if (e.requestId !== PANE_ID || session.screen === "closed") return next(e);
    // No invalidate while drawing: on Desktop it leaves the drawn tree's buttons unhandled.
    // This drawing already shows the new state; the band catches up at the next redraw
    session = observeFocus(session, e.props.isFocused);
    const view = {
      isFocused: e.props.isFocused,
      bodyColumns: e.props.bodyColumns,
      bodyRows: e.props.scroll.bodyRows,
    };
    return pane($.ui.resolve(e), session, view, {
      onChoose: async (id) => commit($, chooseGame(session, id, await $.clock.now())),
      onBack: () => commit($, openMenu(session)),
      onControl: (id) => play($, id),
      onPause: () => commit($, togglePause(session)),
      onRestart: async () => commit($, restart(session, await $.clock.now())),
    });
  });
};
