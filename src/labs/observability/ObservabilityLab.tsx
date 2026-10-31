import { useMemo } from 'react';

import { MetricPanel } from './components/MetricPanel';
import { INITIAL_DASHBOARD, METRIC_DEFINITIONS, makeMockMetrics } from './data/mockMetrics';
import './styles/observability.css';

/**
 * Stage 00: finished UI shell + fixture data, deliberately no dashboard
 * editor, visualization engine, shared React state or fake API calls yet.
 */
export function ObservabilityLab() {
  const metrics = useMemo(() => makeMockMetrics(), []);
  const dashboard = INITIAL_DASHBOARD;

  return (
    <section className="observability-lab" aria-labelledby="lab-title">
      <header className="observability-lab__intro">
        <div>
          <p className="observability-lab__eyebrow">CLOUD X · OBSERVABILITY ENGINEERING</p>
          <h1 id="lab-title">Observability Dashboard Lab</h1>
          <p>
            Отдельная лаборатория для разработки конфигурируемого дашборда. Здесь
            мы будем изучать TypeScript, архитектуру компонентов, состояние,
            обновление метрик и производительность — независимо от Price Charts.
          </p>
        </div>
        <span className="observability-lab__status">LESSON 00 / SCAFFOLD</span>
      </header>

      <div className="observability-lab__facts" aria-label="Состояние лаборатории">
        <div><span>Product</span><strong>{dashboard.title}</strong></div>
        <div><span>Panels</span><strong>{dashboard.panels.length}</strong></div>
        <div><span>Metric series</span><strong>{metrics.length}</strong></div>
        <div><span>Source</span><strong>Offline fixtures</strong></div>
      </div>

      <div className="observability-lab__section-header">
        <div>
          <p className="observability-lab__eyebrow">DASHBOARD PREVIEW</p>
          <h2>{dashboard.title}</h2>
        </div>
        <span>Настройка панелей — следующий урок</span>
      </div>

      <div className="observability-lab__grid">
        {dashboard.panels.map((panel) => {
          const definition = METRIC_DEFINITIONS.find((item) => item.id === panel.metricId);
          if (!definition) return null;

          return (
            <MetricPanel
              key={panel.id}
              config={panel}
              definition={definition}
              series={metrics.find((series) => series.metricId === panel.metricId)}
            />
          );
        })}
      </div>

      <aside className="observability-lab__next" aria-label="Следующий учебный шаг">
        <div>
          <span className="observability-lab__eyebrow">NEXT · LESSON 01</span>
          <h2>Dashboard state &amp; panel configuration</h2>
          <p>
            Дальше самостоятельно добавим панели через React State и разберём,
            как сделать типобезопасный конфиг без привязки к конкретному графику.
            Существующие компоненты PriceChart не изменяем.
          </p>
        </div>
        <a href="https://github.com/Artem29383/PriceChart/blob/master/docs/OBSERVABILITY_LAB.md" target="_blank" rel="noreferrer">
          Открыть план обучения
        </a>
      </aside>
    </section>
  );
}
