import type { StressSeries } from '../performance-stress/workload';

export interface SampledLine {
  /** Original indices, strictly increasing, not synthetic averages. */
  readonly indices: Uint32Array;
  readonly sourceCount: number;
}

/**
 * Linear-time per-series downsampling. First and penultimate point are kept
 * and every interior bucket contributes its min and max (in source order).
 * The final observation remains dynamic in a separate overlay canvas.
 *
 * Changing the renderer does NOT change the source data or tick formula.
 * It changes the detail/resolution visible in the line (intentional LOD).
 */
export function minMaxIndices(values: Float32Array, buckets = 710): SampledLine {
  const lastStatic = values.length - 2;
  if (lastStatic < 0) return { indices: new Uint32Array(), sourceCount: values.length };
  if (lastStatic === 0) return { indices: Uint32Array.of(0), sourceCount: values.length };

  const bucketCount = Math.max(1, Math.floor(buckets));
  const count = lastStatic + 1;
  if (count <= bucketCount * 2) {
    const indices = new Uint32Array(count);
    for (let i = 0; i < count; i++) indices[i] = i;
    return { indices, sourceCount: values.length };
  }

  const indices: number[] = [0];
  const interior = count - 2;
  for (let bucket = 0; bucket < bucketCount; bucket++) {
    const start = 1 + Math.floor((bucket * interior) / bucketCount);
    const end = 1 + Math.floor(((bucket + 1) * interior) / bucketCount);
    if (start >= end) continue;
    let minimum = start;
    let maximum = start;
    for (let i = start + 1; i < end; i++) {
      if ((values[i] ?? 0) < (values[minimum] ?? 0)) minimum = i;
      if ((values[i] ?? 0) > (values[maximum] ?? 0)) maximum = i;
    }
    if (minimum === maximum) indices.push(minimum);
    else if (minimum < maximum) indices.push(minimum, maximum);
    else indices.push(maximum, minimum);
  }
  indices.push(lastStatic);
  return { indices: Uint32Array.from(indices), sourceCount: values.length };
}

export function dynamicLast(series: StressSeries, tick: number): number {
  const value = series.values[series.values.length - 1] ?? 0;
  return value + Math.sin(tick / 3 + series.id) * 6;
}

/** Match the coordinates and constants from the original StressPlot. */
export function sourceX(index: number, sourceCount: number): number {
  return (index / Math.max(1, sourceCount - 1)) * 710;
}

export function sourceY(value: number): number {
  return ((100 - value) / 100) * 128;
}
