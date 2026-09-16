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

type Point = { x: number; y: number; color: string; radius?: number };

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

const pathPoints: Point[] = [
  { x: 46, y: 380, color: "flow", radius: 10 },
  { x: 126, y: 350, color: "flow", radius: 6 },
  { x: 190, y: 387, color: "flow", radius: 6 },
  { x: 258, y: 305, color: "flow", radius: 7 },
  { x: 310, y: 203, color: "flow", radius: 7 },
  { x: 375, y: 178, color: "flow", radius: 7 },
  { x: 414, y: 250, color: "flow", radius: 6 },
  { x: 470, y: 332, color: "flow", radius: 7 },
  { x: 536, y: 302, color: "flow", radius: 6 },
  { x: 594, y: 405, color: "flow", radius: 7 },
  { x: 670, y: 449, color: "flow", radius: 6 },
  { x: 727, y: 342, color: "flow", radius: 7 },
  { x: 802, y: 299, color: "flow", radius: 7 },
  { x: 861, y: 349, color: "flow", radius: 6 },
  { x: 925, y: 286, color: "flow", radius: 6 },
  { x: 995, y: 225, color: "flow", radius: 7 },
  { x: 1056, y: 247, color: "flow", radius: 6 },
  { x: 1110, y: 291, color: "flow", radius: 6 },
  { x: 1155, y: 310, color: "flow", radius: 6 },
  { x: 1190, y: 322, color: "flow", radius: 6 },
  { x: 1220, y: 330, color: "flow", radius: 6 },
  { x: 1240, y: 334, color: "flow", radius: 6 },
  { x: 1250, y: 334, color: "flow", radius: 11 },
];

const pathData = pathPoints
  .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
  .join(" ");

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
          <radialGradient id="backdrop" cx="48%" cy="48%" r="60%">
            <stop offset="0" className="backdrop-center" />
            <stop offset="1" className="backdrop-edge" />
          </radialGradient>
        </defs>

        <rect width="1300" height="700" fill="url(#backdrop)" />

        <g className="network-links">
          {cloud.map((point, index) => {
            const target = cloud[(index * 17 + 23) % cloud.length] ?? point;
            const secondary = cloud[(index * 7 + 51) % cloud.length] ?? point;
            return (
              <g key={`links-${index}`}>
                <line x1={point.x} y1={point.y} x2={target.x} y2={target.y} />
                {index % 3 === 0 && (
                  <line x1={point.x} y1={point.y} x2={secondary.x} y2={secondary.y} />
                )}
              </g>
            );
          })}
          {Array.from({ length: 18 }, (_, index) => (
            <line
              key={`fan-${index}`}
              x1={770 + index * 7}
              y1={240 + index * 10}
              x2={1250}
              y2={334}
            />
          ))}
        </g>

        <g className="network-nodes">
          {cloud.map((point, index) => (
            <circle
              key={`node-${index}`}
              className={`node-${point.color}`}
              cx={point.x}
              cy={point.y}
              r={point.radius}
            />
          ))}
        </g>

        <path className="flow-track" d={pathData} />
        <path className="flow-glow" d={pathData} pathLength="1" />
        <path className="flow-core" d={pathData} pathLength="1" />

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
              r={point.radius}
            />
          ))}
        </g>

        <circle
          className="flow-arrival"
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={lastPoint.radius + 4}
          filter="url(#strong-glow)"
        />

        <circle className="flow-spark" r="8" filter="url(#strong-glow)">
          <animateMotion dur="6s" repeatCount="indefinite" path={pathData} />
        </circle>
      </svg>
    </main>
  );
}