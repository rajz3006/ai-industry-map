import type { Theme } from "@/hooks/useTheme";

/**
 * Theme-aware color maps for the two pieces of UI that take color as JS
 * config rather than CSS: NetworkGraph's SVG marker fills (ARROW_COLORS) and
 * StockDetail's lightweight-charts instance. Values here must mirror the
 * matching custom properties in globals.css exactly (--supply/--money/
 * --power/--partner and the chart-adjacent tokens) — they're duplicated
 * rather than read from computed styles so both themes are available
 * synchronously without a DOM round-trip, and are validated (contrast + CVD)
 * alongside the CSS palette; see globals.css's theme block comments.
 */
export const EDGE_COLORS: Record<Theme, Record<"supply" | "money" | "power" | "partner", string>> = {
  dark: {
    supply: "#33b0a0",
    money: "#d99a2e",
    power: "#e0563a",
    partner: "#8c7ad6",
  },
  light: {
    supply: "#0d8f7d",
    money: "#93630f",
    power: "#b8285a",
    partner: "#5548b8",
  },
};

export const CHART_THEME: Record<
  Theme,
  { text: string; grid: string; border: string; up: string; down: string }
> = {
  dark: {
    text: "#a9ada8",
    grid: "#232b27",
    border: "#303a35",
    up: "#74c69d",
    down: "#ff725e",
  },
  light: {
    text: "#4f564f",
    grid: "#e2ddca",
    border: "#d7d0bc",
    up: "#157a49",
    down: "#b8291a",
  },
};
