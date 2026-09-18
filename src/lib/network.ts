// Pure geometry and timing for the luminous network: no React, no DOM, so it
// can be reasoned about and tested on its own.

const colors = ["coral", "blue", "green", "gold", "violet"];

// Deterministic noise, so a given viewport always draws the same network.
export function random(seed: number) {
  const value = Math.sin(seed * 913.7) * 43758.5453;
  return value - Math.floor(value);
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type Node = { x: number; y: number; color: string; radius: number };
export type Network = {
  nodes: Node[];
  edges: [number, number][];
  path: number[];
  flowStart: number;
};

const NODE_IGNITE = 1.8;
export const LINK_LAG = 0.9;
const LINK_DRAW = 1.4;
export const BIRTH_WINDOW = 11;
export const FLOW_TRAVEL = 14;

// Everything is laid out on a jittered grid that fills the given box. Column
// count follows the width, row count the height, so the network is as dense on
// a phone as on a wide screen — it just has fewer nodes.
export function build(width: number, height: number): Network {
  // Cell size follows the area, not the width alone: otherwise a tall phone and
  // a short wide banner end up with wildly different densities.
  const cell = clamp(Math.sqrt(width * height) / 13, 44, 88);
  // Margins leave room for the jitter, so the grid can be broken up without any
  // node crossing the edge of the box.
  const marginX = clamp(Math.max(width * 0.05, cell * 0.6), 18, 90);
  const marginY = clamp(Math.max(height * 0.06, cell * 0.6), 18, 100);
  const innerWidth = Math.max(width - marginX * 2, 80);
  const innerHeight = Math.max(height - marginY * 2, 80);
  const columns = clamp(Math.round(innerWidth / cell), 5, 22);
  const rows = clamp(Math.round(innerHeight / cell), 3, 14);
  const stepX = innerWidth / Math.max(columns - 1, 1);
  const stepY = innerHeight / Math.max(rows - 1, 1);

  const index = (column: number, row: number) => column * rows + row;
  const nodes: Node[] = [];
  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      const seed = index(column, row);
      // Jitter breaks up the grid. Sideways it stays under half a step, which is
      // what guarantees that a node in the next column is always further right —
      // the luminous path relies on that to never double back. Vertically it can
      // be larger, and that is where most of the irregularity comes from.
      nodes.push({
        x: clamp(
          marginX + column * stepX + (random(seed + 4) - 0.5) * 2 * stepX * 0.45,
          4,
          width - 4,
        ),
        y: clamp(
          marginY + row * stepY + (random(seed + 41) - 0.5) * 2 * stepY * 0.62,
          4,
          height - 4,
        ),
        color: colors[Math.floor(random(seed + 111) * colors.length)] ?? "blue",
        radius: 2.2 + random(seed + 9) * 2,
      });
    }
  }

  const edges: [number, number][] = [];
  const seen = new Set<string>();
  const link = (a: number, b: number) => {
    if (a === b || !nodes[a] || !nodes[b]) return;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push([a, b]);
  };

  // Lattice couplings to the right and below, plus the odd longer chord for
  // character. Grid adjacency means no distance sorting is needed.
  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      const from = index(column, row);
      if (column + 1 < columns) link(from, index(column + 1, row));
      if (row + 1 < rows) link(from, index(column, row + 1));
      if (column + 1 < columns && row + 1 < rows && random(from + 211) < 0.5) {
        link(from, index(column + 1, row + 1));
      }
      if (column + 1 < columns && row > 0 && random(from + 307) < 0.5) {
        link(from, index(column + 1, row - 1));
      }
      if (from % 5 === 0 && column + 3 < columns) {
        const target = Math.floor(random(from + 77) * rows);
        link(from, index(column + 3, target));
      }
    }
  }

  // The luminous path: one node per column, the one nearest a gentle sine. Two
  // consecutive picks are always coupled, so the light only ever travels real
  // links and can never double back.
  const centre = marginY + innerHeight / 2;
  // Amplitude is capped in rows and the wave is measured in columns, so the
  // swing looks the same on a phone as on a wide screen.
  const amplitude = Math.min(innerHeight * 0.32, stepY * 2.2);
  const guide = (column: number) => centre + Math.sin((column / 4.5) * Math.PI * 2) * amplitude;

  const path: number[] = [];
  for (let column = 0; column < columns; column += 1) {
    let best = index(column, 0);
    for (let row = 1; row < rows; row += 1) {
      const candidate = index(column, row);
      const wanted = guide(column);
      if (Math.abs(nodes[candidate]!.y - wanted) < Math.abs(nodes[best]!.y - wanted)) {
        best = candidate;
      }
    }
    const previous = path[path.length - 1];
    if (previous !== undefined) link(previous, best);
    path.push(best);
  }

  // The light waits until the network is essentially there; a few late
  // stragglers should not hold it back.
  const birth = (node: number) =>
    (nodes[node]!.x / Math.max(width, 1)) * BIRTH_WINDOW * 0.62 +
    Math.pow(random(node + 611), 1.8) * BIRTH_WINDOW * 0.38;
  const done = nodes
    .map((_, node) => birth(node) + NODE_IGNITE + LINK_LAG + LINK_DRAW)
    .sort((a, b) => a - b);
  const flowStart = Math.round((done[Math.floor((done.length - 1) * 0.95)]! + 0.4) * 10) / 10;

  return { nodes, edges, path, flowStart };
}

// The line is drawn with an ease, so its progress is not linear in time. To
// light a node exactly as the line reaches it, the easing has to be inverted.
export function timeWhenDrawn(drawn: number) {
  const curve = (first: number, second: number, t: number) => {
    const rest = 1 - t;
    return 3 * rest * rest * t * first + 3 * rest * t * t * second + t * t * t;
  };
  let low = 0;
  let high = 1;
  for (let step = 0; step < 32; step += 1) {
    const mid = (low + high) / 2;
    if (curve(0, 1, mid) < drawn) low = mid;
    else high = mid;
  }
  return curve(0.45, 0.25, (low + high) / 2);
}
