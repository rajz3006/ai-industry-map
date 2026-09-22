import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = "https://myaiprobe.vercel.app";
const TITLE = "The AI industry, mapped and priced";
const DESCRIPTION =
  "A live dependency map of the AI industry: frontier labs, clouds, silicon, foundries, systems vendors and power — with live market data for every public ticker.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · AI Industry Map",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "AI Industry Map",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c0f0e" },
    { media: "(prefers-color-scheme: light)", color: "#f7f5ee" },
  ],
  colorScheme: "dark light",
};

// Runs synchronously, before hydration, so the very first paint already has
// the right theme — no flash of the wrong palette. Mirrors the resolution
// order useTheme.ts uses on the client (explicit localStorage choice, else
// OS preference), just without React in the loop yet.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("aimap:theme");
    var theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
