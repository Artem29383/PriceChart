import { describe, expect, it } from 'vitest';

import { PRESETS, generateSeries } from '../performance-stress/workload';
import { dynamicLast, minMaxIndices, sourceX, sourceY } from './sampling';
import { TickBus } from './runtime';

describe('Optimized Performance Lab', () => {
  it('uses exactly the same fixture arrays as the stress baseline', () => {
    const original = generateSeries(PRESETS.medium);
    const optimized = generateSeries(PRESETS.medium);
    expect(original[0]?.values).toEqual(optimized[0]?.values);
    expect(optimized).toHaveLength(PRESETS.medium.panels);
  });

  it('keeps source order, endpoints, min and max without changing the source', () => {
    const values = Float32Array.from(Array.from({ length: 10_002 }, (_, i) => {
      if (i === 4200) return -100;
      if (i === 4201) return 200;
      return 40 + Math.sin(i) * 10;
    }));
    const sampled = minMaxIndices(values, 64);
    const indices = Array.from(sampled.indices);
    expect(indices[0]).toBe(0);
    expect(indices.at(-1)).toBe(values.length - 2);
    expect(indices).toContain(4200);
    expect(indices).toContain(4201);
    expect(indices.length).toBeLessThanOrEqual(130);
    expect(indices.every((item, i) => i === 0 || item > (indices[i - 1] ?? -1))).toBe(true);
    expect(values[4200]).toBe(-100);
  });

  it('keeps all coordinates at small sample counts', () => {
    expect(Array.from(minMaxIndices(Float32Array.of(10, 20, 30, 40)).indices)).toEqual([0, 1, 2]);
    expect(sourceX(99, 100)).toBeCloseTo(710);
    expect(sourceY(0)).toBe(128);
  });

  it('reproduces the baseline formula for the changing last value', () => {
    const series = generateSeries({ panels: 1, pointsPerPanel: 300, intervalMs: 5000 })[0];
    expect(series).toBeDefined();
    if (!series) return;
    const tick = 17;
    const baselineValue = (series.values.at(-1) ?? 0) + Math.sin(tick / 3 + series.id) * 6;
    expect(dynamicLast(series, tick)).toBe(baselineValue);
  });

  it('notifies subscribers without React and cleans them up', () => {
    const bus = new TickBus();
    const received: number[] = [];
    const unsubscribe = bus.subscribe((tick) => received.push(tick));
    bus.next();
    bus.next();
    unsubscribe();
    bus.next();
    expect(received).toEqual([1, 2]);
    expect(bus.tick).toBe(3);
  });
});
