/**
 * Intentionally unoptimized baseline benchmark.
 * Pure workload model: this lab is isolated from both the user's chart and dashboard.
 */
export interface StressConfig {
  readonly panels: number;
  readonly pointsPerPanel: number;
  readonly intervalMs: number;
}

export interface StressSeries {
  readonly id: number;
  readonly values: Float32Array;
}

export const MAX_TOTAL_POINTS = 1_000_000;

export const PRESETS = {
  light: { panels: 6, pointsPerPanel: 300, intervalMs: 5000 },
  medium: { panels: 24, pointsPerPanel: 2000, intervalMs: 1000 },
  heavy: { panels: 48, pointsPerPanel: 10000, intervalMs: 250 },
  extreme: { panels: 96, pointsPerPanel: 10000, intervalMs: 100 },
} as const satisfies Record<string, StressConfig>;

export function validateConfig(config: StressConfig): string | null {
  const { panels, pointsPerPanel, intervalMs } = config;
  if (!Number.isInteger(panels) || panels < 1 || panels > 96) {
    return 'Количество панелей: от 1 до 96.';
  }
  if (!Number.isInteger(pointsPerPanel) || pointsPerPanel < 20 || pointsPerPanel > 100_000) {
    return 'Точек на панель: от 20 до 100 000.';
  }
  if (![100, 250, 1000, 5000].includes(intervalMs)) {
    return 'Неподдерживаемая частота обновлений.';
  }
  if (panels * pointsPerPanel > MAX_TOTAL_POINTS) {
    return 'Лимит безопасности: максимум 1 000 000 точек одновременно. Уменьши панели или точки.';
  }
  return null;
}

/** Deterministic, per-panel Float32Array data. Generated once per load setting. */
export function generateSeries(config: StressConfig): StressSeries[] {
  const error = validateConfig(config);
  if (error) throw new RangeError(error);

  const series: StressSeries[] = [];
  for (let id = 0; id < config.panels; id++) {
    const values = new Float32Array(config.pointsPerPanel);
    let seed = (id + 1) * 11939;
    for (let i = 0; i < values.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      const noise = (seed >>> 0) / 4294967296;
      values[i] = 40 + Math.sin(i / (19 + id % 9)) * 15 +
        Math.cos(i / 71 + id) * 11 + (noise - 0.5) * 6;
    }
    series.push({ id, values });
  }
  return series;
}
