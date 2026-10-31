import {
  nearestSample,
  nicePriceTicks,
  priceToY,
  sampleIndexToX,
  visibleIndexBounds,
  visiblePriceDomain,
  type ChartSample,
  type PriceDomain,
  type PlotRect,
  type Viewport,
} from './model';

export type ReferenceTheme = 'dark' | 'light' | 'colorful';

export interface Palette {
  readonly background: string;
  readonly text: string;
  readonly secondary: string;
  readonly grid: string;
  readonly accent: string;
  readonly areaTop: string;
  readonly card: string;
  readonly border: string;
}

const palettes: Record<ReferenceTheme, Palette> = {
  dark: {
    background: '#0b0d18',
    text: '#f1edff',
    secondary: '#969bb4',
    grid: '#292c42',
    accent: '#a78bfa',
    areaTop: 'rgba(167, 139, 250, 0.35)',
    card: '#211d38',
    border: '#554778',
  },
  light: {
    background: '#f9f8ff',
    text: '#252237',
    secondary: '#6e6b81',
    grid: '#e2deed',
    accent: '#7447de',
    areaTop: 'rgba(116, 71, 222, 0.20)',
    card: '#ffffff',
    border: '#d4c9ed',
  },
  colorful: {
    background: '#17102b',
    text: '#fff6df',
    secondary: '#b8a8cc',
    grid: '#443459',
    accent: '#e7a5fc',
    areaTop: 'rgba(231, 165, 252, 0.32)',
    card: '#30204c',
    border: '#754b95',
  },
};

export function themePalette(theme: ReferenceTheme): Palette {
  return palettes[theme];
}

export function plotRectangle(width: number, height: number): PlotRect {
  const left = 18;
  const top = 24;
  const right = Math.max(left + 1, width - 79);
  const bottom = Math.max(top + 1, height - 38);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

const priceFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const compactDate = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
});
const fullDate = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function drawArea<T>(
  ctx: CanvasRenderingContext2D,
  samples: readonly ChartSample<T>[],
  viewport: Viewport,
  plot: PlotRect,
  domain: NonNullable<ReturnType<typeof visiblePriceDomain>>,
  palette: Palette,
): void {
  const gradient = ctx.createLinearGradient(0, plot.top, 0, plot.bottom);
  gradient.addColorStop(0, palette.areaTop);
  gradient.addColorStop(1, 'rgba(167, 139, 250, 0)');
  ctx.fillStyle = gradient;
  const { from, to } = visibleIndexBounds(viewport, samples.length);

  let firstX: number | null = null;
  let lastX = 0;
  const closeSegment = () => {
    if (firstX === null) return;
    ctx.lineTo(lastX, plot.bottom);
    ctx.lineTo(firstX, plot.bottom);
    ctx.closePath();
    ctx.fill();
    firstX = null;
  };

  for (let i = from; i < to; i++) {
    const value = samples[i]?.value;
    if (value === null || value === undefined) {
      closeSegment();
      continue;
    }
    const x = sampleIndexToX(i, viewport, plot);
    const y = priceToY(value, domain, plot);
    if (firstX === null) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      firstX = x;
    } else {
      ctx.lineTo(x, y);
    }
    lastX = x;
  }
  closeSegment();

  ctx.beginPath();
  let hasPrevious = false;
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (let i = from; i < to; i++) {
    const value = samples[i]?.value;
    if (value === null || value === undefined) {
      hasPrevious = false;
      continue;
    }
    const x = sampleIndexToX(i, viewport, plot);
    const y = priceToY(value, domain, plot);
    if (hasPrevious) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
    hasPrevious = true;
  }
  ctx.stroke();

  // A solitary point still needs to be visible in a one-day range.
  const { from: visibleFrom, to: visibleTo } = visibleIndexBounds(viewport, samples.length);
  let validCount = 0;
  let soleIndex = -1;
  for (let i = visibleFrom; i < visibleTo; i++) {
    if (samples[i]?.value !== null && samples[i]?.value !== undefined) {
      validCount++;
      soleIndex = i;
      if (validCount > 1) break;
    }
  }
  if (validCount === 1) {
    const value = samples[soleIndex]?.value;
    if (value !== undefined && value !== null) {
      ctx.beginPath();
      ctx.arc(sampleIndexToX(soleIndex, viewport, plot), priceToY(value, domain, plot), 3, 0, Math.PI * 2);
      ctx.fillStyle = palette.accent;
      ctx.fill();
    }
  }
}

function tag(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  color: string,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 5);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText(label, x + width / 2, y + height / 2);
}

