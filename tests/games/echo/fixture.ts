import { type EchoState, echo } from "../../../src/games/echo/echo";

export const ticks = (s: EchoState, n: number) =>
  Array.from({ length: n }).reduce<EchoState>((acc) => echo.tick?.(acc) ?? acc, s);

export const ticksUntilAnswer = (s: EchoState): { s: EchoState; count: number } => {
  let state = s;
  let count = 0;
  while (state.moment.kind !== "answer") {
    state = echo.tick?.(state) ?? state;
    count++;
  }
  return { s: state, count };
};

export const toAnswer = (s: EchoState) => ticksUntilAnswer(s).s;
