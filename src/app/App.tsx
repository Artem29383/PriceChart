import { lazy, Suspense, useEffect, useState } from 'react';

import { ObservabilityLab } from '../labs/observability/ObservabilityLab';
import './navigation.css';

// Load the chart demo only when explicitly visiting it.
const ChartsPage = lazy(() =>
  import('./ChartsPage').then(({ ChartsPage: page }) => ({ default: page })),
);

type Workspace = 'observability' | 'charts';

function workspaceFromHash(hash: string): Workspace {
  return hash === '#/charts' ? 'charts' : 'observability';
}

/** Navigation is independent of React Router and works on the Vite dev server. */
export function App() {
  const [workspace, setWorkspace] = useState<Workspace>(() =>
    workspaceFromHash(window.location.hash),
  );

  useEffect(() => {
    const handleNavigation = () => setWorkspace(workspaceFromHash(window.location.hash));
    window.addEventListener('hashchange', handleNavigation);
    return () => window.removeEventListener('hashchange', handleNavigation);
  }, []);

  return (
    <main className="app-shell">
      <header className="workspace-header">
        <a className="workspace-brand" href="#/observability" aria-label="PriceChart Workspace — начало">
          <span className="workspace-brand__mark">P</span>
          <span>
            <strong>Frontend Engineering Lab</strong>
            <small>PriceChart · Cloud X practice</small>
          </span>
        </a>

        <nav className="workspace-nav" aria-label="Лаборатории">
          <a
            href="#/observability"
            className={workspace === 'observability' ? 'is-active' : undefined}
            aria-current={workspace === 'observability' ? 'page' : undefined}
          >
            Observability Lab
          </a>
          <a
            href="#/charts"
            className={workspace === 'charts' ? 'is-active' : undefined}
            aria-current={workspace === 'charts' ? 'page' : undefined}
          >
            Price Charts
          </a>
        </nav>
      </header>

      {workspace === 'observability' ? (
        <ObservabilityLab />
      ) : (
        <Suspense fallback={<p className="workspace-loading">Загружаем графики…</p>}>
          <ChartsPage />
        </Suspense>
      )}
    </main>
  );
}
