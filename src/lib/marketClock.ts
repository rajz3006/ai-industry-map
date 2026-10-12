// Pure ET market-clock helpers for the Closing Bell tab. No I/O, no React — safe to
// import from components and (if ever needed) server code. All times are America/New_York;
// regular session is 9:30–16:00 ET and the "closing window" this tab cares about is the
// final 30 minutes, 15:30–16:00 ET. Weekends report as closed; exchange holidays are not
// modeled here — callers label data with its session date instead of claiming "live".

export type MarketPhase = "pre" | "open" | "window" | "closed" | "weekend";

export interface MarketWindowState {
  phase: MarketPhase;
  /** New-York wall time, e.g. "3:12 PM". */
  nyTime: string;
  /** New-York date, e.g. "Mon Oct 12". */
  nyDate: string;
  /** ms until the 3:30 PM ET window opens (phase "open"); 0 otherwise. */
  msToWindow: number;
  /** ms until the 4:00 PM ET close (phases "open"/"window"); 0 otherwise. */
  msToClose: number;
}

const NY_TZ = "America/New_York";
const OPEN_MINUTES = 9 * 60 + 30; // 9:30 ET
const CLOSE_MINUTES = 16 * 60; // 16:00 ET
const WINDOW_MINUTES = 15 * 60 + 30; // 15:30 ET

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: NY_TZ,
  hour: "numeric",
  minute: "2-digit",
});
const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: NY_TZ,
  weekday: "short",
  month: "short",
  day: "numeric",
});
const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: NY_TZ,
  hour: "numeric",
  minute: "numeric",
  hour12: false,
  weekday: "short",
});

function nyParts(nowMs: number): { minutes: number; weekday: string } {
  const parts = partsFmt.formatToParts(new Date(nowMs));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  // hour/minute arrive as separate parts ("15" / "45"), not a combined "15:45".
  const h = Number(get("hour"));
  const m = Number(get("minute"));
  return { minutes: h * 60 + m, weekday: get("weekday") };
}

export function getMarketWindowState(nowMs: number): MarketWindowState {
  const { minutes, weekday } = nyParts(nowMs);
  const nyTime = timeFmt.format(new Date(nowMs));
  const nyDate = dateFmt.format(new Date(nowMs));

  if (weekday === "Sat" || weekday === "Sun") {
    return { phase: "weekend", nyTime, nyDate, msToWindow: 0, msToClose: 0 };
  }

  const dayMs = 24 * 60 * 60_000;

  if (minutes < OPEN_MINUTES) {
    return {
      phase: "pre",
      nyTime,
      nyDate,
      msToWindow: (WINDOW_MINUTES - minutes) * 60_000,
      msToClose: 0,
    };
  }
  if (minutes < WINDOW_MINUTES) {
    return {
      phase: "open",
      nyTime,
      nyDate,
      msToWindow: (WINDOW_MINUTES - minutes) * 60_000,
      msToClose: (CLOSE_MINUTES - minutes) * 60_000,
    };
  }
  if (minutes < CLOSE_MINUTES) {
    return {
      phase: "window",
      nyTime,
      nyDate,
      msToWindow: 0,
      msToClose: (CLOSE_MINUTES - minutes) * 60_000,
    };
  }
  // After the close the next window is tomorrow 15:30 ET (or Monday if Friday).
  const daysAhead = weekday === "Fri" ? 3 : 1;
  return {
    phase: "closed",
    nyTime,
    nyDate,
    msToWindow: daysAhead * dayMs - minutes * 60_000 + WINDOW_MINUTES * 60_000,
    msToClose: 0,
  };
}

/** "2h 14m" / "42m 10s" / "38s" — compact countdown label. */
export function formatCountdown(ms: number): string {
  const totalS = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}
