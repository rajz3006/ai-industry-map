"use client";

import { useMemo, useState } from "react";
import { columns, edges, nodeById } from "@/data/industry-map";
import { buildAdjacency, simulateCascade, CASCADE_MAX_DEPTH, type Hop } from "@/lib/cascade";

const risks = [
  { no: "01 / FOUNDRY", title: "Taiwan is the fulcrum", body: "TSMC holds 73% of foundry and is widely cited at more than 90% of advanced logic. Nvidia alone is reported at about 22% of TSMC revenue." },
  { no: "02 / LITHOGRAPHY", title: "There is only one EUV supplier", body: "ASML controls EUV and an estimated 94% of lithography. Standard EUV tools cost roughly $200M and were nearly sold out through 2027." },
  { no: "03 / MEMORY", title: "Three firms gate HBM", body: "SK Hynix is projected at about half of 2026 HBM; Samsung and Micron supply most of the remainder. Qualification does not guarantee volume leadership." },
  { no: "04 / POWER", title: "Chips can arrive before watts", body: "Nuclear restarts and new generation take years. Microsoft's 835MW Three Mile Island PPA targets 2028; Meta's nuclear package reaches up to 6.6GW by 2035." },
  { no: "05 / LEVERAGE", title: "Backlogs fund the buildout", body: "Nebius funds 60% of growth with customer prepayments. CoreWeave entered public markets with $7B+ of private debt and heavy customer concentration." },
  { no: "06 / CIRCULARITY", title: "Suppliers capitalize buyers", body: "Nvidia's investments in Nebius and CoreWeave—and contemplated lab investments—blur customer demand and vendor financing." },
  { no: "07 / CASH FLOW", title: "Capex consumes the cushion", body: "UBS estimated hyperscalers were directing nearly all free cash flow to investment. A rate shock or demand wobble can hit every layer at once." },
  { no: "08 / MISSING MIDDLES", title: "The hidden layers can still stop the stack", body: "Taiwan ODMs, advanced packaging, test, optical modules and rack cooling are less visible than GPUs—but each can throttle deployment." },
];

export default function Fragility({ onSelectNode }: { onSelectNode: (id: string) => void }) {
  const [failedId, setFailedId] = useState<string>("");
  const adj = useMemo(() => buildAdjacency(edges), []);
  const hops = useMemo(() => (failedId ? simulateCascade(failedId, adj) : []), [failedId, adj]);

  const failed = failedId ? nodeById[failedId] : null;
  const byDepth = useMemo(() => {
    const groups = new Map<number, Hop[]>();
    for (const h of hops) {
      const g = groups.get(h.depth) ?? [];
      g.push(h);
      groups.set(h.depth, g);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [hops]);

  const byLayer = useMemo(() => {
    const counts = new Map<string, number>();
    for (const h of hops) {
      const layer = nodeById[h.nodeId]?.layer ?? "Unknown";
      counts.set(layer, (counts.get(layer) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [hops]);

  return (
    <div>
      <section className="cascade" aria-label="Failure cascade simulator">
        <div className="cascade-head">
          <div>
            <h2>Failure cascade simulator</h2>
            <p>
              Pick a node to fail or constrain. The simulator walks the map&apos;s directed dependency
              edges: supply, power and partner links propagate <b>downstream</b> (supplier → buyer);
              investment links propagate <b>both ways</b> (capital exposure is mutual). Depth is capped
              at {CASCADE_MAX_DEPTH} hops. This is a qualitative dependency walk, not a quantified loss model.
            </p>
          </div>
          <div className="cascade-controls">
            <label>
              <span className="sr-only">Node to fail</span>
              <select value={failedId} onChange={(e) => setFailedId(e.target.value)} aria-label="Node to fail">
                <option value="">Select a node to fail…</option>
                {columns.map((col) => (
                  <optgroup key={col.label} label={col.label}>
                    {col.ids.map((id) => (
                      <option key={id} value={id}>
                        {nodeById[id]?.name ?? id}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            {failedId && (
              <button className="cascade-clear" onClick={() => setFailedId("")}>
                Clear
              </button>
            )}
          </div>
        </div>

        {failed && (
          <div className="cascade-results">
            <div className="cascade-summary">
              <b>
                {failed.name} fails → {hops.length} node{hops.length === 1 ? "" : "s"} exposed
              </b>
              <span className="cascade-layers">
                {byLayer.map(([layer, n]) => (
                  <span key={layer} className="cascade-layer">
                    {layer}: {n}
                  </span>
                ))}
              </span>
            </div>
            {byDepth.map(([depth, group]) => (
              <div className="cascade-depth" key={depth}>
                <h3>
                  Depth {depth} — {depth === 1 ? "directly exposed" : "indirectly exposed"} ({group.length})
                </h3>
                <ul>
                  {group.map((h) => {
                    const n = nodeById[h.nodeId];
                    const viaFrom = nodeById[h.viaFrom];
                    if (!n) return null;
                    return (
                      <li key={h.nodeId} className="cascade-hop">
                        <button className="cascade-node" onClick={() => onSelectNode(h.nodeId)}>
                          {n.name}
                        </button>
                        <span className="cascade-via">
                          via {viaFrom?.name ?? h.viaFrom}
                          {h.via && (
                            <>
                              {" "}· <span className={`edge-type ${h.via.type}`}>{h.via.type}</span> · {h.via.label}
                            </>
                          )}
                        </span>
                        <span className="cascade-layer-tag">{n.layer}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {hops.length === 0 && (
              <p className="unavailable-note">No downstream or capital exposure found from this node within {CASCADE_MAX_DEPTH} hops.</p>
            )}
          </div>
        )}
      </section>

      <p className="section-asof">Structural concentration risks · assessed September 2026</p>
      <div className="risk-grid">
        {risks.map((r) => (
          <article className="risk-card" key={r.no}>
            <span className="risk-no">{r.no}</span>
            <h3>{r.title}</h3>
            <p>{r.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
