# PriceChart — Build a reusable line/area trading chart from scratch

One repository with two independent labs: interactive **Price Charts** and a new
**Observability Dashboard Lab** for practicing frontend architecture, TypeScript,
configurable panels and monitoring UI.

The Price Charts demo includes both the student's implementation and a separate
Canvas reference implementation. The Observability lab begins with typed offline
fixtures and empty panels so the dashboard builder can be implemented lesson by lesson.

## Choose a lab

After `npm run dev`, open:

- **Observability Lab:** http://127.0.0.1:5173/#/observability (default; your learning code)
- **Observability Reference:** http://127.0.0.1:5173/#/observability-reference (complete independent dashboard)
- **Performance Stress Lab (BEFORE):** http://127.0.0.1:5173/#/performance-stress (unchanged baseline)
- **Performance Optimized (AFTER):** http://127.0.0.1:5173/#/performance-optimized (Canvas, LOD, visible-only rendering, tick bus)
- **Price Charts:** http://127.0.0.1:5173/#/charts

The page has navigation between both independent labs. The chart demo is lazy-loaded
and does not render when you are working in Observability.

Read [the Observability learning plan](docs/OBSERVABILITY_LAB.md) for the next exercises.
The [completed Observability Reference](docs/OBSERVABILITY_REFERENCE.md) is kept in a
separate folder and separate lazy-loaded route so you can compare with your own work.
The [Performance Stress Lab](docs/PERFORMANCE_STRESS.md) deliberately removes
optimizations in its own isolated route to benchmark how rendering scales.
The [optimized comparison](docs/PERFORMANCE_OPTIMIZED.md) uses the exact same
workload generator and profiles, but eliminates expensive repeat SVG work.

## Second chart: independent production-style Canvas reference

The demo now renders **two separate components** side by side in the codebase (stacked in the UI):

1. `src/chart/react/PriceChart.tsx` — the student's existing implementation, untouched by the reference engine.
2. `src/chart/reference/ReferencePriceChart.tsx` — a standalone, reusable `ReferencePriceChart<T>` with its own `model.ts`, `render.ts`, styles and unit tests.

The reference component accepts data with arbitrary record keys (through typed `getTime` and `getValue`), normalizes/sorts timestamps without mutating caller data, treats duplicate timestamps as last-write-wins, and renders using **Canvas 2D** (no prebuilt chart engine).

It includes:
- price/date axes with readable ticks, purple line + area fill and latest-price label;
- HiDPI and ResizeObserver handling, viewport culling and two Canvas layers;
- drag-to-pan, smooth wheel zoom anchored to cursor, pointer capture, crosshair, hovered-point tooltip;
- keyboard navigation (focus chart then arrow keys, +/−, Home/End);
- Dark / Light / Colorful themes and 1D / 1W / 1M / 1Y / ALL time presets;
- loading older records from a caller-provided `onLoadOlder(beforeTimestamp)` callback, preserving position when history is prepended;
- optional typed `onHover(point | null)`, empty values, null gaps and invalid number handling.

Example:

```tsx
import { ReferencePriceChart } from './chart/reference/ReferencePriceChart';

<ReferencePriceChart
  data={prices}
  getTime={(point) => point.timestamp}
  getValue={(point) => point.close}
  theme="dark"
  height={500}
  onLoadOlder={async (beforeTimestamp) => {
    // Fetch older prices in your application and prepend them to `prices`.
    // The chart intentionally never calls a vendor API on its own.
  }}
/>
```

**Data provider:** the included demo uses deterministic offline mock prices. To display real historical prices, integrate a licensed provider *outside* the chart and pass the updated dataset. A backend/vendor service and API keys are intentionally not bundled.

**Quality checks:** `npm run typecheck && npm run lint && npm run test && npm run build`. CI runs these checks on push.

## Stack

- React 19 + TypeScript (strict, noUncheckedIndexedAccess)
- Vite 7 with a loopback-only dev server
- Canvas 2D for rendering (we will write it ourselves)
- D3 scale / array for calculations later, **not** a ready-made chart engine
- Vitest, ESLint and Prettier

## Start (Windows PowerShell)

```powershell
git clone https://github.com/Artem29383/PriceChart.git
cd PriceChart
npm install
npm run dev
```

Open **http://127.0.0.1:5173/** (not localhost).

More commands:

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm run format
```

## VPN / Windows / Vite stability

We previously had trouble with Vite when a VPN/proxy interfered with local connections.
This starter deliberately:

1. Binds `server.host` to `127.0.0.1`, not `localhost` or `0.0.0.0`.
2. Fixes port `5173` and enables `strictPort`.
3. Uses `127.0.0.1` in the HMR WebSocket configuration.
4. Uses **no service worker/MSW**, no CDN resources and no remote API at startup.
5. Imports `createRoot` directly from `react-dom/client`, avoiding the earlier `ReactDOM is not defined` problem.

If a proxy/VPN still breaks local access:

- Use `http://127.0.0.1:5173/` explicitly.
- Check `netsh winhttp show proxy` and Windows/system VPN split-tunnel settings. Exclude the loopback address from proxy routing if needed. Do not disable security globally.
- Inspect `Get-NetTCPConnection -LocalPort 5173 -State Listen`.
- Check `npm run dev` terminal logs; if Vite exits, the browser cannot connect.
- Check stale service workers in Chrome DevTools → Application → Service Workers only if your browser previously registered one **for the same origin**. This project does not register any worker; unregister old workers for that origin if present.
- If port is occupied, terminate the old dev server or deliberately change both `server.port` and `server.hmr.clientPort`.

## Structure

```text
src/
  app/                 Navigation and charts page
  chart/               Both financial chart implementations
  labs/
    observability/      Dashboard builder laboratory (isolated)
  demo/
    data/              Deterministic synthetic daily stock history
  styles/              Demo-only styles
  test/                Test utilities
docs/
  LEARNING_PLAN.md     Original chart roadmap
  NEW_CHAT_PROMPT.md   Original chart learning prompt
  OBSERVABILITY_LAB.md Dashboard builder curriculum
```

## Learning rules

- **Do not implement the full chart ahead of the lessons.** We will pair-program it.
- Keep the chart implementation independent of the demo page.
- Never import a ready-made chart renderer.
- Explain geometry, lifecycle and TypeScript contracts before introducing a non-trivial abstraction.
- Preserve the user's code; improve it through review instead of wholesale replacement.
- No candle charts in the initial scope.

See [docs/LEARNING_PLAN.md](docs/LEARNING_PLAN.md) and [docs/NEW_CHAT_PROMPT.md](docs/NEW_CHAT_PROMPT.md).
