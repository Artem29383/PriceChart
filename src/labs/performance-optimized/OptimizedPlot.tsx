import { memo, useEffect, useRef } from 'react';

import type { StressSeries } from '../performance-stress/workload';
import { dynamicLast, minMaxIndices, sourceX, sourceY, type SampledLine } from './sampling';
import { TickBus, VisibilityRegistry } from './runtime';

const WIDTH = 710;
const HEIGHT = 128;
const MAX_DPR = 2;
const COLORS = ['#ad95ff', '#6bd3dd', '#ffba75', '#82b9ff', '#f084bf', '#87d6a2'];

interface OptimizedPlotProps {
  readonly series: StressSeries;
  readonly bus: TickBus;
  readonly visibility: VisibilityRegistry;
}

function configureCanvas(canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const ratio = Math.min(MAX_DPR, Math.max(1, window.devicePixelRatio || 1));
  const pixelWidth = Math.max(1, Math.round(width * ratio));
  const pixelHeight = Math.max(1, Math.round(height * ratio));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  ctx.setTransform(pixelWidth / WIDTH, 0, 0, pixelHeight / HEIGHT, 0, 0);
  return ctx;
}

function paintHistory(
  ctx: CanvasRenderingContext2D,
  values: Float32Array,
  sampled: SampledLine,
  color: string,
): void {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = '#30394b';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  for (const y of [32, 64, 96]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < sampled.indices.length; i++) {
    const index = sampled.indices[i] ?? 0;
    const x = sourceX(index, values.length);
    const y = sourceY(values[index] ?? 0);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

/**
 * No React state per metric tick: only the overlay canvas and two DOM text
 * nodes change. Static history is downsampled once on first visibility.
 * Rendering stops for panels outside the viewport.
 */
export const OptimizedPlot = memo(function OptimizedPlot({
  series, bus, visibility,
}: OptimizedPlotProps) {
  const rootRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const valueRef = useRef<HTMLElement>(null);
  const tickRef = useRef<HTMLElement>(null);

  const color = COLORS[series.id % COLORS.length] ?? '#ad95ff';
  const initial = dynamicLast(series, 0).toFixed(1);

  useEffect(() => {
    const root = rootRef.current;
    const wrap = wrapRef.current;
    const staticCanvas = historyRef.current;
    const liveCanvas = overlayRef.current;
    if (!root || !wrap || !staticCanvas || !liveCanvas) return;

    let active = false;
    let sampled: SampledLine | null = null;
    let unsubscribe: (() => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let overlayContext: CanvasRenderingContext2D | null = null;

    const tick = (currentTick: number) => {
      if (!active || !overlayContext) return;
      overlayContext.clearRect(0, 0, WIDTH, HEIGHT);
      const last = dynamicLast(series, currentTick);
      const count = series.values.length;

      overlayContext.strokeStyle = color;
      overlayContext.lineWidth = 1.5;
      overlayContext.lineCap = 'round';
      overlayContext.beginPath();
      overlayContext.moveTo(
        sourceX(count - 2, count),
        sourceY(series.values[count - 2] ?? 0),
      );
      overlayContext.lineTo(WIDTH, sourceY(last));
      overlayContext.stroke();

      if (valueRef.current) valueRef.current.textContent = `${last.toFixed(1)}%`;
      if (tickRef.current) tickRef.current.textContent = `Canvas · cached + LOD · тик #${currentTick}`;
    };

    const redraw = () => {
      if (!active) return;
      const rect = wrap.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const base = configureCanvas(staticCanvas, rect.width, rect.height);
      overlayContext = configureCanvas(liveCanvas, rect.width, rect.height);
      if (!base || !overlayContext) return;

      // One scan of the original N values, not N operations per tick.
      sampled ??= minMaxIndices(series.values, WIDTH);
      paintHistory(base, series.values, sampled, color);
      tick(bus.tick);
    };

    const setVisible = (visible: boolean) => {
      if (visible === active) return;
      active = visible;
      if (active) {
        sampled ??= minMaxIndices(series.values, WIDTH);
        resizeObserver = new ResizeObserver(redraw);
        resizeObserver.observe(wrap);
        unsubscribe = bus.subscribe(tick);
        redraw();
      } else {
        unsubscribe?.();
        unsubscribe = null;
        resizeObserver?.disconnect();
        resizeObserver = null;
        overlayContext = null;
        // Existing canvas bitmaps remain available until we scroll back.
      }
    };

    const unobserve = visibility.observe(root, setVisible);
    return () => {
      unobserve();
      unsubscribe?.();
      resizeObserver?.disconnect();
    };
  }, [series, bus, visibility, color]);

  return (
    <article ref={rootRef} className="stress-panel optimized-panel" style={{ '--stress-color': color } as React.CSSProperties}>
      <div className="stress-panel__header">
        <div>
          <small>SERVER / NODE-{String(series.id + 1).padStart(2, '0')}</small>
          <h3>CPU telemetry #{series.id + 1}</h3>
        </div>
        <strong ref={valueRef}>{initial}%</strong>
      </div>
      <div className="optimized-canvas" ref={wrapRef} role="img" aria-label={`Оптимизированный график номер ${series.id + 1}`}>
        <canvas ref={historyRef} aria-hidden="true" />
        <canvas ref={overlayRef} aria-hidden="true" />
      </div>
      <footer>
        <span>{series.values.length.toLocaleString('ru-RU')} исходных точек</span>
        <span ref={tickRef}>Canvas · cached + LOD · тик #0</span>
      </footer>
    </article>
  );
});
