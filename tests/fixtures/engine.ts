import type { Hook, On } from "claude-code";
import { type Engine, type MockClock, type Mounted, mock } from "claude-code/testing";
import { GAME_IDS, type GameId } from "../../src/games/index";

// Every test plays on both surfaces
export const SURFACES = ["desktop", "terminal"] as const;
export type Surface = (typeof SURFACES)[number];

// The game seed, and the instant the mock clock starts at.
export const SEED = 1;

const CWD = "/work";

// Any game, for a test the game does not matter to. GAMES is never empty
export const A_GAME = GAME_IDS[0] as GameId;

export const PANE_OPENED = { id: "gamemods", title: "Gamemods", focus: true };

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

type StubOptions = { isPlaced?: boolean; stored?: Record<string, unknown> };

// The engine side of every call the mod makes: what it registers, opens, closes, toasts and stores.
// `isPlaced: false` plays a surface that leaves the pane undrawn.
function stubEngine(on: On, { isPlaced = true, stored = {} }: StubOptions = {}): EngineLog {
  const clock = mock.clock(on, { now: SEED });
  const log: EngineLog = {
    registered: [],
    opened: [],
    closed: [],
    toasts: [],
    stored,
    clock,
  };
  on("session.start", () => ({ cwd: CWD }));
  on("ui.render", () => ({
    type: "Text",
    props: {},
    children: ["engine band"],
  }));
  on("command.register", (_$, e) => {
    log.registered.push(e);
    return { value: { command: e.name } };
  });
  on("ui.open", (_$, e) => {
    log.opened.push(e);
    return {
      value: isPlaced ? { isPlaced: true } : { isPlaced: false, reason: "too narrow" },
    };
  });
  on("ui.close", (_$, e) => {
    log.closed.push(e.id);
    return { value: undefined };
  });
  on("ui.panes", () => ({
    value: log.opened.length
      ? [
          {
            id: PANE_OPENED.id,
            title: PANE_OPENED.title,
            isShown: true,
            isFocused: false,
            isPlaced,
          },
        ]
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

// The band opens a game, as in a session
async function openFromBand($: Engine, surface: Surface, id: GameId) {
  const band = await $.ui.mount({ ...BAND, surface });
  await band.press({ key: "band-toggle" });
  await band.press({ key: `game-${id}` });
  await band.unmount();
}

// The engine stubbed and a session started on `surface`
export async function startSession($: Engine, on: On, surface: Surface, options?: StubOptions) {
  const engine = stubEngine(on, options);
  await $.session.start({ surface, isInteractive: true, cwd: CWD });
  return engine;
}

// The pane's mount spec, with the props a test varies
export const paneWith = ({
  isFocused = true,
  bodyRows = PANE.props.scroll.bodyRows,
  placement = PANE.props.placement,
}: {
  isFocused?: boolean;
  bodyRows?: number;
  placement?: "dock" | "inline";
} = {}) => ({
  ...PANE,
  props: {
    ...PANE.props,
    isFocused,
    placement,
    scroll: { offset: 0, bodyRows },
  },
});

export const UNFOCUSED = paneWith({ isFocused: false });

// A session with `id` open from the band, its pane mounted: what most tests start from
export async function openGame<S extends Surface>(
  $: Engine,
  on: On,
  surface: S,
  id: GameId,
  { pane = paneWith(), ...options }: StubOptions & { pane?: ReturnType<typeof paneWith> } = {},
) {
  const engine = await startSession($, on, surface, options);
  await openFromBand($, surface, id);
  const ui = await $.ui.mount({ ...pane, surface });
  return { engine, ui };
}

// A session where `draw` renders the mount in place of the mod, for one function under test
export async function mountDrawn(
  $: Engine,
  on: On,
  surface: Surface,
  draw: Hook<"ui.render">,
  spec: Omit<Parameters<Engine["ui"]["mount"]>[0], "surface"> = PANE,
) {
  on("session.start", () => ({ cwd: CWD }));
  on("ui.render", draw);
  await $.session.start({ surface, isInteractive: true, cwd: CWD });
  return $.ui.mount({ ...spec, surface });
}

// Presses each of the game's `controls` in turn
export const pressControls = async <S extends Surface>(
  ui: Mounted<S, "Pane">,
  controls: string[],
) => {
  for (const id of controls) await ui.press({ key: `control-${id}` });
};

// The color of the frame around the board; none unless the game is paused
export const frameColor = async <S extends Surface>(ui: Mounted<S, "Pane">) =>
  (await ui.findAll({ type: "Box" })).find((box) => box.props.borderStyle === "round")?.props
    .borderColor;

export const pressAll = async <S extends Surface>(ui: Mounted<S, "Pane">, keys: string[]) => {
  for (const key of keys) await ui.press({ key });
};

// The person typing `/gamemods <args>` at the prompt
export const gamemods = ($: Engine, args = "") =>
  $.command.run({
    command: "gamemods",
    args,
    origin: { kind: "composer" },
    presentation: { isFullscreen: true, columns: 106 },
  });