export function drawBase<T>(
  ctx: CanvasRenderingContext2D,
  samples: readonly ChartSample<T>[],
  viewport: Viewport,
  width: number,
  height: number,
  palette: Palette,
): { plot: PlotRect; domain: PriceDomain | null } {
  const plot = plotRectangle(width, height);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);

  const domain = visiblePriceDomain(samples, viewport);
  if (!domain) {
    ctx.fillStyle = palette.secondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('Нет данных за выбранный период', width / 2, height / 2);
    return { plot, domain };
  }

  ctx.save();
  ctx.font = '11px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  for (const price of nicePriceTicks(domain)) {
    const y = priceToY(price, domain, plot);
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.right, y);
    ctx.stroke();
    ctx.fillStyle = palette.secondary;
    ctx.textAlign = 'left';
    ctx.fillText(priceFormatter.format(price), plot.right + 11, y);
  }

  // Calendar labels track actual samples, even if markets are closed on weekends.
  const count = width < 490 ? 3 : width < 850 ? 5 : 7;
  let previousIndex = -1;
  const seenLabels = new Set<string>();
  for (let t = 0; t < count; t++) {
    const ratio = t / (count - 1);
    const index = Math.max(0, Math.min(samples.length - 1, Math.round(viewport.start + ratio * (viewport.count - 1))));
    if (index === previousIndex) continue;
    previousIndex = index;
    const sample = samples[index];
    if (!sample) continue;
    const x = sampleIndexToX(index, viewport, plot);
    if (x < plot.left - 1 || x > plot.right + 1) continue;
    const label = compactDate.format(sample.time);
    if (seenLabels.has(label)) continue;
    seenLabels.add(label);
    ctx.strokeStyle = palette.grid;
    ctx.beginPath();
    ctx.moveTo(x, plot.bottom);
    ctx.lineTo(x, plot.bottom + 5);
    ctx.stroke();
    ctx.fillStyle = palette.secondary;
    ctx.textAlign = t === 0 ? 'left' : t === count - 1 ? 'right' : 'center';
    ctx.fillText(label, x, plot.bottom + 20);
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.left, plot.top, plot.width, plot.height);
  ctx.clip();
  drawArea(ctx, samples, viewport, plot, domain, palette);
  ctx.restore();

  const lastIndex = samples.length - 1;
  const lastValue = samples[lastIndex]?.value;
  if (
    lastValue !== null && lastValue !== undefined &&
    lastIndex >= viewport.start && lastIndex <= viewport.start + viewport.count - 1
  ) {
    const y = priceToY(lastValue, domain, plot);
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = palette.accent;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.right, y);
    ctx.stroke();
    ctx.restore();
    tag(ctx, priceFormatter.format(lastValue), plot.right + 2, Math.max(2, Math.min(height - 25, y - 11)), 73, 22, palette.accent, palette.background);
  }
  return { plot, domain };
}

export function drawOverlay<T>(
  ctx: CanvasRenderingContext2D,
  samples: readonly ChartSample<T>[],
  viewport: Viewport,
  plot: PlotRect,
  domain: PriceDomain | null,
  width: number,
  height: number,
  palette: Palette,
  hoverX: number | null,
): void {
  ctx.clearRect(0, 0, width, height);
  if (hoverX === null) return;
  const result = nearestSample(samples, viewport, plot, hoverX);
  if (!result || !domain || result.sample.value === null) return;

  const x = sampleIndexToX(result.index, viewport, plot);
  const y = priceToY(result.sample.value, domain, plot);

  ctx.save();
  ctx.strokeStyle = palette.secondary;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x, plot.top);
  ctx.lineTo(x, plot.bottom);
  ctx.moveTo(plot.left, y);
  ctx.lineTo(plot.right, y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = palette.accent;
  ctx.fill();
  ctx.strokeStyle = palette.background;
  ctx.lineWidth = 2;
  ctx.stroke();

  const value = priceFormatter.format(result.sample.value);
  tag(ctx, value, plot.right + 2, Math.max(2, Math.min(height - 24, y - 11)), 73, 22, palette.card, palette.text);

  const date = compactDate.format(result.sample.time);
  const xLabelWidth = 82;
  tag(
    ctx,
    date,
    Math.max(0, Math.min(width - xLabelWidth, x - xLabelWidth / 2)),
    plot.bottom + 7,
    xLabelWidth,
    22,
    palette.card,
    palette.text,
  );

  const tooltipWidth = 158;
  const tooltipX = Math.max(plot.left, Math.min(plot.right - tooltipWidth, x + 13));
  const tooltipY = Math.max(plot.top + 7, Math.min(plot.bottom - 56, y - 65));

  ctx.fillStyle = palette.card;
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(tooltipX, tooltipY, tooltipWidth, 52, 7);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = palette.secondary;
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(fullDate.format(result.sample.time), tooltipX + 10, tooltipY + 17);
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillStyle = palette.text;
  ctx.fillText(value, tooltipX + 10, tooltipY + 36);
  ctx.restore();
}
