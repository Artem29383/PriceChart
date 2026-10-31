import { describe, expect, it } from 'vitest';
import {
  clampViewport,
  nearestSample,
  normalizePrices,
  panViewport,
  sampleIndexToX,
  viewportForPreset,
  xToSampleIndex,
  zoomViewport,
  visiblePriceDomain,
  type PlotRect,
} from './model';

const plot: PlotRect = {
  left: 20, top: 10, width: 400, height: 180, right: 420, bottom: 190,
};

const records = [
  { timestamp: 3000, close: 30 },
  { timestamp: 1000, close: 10 },
  { timestamp: 2000, close: 20 },
];
const samples = normalizePrices(records, (point) => point.timestamp, (point) => point.close);

describe('reference chart model', () => {
  it('sorts and deduplicates timestamps without modifying the input', () => {
    const data = [
      ...records,
      { timestamp: 2000, close: 25 },
      { timestamp: Number.NaN, close: 99 },
    ];
    const normalized = normalizePrices(data, (point) => point.timestamp, (point) => point.close);
    expect(normalized.map((point) => point.value)).toEqual([10, 25, 30]);
    expect(data[0]?.timestamp).toBe(3000);
  });

  it('round-trips screen coordinates for fractional indices', () => {
    const viewport = { start: 1.3, count: 10 };
    const x = sampleIndexToX(5.6, viewport, plot);
    expect(xToSampleIndex(x, viewport, plot)).toBeCloseTo(5.6);
  });

  it('preserves the point under the cursor when zooming without hitting a boundary', () => {
    const viewport = { start: 40, count: 40 };
    const before = xToSampleIndex(170, viewport, plot);
    const next = zoomViewport(viewport, 170, plot, -180, 200);
    expect(xToSampleIndex(170, next, plot)).toBeCloseTo(before, 7);
    expect(next.count).toBeLessThan(viewport.count);
  });

  it('clamps panning at history bounds', () => {
    const viewport = { start: 20, count: 20 };
    expect(panViewport(viewport, 100000, plot.width, 100).start).toBe(0);
    expect(panViewport(viewport, -100000, plot.width, 100).start).toBe(80);
  });

  it('handles small data sets and missing prices', () => {
    expect(clampViewport({ start: 100, count: 90 }, 1)).toEqual({ start: 0, count: 2 });
    expect(visiblePriceDomain([{ time: 0, value: null, original: 1 }], { start: 0, count: 2 })).toBeNull();
  });

  it('uses actual timestamps for date presets', () => {
    const points = normalizePrices(
      [
        { time: 0, value: 1 },
        { time: 100 * 86400000, value: 2 },
        { time: 101 * 86400000, value: 3 },
        { time: 102 * 86400000, value: 4 },
      ],
      (p) => p.time,
      (p) => p.value,
    );
    expect(viewportForPreset(points, '1W').start).toBe(1);
    expect(viewportForPreset(points, 'ALL').count).toBe(4);
  });

  it('finds a hovered valid observation', () => {
    const viewport = { start: 0, count: 3 };
    expect(nearestSample(samples, viewport, plot, 220)?.sample.value).toBe(20);
  });
});
