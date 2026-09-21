// Failure cascade simulation model (pure, UI-free).
//
// Documented propagation semantics (qualitative — not quantified loss estimates):
// - supply / power / partner edges propagate DOWNSTREAM (from → to): if a supplier,
//   power source or key partner fails, its buyers feel it.
// - money edges (investments) propagate BOTH directions: a failed investor starves
//   its portfolio of capital, and a failed investee impairs the investor's stake.
//   Capital exposure is mutual.
// - Breadth-first traversal from the failed node, depth capped. Each affected node
//   keeps the edge it arrived on so the path is inspectable.

import type { MapEdge } from "@/data/industry-map";

export interface Hop {
  nodeId: string;
  depth: number;
  via: MapEdge | null; // edge traversed to reach this node
  viaFrom: string; // node id on the other end of `via`
}

export const CASCADE_MAX_DEPTH = 4;

export function buildAdjacency(edges: MapEdge[]): Map<string, { to: string; edge: MapEdge }[]> {
  const adj = new Map<string, { to: string; edge: MapEdge }[]>();
  const add = (from: string, to: string, edge: MapEdge) => {
    const list = adj.get(from) ?? [];
    list.push({ to, edge });
    adj.set(from, list);
  };
  for (const e of edges) {
    if (e.type === "money") {
      add(e.from, e.to, e);
      add(e.to, e.from, e);
    } else {
      add(e.from, e.to, e);
    }
  }
  return adj;
}

export function simulateCascade(
  failedId: string,
  adj: Map<string, { to: string; edge: MapEdge }[]>,
  maxDepth = CASCADE_MAX_DEPTH
): Hop[] {
  const visited = new Set<string>([failedId]);
  const hops: Hop[] = [];
  let frontier: Hop[] = [{ nodeId: failedId, depth: 0, via: null, viaFrom: failedId }];
  while (frontier.length) {
    const next: Hop[] = [];
    for (const hop of frontier) {
      if (hop.depth >= maxDepth) continue;
      for (const { to, edge } of adj.get(hop.nodeId) ?? []) {
        if (visited.has(to)) continue;
        visited.add(to);
        const h: Hop = { nodeId: to, depth: hop.depth + 1, via: edge, viaFrom: hop.nodeId };
        hops.push(h);
        next.push(h);
      }
    }
    frontier = next;
  }
  return hops;
}
