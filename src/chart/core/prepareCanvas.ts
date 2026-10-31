export const prepareCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
  const width = 500;
  const height = 260;
  const padding = 20;
  const dpr = window.devicePixelRatio || 1;

  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.strokeStyle = '#a78bfa';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';

  return {
    plotHeight,
    plotWidth,
    padding,
  };
};
