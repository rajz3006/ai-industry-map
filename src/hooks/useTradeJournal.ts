"use client";

import { useCallback, useEffect, useState } from "react";

export type TradeJournalStatus = "planned" | "placed" | "closed";

export interface TradeJournalEntry {
  id: string;
  symbol: string;
  enteredAt: number;
  entryPrice: number;
  stopPrice: number;
  takeProfitPrice: number;
  shares: number;
  riskBudget: number;
  rMultiple: number | null;
  reasonNotes: string;
  orderId: string | null;
  status: TradeJournalStatus;
}

const STORAGE_KEY = "ai-map:trade-journal:v1";

function loadEntries(): TradeJournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TradeJournalEntry[];
    return Array.isArray(parsed)
      ? parsed.filter(
          (e) =>
            e &&
            typeof e.id === "string" &&
            typeof e.symbol === "string" &&
            typeof e.entryPrice === "number" &&
            typeof e.status === "string"
        )
      : [];
  } catch {
    return [];
  }
}

/**
 * Browser-local trade journal — the qualitative "why" behind each paper trade, kept alongside
 * the numbers so the user can look back and see whether their stated reasoning actually played
 * out. Persisted the same way as usePriceAlerts: localStorage only, no server round trip.
 */
export function useTradeJournal() {
  const [entries, setEntries] = useState<TradeJournalEntry[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(loadEntries());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // storage full or blocked — journal still works for this session
    }
  }, [entries]);

  const logTrade = useCallback(
    (
      entry: Omit<TradeJournalEntry, "id" | "enteredAt" | "status"> & {
        status?: TradeJournalStatus;
      }
    ) => {
      const record: TradeJournalEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        enteredAt: Date.now(),
        status: entry.status ?? "placed",
        symbol: entry.symbol,
        entryPrice: entry.entryPrice,
        stopPrice: entry.stopPrice,
        takeProfitPrice: entry.takeProfitPrice,
        shares: entry.shares,
        riskBudget: entry.riskBudget,
        rMultiple: entry.rMultiple,
        reasonNotes: entry.reasonNotes,
        orderId: entry.orderId ?? null,
      };
      setEntries((prev) => [record, ...prev]);
      return record;
    },
    []
  );

  const updateStatus = useCallback((id: string, status: TradeJournalStatus) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
  }, []);

  return { entries, logTrade, updateStatus };
}
