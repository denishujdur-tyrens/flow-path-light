import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Luminous Network Flow" },
      {
        name: "description",
        content: "An animated network path flowing from left to right.",
      },
      { property: "og:title", content: "Luminous Network Flow" },
      {
        property: "og:description",
        content: "An animated network path flowing from left to right.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NetworkFlow,
});

type Point = { x: number; y: number; color: string; radius: number };

const colors = ["coral", "blue", "green", "gold", "violet"];

function stable(value: number) {
  return Math.round(value * 1000) / 1000;
}

function random(seed: number) {
  const value = Math.sin(seed * 913.7) * 43758.5453;
  return value - Math.floor(value);
}

const cloud: Point[] = Array.from({ length: 190 }, (_, index) => {
  const angle = random(index + 4) * Math.PI * 2;
  const distance = Math.sqrt(random(index + 41));
  return {
    x: stable(500 + Math.cos(angle) * distance * 340 + random(index + 77) * 55),
    y: stable(350 + Math.sin(angle) * distance * 235),
    color: colors[Math.floor(random(index + 111) * colors.length)] ?? "blue",
    radius: stable(2.5 + random(index + 9) * 2.2),
  };
});

const rightCloud: Point[] = Array.from({ length: 95 }, (_, index) => {
  const angle = random(index + 301) * Math.PI * 2;
  const distance = Math.sqrt(random(index + 347));
  return {
    x: stable(1040 + Math.cos(angle) * distance * 210),
    y: stable(305 + Math.sin(angle) * distance * 125),
    color: colors[Math.floor(random(index + 409) * colors.length)] ?? "blue",
    radius: stable(2.3 + random(index + 53) * 2),
  };
});

// One flat node list, so every link and the luminous path address the same nodes.
const nodes: Point[] = [...cloud, ...rightCloud];
const RIGHT_OFFSET = cloud.length;
const CLUSTER_SPLIT = 830;

function gap(a: number, b: number) {
  return Math.hypot(nodes[a]!.x - nodes[b]!.x, nodes[a]!.y - nodes[b]!.y);
}

// The single source of truth for the couplings: the drawn links and the path
// the light travels both come from this list.
const edges: [number, number][] = [];
const edgeKeys = new Set<string>();

function addEdge(a: number, b: number) {
  if (a === b) return;
  const key = a < b ? `${a}-${b}` : `${b}-${a}`;
  if (edgeKeys.has(key)) return;
  edgeKeys.add(key);
  edges.push([a, b]);
}

// Long-range couplings: they give the network its web.
cloud.forEach((_, index) => {
  addEdge(index, (index * 17 + 23) % cloud.length);
  if (index % 3 === 0) addEdge(index, (index * 7 + 51) % cloud.length);
});

rightCloud.forEach((_, index) => {
  const from = RIGHT_OFFSET + index;
  addEdge(from, RIGHT_OFFSET + ((index * 13 + 19) % rightCloud.length));
  if (index % 3 === 0) {
    addEdge(from, RIGHT_OFFSET + ((index * 5 + 37) % rightCloud.length));
  }
});

// Short-range couplings: every node reaches its nearest neighbours. These are
// the small steps the flow travels along, instead of long chords.
const byDistance = (from: number) =>
  nodes
    .map((_, index) => index)
    .filter((index) => index !== from)
    .sort((a, b) => gap(from, a) - gap(from, b));

nodes.forEach((_, index) => {
  for (const other of byDistance(index).slice(0, 6)) addEdge(index, other);
});

// Bridges, so the two clusters are one network and the light can cross over.
cloud
  .map((_, index) => index)
  .sort((a, b) => cloud[b]!.x - cloud[a]!.x)
  .slice(0, 7)
  .forEach((source) => {
    const nearest = byDistance(source).find((index) => index >= RIGHT_OFFSET);
    if (nearest !== undefined) addEdge(source, nearest);
  });

const neighbours: number[][] = nodes.map(() => []);
for (const [a, b] of edges) {
  neighbours[a]!.push(b);
  neighbours[b]!.push(a);
}

const startNode = nodes.reduce(
  (best, point, index) => (point.x < nodes[best]!.x ? index : best),
  0,
);
const endNode = nodes.reduce(
  (best, point, index) => (point.x > nodes[best]!.x ? index : best),
  0,
);

