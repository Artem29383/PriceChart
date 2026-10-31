import { memo, useMemo, useState } from 'react';

import {
  METRICS,
  METRIC_IDS,
  VISUALIZATIONS,
  formatValue,
  metricStatus,
  selectRange,
  type MetricId,
  type MetricPoint,
  type Panel,
  type Range,
  type Visualization,
} from '../model';
import { MetricVisual } from './MetricVisual';

export interface PanelCardProps {
  readonly panel: Panel;
  readonly points: readonly MetricPoint[];
  readonly range: Range;
  readonly index: number;
  readonly total: number;
  readonly onEdit: (id: string, patch: Partial<Pick<Panel, 'title' | 'metric' | 'visualization'>>) => void;
  readonly onRemove: (id: string) => void;
  readonly onDuplicate: (id: string) => void;
  readonly onMove: (id: string, direction: -1 | 1) => void;
}

export const PanelCard = memo(function PanelCard({
  panel,
  points,
  range,
  index,
  total,
  onEdit,
  onRemove,
  onDuplicate,
  onMove,
}: PanelCardProps) {
  const [editing, setEditing] = useState(false);
  const visible = useMemo(() => selectRange(points, range), [points, range]);
  const last = [...visible].reverse().find((point) => point.value !== null)?.value ?? null;
  const status = metricStatus(panel.metric, last);
  const definition = METRICS[panel.metric];

  return (
    <article className="oref-panel" style={{ '--oref-accent': definition.color } as React.CSSProperties}>
      <header className="oref-panel__header">
        <div className="oref-panel__info">
          <div className="oref-panel__metric"><span className="oref-panel__dot"/> {definition.service}</div>
          <h3 title={panel.title}>{panel.title || definition.label}</h3>
        </div>
        <div className="oref-panel__actions">
          <button type="button" title="Move left" aria-label={`Move ${panel.title} backward`} disabled={index === 0} onClick={() => onMove(panel.id, -1)}>←</button>
          <button type="button" title="Move right" aria-label={`Move ${panel.title} forward`} disabled={index === total - 1} onClick={() => onMove(panel.id, 1)}>→</button>
          <button type="button" title="Edit panel" aria-label={`Edit ${panel.title}`} aria-expanded={editing} onClick={() => setEditing((value) => !value)}>⚙</button>
          <button type="button" title="Duplicate panel" aria-label={`Duplicate ${panel.title}`} onClick={() => onDuplicate(panel.id)}>⧉</button>
          <button type="button" title="Remove panel" aria-label={`Remove ${panel.title}`} onClick={() => onRemove(panel.id)}>×</button>
        </div>
      </header>

      <div className="oref-panel__value">
        <strong>{formatValue(last, panel.metric)}</strong>
        <span>{definition.unit}</span>
        <span className={`oref-status oref-status--${status}`}>{status}</span>
      </div>

      {editing && (
        <div className="oref-panel__editor" aria-label={`Settings for ${panel.title}`}>
          <label>
            Panel title
            <input
              type="text"
              maxLength={80}
              value={panel.title}
              onChange={(event) => onEdit(panel.id, { title: event.currentTarget.value })}
            />
          </label>
          <label>
            Metric
            <select
              value={panel.metric}
              onChange={(event) => {
                const metric = event.currentTarget.value as MetricId;
                onEdit(panel.id, { metric, title: METRICS[metric].label });
              }}
            >
              {METRIC_IDS.map((id) => <option value={id} key={id}>{METRICS[id].label}</option>)}
            </select>
          </label>
          <label>
            Visualization
            <select
              value={panel.visualization}
              onChange={(event) => onEdit(panel.id, { visualization: event.currentTarget.value as Visualization })}
            >
              {VISUALIZATIONS.map((kind) => <option value={kind} key={kind}>{kind}</option>)}
            </select>
          </label>
          <button type="button" className="oref-panel__done" onClick={() => setEditing(false)}>Done</button>
        </div>
      )}

      <MetricVisual metric={panel.metric} points={visible} visualization={panel.visualization}/>

      <footer className="oref-panel__footer">
        <span><i/> {visible.length} observations</span>
        <span>{panel.visualization.toUpperCase()} · {range.toUpperCase()}</span>
      </footer>
    </article>
  );
});
