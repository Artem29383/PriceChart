import { useId, useMemo, useState } from 'react';

import {
  METRICS,
  formatValue,
  metricStatus,
  type MetricId,
  type MetricPoint,
  type Visualization,
} from '../model';

const W = 760;
const H = 222;
const LEFT = 48;
const RIGHT = 748;
const TOP = 16;
const BOTTOM = 182;

const formatTime = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
});

interface VisualProps {
  readonly metric: MetricId;
  readonly points: readonly MetricPoint[];
  readonly visualization: Visualization;
}

function latestValid(points: readonly MetricPoint[]): number | null {
  for (let i = points.length - 1; i >= 0; i--) {
    const value = points[i]?.value;
    if (value !== null && value !== undefined) return value;
  }
  return null;
}

function StatVisual({ metric, points }: Pick<VisualProps, 'metric' | 'points'>) {
  const latest = latestValid(points);
  const older = points[Math.max(0, points.length - 8)]?.value;
  const delta = latest === null || older == null ? null : latest - older;
  const status = metricStatus(metric, latest);
  return (
    <div className="oref-stat">
      <div className="oref-stat__main">
        <strong>{formatValue(latest, metric)}</strong>
        <span>{METRICS[metric].unit}</span>
      </div>
      <div className="oref-stat__under">
        <span className={`oref-status oref-status--${status}`}>{status}</span>
        <span>{delta === null ? 'Change unavailable' : `${delta > 0 ? '+' : ''}${formatValue(delta, metric)} ${METRICS[metric].unit} vs 8 points ago`}</span>
      </div>
      <p>Current value · {METRICS[metric].service}</p>
    </div>
  );
}