// Dijkstra over the real couplings. Every step must move rightwards, so the
// flow can never double back or loop; cost grows faster than length, so a leg
// is walked as many small steps rather than one long chord.
function walk(
  from: number,
  to: number,
  pull: (x: number) => number,
  maxSpan = 82,
) {
  const cost = nodes.map(() => Infinity);
  const previous = nodes.map(() => -1);
  const settled = nodes.map(() => false);
  cost[from] = 0;

  for (;;) {
    let current = -1;
    for (let index = 0; index < nodes.length; index += 1) {
      if (!settled[index] && (current === -1 || cost[index]! < cost[current]!)) {
        current = index;
      }
    }
    if (current === -1 || cost[current] === Infinity) break;
    if (current === to) break;
    settled[current] = true;

    for (const next of neighbours[current]!) {
      // Only rightwards, and only along short couplings: that is what forces the
      // light to climb and fall in many small steps instead of one long chord.
      if (nodes[next]!.x <= nodes[current]!.x) continue;
      const span = gap(current, next);
      if (span > maxSpan) continue;
      const strayed = Math.abs(nodes[next]!.y - pull(nodes[next]!.x));
      const step = span + strayed * 1.6;
      if (cost[current]! + step < cost[next]!) {
        cost[next] = cost[current]! + step;
        previous[next] = current;
      }
    }
  }

  if (cost[to] === Infinity) return null;
  const leg: number[] = [];
  for (let at = to; at !== -1; at = previous[at]!) leg.unshift(at);
  return leg[0] === from ? leg : null;
}

// A gentle guide curve: the flow is pulled towards it, which gives the calm
// rise and fall. It is a preference, not a path — every point the light visits
// is a real node and every step a real coupling.
const guide = (x: number) => {
  const centre = x < CLUSTER_SPLIT ? 350 : 305;
  const amplitude = x < CLUSTER_SPLIT ? 110 : 70;
  const phase = ((x - nodes[startNode]!.x) / 230) * Math.PI * 2;
  return centre + Math.sin(phase) * amplitude;
};

// Short couplings first; the cap is loosened only if the network leaves the
// light no rightward route at all.
const flowPath =
  walk(startNode, endNode, guide) ??
  walk(startNode, endNode, guide, 220) ??
  walk(startNode, endNode, guide, Infinity) ??
  [startNode, endNode];

const pathPoints = flowPath.map((index) => nodes[index]!);

const pathData = pathPoints
  .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
  .join(" ");

// How far along the path each node sits, so the nodes light up with the line.
const segmentLengths = pathPoints.map((point, index) =>
  index === 0
    ? 0
    : Math.hypot(
        point.x - pathPoints[index - 1]!.x,
        point.y - pathPoints[index - 1]!.y,
      ),
);
const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);
const pathProgress = segmentLengths.reduce<number[]>((list, length, index) => {
  list.push((list[index - 1] ?? 0) + length / (totalLength || 1));
  return list;
}, []);

// The line is drawn with an ease, so its progress is not linear in time. To
// light a node exactly as the line reaches it, the easing has to be inverted.
const EASE = { x1: 0.45, y1: 0, x2: 0.25, y2: 1 };

function bezier(first: number, second: number, t: number) {
  const rest = 1 - t;
  return 3 * rest * rest * t * first + 3 * rest * t * t * second + t * t * t;
}

// Fraction of the travel time at which the line has drawn `drawn` of itself.
function timeWhenDrawn(drawn: number) {
  let low = 0;
  let high = 1;
  for (let step = 0; step < 40; step += 1) {
    const mid = (low + high) / 2;
    if (bezier(EASE.y1, EASE.y2, mid) < drawn) low = mid;
    else high = mid;
  }
  return bezier(EASE.x1, EASE.x2, (low + high) / 2);
}

const NODE_IGNITE = 1.8;
const LINK_LAG = 0.9;
const LINK_DRAW = 1.4;
const FLOW_TRAVEL = 14;

// Each node lights up on its own clock: a weak left-to-right drift plus a large
// per-node scatter, so they are born one by one rather than as a moving front.
const START_BIRTH = 0.15;
const birth = (index: number) =>
  index === startNode
    ? START_BIRTH
    : (nodes[index]!.x / 1250) * 8.5 + Math.pow(random(index + 611), 1.8) * 5;

const nodeDelay = (index: number) => `${birth(index).toFixed(2)}s`;
const linkDelay = (a: number, b: number) =>
  `${(Math.max(birth(a), birth(b)) + LINK_LAG).toFixed(2)}s`;

// The luminous path waits until the network is essentially there. A handful of
// late stragglers should not hold the light back, so this is the 97th
// percentile of completion rather than the very last one.
const completions = [
  ...nodes.map((_, index) => birth(index) + NODE_IGNITE),
  ...edges.map(([a, b]) => Math.max(birth(a), birth(b)) + LINK_LAG + LINK_DRAW),
].sort((first, second) => first - second);
const networkComplete =
  completions[Math.floor((completions.length - 1) * 0.95)] ?? 0;
const FLOW_START = Math.round((networkComplete + 0.4) * 10) / 10;

