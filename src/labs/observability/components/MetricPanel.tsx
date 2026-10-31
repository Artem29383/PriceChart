import type { DashboardPanelConfig, MetricDefinition, MetricSeries } from '../model/types';

export interface MetricPanelProps {
  readonly config: DashboardPanelConfig;
  readonly definition: MetricDefinition;
  readonly series: MetricSeries | undefined;
}

export function MetricPanel({ config, definition, series }: MetricPanelProps) {
  const points = series?.points ?? [];
  let current: number | null = null;

  for (let index = points.length - 1; index >= 0; index--) {
    const value = points[index]?.value;
    if (value !== null && value !== undefined) {
      current = value;
      break;
    }
  }

  const formatted = current === null
    ? '—'
    : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(current);

  return (
    <article className="observability-panel" aria-label={config.title}>
      <header className="observability-panel__header">
        <div>
          <span className="observability-panel__metric">{definition.id.toUpperCase()}</span>
          <h3>{config.title}</h3>
        </div>
        <span className="observability-panel__kind">{config.visualization}</span>
      </header>

      <div className="observability-panel__summary">
        <strong>{formatted}<small> {definition.unit}</small></strong>
        <span>{series?.service ?? 'Источник не подключён'}</span>
      </div>

      <div className="observability-panel__placeholder">
        <span aria-hidden="true" className="observability-panel__icon">▥</span>
        <strong>Рендерер панели ещё не реализован</strong>
        <p>Здесь будет выбранный пользователем виджет: {config.visualization}.</p>
      </div>

      <footer className="observability-panel__footer">
        <span>{points.length} наблюдений</span>
        <span>Данные: локальный генератор</span>
      </footer>
    </article>
  );
}
