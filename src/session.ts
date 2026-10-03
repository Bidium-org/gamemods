import type { GameId } from "./games/catalog";
import type { Game } from "./games/game";
import { GAMES } from "./games/index";

export type Screen = "closed" | "menu" | "game";

export type PauseReason = "manual" | "focus" | "permission" | "turn-end" | "menu";

export type Session = {
  screen: Screen;
  bandExpanded: boolean;
  // Hidden by the band's close button, until the session ends
  bandHidden: boolean;
  gameId: GameId | null;
  // The chosen game's state; null for a game not playable yet
  state: unknown;
  pause: PauseReason | null;
  // The pane's last `isFocused`
  hasFocus: boolean;
  isWorking: boolean;
  best: Partial<Record<GameId, number>>;
};

export const initialSession: Session = {
  screen: "closed",
  bandExpanded: false,
  bandHidden: false,
  gameId: null,
  state: null,
  pause: null,
  hasFocus: false,
  isWorking: false,
  best: {},
};

export const currentGame = (s: Session): Game<unknown> | undefined =>
  s.gameId ? GAMES[s.gameId] : undefined;

export const pausedGameId = (s: Session): GameId | null =>
  s.state !== null && s.pause ? s.gameId : null;

export const toggleBand = (s: Session): Session => ({
  ...s,
  bandExpanded: !s.bandExpanded,
});

export const hideBand = (s: Session): Session => ({ ...s, bandHidden: true });

// The first reason wins; nothing to pause without a game
export const pause = (s: Session, reason: PauseReason): Session =>
  s.pause || s.state === null ? s : { ...s, pause: reason };

// Lifting the pause lets the game pick up again, as `resume` decides
const unpause = (s: Session): Session => {
  const resume = currentGame(s)?.resume;
  return { ...s, pause: null, state: resume && s.state !== null ? resume(s.state) : s.state };
};

export const togglePause = (s: Session): Session => (s.pause ? unpause(s) : pause(s, "manual"));

// The same game comes back as it was left; another one abandons it
export const chooseGame = (s: Session, id: GameId, seed: number): Session => {
  const shown = { ...s, screen: "game" as const, bandExpanded: false };
  if (id === s.gameId) return shown;
  return {
    ...shown,
    gameId: id,
    state: GAMES[id]?.init(seed) ?? null,
    pause: null,
  };
};

export const openMenu = (s: Session): Session => pause({ ...s, screen: "menu" }, "menu");

// The game stays in memory: only the pane goes away, and its focus with it
export const closePane = (s: Session): Session =>
  pause({ ...s, screen: "closed", hasFocus: false }, "menu");

// The best score follows the score up
const advance = (s: Session, game: Game<unknown>, gameId: GameId, state: unknown): Session => {
  if (state === s.state) return s;
  const best = Math.max(s.best[gameId] ?? 0, game.status(state).score);
  return { ...s, state, best: { ...s.best, [gameId]: best } };
};

// A paused game ignores its keys
export const control = (s: Session, id: string): Session => {
  const game = currentGame(s);
  if (!game || !s.gameId || s.pause) return s;
  return advance(s, game, s.gameId, game.onControl(s.state, id));
};

// The clock's period: a game with `tickMs` runs only on the game screen, unpaused, not over
export const clockMs = (s: Session): number | null => {
  const game = currentGame(s);
  if (!game?.tickMs || s.screen !== "game" || s.pause || s.state === null) return null;
  return game.status(s.state).phase === "playing" ? game.tickMs : null;
};

// What the game screen shows of the game: a change that keeps it needs no redraw
export const gameView = (s: Session): string => {
  const game = currentGame(s);
  return game && s.state !== null
    ? JSON.stringify([game.board(s.state), game.status(s.state)])
    : "";
};

export const tick = (s: Session): Session => {
  const game = currentGame(s);
  if (!game?.tick || !s.gameId || clockMs(s) === null) return s;
  return advance(s, game, s.gameId, game.tick(s.state));
};

export const restart = (s: Session, seed: number): Session => {
  const game = currentGame(s);
  if (!game) return s;
  const state = game.restart?.(s.state, seed) ?? game.init(seed);
  return { ...s, state, pause: null };
};

// Losing the focus pauses; getting it back never resumes
export const observeFocus = (s: Session, isFocused: boolean): Session => {
  if (s.hasFocus === isFocused) return s;
  const seen = { ...s, hasFocus: isFocused };
  return isFocused ? seen : pause(seen, "focus");
};

export const setWorking = (s: Session, isWorking: boolean): Session =>
  s.isWorking === isWorking ? s : { ...s, isWorking };
