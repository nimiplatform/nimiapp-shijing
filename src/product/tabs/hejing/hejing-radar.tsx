import type { HeJingMetric } from './hejing-model.ts';

// Self-contained pentagon radar for the relationship index. Geometry is derived
// from the metric values so the same component handles any 5-axis workspace.

const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 240;
const CENTER_X = 150;
const CENTER_Y = 110;
const RADIUS = 76;
const LABEL_RADIUS = RADIUS + 21;
const GRID_RINGS = [0.25, 0.5, 0.75, 1] as const;

function polar(distance: number, index: number, count: number): readonly [number, number] {
  const angle = ((-90 + (index * 360) / count) * Math.PI) / 180;
  return [CENTER_X + distance * Math.cos(angle), CENTER_Y + distance * Math.sin(angle)];
}

function points(distances: readonly number[], count: number): string {
  return distances.map((distance, index) => polar(distance, index, count).join(',')).join(' ');
}

function ratio(metric: HeJingMetric): number {
  return Math.max(0, Math.min(1, metric.value / 100));
}

export function HeJingRadar({
  metrics,
  label,
}: {
  readonly metrics: readonly HeJingMetric[];
  readonly label: string;
}) {
  const count = metrics.length;
  if (count < 3) return null;

  const valuePolygon = points(
    metrics.map((metric) => RADIUS * ratio(metric)),
    count,
  );

  return (
    <svg
      className="shijing-hejing__radar"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
      aria-label={label}
    >
      <g className="shijing-hejing__radar-grid">
        {GRID_RINGS.map((ring) => (
          <polygon
            key={ring}
            points={points(
              metrics.map(() => RADIUS * ring),
              count,
            )}
          />
        ))}
        {metrics.map((metric, index) => {
          const [x, y] = polar(RADIUS, index, count);
          return <line key={metric.id} x1={CENTER_X} y1={CENTER_Y} x2={x} y2={y} />;
        })}
      </g>

      <polygon className="shijing-hejing__radar-area" points={valuePolygon} />

      {metrics.map((metric, index) => {
        const [x, y] = polar(RADIUS * ratio(metric), index, count);
        return (
          <circle
            key={metric.id}
            className="shijing-hejing__radar-dot"
            data-tone={metric.tone}
            cx={x}
            cy={y}
            r={4}
          />
        );
      })}

      {metrics.map((metric, index) => {
        const [x, y] = polar(LABEL_RADIUS, index, count);
        const anchor = x < CENTER_X - 6 ? 'end' : x > CENTER_X + 6 ? 'start' : 'middle';
        return (
          <text
            key={metric.id}
            className="shijing-hejing__radar-label"
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
          >
            {metric.label}
          </text>
        );
      })}
    </svg>
  );
}