// Centre the diagram on the canvas: the node cloud is not symmetric, so the
// offset comes from its real bounds rather than a hand-picked number.
const CANVAS = { width: 1300, height: 700 };
const bounds = nodes.reduce(
  (box, point) => ({
    minX: Math.min(box.minX, point.x - point.radius),
    maxX: Math.max(box.maxX, point.x + point.radius),
    minY: Math.min(box.minY, point.y - point.radius),
    maxY: Math.max(box.maxY, point.y + point.radius),
  }),
  { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
);
const OFFSET_X = stable(CANVAS.width / 2 - (bounds.minX + bounds.maxX) / 2);
const OFFSET_Y = stable(CANVAS.height / 2 - (bounds.minY + bounds.maxY) / 2);

function NetworkFlow() {
  const lastPoint = pathPoints[pathPoints.length - 1]!;

  return (
    <main className="network-stage" aria-label="Animated luminous network flow">
      <svg
        className="network-canvas"
        viewBox="0 0 1300 700"
        role="img"
        aria-label="A network whose main path lights up from left to right"
      >
        <defs>
          <filter id="soft-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="strong-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="7" result="wide" />
            <feGaussianBlur stdDeviation="2" result="near" />
            <feMerge>
              <feMergeNode in="wide" />
              <feMergeNode in="near" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="node-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="1.8" result="bloom" />
            <feMerge>
              <feMergeNode in="bloom" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="backdrop" cx="48%" cy="48%" r="60%">
            <stop offset="0" className="backdrop-center" />
            <stop offset="1" className="backdrop-edge" />
          </radialGradient>
        </defs>

        <rect width="1300" height="700" fill="url(#backdrop)" />

        <g transform={`translate(${OFFSET_X} ${OFFSET_Y})`}>

        <g className="network-links">
          {edges.map(([a, b], index) => (
            <line
              key={`link-${index}`}
              pathLength={1}
              x1={nodes[a]!.x}
              y1={nodes[a]!.y}
              x2={nodes[b]!.x}
              y2={nodes[b]!.y}
              style={{ animationDelay: linkDelay(a, b) }}
            />
          ))}
        </g>

        <g className="network-halos">
          {nodes.map((point, index) => (
            <circle
              key={`halo-${index}`}
              className={`node-halo node-${point.color}`}
              cx={point.x}
              cy={point.y}
              r={point.radius}
              style={{ animationDelay: nodeDelay(index) }}
            />
          ))}
        </g>

        <g className="network-nodes" filter="url(#node-glow)">
          {nodes.map((point, index) => (
            <circle
              key={`node-${index}`}
              className={`node-${point.color}`}
              cx={point.x}
              cy={point.y}
              r={point.radius}
              style={{ animationDelay: nodeDelay(index) }}
            />
          ))}
        </g>

        <path
          className="flow-track"
          d={pathData}
          style={{ animationDelay: `${FLOW_START - 0.8}s` }}
        />
        <path
          className="flow-glow"
          d={pathData}
          pathLength="1"
          style={{
            animationDelay: `${FLOW_START}s`,
            animationDuration: `${FLOW_TRAVEL}s`,
          }}
        />
        <path
          className="flow-core"
          d={pathData}
          pathLength="1"
          style={{
            animationDelay: `${FLOW_START}s`,
            animationDuration: `${FLOW_TRAVEL}s`,
          }}
        />

        <g className="flow-pulses">
          {pathPoints.slice(0, -1).map((point, index) => (
            <circle
              key={`flow-pulse-${index}`}
              cx={point.x}
              cy={point.y}
              r={point.radius + 2}
              style={{
                animationDelay: `${(
                  FLOW_START +
                  timeWhenDrawn(pathProgress[index] ?? 0) * FLOW_TRAVEL
                ).toFixed(2)}s`,
              }}
            />
          ))}
        </g>

        <g className="flow-nodes" filter="url(#soft-glow)">
          {pathPoints.map((point, index) => (
            <circle
              key={`flow-node-${index}`}
              className={
                index === 0
                  ? "flow-node-start"
                  : index === pathPoints.length - 1
                    ? "flow-node-end"
                    : undefined
              }
              cx={point.x}
              cy={point.y}
              r={
                index === 0 || index === pathPoints.length - 1
                  ? point.radius + 6
                  : point.radius + 1.4
              }
              style={{
                animationDelay:
                  index === 0
                    ? `${START_BIRTH}s`
                    : `${(
                        FLOW_START +
                        timeWhenDrawn(pathProgress[index] ?? 0) * FLOW_TRAVEL
                      ).toFixed(2)}s`,
              }}
            />
          ))}
        </g>

        <circle
          className="flow-arrival"
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={lastPoint.radius + 10}
          filter="url(#strong-glow)"
          style={{ animationDelay: `${FLOW_START + FLOW_TRAVEL}s` }}
        />

        </g>
      </svg>
    </main>
  );
}
