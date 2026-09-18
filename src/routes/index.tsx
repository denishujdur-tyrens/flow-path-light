import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import {
  BIRTH_WINDOW,
  FLOW_TRAVEL,
  LINK_LAG,
  build,
  random,
  timeWhenDrawn,
  type Network,
} from "@/lib/network";

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

// Size is rounded to a 48px grid: resizing a window should not restart the
// animation on every pixel.
function useStageSize() {
  const ref = useRef<HTMLElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // A stage that is hidden, printed or not yet laid out measures zero, and a
    // ResizeObserver may never fire for it. Falling back to the window, and
    // then to a default, means the animation is never simply absent.
    const measure = () => {
      const box = element.getBoundingClientRect();
      const rawWidth = box.width || window.innerWidth || 1200;
      const rawHeight = box.height || window.innerHeight || 700;
      const width = Math.max(Math.round(rawWidth / 48) * 48, 320);
      const height = Math.max(Math.round(rawHeight / 48) * 48, 420);
      setSize((current) =>
        current?.width === width && current?.height === height ? current : { width, height },
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

function NetworkFlow() {
  const { ref, size } = useStageSize();
  const network = useMemo(() => (size ? build(size.width, size.height) : null), [size]);

  return (
    <main className="network-stage" ref={ref} aria-label="Animated luminous network flow">
      {size && network ? <Scene network={network} width={size.width} height={size.height} /> : null}
    </main>
  );
}

function Scene({ network, width, height }: { network: Network; width: number; height: number }) {
  const { nodes, edges, path, flowStart } = network;

  const birth = (node: number) =>
    node === path[0]
      ? 0.15
      : (nodes[node]!.x / Math.max(width, 1)) * BIRTH_WINDOW * 0.62 +
        Math.pow(random(node + 611), 1.8) * BIRTH_WINDOW * 0.38;
  const nodeDelay = (node: number) => `${birth(node).toFixed(2)}s`;
  const linkDelay = (a: number, b: number) =>
    `${(Math.max(birth(a), birth(b)) + LINK_LAG).toFixed(2)}s`;

  const points = path.map((node) => nodes[node]!);
  const pathData = points
    .map((point, step) => `${step === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");

  const travelled: number[] = [0];
  for (let step = 1; step < points.length; step += 1) {
    const previous = points[step - 1]!;
    const point = points[step]!;
    travelled.push(travelled[step - 1]! + Math.hypot(point.x - previous.x, point.y - previous.y));
  }
  const total = travelled[travelled.length - 1] || 1;
  const arrival = (step: number) =>
    flowStart + timeWhenDrawn(travelled[step]! / total) * FLOW_TRAVEL;

  return (
    <svg
      className="network-canvas"
      viewBox={`0 0 ${width} ${height}`}
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

      <rect width={width} height={height} fill="url(#backdrop)" />

      <g className="network-links">
        {edges.map(([a, b], key) => (
          <line
            key={`link-${key}`}
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
        {nodes.map((node, key) => (
          <circle
            key={`halo-${key}`}
            className={`node-halo node-${node.color}`}
            cx={node.x}
            cy={node.y}
            r={node.radius}
            style={{ animationDelay: nodeDelay(key) }}
          />
        ))}
      </g>

      <g className="network-nodes" filter="url(#node-glow)">
        {nodes.map((node, key) => (
          <circle
            key={`node-${key}`}
            className={`node-${node.color}`}
            cx={node.x}
            cy={node.y}
            r={node.radius}
            style={{ animationDelay: nodeDelay(key) }}
          />
        ))}
      </g>

      <path className="flow-track" d={pathData} style={{ animationDelay: `${flowStart - 0.8}s` }} />
      <path
        className="flow-glow"
        d={pathData}
        pathLength="1"
        style={{
          animationDelay: `${flowStart}s`,
          animationDuration: `${FLOW_TRAVEL}s`,
        }}
      />
      <path
        className="flow-core"
        d={pathData}
        pathLength="1"
        style={{
          animationDelay: `${flowStart}s`,
          animationDuration: `${FLOW_TRAVEL}s`,
        }}
      />

      <g className="flow-pulses">
        {points.slice(0, -1).map((point, step) => (
          <circle
            key={`pulse-${step}`}
            cx={point.x}
            cy={point.y}
            r={point.radius + 2}
            style={{ animationDelay: `${arrival(step).toFixed(2)}s` }}
          />
        ))}
      </g>

      <g className="flow-nodes" filter="url(#soft-glow)">
        {points.map((point, step) => (
          <circle
            key={`flow-node-${step}`}
            className={
              step === 0
                ? "flow-node-start"
                : step === points.length - 1
                  ? "flow-node-end"
                  : undefined
            }
            cx={point.x}
            cy={point.y}
            r={step === 0 || step === points.length - 1 ? point.radius + 6 : point.radius + 1.4}
            style={{
              animationDelay: step === 0 ? "0.15s" : `${arrival(step).toFixed(2)}s`,
            }}
          />
        ))}
      </g>

      <circle
        className="flow-arrival"
        cx={points[points.length - 1]!.x}
        cy={points[points.length - 1]!.y}
        r={points[points.length - 1]!.radius + 10}
        filter="url(#strong-glow)"
        style={{ animationDelay: `${flowStart + FLOW_TRAVEL}s` }}
      />
    </svg>
  );
}
