/**
 * Small initial types only. We'll expand these when real drawing and
 * interactions appear, rather than designing a big engine prematurely.
 */
export type ChartTheme = 'dark' | 'light' | 'colorful';

/** Normalized format that the future drawing layer will consume. */
export interface TimeValuePoint {
  readonly timestamp: number;
  readonly value: number | null;
}

/** Fractional indices allow smooth drag-to-pan. */
export interface ChartViewport {
  readonly startIndex: number;
  readonly visibleCount: number;
}
