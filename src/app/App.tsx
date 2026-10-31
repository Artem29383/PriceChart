import { useMemo, useState } from 'react';

import type { ChartTheme } from '../chart/core/types';
import { PriceChart } from '../chart/react/PriceChart';
import { generateMockPrices } from '../demo/data/generateMockPrices';

const THEMES: readonly ChartTheme[] = ['dark', 'light', 'colorful'];

export function App() {
  const [theme, setTheme] = useState<ChartTheme>('dark');

  // Stable data across UI state changes.
  const prices = useMemo(() => generateMockPrices(320, 42), []);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand__mark">P</span>
          <div>
            <strong>PriceChart</strong>
            <small>Chart engineering · from first principles</small>
          </div>
        </div>
        <span className="status-tag">STARTER / LESSON 00</span>
      </header>

      <section className="workbench">
        <div className="workbench__top">
          <div>
            <p className="eyebrow">REUSABLE LINE / AREA CHART</p>
            <h1>Build the chart. Understand the engine.</h1>
            <p className="workbench__description">
              We will implement drawing, pan, zoom, crosshair and a strongly
              typed reusable API step by step.
            </p>
          </div>
          <a
            className="docs-link"
            href="https://github.com/Artem29383/PriceChart/blob/master/docs/LEARNING_PLAN.md"
            target="_blank"
            rel="noreferrer"
          >
            Learning plan ↗
          </a>
        </div>

        <div className="preview-panel">
          <div className="preview-panel__toolbar">
            <div>
              <p className="ticker">DEMO / STOCK</p>
              <strong>Example price history</strong>
              <small>320 synthetic daily observations · offline</small>
            </div>

            <div className="theme-toggle" role="group" aria-label="Chart theme">
              {THEMES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={item === theme ? 'is-selected' : undefined}
                  onClick={() => setTheme(item)}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* The generic T is inferred as StockPrice. */}
          <PriceChart
            data={prices}
            getTime={(item) => item.timestamp}
            getValue={(item) => item.close}
            theme={theme}
            height={420}
          />

          <div className="preview-panel__footer">
            <span>Canvas · strict TypeScript · D3 for scale math</span>
            <span>Renderer starts in Lesson 01</span>
          </div>
        </div>
      </section>

      <footer className="app-footer">
        <span>No chart library. No backend. No service worker.</span>
        <span>Local address: 127.0.0.1:5173</span>
      </footer>
    </main>
  );
}
