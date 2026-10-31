/**
 * Deterministic fake stock history. This module is data infrastructure,
 * not charting logic; it doesn't render anything or call a network API.
 */
export interface StockPrice {
  readonly timestamp: number;
  readonly close: number;
  readonly volume: number;
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function generateMockPrices(count = 260, seed = 42): StockPrice[] {
  if (!Number.isInteger(count) || count < 0 || count > 100_000) {
    throw new RangeError('count must be an integer between 0 and 100,000');
  }

  const random = createRandom(seed);
  const output: StockPrice[] = [];
  const day = new Date(Date.UTC(2025, 0, 1, 16, 0, 0));
  let close = 120;

  while (output.length < count) {
    const weekday = day.getUTCDay();

    // Synthetic daily market observations; no Saturday/Sunday samples.
    if (weekday !== 0 && weekday !== 6) {
      const trend = Math.sin(output.length / 17) * 0.55;
      const noise = (random() - 0.5) * 3.8;

      close = Math.max(1, close + trend + noise);

      output.push({
        timestamp: day.getTime(),
        close: Math.round(close * 100) / 100,
        volume: Math.round(1000 + random() * 9000),
      });
    }

    day.setUTCDate(day.getUTCDate() + 1);
  }

  return output;
}