function TableVisual({ metric, points }: Pick<VisualProps, 'metric' | 'points'>) {
  return (
    <div className="oref-table-wrap">
      <table className="oref-table">
        <thead><tr><th scope="col">Time</th><th scope="col">Value</th><th scope="col">Status</th></tr></thead>
        <tbody>
          {points.slice(-6).reverse().map((point) => (
            <tr key={point.timestamp}>
              <td>{formatTime.format(point.timestamp)}</td>
              <td>{formatValue(point.value, metric)} {METRICS[metric].unit}</td>
              <td><span className={`oref-status oref-status--${metricStatus(metric, point.value)}`}>{metricStatus(metric, point.value)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartVisual({ metric, points, visualization }: VisualProps) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const { min, max, segments, bars, start, end } = useMemo(() => {
    let smallest = Infinity;
    let largest = -Infinity;
    for (const point of points) {
      if (point.value === null) continue;
      smallest = Math.min(smallest, point.value);
      largest = Math.max(largest, point.value);
    }
    if (!Number.isFinite(smallest)) smallest = 0;
    if (!Number.isFinite(largest)) largest = 1;
    const floor = Math.max(0, smallest - (largest - smallest) * 0.15);
    const ceiling = Math.max(floor + 1, largest + (largest - smallest) * 0.16);
    const first = points[0]?.timestamp ?? 0;
    const last = points[points.length - 1]?.timestamp ?? first + 1;
    const duration = Math.max(1, last - first);
    const x = (timestamp: number) => LEFT + ((timestamp - first) / duration) * (RIGHT - LEFT);
    const y = (value: number) => BOTTOM - ((value - floor) / (ceiling - floor)) * (BOTTOM - TOP);

    const groups: { line: string; fill: string }[] = [];
    let line = '';
    let firstX = 0;
    let lastX = 0;
    const push = () => {
      if (line) groups.push({
        line,
        fill: `${line} L ${lastX.toFixed(2)} ${BOTTOM} L ${firstX.toFixed(2)} ${BOTTOM} Z`,
      });
      line = '';
    };
    for (const point of points) {
      if (point.value === null) { push(); continue; }
      const px = x(point.timestamp);
      const py = y(point.value);
      if (!line) { firstX = px; line = `M ${px.toFixed(2)} ${py.toFixed(2)}`; }
      else line += ` L ${px.toFixed(2)} ${py.toFixed(2)}`;
      lastX = px;
    }
    push();

    const bucketSize = Math.max(1, Math.ceil(points.length / 72));
    const groupedBars: { x: number; y: number; width: number; height: number }[] = [];
    for (let offset = 0; offset < points.length; offset += bucketSize) {
      const bucket = points.slice(offset, offset + bucketSize);
      const valid = bucket.filter((point): point is { timestamp: number; value: number } => point.value !== null);
      if (!valid.length) continue;
      const average = valid.reduce((sum, point) => sum + point.value, 0) / valid.length;
      const startTime = bucket[0]?.timestamp ?? first;
      const nextTime = points[Math.min(points.length - 1, offset + bucketSize)]?.timestamp ?? last;
      const bx = x(startTime);
      const bw = Math.max(2, x(nextTime) - bx - 2);
      const by = y(average);
      groupedBars.push({ x: bx, y: by, width: bw, height: BOTTOM - by });
    }

    return { min: floor, max: ceiling, segments: groups, bars: groupedBars, start: first, end: last };
  }, [points]);

  const active = hover === null ? null : points[hover];
  const timeStep = Math.max(1, end - start);
  const coordinateX = (timestamp: number) => LEFT + ((timestamp - start) / timeStep) * (RIGHT - LEFT);
  const coordinateY = (value: number) => BOTTOM - ((value - min) / (max - min)) * (BOTTOM - TOP);

  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !points.length) return;
    const px = (event.clientX - rect.left) / rect.width * W;
    const target = start + Math.max(0, Math.min(1, (px - LEFT) / (RIGHT - LEFT))) * timeStep;

    // Binary search keeps hover cost logarithmic for long histories.
    let low = 0;
    let high = points.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if ((points[mid]?.timestamp ?? Infinity) < target) low = mid + 1;
      else high = mid;
    }
    const previous = Math.max(0, low - 1);
    const next = Math.min(points.length - 1, low);
    const nearest = Math.abs((points[previous]?.timestamp ?? 0) - target) <
      Math.abs((points[next]?.timestamp ?? 0) - target) ? previous : next;
    setHover(nearest);
  };

  if (points.length === 0) return <div className="oref-empty">No telemetry in this time range</div>;

  return (
    <div className="oref-plot">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${METRICS[metric].label} · ${visualization} graph`}
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={METRICS[metric].color} stopOpacity="0.32"/>
            <stop offset="100%" stopColor={METRICS[metric].color} stopOpacity="0.015"/>
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((step) => {
          const y = TOP + (step / 3) * (BOTTOM - TOP);
          return (
            <g key={step}>
              <line x1={LEFT} x2={RIGHT} y1={y} y2={y} stroke="var(--oref-grid)" strokeDasharray="4 5"/>
              <text x={LEFT - 7} y={y + 4} textAnchor="end" fill="var(--oref-muted)" fontSize="11">
                {formatValue(max - (step / 3) * (max - min), metric)}
              </text>
            </g>
          );
        })}
        {visualization === 'bars' ? (
          bars.map((bar, index) => (
            <rect
              key={index}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={Math.max(0, bar.height)}
              rx="1.8"
              fill={METRICS[metric].color}
              opacity="0.84"
            />
          ))
        ) : (
          <>
            {visualization === 'area' && segments.map((segment, i) => (
              <path key={i} d={segment.fill} fill={`url(#${gradientId})`}/>
            ))}
            {segments.map((segment, i) => (
              <path key={i} d={segment.line} fill="none" stroke={METRICS[metric].color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/>
            ))}
          </>
        )}
        {[0, 0.5, 1].map((fraction) => {
          const time = start + fraction * timeStep;
          return (
            <text key={fraction} x={LEFT + fraction * (RIGHT - LEFT)} y={H - 9} textAnchor={fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'} fill="var(--oref-muted)" fontSize="11">
              {formatTime.format(time)}
            </text>
          );
        })}
        {active && active.value !== null && (
          <>
            <line x1={coordinateX(active.timestamp)} x2={coordinateX(active.timestamp)} y1={TOP} y2={BOTTOM} stroke="var(--oref-muted)" strokeDasharray="4 4"/>
            <line x1={LEFT} x2={RIGHT} y1={coordinateY(active.value)} y2={coordinateY(active.value)} stroke="var(--oref-muted)" opacity=".35" strokeDasharray="4 4"/>
            <circle cx={coordinateX(active.timestamp)} cy={coordinateY(active.value)} r="5" fill={METRICS[metric].color} stroke="var(--oref-bg)" strokeWidth="2"/>
          </>
        )}
      </svg>
      {active && (
        <div className="oref-plot__tooltip" role="status">
          <span>{formatTime.format(active.timestamp)}</span>
          <strong>{formatValue(active.value, metric)} {METRICS[metric].unit}</strong>
        </div>
      )}
    </div>
  );
}

export function MetricVisual({ metric, points, visualization }: VisualProps) {
  switch (visualization) {
    case 'stat':
      return <StatVisual metric={metric} points={points}/>;
    case 'table':
      return <TableVisual metric={metric} points={points}/>;
    case 'area':
    case 'line':
    case 'bars':
      return <ChartVisual metric={metric} points={points} visualization={visualization}/>;
  }
}
