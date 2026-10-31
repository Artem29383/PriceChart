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
      <section className="workbench">
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
          <PriceChart
            data={prices}
            getTime={(item) => item.timestamp}
            getValue={(item) => item.close}
            theme={theme}
            height={420}
          />
        </div>
      </section>
    </main>
  );
}
