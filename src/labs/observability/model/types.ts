/** Domain models for the Observability lab. This module knows nothing about charts. */
export type MetricId = 'cpu' | 'memory' | 'requests' | 'latency';
export type MetricUnit = '%' | 'GB' | 'req/s' | 'ms';
export type VisualizationKind = 'line' | 'stat' | 'table';

export interface MetricPoint {
  readonly timestamp: number;
  readonly value: number | null;
}

export interface MetricDefinition {
  readonly id: MetricId;
  readonly label: string;
  readonly unit: MetricUnit;
  readonly description: string;
}

export interface MetricSeries {
  readonly metricId: MetricId;
  readonly service: string;
  readonly points: readonly MetricPoint[];
}

export interface DashboardPanelConfig {
  readonly id: string;
  readonly title: string;
  readonly metricId: MetricId;
  readonly visualization: VisualizationKind;
}

export interface DashboardConfig {
  readonly id: string;
  readonly title: string;
  readonly panels: readonly DashboardPanelConfig[];
}
