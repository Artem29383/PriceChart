import type { ChartTheme } from '../core/types';

/**
 * Reusable, generic public API. T is inferred from the caller's data.
 * External records do not need specific property names for date or price.
 */
export interface PriceChartProps<T> {
  data: readonly T[];
  getTime: (item: T) => number;
  getValue: (item: T) => number | null;
  height?: number;
  theme?: ChartTheme;
  className?: string;
}

/**
 * Intentional blank starter: no graph implementation or fake chart.
 * We'll implement Canvas and its lifecycle together in the next chat.
 */
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

  const firstTime = firstPoint === undefined ? null : getTime(firstPoint);
  const latestValue = lastPoint === undefined ? null : getValue(lastPoint);

  return (
    <section
      className={['price-chart', className].filter(Boolean).join(' ')}
      data-theme={theme}
      style={{ height }}
      aria-label="Price chart (not implemented yet)"
    >
      <div className="price-chart__pending">
        <div className="price-chart__glyph" aria-hidden="true">◇</div>

        <strong>Canvas renderer: not implemented</strong>
        <span>We'll build the line, axes, gradient, drag and zoom together.</span>

        <div className="price-chart__debug">
          <span>samples: {data.length}</span>
          <span>first timestamp: {firstTime ?? '—'}</span>
          <span>last value: {latestValue?.toFixed(2) ?? '—'}</span>
        </div>
      </div>
    </section>
  );
}
