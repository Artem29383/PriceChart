import { describe, expect, it } from 'vitest';
import { generateSeries, MAX_TOTAL_POINTS, PRESETS, validateConfig } from './workload';

describe('performance stress fixture', () => {
  it('starts in a safe configuration', () => {
    expect(validateConfig(PRESETS.light)).toBeNull();
    expect(PRESETS.light.panels * PRESETS.light.pointsPerPanel).toBeLessThan(MAX_TOTAL_POINTS);
  });

  it('accepts large but bounded workloads', () => {
    expect(validateConfig(PRESETS.extreme)).toBeNull();
    expect(validateConfig({ panels: 96, pointsPerPanel: 30_000, intervalMs: 100 })).not.toBeNull();
    expect(() => generateSeries({ panels: 96, pointsPerPanel: 30_000, intervalMs: 100 })).toThrow(RangeError);
  });

  it('provides independent deterministic typed arrays for each panel', () => {
    const config = { panels: 3, pointsPerPanel: 40, intervalMs: 1000 };
    const first = generateSeries(config);
    const second = generateSeries(config);
    expect(first).toHaveLength(3);
    expect(first[0]?.values).toBeInstanceOf(Float32Array);
    expect(Array.from(first[0]?.values ?? [])).toEqual(Array.from(second[0]?.values ?? []));
    expect(Array.from(first[0]?.values ?? [])).not.toEqual(Array.from(first[1]?.values ?? []));
    expect(first[0]?.values).not.toBe(first[1]?.values);
  });

  it('rejects nonsensical counts and frequencies', () => {
    expect(validateConfig({ panels: 0, pointsPerPanel: 100, intervalMs: 1000 })).not.toBeNull();
    expect(validateConfig({ panels: 5, pointsPerPanel: -1, intervalMs: 1000 })).not.toBeNull();
    expect(validateConfig({ panels: 5, pointsPerPanel: 100, intervalMs: 16 })).not.toBeNull();
  });
});
