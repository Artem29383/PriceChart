import {
  DEFAULT_DASHBOARD,
  MAX_PANELS,
  METRICS,
  STORAGE_KEY,
  isMetricId,
  isVisualization,
  type Dashboard,
  type MetricId,
  type Panel,
  type Visualization,
} from './model';

export type DashboardAction =
  | { type: 'add'; panel: Panel }
  | { type: 'remove'; id: string }
  | { type: 'duplicate'; id: string; newId: string }
  | { type: 'edit'; id: string; patch: Partial<Pick<Panel, 'title' | 'metric' | 'visualization'>> }
  | { type: 'move'; id: string; direction: -1 | 1 }
  | { type: 'rename'; title: string }
  | { type: 'replace'; dashboard: Dashboard }
  | { type: 'reset' };

export function dashboardReducer(current: Dashboard, action: DashboardAction): Dashboard {
  switch (action.type) {
    case 'add':
      if (current.panels.length >= MAX_PANELS || current.panels.some((p) => p.id === action.panel.id)) return current;
      return { ...current, panels: [...current.panels, action.panel] };
    case 'remove':
      return { ...current, panels: current.panels.filter((panel) => panel.id !== action.id) };
    case 'duplicate': {
      const index = current.panels.findIndex((p) => p.id === action.id);
      const existing = current.panels[index];
      if (!existing || current.panels.length >= MAX_PANELS || current.panels.some((p) => p.id === action.newId)) return current;
      const panels = [...current.panels];
      panels.splice(index + 1, 0, { ...existing, id: action.newId, title: `${existing.title} copy` });
      return { ...current, panels };
    }
    case 'edit':
      return {
        ...current,
        panels: current.panels.map((panel) => panel.id === action.id ? {
          ...panel,
          ...action.patch,
          title: action.patch.title === undefined ? panel.title : action.patch.title.slice(0, 80),
        } : panel),
      };
    case 'move': {
      const index = current.panels.findIndex((p) => p.id === action.id);
      const target = index + action.direction;
      if (index < 0 || target < 0 || target >= current.panels.length) return current;
      const panels = [...current.panels];
      const moved = panels[index];
      const neighbor = panels[target];
      if (!moved || !neighbor) return current;
      panels[index] = neighbor;
      panels[target] = moved;
      return { ...current, panels };
    }
    case 'rename':
      return { ...current, title: action.title.slice(0, 80) };
    case 'replace':
      return action.dashboard;
    case 'reset':
      return DEFAULT_DASHBOARD;
  }
}

/** Validate imported and persisted settings; never trust localStorage or JSON files. */
export function parseDashboard(value: unknown): Dashboard | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || typeof record.title !== 'string' || record.title.length > 80 || typeof record.id !== 'string') return null;
  if (!Array.isArray(record.panels) || record.panels.length > MAX_PANELS) return null;

  const panels: Panel[] = [];
  const ids = new Set<string>();
  for (const candidate of record.panels) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
    const item = candidate as Record<string, unknown>;
    if (
      typeof item.id !== 'string' || item.id.length > 120 || item.id.length === 0 ||
      typeof item.title !== 'string' || item.title.length > 80 ||
      !isMetricId(item.metric) || !isVisualization(item.visualization) || ids.has(item.id)
    ) return null;

    ids.add(item.id);
    panels.push({ id: item.id, title: item.title, metric: item.metric, visualization: item.visualization });
  }

  return { id: record.id.slice(0, 120), title: record.title, panels };
}

export function serializeDashboard(dashboard: Dashboard): string {
  return JSON.stringify({ version: 1, ...dashboard }, null, 2);
}

export function readDashboard(): Dashboard {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? parseDashboard(JSON.parse(raw) as unknown) ?? DEFAULT_DASHBOARD : DEFAULT_DASHBOARD;
  } catch {
    return DEFAULT_DASHBOARD;
  }
}

export function persistDashboard(dashboard: Dashboard): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeDashboard(dashboard));
    return true;
  } catch {
    return false;
  }
}

export function createPanel(metric: MetricId = 'cpu', visualization: Visualization = 'area'): Panel {
  return {
    id: crypto.randomUUID(),
    title: METRICS[metric].label,
    metric,
    visualization,
  };
}
