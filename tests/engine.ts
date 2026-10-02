import type { On } from "claude-code";
import type { Engine } from "claude-code/testing";

export type EngineLog = {
  registered: unknown[];
  opened: unknown[];
  closed: string[];
  toasts: string[];
};

// The engine side of every call the mod makes: what it registers, opens, closes and toasts.
// `isPlaced: false` plays a surface that leaves the pane undrawn.
export function stubEngine(on: On, { isPlaced = true } = {}): EngineLog {
  const log: EngineLog = { registered: [], opened: [], closed: [], toasts: [] };
  on("session.start", () => ({ cwd: "/work" }));
  on("ui.render", () => ({ type: "Text", props: {}, children: ["engine band"] }));
  on("command.register", (_$, e) => {
    log.registered.push(e);
    return { value: { command: e.name } };
  });
  on("ui.open", (_$, e) => {
    log.opened.push(e);
    return { value: isPlaced ? { isPlaced: true } : { isPlaced: false, reason: "too narrow" } };
  });
  on("ui.close", (_$, e) => {
    log.closed.push(e.id);
    return { value: undefined };
  });
  on("ui.panes", () => ({
    value: log.opened.length
      ? [{ id: "gameboy", title: "Gameboy", isShown: true, isFocused: false, isPlaced }]
      : [],
  }));
  on("ui.toast", (_$, e) => {
    log.toasts.push(e.text);
    return { value: undefined };
  });
  return log;
}

// The person typing `/gameboy <args>` at the prompt
export const gameboy = ($: Engine, args = "") =>
  $.command.run({
    command: "gameboy",
    args,
    origin: { kind: "composer" },
    presentation: { isFullscreen: true, columns: 106 },
  });
