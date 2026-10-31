import { describe, expect, it } from 'vitest';
import { INITIAL_DASHBOARD, METRIC_DEFINITIONS, makeMockMetrics } from './mockMetrics';

describe('Observability Lab fixtures', () => {
  it('generate deterministic samples with a fixed seed', () => {
    expect(makeMockMetrics(8, 21)).toEqual(makeMockMetrics(8, 21));
  });

  it('return time-ordered samples with numeric or missing values', () => {
    const result = makeMockMetrics(180, 42);
    expect(result).toHaveLength(METRIC_DEFINITIONS.length);
    for (const metric of result) {
      expect(metric.points).toHaveLength(180);
      for (let index = 0; index < metric.points.length; index++) {
        const point = metric.points[index];
        expect(point).toBeDefined();
        if (!point) continue;
        if (point.value !== null) expect(Number.isFinite(point.value)).toBe(true);
        if (index > 0) expect(point.timestamp).toBeGreaterThan(metric.points[index - 1]?.timestamp ?? -Infinity);
      }
    }
    expect(result.find((item) => item.metricId === 'latency')?.points.some((point) => point.value === null)).toBe(true);
  });

  it('keep panel metrics linked to a known metric definition', () => {
    const knownIds = new Set(METRIC_DEFINITIONS.map((definition) => definition.id));
    expect(INITIAL_DASHBOARD.panels.every((panel) => knownIds.has(panel.metricId))).toBe(true);
  });

  it('support an empty dataset and reject invalid sample counts', () => {
    expect(makeMockMetrics(0).every((series) => series.points.length === 0)).toBe(true);
    expect(() => makeMockMetrics(-1)).toThrow(RangeError);
  });
});
