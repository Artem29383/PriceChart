import { METRIC_IDS, type MetricId, type MetricPoint, type Telemetry } from './model';

const STEP = 60_000;
const HISTORY_LIMIT = 720;

function hashNoise(index: number, salt: number): number {
  const value = Math.sin(index * 78.233 + salt * 13.371) * 43758.5453;
  return value - Math.floor(value);
}

function sampleValue(metric: MetricId, index: number): number | null {
  const noise = hashNoise(index, METRIC_IDS.indexOf(metric) + 1);
  const wave = Math.sin(index / 15) * 0.5 + Math.cos(index / 37) * 0.5;
  const spike = index % 117 >= 107 && index % 117 <= 114 ? 1 : 0;
  const raw = (() => {
    switch (metric) {
      case 'cpu': return 48 + wave * 19 + noise * 8 + spike * 30;
      case 'memory': return 9.4 + Math.sin(index / 48) * 0.9 + noise * 0.24 + spike * 0.5;
      case 'requests': return 240 + wave * 80 + noise * 85 + spike * 190;
      case 'latency': return 106 + wave * 32 + noise * 22 + spike * 150;
      case 'errors': return 0.38 + Math.abs(wave) * 0.7 + noise * 0.22 + spike * 3.6;
      case 'network': return 38 + wave * 14 + noise * 10 + spike * 32;
    }
  })();
  if (metric === 'latency' && index % 97 === 0) return null;
  return Math.round(Math.max(0, metric === 'cpu' ? Math.min(100, raw) : raw) * 100) / 100;
}

export function createTelemetry(now: number = Date.now(), history = 300): Telemetry {
  const total = Math.max(0, Math.min(HISTORY_LIMIT, Math.floor(history)));
  const latest = Math.floor(now / STEP) * STEP;
  const output = {} as Record<MetricId, MetricPoint[]>;
  for (const metric of METRIC_IDS) {
    output[metric] = [];
    for (let i = 0; i < total; i++) {
      const timestamp = latest - (total - 1 - i) * STEP;
      const index = Math.floor(timestamp / STEP);
      output[metric].push({ timestamp, value: sampleValue(metric, index) });
    }
  }
  return output;
}

/** Simulate a live source with bounded retention; can later be replaced by SSE/WebSocket. */
export function appendTelemetry(previous: Telemetry, now: number): Telemetry {
  const next = {} as Record<MetricId, MetricPoint[]>;
  for (const metric of METRIC_IDS) {
    const history = previous[metric];
    const last = history[history.length - 1]?.timestamp ?? now - 1;
    const timestamp = Math.max(now, last + 1);
    const index = Math.floor(timestamp / 5_000);
    const point = { timestamp, value: sampleValue(metric, index) };
    next[metric] = [...history, point].slice(-HISTORY_LIMIT);
  }
  return next;
}

export const LIVE_REFRESH_MS = 5_000;
