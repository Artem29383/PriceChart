import type { ChartTheme, ChartViewport } from '../core/types';
import { useEffect, useRef, useState } from 'react';
import { getPriceDomain } from '../core/getPriceDomain.ts';
import { prepareCanvas } from '../core/prepareCanvas.ts';
import { renderPoints } from '../core/renderPoints.ts';
import { renderArea } from '../core/renderArea.ts';
import { renderPriceAxis } from '../core/renderPriceAxis.ts';
import { renderTimeAxis } from '../core/renderTimeAxis.ts';
import * as React from 'react';

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
  const [viewport, setViewport] = useState<ChartViewport>(() => {
    const visibleCount = Math.min(80, data.length);

    return {
      startIndex: data.length - visibleCount,
      visibleCount,
    };
  });
  const firstPoint = data[0];
  const lastPoint = data[data.length - 1];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startIndex: number;
  } | null>(null);
  const firstTime = firstPoint === undefined ? null : getTime(firstPoint);
  const latestValue = lastPoint === undefined ? null : getValue(lastPoint);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const { plotHeight, padding, plotWidth } = prepareCanvas(canvas, ctx);

    const from = Math.max(0, Math.floor(viewport.startIndex));
    const to = Math.min(data.length, Math.ceil(viewport.startIndex + viewport.visibleCount));

    const domain = getPriceDomain(data.slice(from, to), getValue);

    if (!domain) return;

    const { minPrice, maxPrice } = domain;

    renderPriceAxis(ctx, minPrice, maxPrice, padding, plotWidth, plotHeight);

    // Ограничиваем рисунок областью графика
    ctx.save();
    ctx.beginPath();
    ctx.rect(padding, padding, plotWidth, plotHeight);
    ctx.clip();

    renderArea(ctx, data, getValue, padding, plotHeight, plotWidth, maxPrice, minPrice, viewport);
    renderPoints(ctx, data, getValue, padding, plotHeight, plotWidth, maxPrice, minPrice, viewport);

    ctx.restore();

    // Даты рисуем после восстановления clip
    renderTimeAxis(ctx, data, getTime, padding, plotWidth, plotHeight, viewport);
  }, [data, getValue, getTime, viewport]);


  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startIndex: viewport.startIndex,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    // Текущая ширина области графика — 410 из 500 CSS-пикселей.
    // Учитываем возможное CSS-масштабирование элемента.
    const canvasWidth = event.currentTarget.getBoundingClientRect().width;
    const plotWidth = canvasWidth * (410 / 500);

    if (plotWidth <= 0) return;

    const deltaX = event.clientX - drag.startX;
    const pointsPerPixel = (viewport.visibleCount - 1) / plotWidth;

    const maxStart = Math.max(0, data.length - viewport.visibleCount);

    const nextStart = Math.max(0, Math.min(maxStart, drag.startIndex - deltaX * pointsPerPixel));

    setViewport((prev) =>
      prev.startIndex === nextStart ? prev : { ...prev, startIndex: nextStart },
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;

    dragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };


  return (
    <section
      className={['price-chart', className].filter(Boolean).join(' ')}
      data-theme={theme}
      style={{ height }}
      aria-label="Price chart"
    >
      <div className="price-chart__pending">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onLostPointerCapture={handlePointerUp}
          style={{
            cursor: 'grab',
            touchAction: 'none',
          }}
        />
        <div className="price-chart__debug">
          <span>samples: {data.length}</span>
          <span>first timestamp: {firstTime ?? '—'}</span>
          <span>last value: {latestValue?.toFixed(2) ?? '—'}</span>
        </div>
      </div>
    </section>
  );
}
