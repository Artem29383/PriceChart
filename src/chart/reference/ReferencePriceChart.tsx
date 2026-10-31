import { useEffect, useMemo, useRef, useState } from 'react';

import {
  clampViewport,
  nearestSample,
  normalizePrices,
  panViewport,
  viewportForPreset,
  zoomViewport,
  TIME_PRESETS,
  type ChartSample,
  type PlotRect,
  type PriceDomain,
  type TimePreset,
  type Viewport,
} from './model';
import { drawBase, drawOverlay, themePalette, type ReferenceTheme } from './render';
import './reference.css';

export interface ReferencePriceChartProps<T> {
  data: readonly T[];
  getTime: (item: T) => number;
  getValue: (item: T) => number | null;
  theme?: ReferenceTheme;
  height?: number;
  className?: string;
  /** Reports the original record, never an internal normalized object. */
  onHover?: (point: T | null) => void;
  /** Parent loads older records and passes a new data array; no fetching inside the chart. */
  onLoadOlder?: (beforeTimestamp: number) => void | Promise<void>;
}

interface DragState {
  readonly pointerId: number;
  readonly clientX: number;
  readonly viewport: Viewport;
}

export function ReferencePriceChart<T>({
  data,
  getTime,
  getValue,
  theme = 'dark',
  height = 440,
  className,
  onHover,
  onLoadOlder,
}: ReferencePriceChartProps<T>) {
  const samples = useMemo(() => normalizePrices(data, getTime, getValue), [data, getTime, getValue]);
  const viewportRef = useRef<Viewport>(viewportForPreset(samples, '1Y'));
  const previousSamplesRef = useRef<readonly ChartSample<T>[]>([]);
  const hostRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const invalidateRef = useRef<() => void>(() => {});
  const [activePreset, setActivePreset] = useState<TimePreset | null>('1Y');
  const [loadError, setLoadError] = useState<string | null>(null);
  const pendingOlderRef = useRef(false);
  const attemptedOldestRef = useRef<number | null>(null);

  // Preserve the same visible observations if more history is prepended.
  useEffect(() => {
    const previous = previousSamplesRef.current;
    const current = viewportRef.current;
    let next = current;

    if (previous.length && samples.length) {
      const oldFirst = previous[0]?.time;
      const prepended = oldFirst === undefined
        ? 0
        : samples.findIndex((sample) => sample.time === oldFirst);
      const shift = prepended > 0 ? prepended : 0;
      const followedRightEdge =
        current.start >= Math.max(0, previous.length - current.count) - 0.01;

      if (shift > 0) {
        next = { ...current, start: current.start + shift };
      } else if (followedRightEdge && samples.length > previous.length) {
        next = { ...current, start: samples.length - current.count };
      }
    }

    viewportRef.current = clampViewport(next, samples.length);
    previousSamplesRef.current = samples;
  }, [samples]);

  useEffect(() => {
    const host = hostRef.current;
    const baseCanvas = baseRef.current;
    const overlayCanvas = overlayRef.current;
    if (!host || !baseCanvas || !overlayCanvas) return;

    const baseCtx = baseCanvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');
    if (!baseCtx || !overlayCtx) return;

    const palette = themePalette(theme);
    let width = 0;
    let canvasHeight = 0;
    let plot: PlotRect | null = null;
    let domain: PriceDomain | null = null;
    let hoverX: number | null = null;
    let hoveredIndex: number | null = null;
    let drag: DragState | null = null;
    let frame = 0;
    let baseDirty = true;

    const notifyHover = (x: number | null) => {
      const hovered = x !== null && plot
        ? nearestSample(samples, viewportRef.current, plot, x)
        : null;
      const nextIndex = hovered?.index ?? null;
      if (nextIndex === hoveredIndex) return;
      hoveredIndex = nextIndex;
      onHover?.(hovered?.sample.original ?? null);
    };

    const paint = () => {
      frame = 0;
      if (width === 0 || canvasHeight === 0) return;
      if (baseDirty || !plot) {
        const layout = drawBase(
          baseCtx, samples, viewportRef.current, width, canvasHeight, palette,
        );
        plot = layout.plot;
        domain = layout.domain;
        baseDirty = false;
      }
      drawOverlay(
        overlayCtx, samples, viewportRef.current, plot, domain,
        width, canvasHeight, palette, hoverX,
      );
      notifyHover(hoverX);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const invalidateBase = () => {
      baseDirty = true;
      schedule();
    };
    invalidateRef.current = invalidateBase;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const nextWidth = Math.max(0, Math.round(rect.width));
      const nextHeight = Math.max(0, Math.round(rect.height));
      if (nextWidth === width && nextHeight === canvasHeight) return;
      width = nextWidth;
      canvasHeight = nextHeight;
      if (!width || !canvasHeight) return;
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      for (const canvas of [baseCanvas, overlayCanvas]) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(canvasHeight * dpr);
        canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      invalidateBase();
    };

    const localX = (event: PointerEvent | WheelEvent): number => {
      const rect = overlayCanvas.getBoundingClientRect();
      return rect.width ? (event.clientX - rect.left) * (width / rect.width) : 0;
    };
    const insidePlot = (x: number) => plot !== null && x >= plot.left && x <= plot.right;

    const maybeLoadOlder = () => {
      if (!onLoadOlder || pendingOlderRef.current || viewportRef.current.start > 2) return;
      const oldest = samples[0]?.time;
      if (oldest === undefined || attemptedOldestRef.current === oldest) return;
      attemptedOldestRef.current = oldest;
      pendingOlderRef.current = true;
      setLoadError(null);
      Promise.resolve()
        .then(() => onLoadOlder(oldest))
        .catch((error: unknown) => {
          setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить историю');
        })
        .finally(() => {
          pendingOlderRef.current = false;
        });
    };

    const handleDown = (event: PointerEvent) => {
      const x = localX(event);
      if (event.button !== 0 || !insidePlot(x)) return;
      overlayCanvas.setPointerCapture(event.pointerId);
      drag = { pointerId: event.pointerId, clientX: event.clientX, viewport: viewportRef.current };
      overlayCanvas.style.cursor = 'grabbing';
      hoverX = null;
      notifyHover(null);
      setActivePreset(null);
      schedule();
    };

    const handleMove = (event: PointerEvent) => {
      if (drag) {
        if (event.pointerId !== drag.pointerId || !plot) return;
        const rect = overlayCanvas.getBoundingClientRect();
        const clientDelta = event.clientX - drag.clientX;
        const delta = rect.width ? clientDelta * (width / rect.width) : clientDelta;
        viewportRef.current = panViewport(drag.viewport, delta, plot.width, samples.length);
        invalidateBase();
        maybeLoadOlder();
        return;
      }
      const x = localX(event);
      hoverX = insidePlot(x) ? x : null;
      schedule();
    };

    const finishDrag = (event: PointerEvent) => {
      if (drag?.pointerId !== event.pointerId) return;
      drag = null;
      overlayCanvas.style.cursor = 'crosshair';
      if (overlayCanvas.hasPointerCapture(event.pointerId)) {
        overlayCanvas.releasePointerCapture(event.pointerId);
      }
      const x = localX(event);
      hoverX = insidePlot(x) ? x : null;
      schedule();
    };

    const cancelDrag = () => {
      if (!drag) return;
      drag = null;
      overlayCanvas.style.cursor = 'crosshair';
      hoverX = null;
      schedule();
    };

    const handleWheel = (event: WheelEvent) => {
      const x = localX(event);
      if (!plot || !insidePlot(x)) return;
      event.preventDefault();
      // WheelEvent.deltaMode can be pixels, lines or pages.
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 250 : 1);
      viewportRef.current = zoomViewport(viewportRef.current, x, plot, delta, samples.length);
      setActivePreset(null);
      invalidateBase();
      maybeLoadOlder();
    };

    const handleKey = (event: KeyboardEvent) => {
      if (!plot) return;
      const initial = viewportRef.current;
      const step = plot.width * 0.15;
      let next: Viewport | null = null;
      switch (event.key) {
        case 'ArrowLeft':
          next = panViewport(initial, step, plot.width, samples.length);
          break;
        case 'ArrowRight':
          next = panViewport(initial, -step, plot.width, samples.length);
          break;
        case '+':
        case '=':
          next = zoomViewport(initial, plot.left + plot.width / 2, plot, -120, samples.length);
          break;
        case '-':
        case '_':
          next = zoomViewport(initial, plot.left + plot.width / 2, plot, 120, samples.length);
          break;
        case 'Home':
          next = { ...initial, start: 0 };
          break;
        case 'End':
          next = { ...initial, start: Math.max(0, samples.length - initial.count) };
          break;
        default:
          return;
      }
      event.preventDefault();
      viewportRef.current = clampViewport(next, samples.length);
      setActivePreset(null);
      invalidateBase();
      maybeLoadOlder();
    };

    const handleLeave = () => {
      if (drag) return;
      hoverX = null;
      schedule();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    overlayCanvas.addEventListener('pointerdown', handleDown);
    overlayCanvas.addEventListener('pointermove', handleMove);
    overlayCanvas.addEventListener('pointerup', finishDrag);
    overlayCanvas.addEventListener('pointercancel', finishDrag);
    overlayCanvas.addEventListener('lostpointercapture', cancelDrag);
    overlayCanvas.addEventListener('pointerleave', handleLeave);
    overlayCanvas.addEventListener('wheel', handleWheel, { passive: false });
    overlayCanvas.addEventListener('keydown', handleKey);
    schedule();

    return () => {
      observer.disconnect();
      overlayCanvas.removeEventListener('pointerdown', handleDown);
      overlayCanvas.removeEventListener('pointermove', handleMove);
      overlayCanvas.removeEventListener('pointerup', finishDrag);
      overlayCanvas.removeEventListener('pointercancel', finishDrag);
      overlayCanvas.removeEventListener('lostpointercapture', cancelDrag);
      overlayCanvas.removeEventListener('pointerleave', handleLeave);
      overlayCanvas.removeEventListener('wheel', handleWheel);
      overlayCanvas.removeEventListener('keydown', handleKey);
      if (frame) cancelAnimationFrame(frame);
      invalidateRef.current = () => {};
      if (hoveredIndex !== null) onHover?.(null);
    };
  }, [samples, theme, onHover, onLoadOlder]);

  const selectPreset = (preset: TimePreset) => {
    viewportRef.current = viewportForPreset(samples, preset);
    setActivePreset(preset);
    invalidateRef.current();
  };

  let latestValue = '—';
  for (let i = samples.length - 1; i >= 0; i--) {
    const value = samples[i]?.value;
    if (value === undefined || value === null) continue;
    latestValue = value.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    break;
  }

  return (
    <section
      className={['reference-chart', className].filter(Boolean).join(' ')}
      data-theme={theme}
      aria-label="Интерактивный график цен"
    >
      <div className="reference-chart__toolbar">
        <div className="reference-chart__heading">
          <span className="reference-chart__eyebrow">REFERENCE CHART · CANVAS ENGINE</span>
          <strong>Price history <span className="reference-chart__latest">{latestValue}</span></strong>
        </div>
        <div className="reference-chart__ranges" aria-label="Временной диапазон">
          {TIME_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={activePreset === preset ? 'is-selected' : ''}
              aria-pressed={activePreset === preset}
              onClick={() => selectPreset(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
      <div
        className="reference-chart__surface"
        ref={hostRef}
        style={{ height: Math.max(220, height - 88) }}
      >
        <canvas className="reference-chart__canvas" ref={baseRef} aria-hidden="true" />
        <canvas
          className="reference-chart__canvas reference-chart__interactive"
          ref={overlayRef}
          tabIndex={0}
          role="img"
          aria-label="График котировок: перетащите для прокрутки истории, колесо для масштаба; стрелки, плюс и минус с клавиатуры"
        />
      </div>
      <div className="reference-chart__footer">
        <span>{samples.length.toLocaleString('ru-RU')} точек · потяни мышью · колесо = масштаб</span>
        <span>← → перемещение · + − масштаб</span>
      </div>
      {loadError && <p className="reference-chart__error" role="alert">{loadError}</p>}
    </section>
  );
}
