export function renderPriceAxis(
  ctx: CanvasRenderingContext2D,
  minPrice: number,
  maxPrice: number,
  padding: number,
  plotWidth: number,
  plotHeight: number,
) {
  const right = padding + plotWidth;
  const tickCount = 5;

  ctx.save();

  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < tickCount; i++) {
    const ratio = i / (tickCount - 1);

    const y = padding + ratio * plotHeight;

    const price = maxPrice - ratio * (maxPrice - minPrice);

    // Горизонтальная сетка
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(right, y);

    ctx.strokeStyle = 'rgba(155, 148, 180, 0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Подпись цены справа
    ctx.fillStyle = '#a8a1be';
    ctx.fillText(price.toFixed(2), right + 12, y);
  }

  ctx.restore();
}
