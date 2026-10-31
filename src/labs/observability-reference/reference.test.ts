import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DASHBOARD,
  METRIC_IDS,
  formatValue,
  metricStatus,
  selectRange,
} from './model';
import { dashboardReducer, parseDashboard, serializeDashboard } from './dashboard';
import { appendTelemetry, createTelemetry } from './telemetry';

describe('Reference dashboard state', () => {
  it('adds, moves, edits, duplicates, removes panels immutably', () => {
    const initial = DEFAULT_DASHBOARD;
    const added = dashboardReducer(initial, {
      type: 'add',
      panel: { id: 'extra', title: 'extra', metric: 'cpu', visualization: 'line' },
    });
    expect(added.panels).toHaveLength(initial.panels.length + 1);
    expect(initial.panels).toHaveLength(6);
    expect(dashboardReducer(added, { type: 'add', panel: { id: 'extra', title: 'duplicate', metric: 'cpu', visualization: 'stat' } })).toBe(added);
    const edited = dashboardReducer(added, { type: 'edit', id: 'extra', patch: { metric: 'errors', visualization: 'bars' } });
    expect(edited.panels.at(-1)?.metric).toBe('errors');
    const moved = dashboardReducer(edited, { type: 'move', id: 'extra', direction: -1 });
    expect(moved.panels.at(-2)?.id).toBe('extra');
    const copied = dashboardReducer(moved, { type: 'duplicate', id: 'extra', newId: 'copy' });
    expect(copied.panels.some((panel) => panel.id === 'copy')).toBe(true);
    const removed = dashboardReducer(copied, { type: 'remove', id: 'copy' });
    expect(removed.panels.some((panel) => panel.id === 'copy')).toBe(false);
    expect(dashboardReducer(removed, { type: 'reset' })).toBe(DEFAULT_DASHBOARD);
  });

  it('round trips settings through validated JSON', () => {
    const loaded = parseDashboard(JSON.parse(serializeDashboard(DEFAULT_DASHBOARD)) as unknown);
    expect(loaded).toEqual(DEFAULT_DASHBOARD);
    expect(parseDashboard({ version: 1, id: 'a', title: 'a', panels: [{ id: 'x', metric: 'unknown', title: 'x', visualization: 'stat' }] })).toBeNull();
    expect(parseDashboard({ version: 1, id: 'a', title: 'a', panels: Array(40).fill({}) })).toBeNull();
  });

  it('simulates telemetry, keeps bounded history and retains gaps', () => {
    let sample = createTelemetry(Date.UTC(2026, 9, 31), 300);
    expect(METRIC_IDS.every((metric) => sample[metric].length === 300)).toBe(true);
    expect(sample.latency.some((point) => point.value === null)).toBe(true);
    sample = appendTelemetry(sample, Date.UTC(2026, 9, 31) + 5_000);
    expect(sample.cpu).toHaveLength(301);
    expect(sample.cpu.at(-1)?.timestamp).toBeGreaterThan(sample.cpu.at(-2)?.timestamp ?? 0);
    for (let i = 0; i < 500; i++) sample = appendTelemetry(sample, Date.UTC(2026, 9, 31) + 10_000 + i * 5_000);
    expect(sample.cpu.length).toBeLessThanOrEqual(720);
  });

  it('selects a time interval and formats statuses', () => {
    const points = [
      { timestamp: 0, value: 10 },
      { timestamp: 60_000, value: 15 },
      { timestamp: 20 * 60_000, value: 20 },
    ];
    expect(selectRange(points, '15m').map((point) => point.value)).toEqual([20]);
    expect(metricStatus('cpu', 91)).toBe('critical');
    expect(metricStatus('cpu', null)).toBe('unknown');
    expect(formatValue(null, 'latency')).toBe('—');
  });
});
