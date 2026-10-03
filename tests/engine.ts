import type { On } from "claude-code";
import { type Engine, type MockClock, type Mounted, mock } from "claude-code/testing";
import type { GameId } from "../src/games/catalog";

export type EngineLog = {
  registered: unknown[];
  opened: unknown[];
  closed: string[];
  toasts: string[];
  // The plugin's store, as kept between sessions
  stored: Record<string, unknown>;
  // Moves only when the test advances it
  clock: MockClock;
};

// The engine side of every call the mod makes: what it registers, opens, closes, toasts and stores.
// `isPlaced: false` plays a surface that leaves the pane undrawn.
export function stubEngine(
  on: On,
  { isPlaced = true, stored = {} }: { isPlaced?: boolean; stored?: Record<string, unknown> } = {},
): EngineLog {
  // The game seed: its careless bot lets WINNING_KEYS win; LOSING_2048_KEYS end a 2048 game
  const clock = mock.clock(on, { now: 1 });
  const log: EngineLog = { registered: [], opened: [], closed: [], toasts: [], stored, clock };
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
      ? [{ id: "gamemods", title: "Gamemods", isShown: true, isFocused: false, isPlaced }]
      : [],
  }));
  on("ui.toast", (_$, e) => {
    log.toasts.push(e.text);
    return { value: undefined };
  });
  on("classic.PermissionRequest", () => ({}));
  on("turn.start", (_$, e) => ({ turnId: e.turnId }));
  on("turn.complete", (_$, e) => ({ text: e.answer }));
  on("store.get", (_$, e) => ({ value: log.stored[e.key] }));
  on("store.set", (_$, e) => {
    log.stored[e.key] = e.value;
    return { value: undefined };
  });
  return log;
}

export const BAND = {
  plugin: "gamemods",
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
  plugin: "gamemods",
  component: "Pane",
  requestId: "gamemods",
  viewport: { columns: 106, rows: 52, isFullscreen: true },
  props: {
    title: "Gamemods",
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

export const pressAll = async <S extends Surface>(ui: Mounted<S, "Pane">, keys: string[]) => {
  for (const key of keys) await ui.press({ key });
};

// From the center: X on 0, 8, 6, then 3 wins by a fork
export const WINNING_KEYS = [
  ...["control-up", "control-left", "control-place"],
  ...["control-down", "control-down", "control-right", "control-right", "control-place"],
  ...["control-left", "control-left", "control-place"],
  ...["control-up", "control-place"],
];

// From seed 1, cycling left, down, right, up runs out of moves with a score of 3140
export const LOSING_2048_KEYS = Array.from(
  { length: 261 },
  (_, i) => `control-${["left", "down", "right", "up"][i % 4]}`,
);

// The person typing `/gamemods <args>` at the prompt
export const gamemods = ($: Engine, args = "") =>
  $.command.run({
    command: "gamemods",
    args,
    origin: { kind: "composer" },
    presentation: { isFullscreen: true, columns: 106 },
  });
