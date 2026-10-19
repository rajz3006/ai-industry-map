"use client";

import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

export type EntrySeal = "verified" | "estimated";

/**
 * A Markets-table range cell with a rich hover/focus tooltip showing the FULL methodology
 * breakdown — every input that went into the number — plus the trust seal.
 *
 * The tooltip is position:fixed and placed via JS (not CSS hover) because the table lives
 * inside an overflow-x:auto scroller that would clip a CSS-only absolutely-positioned card.
 */
export function EntryRangeCell({
  title,
  seal,
  lines,
  warnings,
  footer,
  touch,
  children,
}: {
  title: string;
  seal: EntrySeal;
  lines: string[];
  warnings: string[];
  footer: string;
  touch: "touched" | "below" | "above" | null;
  children: ReactNode;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [tipStyle, setTipStyle] = useState<CSSProperties | null>(null);

  function show() {
    const el = anchorRef.current;
    if (!el || typeof window === "undefined") return;
    const r = el.getBoundingClientRect();
    const w = Math.min(430, window.innerWidth - 24);
    const x = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
    const maxH = 400;
    const fitsBelow = r.bottom + 12 + maxH <= window.innerHeight;
    setTipStyle({
      left: x,
      width: w,
      maxHeight: maxH,
      ...(fitsBelow
        ? { top: r.bottom + 12 }
        : { bottom: window.innerHeight - r.top + 12 }),
    });
  }
  function hide() {
    setTipStyle(null);
  }

  return (
    <span
      ref={anchorRef}
      className={`mk-entry-cell mk-tip-anchor ${touch ?? ""}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      aria-label={`${title}. ${lines.join(". ")}`}
    >
      {children}
      <span
        className={`mk-seal ${seal}`}
        title={
          seal === "verified"
            ? "Methodology verified: full statement data, healthy balance sheet, no material estimation"
            : "Estimated: fallback or approximated inputs — treat the range as approximate"
        }
      >
        {seal === "verified" ? "✓ verified" : "~ estimated"}
      </span>
      {touch === "touched" && <span className="mk-entry-badge">touched</span>}
      {touch === "below" && <span className="mk-entry-badge below">below</span>}
      {tipStyle && (
        <span className="mk-tip-card" style={tipStyle} role="tooltip">
          <span className="mk-tip-title">
            {title} <span className={`mk-seal ${seal}`}>{seal === "verified" ? "✓ verified" : "~ estimated"}</span>
          </span>
          <span className="mk-tip-lines">
            {lines.map((l, i) => (
              <span key={i} className="mk-tip-line">
                {l}
              </span>
            ))}
          </span>
          {warnings.length > 0 && (
            <span className="mk-tip-warnings">
              {warnings.map((w, i) => (
                <span key={i} className="mk-tip-warn">
                  ⚠ {w}
                </span>
              ))}
            </span>
          )}
          <span className="mk-tip-footer">{footer}</span>
        </span>
      )}
    </span>
  );
}
