import type { ChartTheme } from '../core/types';
import { useEffect, useRef } from 'react';
import { getPriceDomain } from '../core/getPriceDomain.ts';
import { prepareCanvas } from '../core/prepareCanvas.ts';
import { renderPoints } from '../core/renderPoints.ts';

export interface PriceChartProps<T> {
  data: readonly T[];
  getTime: (item: T) => number;
  getValue: (item: T) => number | null;
  height?: number;
  theme?: ChartTheme;
  className?: string;
}

export function PriceChart<T>({
  data,
  getTime,
  getValue,
  height = 420,
  theme = 'dark',
  className,
}: PriceChartProps<T>) {
  const firstPoint = data[0];
  const lastPoint = data[data.length - 1];
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const firstTime = firstPoint === undefined ? null : getTime(firstPoint);
  const latestValue = lastPoint === undefined ? null : getValue(lastPoint);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const domain = getPriceDomain(data, getValue);
    const {plotHeight, padding, plotWidth} = prepareCanvas(canvas, ctx);

    if (!domain) return;

    const { minPrice, maxPrice } = domain;
    renderPoints(ctx, data, getValue, padding, plotHeight, plotWidth, maxPrice, minPrice);
  }, [data, getValue]);

  return (
    <section
      className={['price-chart', className].filter(Boolean).join(' ')}
      data-theme={theme}
      style={{ height }}
      aria-label="Price chart"
    >
      <div className="price-chart__pending">
        <canvas ref={canvasRef} />
        <div className="price-chart__debug">
          <span>samples: {data.length}</span>
          <span>first timestamp: {firstTime ?? '—'}</span>
          <span>last value: {latestValue?.toFixed(2) ?? '—'}</span>
        </div>
      </div>
    </section>
  );
}
