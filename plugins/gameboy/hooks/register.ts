import type { Register } from "claude-code";
import { CATALOG } from "../src/catalog";

export const register: Register = (on) => {
  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e);
    const { Text } = $.ui.resolve(e);
    return Text({ children: [`GAMEBOY · ${CATALOG.length} jeux`] });
  });
};
