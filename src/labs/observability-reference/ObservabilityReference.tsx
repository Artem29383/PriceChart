import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { PanelCard } from './components/PanelCard';
import { createPanel, dashboardReducer, parseDashboard, persistDashboard, readDashboard, serializeDashboard } from './dashboard';
import { METRICS, METRIC_IDS, MAX_PANELS, RANGES, metricStatus, type MetricId, type Panel, type Range, type Theme } from './model';
import { appendTelemetry, createTelemetry, LIVE_REFRESH_MS } from './telemetry';
import './reference.css';

function lastValid(points: readonly { readonly value: number | null }[]): number | null {
  for (let i = points.length - 1; i >= 0; i--) {
    const value = points[i]?.value;
    if (value !== null && value !== undefined) return value;
  }
  return null;
}

/** Full working reference dashboard; deliberately isolated from the learning lab. */
export function ObservabilityReference() {
  const [dashboard, dispatch] = useReducer(dashboardReducer, undefined, readDashboard);
  const [telemetry, setTelemetry] = useState(() => createTelemetry());
  const [range, setRange] = useState<Range>('1h');
  const [live, setLive] = useState(true);
  const [theme, setTheme] = useState<Theme>('dark');
  const [newMetric, setNewMetric] = useState<MetricId>('cpu');
  const [notice, setNotice] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!persistDashboard(dashboard)) {
      setNotice('Browser storage is unavailable. Changes will last only until refresh.');
    }
  }, [dashboard]);

  useEffect(() => {
    if (!live) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setTelemetry((previous) => appendTelemetry(previous, Date.now()));
      }
    }, LIVE_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [live]);

  const alerts = useMemo(() => METRIC_IDS.filter((metric) => {
    const status = metricStatus(metric, lastValid(telemetry[metric]));
    return status === 'critical' || status === 'warning';
  }), [telemetry]);

  const editPanel = useCallback((id: string, patch: Partial<Pick<Panel, 'title' | 'metric' | 'visualization'>>) => {
    dispatch({ type: 'edit', id, patch });
  }, []);
  const removePanel = useCallback((id: string) => dispatch({ type: 'remove', id }), []);
  const duplicatePanel = useCallback((id: string) => dispatch({ type: 'duplicate', id, newId: crypto.randomUUID() }), []);
  const movePanel = useCallback((id: string, direction: -1 | 1) => dispatch({ type: 'move', id, direction }), []);

  const addPanel = () => {
    if (dashboard.panels.length >= MAX_PANELS) return;
    dispatch({ type: 'add', panel: createPanel(newMetric) });
    setNotice(null);
  };

  const exportDashboard = () => {
    const blob = new Blob([serializeDashboard(dashboard)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = 'observability-dashboard.json';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    setNotice('Configuration exported as JSON.');
  };

  const importDashboard = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    try {
      if (file.size > 100_000) throw new Error('Configuration is too large (max 100 KB).');
      const raw: unknown = JSON.parse(await file.text());
      const restored = parseDashboard(raw);
      if (!restored) throw new Error('Invalid dashboard configuration or unsupported version.');
      dispatch({ type: 'replace', dashboard: restored });
      setNotice('Dashboard imported successfully.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to import configuration.');
    }
  };

  const resetDashboard = () => {
    if (!window.confirm('Reset all panels and saved settings to defaults?')) return;
    dispatch({ type: 'reset' });
    setNotice('Default dashboard restored.');
  };

  return (
    <section className="oref" data-theme={theme} aria-labelledby="oref-title">
      <div className="oref-layout">
        <aside className="oref-sidebar" aria-label="Monitoring navigation">
          <div className="oref-sidebar__top">
            <span className="oref-sidebar__glyph">◈</span>
            <strong>CONTROL</strong>
            <small>CLOUD / OBSERVE</small>
          </div>
          <div className="oref-sidebar__group">
            <span>WORKSPACE</span>
            <div className="oref-sidebar__item oref-sidebar__item--active">▦ &nbsp; Overview</div>
            <div className="oref-sidebar__item">◷ &nbsp; Infrastructure</div>
            <div className="oref-sidebar__item">≋ &nbsp; Services</div>
          </div>
          <div className="oref-sidebar__group">
            <span>ENVIRONMENT</span>
            <div className="oref-sidebar__environment"><span className="oref-online-dot"/> Production <b>6 metrics</b></div>
          </div>
          <div className="oref-sidebar__bottom">
            <span className="oref-online-dot"/> SIMULATED TELEMETRY
            <small>Offline reference app · no external API</small>
          </div>
        </aside>

        <div className="oref-content">
          <header className="oref-hero">
            <div>
              <div className="oref-breadcrumb">WORKSPACE <span>/</span> OBSERVABILITY <span>/</span> DASHBOARD</div>
              <div className="oref-heading">
                <h1 id="oref-title">{dashboard.title || 'Untitled dashboard'}</h1>
                <span className="oref-tag">REFERENCE</span>
              </div>
              <p>Собственный конструктор: живые метрики, настраиваемые панели, временные диапазоны и сохранение.</p>
            </div>
            <div className="oref-hero__status">
              <span className="oref-online-dot"/>
              {live ? 'Live simulation' : 'Paused'}
              <small>{alerts.length ? `${alerts.length} active warnings` : 'All services operational'}</small>
            </div>
          </header>

          <div className="oref-overview">
            <div className="oref-overview__tile">
              <span>Monitored services</span>
              <strong>04</strong>
              <small>api · db · edge · worker</small>
            </div>
            <div className="oref-overview__tile">
              <span>Metric streams</span>
              <strong>{METRIC_IDS.length.toString().padStart(2, '0')}</strong>
              <small>6 simulated series</small>
            </div>
            <div className="oref-overview__tile">
              <span>Active panels</span>
              <strong>{dashboard.panels.length.toString().padStart(2, '0')}</strong>
              <small>Up to {MAX_PANELS} per dashboard</small>
            </div>
            <div className="oref-overview__tile">
              <span>Warnings</span>
              <strong className={alerts.length ? 'oref-overview__warning' : ''}>{alerts.length.toString().padStart(2, '0')}</strong>
              <small>{alerts.length ? alerts.map((id) => METRICS[id].short).join(' · ') : 'No threshold breaches'}</small>
            </div>
          </div>

          <div className="oref-toolbar">
            <div className="oref-toolbar__ranges" role="group" aria-label="Chart time range">
              {RANGES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={range === item ? 'is-active' : ''}
                  aria-pressed={range === item}
                  onClick={() => setRange(item)}
                >{item}</button>
              ))}
            </div>
            <div className="oref-toolbar__right">
              <button type="button" className={live ? 'oref-live is-running' : 'oref-live'} aria-pressed={live} onClick={() => setLive((value) => !value)}>
                <span className="oref-online-dot"/> {live ? 'LIVE · Pause' : 'Paused · Resume'}
              </button>
              <button type="button" onClick={() => setTelemetry((prev) => appendTelemetry(prev, Date.now()))} title="Generate another simulated observation">↻ Refresh</button>
              <button type="button" onClick={() => setTheme((previous) => previous === 'dark' ? 'light' : 'dark')} aria-label="Toggle dashboard theme">{theme === 'dark' ? '☼ Light' : '☾ Dark'}</button>
            </div>
          </div>

          <div className="oref-dashboard-title">
            <div>
              <div className="oref-section-label">DASHBOARD BUILDER</div>
              <input
                className="oref-dashboard-name"
                value={dashboard.title}
                maxLength={80}
                aria-label="Dashboard name"
                onChange={(event) => dispatch({ type: 'rename', title: event.currentTarget.value })}
              />
              <p>Перетащить пока нельзя: порядок меняется кнопками со стрелками на каждой панели.</p>
            </div>
            <div className="oref-dashboard-actions">
              <input
                ref={uploadRef}
                className="oref-visually-hidden"
                type="file"
                accept=".json,application/json"
                aria-label="Import JSON dashboard"
                onChange={(event) => { void importDashboard(event); }}
              />
              <button type="button" onClick={() => uploadRef.current?.click()}>↑ Import</button>
              <button type="button" onClick={exportDashboard}>↓ Export</button>
              <button type="button" className="oref-button--subtle" onClick={resetDashboard}>Reset</button>
            </div>
          </div>

          {notice && <div className="oref-notice" role="status">{notice} <button type="button" aria-label="Dismiss message" onClick={() => setNotice(null)}>×</button></div>}

          <div className="oref-grid">
            {dashboard.panels.map((panel, index) => (
              <PanelCard
                key={panel.id}
                panel={panel}
                points={telemetry[panel.metric]}
                range={range}
                index={index}
                total={dashboard.panels.length}
                onEdit={editPanel}
                onRemove={removePanel}
                onDuplicate={duplicatePanel}
                onMove={movePanel}
              />
            ))}
          </div>

          {dashboard.panels.length === 0 && (
            <div className="oref-zero">
              <strong>Панелей пока нет</strong>
              <p>Выбери метрику ниже и добавь первый виджет.</p>
            </div>
          )}

          <div className="oref-add-panel">
            <div>
              <div className="oref-add-panel__icon">＋</div>
              <div>
                <strong>Add another panel</strong>
                <p>Выбери источник; позже можно поменять тип визуализации и название.</p>
              </div>
            </div>
            <div className="oref-add-panel__controls">
              <label className="oref-visually-hidden" htmlFor="oref-add-metric">Metric to add</label>
              <select id="oref-add-metric" value={newMetric} onChange={(event) => setNewMetric(event.currentTarget.value as MetricId)}>
                {METRIC_IDS.map((id) => <option key={id} value={id}>{METRICS[id].label}</option>)}
              </select>
              <button type="button" disabled={dashboard.panels.length >= MAX_PANELS} onClick={addPanel}>+ Add panel</button>
            </div>
          </div>

          <footer className="oref-bottom">
            <span><span className="oref-online-dot"/> METRICS PIPELINE ONLINE</span>
            <span>Frontend-only reference · localStorage v1 · 5-sec simulated polling</span>
          </footer>
        </div>
      </div>
    </section>
  );
}
