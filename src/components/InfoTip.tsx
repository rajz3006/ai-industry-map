"use client";

/** Small "i" badge that reveals an explanation on hover/focus — a CSS-only tooltip (no JS
 * state), so it's cheap to drop next to any config input. */
export default function InfoTip({ text }: { text: string }) {
  return <span className="info-tip" tabIndex={0} aria-label={text} data-tip={text} />;
}
