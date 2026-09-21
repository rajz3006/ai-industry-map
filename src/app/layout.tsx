import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = "https://myaiprobe.vercel.app";
const TITLE = "AI Industry Map — who pays whom, what breaks first";
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
  themeColor: "#0a0e14",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
