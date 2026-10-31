export function renderPoints<T>(
  ctx: CanvasRenderingContext2D,
  data: readonly T[],
  getValue: (item: T) => number | null,
  padding: number,
  plotHeight: number,
  plotWidth: number,
  maxPrice: number,
  minPrice: number,
) {
  ctx.beginPath();
  let previousPointValid = false;

  for (let index = 0; index < data.length; index++) {
    const item = data[index];
    if (item === undefined) continue;

    const price = getValue(item);

    if (price === null || !Number.isFinite(price)) {
      previousPointValid = false;
      continue;
    }

    const x = padding + (index / Math.max(1, data.length - 1)) * plotWidth;

    const y = padding + ((maxPrice - price) / (maxPrice - minPrice)) * plotHeight;

    if (previousPointValid) {
      ctx.lineTo(x, y);
    } else {
      ctx.moveTo(x, y);
    }

    previousPointValid = true;
  }

  ctx.stroke();
}
