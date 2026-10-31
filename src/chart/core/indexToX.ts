import type { ChartViewport } from './types';

export function indexToX(
  index: number,
  viewport: ChartViewport,
  padding: number,
  plotWidth: number,
): number {
  const span = Math.max(1, viewport.visibleCount - 1);

  return padding + ((index - viewport.startIndex) / span) * plotWidth;
}
