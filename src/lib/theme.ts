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

/**
 * Fixed per-layer colors for the Daily-movers category trend chart. Reuses the four edge
 * colors above for the layers they read most naturally against, plus two new hues (blue,
 * magenta) for the remaining layers — deliberately avoiding red/green since those are
 * reserved for up/down semantics elsewhere on the same screen.
 */
export const CATEGORY_COLORS: Record<Theme, Record<string, string>> = {
  dark: {
    "Cloud & compute": "#33b0a0",
    "Fabrication & links": "#d99a2e",
    "Frontier labs": "#8c7ad6",
    "Power & utilities": "#e0563a",
    "Software & silicon": "#5b9be0",
    "Systems & sites": "#d15fa0",
  },
  light: {
    "Cloud & compute": "#0d8f7d",
    "Fabrication & links": "#93630f",
    "Frontier labs": "#5548b8",
    "Power & utilities": "#b8285a",
    "Software & silicon": "#1a5fb4",
    "Systems & sites": "#a12f70",
  },
};
export const CATEGORY_COLOR_FALLBACK: Record<Theme, string> = {
  dark: "#a9ada8",
  light: "#4f564f",
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
