import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Industry Map",
  description:
    "Who pays whom and what breaks first — a live dependency map of the AI industry's capital, compute, chip supply and power relationships.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
