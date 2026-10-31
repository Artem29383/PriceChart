import type { ChartViewport } from './types.ts';
import { indexToX } from './indexToX.ts';

export function renderArea<T>(
  ctx: CanvasRenderingContext2D,
  data: readonly T[],
  getValue: (item: T) => number | null,
  padding: number,
  plotHeight: number,
  plotWidth: number,
  maxPrice: number,
  minPrice: number,
  viewport: ChartViewport,
) {
  const baseline = padding + plotHeight;

  // Градиент сверху вниз
  const gradient = ctx.createLinearGradient(0, padding, 0, baseline);

  gradient.addColorStop(0, 'rgba(167, 139, 250, 0.4)');
  gradient.addColorStop(1, 'rgba(167, 139, 250, 0)');

  ctx.save();
  ctx.fillStyle = gradient;

  let firstX: number | null = null;
  let lastX: number | null = null;

  // Завершаем и заливаем отдельный участок графика
  const fillSegment = () => {
    if (firstX === null || lastX === null) return;

    ctx.lineTo(lastX, baseline);
    ctx.lineTo(firstX, baseline);
    ctx.closePath();
    ctx.fill();

    firstX = null;
    lastX = null;
  };

  for (let index = 0; index < data.length; index++) {
    const item = data[index];
    if (item === undefined) continue;

    const price = getValue(item);

    if (price === null || !Number.isFinite(price)) {
      fillSegment();
      continue;
    }

    const x = indexToX(index, viewport, padding, plotWidth);
    const y = padding + ((maxPrice - price) / (maxPrice - minPrice)) * plotHeight;

    if (firstX === null) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      firstX = x;
    } else {
      ctx.lineTo(x, y);
    }

    lastX = x;
  }

  fillSegment();
  ctx.restore();
}
