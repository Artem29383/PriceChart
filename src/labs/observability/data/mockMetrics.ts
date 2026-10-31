import type {
  DashboardConfig,
  MetricDefinition,
  MetricId,
  MetricPoint,
  MetricSeries,
} from '../model/types';

export const METRIC_DEFINITIONS = [
  {
    id: 'cpu',
    label: 'CPU Usage',
    unit: '%',
    description: 'Загрузка CPU сервиса',
  },
  {
    id: 'memory',
    label: 'Memory Usage',
    unit: 'GB',
    description: 'Использование оперативной памяти',
  },
  {
    id: 'requests',
    label: 'HTTP Requests',
    unit: 'req/s',
    description: 'Частота входящих HTTP-запросов',
  },
  {
    id: 'latency',
    label: 'API Latency',
    unit: 'ms',
    description: 'Время ответа API',
  },
] as const satisfies readonly MetricDefinition[];

export const INITIAL_DASHBOARD = {
  id: 'platform-overview',
  title: 'Platform Overview',
  panels: [
    { id: 'cpu-panel', metricId: 'cpu', title: 'CPU Usage', visualization: 'line' },
    { id: 'memory-panel', metricId: 'memory', title: 'Memory Usage', visualization: 'line' },
    { id: 'requests-panel', metricId: 'requests', title: 'HTTP Requests', visualization: 'stat' },
    { id: 'latency-panel', metricId: 'latency', title: 'API Latency', visualization: 'line' },
  ],
} as const satisfies DashboardConfig;

/**
 * Repeatable offline telemetry. It is a fixture, not a real monitoring API.
 * Sampling is one minute; timestamps are in Unix milliseconds.
 */
export function makeMockMetrics(count = 240, seed = 42): MetricSeries[] {
  if (!Number.isInteger(count) || count < 0 || count > 100_000) {
    throw new RangeError('count must be an integer between 0 and 100,000');
  }

  let randomState = seed >>> 0;
  const random = () => {
    randomState = (1664525 * randomState + 1013904223) >>> 0;
    return randomState / 4294967296;
  };

  const endTimestamp = Date.UTC(2026, 9, 31, 12, 0, 0);
  const groups: Record<MetricId, MetricPoint[]> = {
    cpu: [],
    memory: [],
    requests: [],
    latency: [],
  };

  for (let index = 0; index < count; index++) {
    const timestamp = endTimestamp - (count - 1 - index) * 60_000;
    const spike = index % 83 > 70 ? 17 : 0;

    groups.cpu.push({
      timestamp,
      value: Math.round(Math.min(100, Math.max(0, 48 + Math.sin(index / 13) * 15 + spike + random() * 8)) * 10) / 10,
    });
    groups.memory.push({
      timestamp,
      value: Math.round((9.5 + Math.sin(index / 38) * 0.7 + random() * 0.35) * 100) / 100,
    });
    groups.requests.push({
      timestamp,
      value: Math.round(Math.max(0, 165 + Math.sin(index / 19) * 36 + random() * 28)),
    });
    groups.latency.push({
      timestamp,
      // Null means missing telemetry, not zero latency.
      value: index % 59 === 0 ? null : Math.round(85 + Math.sin(index / 16) * 18 + spike * 3 + random() * 12),
    });
  }

  return METRIC_DEFINITIONS.map(({ id }) => ({
    metricId: id,
    service: id === 'memory' ? 'database' : 'api-gateway',
    points: groups[id],
  }));
}
