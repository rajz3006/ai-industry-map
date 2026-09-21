"use client";

import { useState } from "react";
import type { QuoteMap } from "@/hooks/useQuotes";
import {
  ALERT_KIND_LABEL,
  describeAlert,
  requestNotificationPermission,
  type AlertKind,
  type PriceAlert,
} from "@/hooks/usePriceAlerts";
import { formatPrice } from "@/lib/format";

interface Props {
  open: boolean;
  onClose: () => void;
  initialSymbol: string | null;
  quotes: QuoteMap;
  alerts: PriceAlert[];
  fired: PriceAlert[];
  addAlert: (input: { symbol: string; kind: AlertKind; value: number; basePrice: number }) => void;
  removeAlert: (id: string) => void;
  clearFired: (id: string) => void;
}

export default function AlertsPanel({ open, onClose, initialSymbol, quotes, alerts, fired, addAlert, removeAlert, clearFired }: Props) {
  // The parent remounts this panel (via key) each time it opens, so initializing
  // from initialSymbol here gives a fresh, prefilled form without an effect.
  const [symbol, setSymbol] = useState(initialSymbol ?? "");
  const [kind, setKind] = useState<AlertKind>("above");
  const [value, setValue] = useState("");
  const [perm, setPerm] = useState<string>(typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");
  const [formError, setFormError] = useState("");

  if (!open) return null;

  const sym = symbol.trim().toUpperCase();
  const q = sym ? quotes[sym] : undefined;
  const livePrice = q && !("error" in q) && typeof q.price === "number" ? q.price : null;

  function submit() {
    setFormError("");
    const v = parseFloat(value);
    if (!sym) return setFormError("Enter a ticker symbol.");
    if (!Number.isFinite(v) || v <= 0) return setFormError("Enter a positive target price or percent.");
    if (livePrice === null) return setFormError(`No live price for ${sym} yet — wait for the quote to load.`);
    addAlert({ symbol: sym, kind, value: v, basePrice: livePrice });
    setValue("");
  }

  function thresholdPreview(): number {
    const v = parseFloat(value);
    if (!Number.isFinite(v) || livePrice === null) return NaN;
    if (kind === "above" || kind === "below") return v;
    return kind === "move-up" ? livePrice * (1 + v / 100) : livePrice * (1 - v / 100);
  }

  const preview = thresholdPreview();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="alerts-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Price alerts">
        <button className="stock-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="eyebrow">Watchlist</div>
        <h2>Price alerts</h2>
        <p className="alerts-note">
          Alerts live in this browser only and are checked while the app is open and prices refresh.
          They do not fire when the tab is closed.
        </p>

        {fired.length > 0 && (
          <div className="fired-list">
            {fired.map((a) => (
              <div className="fired-item" key={a.id}>
                <b>🔔 {a.symbol}</b> {describeAlert(a)}
                <button onClick={() => clearFired(a.id)} aria-label={`Dismiss alert for ${a.symbol}`}>Dismiss</button>
              </div>
            ))}
          </div>
        )}

        <div className="alert-form">
          <h3>New alert</h3>
          <div className="alert-grid">
            <label>
              Symbol
              <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="NVDA" maxLength={8} />
            </label>
            <label>
              Condition
              <select value={kind} onChange={(e) => setKind(e.target.value as AlertKind)}>
                {(Object.keys(ALERT_KIND_LABEL) as AlertKind[]).map((k) => (
                  <option key={k} value={k}>{ALERT_KIND_LABEL[k]}</option>
                ))}
              </select>
            </label>
            <label>
              {kind === "above" || kind === "below" ? "Price ($)" : "Percent (%)"}
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={kind === "above" || kind === "below" ? "180.00" : "5"}
                inputMode="decimal"
              />
            </label>
          </div>
          <div className="alert-hint">
            {livePrice !== null ? (
              <>Current {sym || "price"}: <b>{formatPrice(livePrice, sym)}</b>{Number.isFinite(preview) && <> · triggers at <b>{formatPrice(preview, sym)}</b></>}</>
            ) : sym ? (
              <>Waiting for a live quote for {sym}…</>
            ) : (
              <>Enter a symbol to see its live price.</>
            )}
          </div>
          {formError && <div className="alert-error">{formError}</div>}
          <button className="alert-add" onClick={submit}>Create alert</button>
        </div>

        <div className="alert-list">
          <h3>Your alerts ({alerts.length})</h3>
          {alerts.length === 0 && <p className="alerts-note">No alerts yet. Create one above.</p>}
          {alerts.map((a) => (
            <div className={`alert-item ${a.triggeredAt ? "triggered" : ""}`} key={a.id}>
              <div>
                <b>{a.symbol}</b> <span>{describeAlert(a)}</span>
                <span className="alert-status">{a.triggeredAt ? ` · triggered ${new Date(a.triggeredAt).toLocaleString()}` : " · active"}</span>
              </div>
              <button onClick={() => removeAlert(a.id)} aria-label={`Remove alert for ${a.symbol}`}>Remove</button>
            </div>
          ))}
        </div>

        <div className="alert-perm">
          {perm === "granted" ? (
            <span className="alerts-note">Browser notifications are on — alerts will pop up even when the tab is in the background.</span>
          ) : perm === "unsupported" ? (
            <span className="alerts-note">This browser does not support notifications; alerts still appear in the app.</span>
          ) : (
            <button
              className="alert-add secondary"
              onClick={async () => setPerm(await requestNotificationPermission())}
            >
              Enable browser notifications
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
