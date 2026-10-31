import type { ChartViewport } from './types.ts';
import { indexToX } from './indexToX.ts';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});

export function renderTimeAxis<T>(
  ctx: CanvasRenderingContext2D,
  data: readonly T[],
  getTime: (item: T) => number,
  padding: number,
  plotWidth: number,
  plotHeight: number,
  viewport: ChartViewport,
) {
  if (data.length === 0) return;

  const tickCount = 5;
  const axisY = padding + plotHeight;

  ctx.save();

  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#a8a1be';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(155, 148, 180, 0.3)';

  for (let i = 0; i < tickCount; i++) {
    const ratio = i / (tickCount - 1);
    const index = Math.round(viewport.startIndex + ratio * (viewport.visibleCount - 1));

    const point = data[index];
    if (point === undefined) continue;

    const timestamp = getTime(point);
    if (!Number.isFinite(timestamp)) continue;

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) continue;

    const x = indexToX(index, viewport, padding, plotWidth);

    ctx.beginPath();
    ctx.moveTo(x, axisY);
    ctx.lineTo(x, axisY + 5);
    ctx.stroke();

    ctx.textAlign = i === 0 ? 'left' : i === tickCount - 1 ? 'right' : 'center';

    ctx.fillText(dateFormatter.format(date), x, axisY + 19);
  }

  ctx.restore();
}
