/**
 * Pure chart geometry and data normalization; no React or DOM dependencies.
 * A viewport uses fractional sample indices so pan and zoom never have to
 * round to whole observations.
 */
export interface ChartSample<T> {
  readonly time: number;
  readonly value: number | null;
  readonly original: T;
}

export interface Viewport {
  readonly start: number;
  readonly count: number;
}

export interface PlotRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly right: number;
  readonly bottom: number;
}

export type TimePreset = '1D' | '1W' | '1M' | '1Y' | 'ALL';
export const TIME_PRESETS: readonly TimePreset[] = ['1D', '1W', '1M', '1Y', 'ALL'];

export interface PriceDomain {
  readonly min: number;
  readonly max: number;
}

/** Sort by time, keep the last observation for a duplicate timestamp. */
export function normalizePrices<T>(
  data: readonly T[],
  getTime: (item: T) => number,
  getValue: (item: T) => number | null,
): ChartSample<T>[] {
  const ordered: ChartSample<T>[] = [];
  for (const original of data) {
    const time = getTime(original);
    if (!Number.isFinite(time) || Math.abs(time) > 8.64e15) continue;
    const raw = getValue(original);
    ordered.push({
      time,
      value: raw !== null && Number.isFinite(raw) ? raw : null,
      original,
    });
  }

  ordered.sort((a, b) => a.time - b.time);
  const deduped: ChartSample<T>[] = [];
  for (const point of ordered) {
    if (deduped.length && deduped[deduped.length - 1]?.time === point.time) {
      deduped[deduped.length - 1] = point;
    } else {
      deduped.push(point);
    }
  }
  return deduped;
}

export function clampViewport(viewport: Viewport, length: number): Viewport {
  const count = Math.min(Math.max(2, length), Math.max(2, viewport.count));
  const maxStart = Math.max(0, length - count);
  const start = Math.max(0, Math.min(maxStart, viewport.start));
  return { start, count };
}

export function viewportForPreset<T>(
  samples: readonly ChartSample<T>[],
  preset: TimePreset,
): Viewport {
  const length = samples.length;
  if (length <= 2 || preset === 'ALL') {
    return clampViewport({ start: 0, count: Math.max(2, length) }, length);
  }

  const lastTime = samples[length - 1]?.time ?? 0;
  const duration: Record<Exclude<TimePreset, 'ALL'>, number> = {
    '1D': 24 * 60 * 60 * 1000,
    '1W': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
    '1Y': 365 * 24 * 60 * 60 * 1000,
  };
  const threshold = lastTime - duration[preset];

  // Lower bound works because normalizePrices sorts the samples.
  let low = 0;
  let high = length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if ((samples[mid]?.time ?? Infinity) < threshold) low = mid + 1;
    else high = mid;
  }
  const count = Math.max(2, length - low);
  return clampViewport({ start: length - count, count }, length);
}

export function sampleIndexToX(index: number, viewport: Viewport, plot: PlotRect): number {
  return plot.left + ((index - viewport.start) / (viewport.count - 1)) * plot.width;
}

export function xToSampleIndex(x: number, viewport: Viewport, plot: PlotRect): number {
  return viewport.start + ((x - plot.left) / plot.width) * (viewport.count - 1);
}

export function panViewport(
  initial: Viewport,
  deltaPixels: number,
  plotWidth: number,
  length: number,
): Viewport {
  if (plotWidth <= 0) return initial;
  return clampViewport(
    { ...initial, start: initial.start - (deltaPixels / plotWidth) * (initial.count - 1) },
    length,
  );
}

export function zoomViewport(
  initial: Viewport,
  cursorX: number,
  plot: PlotRect,
  wheelDeltaY: number,
  length: number,
): Viewport {
  if (plot.width <= 0 || length < 2) return initial;
  const ratio = Math.max(0, Math.min(1, (cursorX - plot.left) / plot.width));
  const anchorIndex = initial.start + ratio * (initial.count - 1);
  const minCount = Math.min(length, 4);
  const newCount = Math.max(
    minCount,
    Math.min(length, 1 + (initial.count - 1) * Math.exp(wheelDeltaY * 0.0015)),
  );
  return clampViewport(
    { start: anchorIndex - ratio * (newCount - 1), count: newCount },
    length,
  );
}

export function visibleIndexBounds(viewport: Viewport, length: number): {
  readonly from: number;
  readonly to: number;
} {
  return {
    from: Math.max(0, Math.floor(viewport.start) - 1),
    to: Math.min(length, Math.ceil(viewport.start + viewport.count) + 1),
  };
}

export function visiblePriceDomain<T>(
  samples: readonly ChartSample<T>[],
  viewport: Viewport,
): PriceDomain | null {
  const { from, to } = visibleIndexBounds(viewport, samples.length);
  let min = Infinity;
  let max = -Infinity;
  for (let i = from; i < to; i++) {
    const value = samples[i]?.value;
    if (value === null || value === undefined) continue;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  const extra = Math.max((max - min) * 0.08, Math.abs(max) * 0.003, 0.01);
  return { min: min - extra, max: max + extra };
}

export function priceToY(price: number, domain: PriceDomain, plot: PlotRect): number {
  return plot.bottom - ((price - domain.min) / (domain.max - domain.min)) * plot.height;
}

export function nearestSample<T>(
  samples: readonly ChartSample<T>[],
  viewport: Viewport,
  plot: PlotRect,
  x: number,
): { index: number; sample: ChartSample<T> } | null {
  if (samples.length === 0 || x < plot.left || x > plot.right) return null;
  const nearest = Math.round(xToSampleIndex(x, viewport, plot));
  const { from, to } = visibleIndexBounds(viewport, samples.length);
  for (let distance = 0; distance < 7; distance++) {
    for (const index of distance === 0 ? [nearest] : [nearest - distance, nearest + distance]) {
      if (index < from || index >= to) continue;
      const sample = samples[index];
      if (sample && sample.value !== null) return { index, sample };
    }
  }
  return null;
}

export function nicePriceTicks(domain: PriceDomain, targetCount = 5): number[] {
  const rawStep = (domain.max - domain.min) / Math.max(1, targetCount - 1);
  if (!Number.isFinite(rawStep) || rawStep <= 0) return [];
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const normal = rawStep / power;
  const unit = [1, 2, 2.5, 5, 10].find((step) => step >= normal) ?? 10;
  const step = unit * power;
  const first = Math.ceil(domain.min / step) * step;
  const ticks: number[] = [];
  for (let i = 0; i < 20; i++) {
    const value = first + i * step;
    if (value > domain.max + step * 1e-8) break;
    ticks.push(Number(value.toPrecision(12)));
  }
  return ticks;
}
