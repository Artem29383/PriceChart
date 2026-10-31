/** Contracts for the independent, completed observability dashboard. */
export const METRICS = {
  cpu: { label: 'CPU usage', short: 'CPU', unit: '%', service: 'api-gateway', color: '#8b80ff', warn: 75, critical: 90 },
  memory: { label: 'Memory', short: 'RAM', unit: 'GB', service: 'postgres-primary', color: '#49d9c6', warn: 12, critical: 14 },
  requests: { label: 'Request rate', short: 'RPS', unit: 'req/s', service: 'api-gateway', color: '#6aabff', warn: 400, critical: 600 },
  latency: { label: 'P95 latency', short: 'P95', unit: 'ms', service: 'api-gateway', color: '#f7b66c', warn: 180, critical: 260 },
  errors: { label: 'Error rate', short: '5XX', unit: '%', service: 'api-gateway', color: '#fa7899', warn: 2, critical: 5 },
  network: { label: 'Network traffic', short: 'NET', unit: 'MB/s', service: 'edge-proxy', color: '#c58dff', warn: 85, critical: 110 },
} as const;

export type MetricId = keyof typeof METRICS;
export type Visualization = 'area' | 'line' | 'bars' | 'stat' | 'table';
export type Range = '15m' | '1h' | '4h';
export type Theme = 'dark' | 'light';

export interface MetricPoint {
  readonly timestamp: number;
  readonly value: number | null;
}

export type Telemetry = Record<MetricId, readonly MetricPoint[]>;

export interface Panel {
  readonly id: string;
  readonly metric: MetricId;
  readonly title: string;
  readonly visualization: Visualization;
}

export interface Dashboard {
  readonly id: string;
  readonly title: string;
  readonly panels: readonly Panel[];
}

export const METRIC_IDS = Object.keys(METRICS) as MetricId[];
export const VISUALIZATIONS: readonly Visualization[] = ['area', 'line', 'bars', 'stat', 'table'];
export const RANGES: readonly Range[] = ['15m', '1h', '4h'];
export const MAX_PANELS = 24;
export const STORAGE_KEY = 'pricechart:observability-reference:v1';

export const DEFAULT_DASHBOARD: Dashboard = {
  id: 'production-overview',
  title: 'Production overview',
  panels: [
    { id: 'cpu-default', metric: 'cpu', title: 'CPU usage', visualization: 'area' },
    { id: 'requests-default', metric: 'requests', title: 'Request throughput', visualization: 'bars' },
    { id: 'memory-default', metric: 'memory', title: 'Memory consumption', visualization: 'area' },
    { id: 'latency-default', metric: 'latency', title: 'API P95 latency', visualization: 'line' },
    { id: 'errors-default', metric: 'errors', title: 'HTTP 5xx error rate', visualization: 'stat' },
    { id: 'network-default', metric: 'network', title: 'Network ingress', visualization: 'area' },
  ],
};

export function isMetricId(value: unknown): value is MetricId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(METRICS, value);
}

export function isVisualization(value: unknown): value is Visualization {
  return typeof value === 'string' && VISUALIZATIONS.some((kind) => kind === value);
}

export function rangeMillis(range: Range): number {
  switch (range) {
    case '15m': return 15 * 60_000;
    case '1h': return 60 * 60_000;
    case '4h': return 240 * 60_000;
  }
}

export function formatValue(value: number | null | undefined, metric: MetricId): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const maximumFractionDigits = metric === 'memory' || metric === 'errors' ? 2 : 1;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

export function metricStatus(metric: MetricId, value: number | null | undefined): 'healthy' | 'warning' | 'critical' | 'unknown' {
  if (value == null || !Number.isFinite(value)) return 'unknown';
  if (value >= METRICS[metric].critical) return 'critical';
  if (value >= METRICS[metric].warn) return 'warning';
  return 'healthy';
}

export function selectRange(points: readonly MetricPoint[], duration: Range): MetricPoint[] {
  const latest = points[points.length - 1]?.timestamp;
  if (latest === undefined) return [];
  const from = latest - rangeMillis(duration);
  return points.filter((point) => point.timestamp >= from);
}
