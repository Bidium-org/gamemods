import type { On } from "claude-code";
import type { Engine, Mounted } from "claude-code/testing";
import type { GameId } from "../src/games/catalog";

export type EngineLog = {
  registered: unknown[];
  opened: unknown[];
  closed: string[];
  toasts: string[];
  // The plugin's store, as kept between sessions
  stored: Record<string, unknown>;
};

// The engine side of every call the mod makes: what it registers, opens, closes, toasts and stores.
// `isPlaced: false` plays a surface that leaves the pane undrawn.
export function stubEngine(
  on: On,
  { isPlaced = true, stored = {} }: { isPlaced?: boolean; stored?: Record<string, unknown> } = {},
): EngineLog {
  const log: EngineLog = { registered: [], opened: [], closed: [], toasts: [], stored };
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
  on("classic.PermissionRequest", () => ({}));
  on("turn.start", (_$, e) => ({ turnId: e.turnId }));
  on("turn.complete", (_$, e) => ({ text: e.answer }));
  // The game seed: one whose careless bot lets WINNING_KEYS win
  on("clock.now", () => ({ value: 1 }));
  on("store.get", (_$, e) => ({ value: log.stored[e.key] }));
  on("store.set", (_$, e) => {
    log.stored[e.key] = e.value;
    return { value: undefined };
  });
  return log;
}

export const BAND = {
  plugin: "gameboy",
  component: "AbovePrompt",
  requestId: "above-prompt",
  viewport: { columns: 106, rows: 52, isFullscreen: true },
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 12,
    bodyColumns: 95,
    scroll: { offset: 0, bodyRows: 12 },
    view: {},
  },
} as const;

export const PANE = {
  plugin: "gameboy",
  component: "Pane",
  requestId: "gameboy",
  viewport: { columns: 106, rows: 52, isFullscreen: true },
  props: {
    title: "Gameboy",
    isFocused: true,
    bodyColumns: 38,
    placement: "dock",
    scroll: { offset: 0, bodyRows: 46 },
    view: {},
  },
} as const;

export type Surface = "desktop" | "terminal";

// The band opens a game, as in a session
export async function openFromBand($: Engine, surface: Surface, id: GameId) {
  const band = await $.ui.mount({ ...BAND, surface });
  await band.press({ key: "band-toggle" });
  await band.press({ key: `game-${id}` });
  await band.unmount();
}

export const pressAll = async (ui: Mounted<Surface, "Pane">, keys: string[]) => {
  for (const key of keys) await ui.press({ key });
};

// From the center: X on 0, 8, 6, then 3 wins by a fork
export const WINNING_KEYS = [
  ...["control-up", "control-left", "control-place"],
  ...["control-down", "control-down", "control-right", "control-right", "control-place"],
  ...["control-left", "control-left", "control-place"],
  ...["control-up", "control-place"],
];

// The person typing `/gameboy <args>` at the prompt
export const gameboy = ($: Engine, args = "") =>
  $.command.run({
    command: "gameboy",
    args,
    origin: { kind: "composer" },
    presentation: { isFullscreen: true, columns: 106 },
  });
