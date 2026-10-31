import { describe, expect, it } from 'vitest';

import { generateMockPrices } from './generateMockPrices';

describe('generateMockPrices', () => {
  it('is deterministic with a fixed seed', () => {
    expect(generateMockPrices(20, 42)).toEqual(generateMockPrices(20, 42));
  });

  it('generates strictly ordered weekdays with finite prices', () => {
    const points = generateMockPrices(100);
    expect(points).toHaveLength(100);

    for (let index = 0; index < points.length; index++) {
      const point = points[index]!;
      const weekday = new Date(point.timestamp).getUTCDay();

      expect(weekday).not.toBe(0);
      expect(weekday).not.toBe(6);
      expect(Number.isFinite(point.close)).toBe(true);

      if (index > 0) {
        expect(point.timestamp).toBeGreaterThan(points[index - 1]!.timestamp);
      }
    }
  });

  it('supports an empty dataset', () => {
    expect(generateMockPrices(0)).toEqual([]);
  });

  it('validates the sample count', () => {
    expect(() => generateMockPrices(-1)).toThrow(RangeError);
  });
});
