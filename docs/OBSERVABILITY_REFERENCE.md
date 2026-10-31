# Observability Reference — completed standalone dashboard

**Route:** `http://127.0.0.1:5173/#/observability-reference`

This is the **finished reference** for the dashboard-builder exercises. It lives in
`src/labs/observability-reference` and does **not import from or modify**
`src/labs/observability` (your learning lab) or either PriceChart engine.

## Functional scope

- Fully working add / delete / duplicate / move / edit panel actions.
- Editable dashboard title, metric source, and 5 display modes: area, line,
  bars, stat, and table.
- Interactive SVG graphs with pointer crosshair and tooltip; null samples
  render gaps instead of zeros.
- Six simulated telemetry streams: CPU, memory, RPS, latency, HTTP errors,
  network throughput.
- Live mode updates every 5 seconds when the page is visible, pause/resume
  toggle and manual refresh. Samples are bounded at 720 per stream.
- Time-range selection: 15 minutes, 1 hour, 4 hours.
- Warning / critical thresholds, responsive layout and dark / light theme.
- Versioned dashboard config persisted in `localStorage`. Import / Export JSON,
  with runtime schema validation (including max panel count, unique IDs and
  allowable metric/visualization values).
- Reducer-based state transitions, chart rendering isolated from state model,
  a source adapter boundary, tests for the reducer, validation and telemetry.
- Lazy-loaded route: the reference dashboard and charts don't load when you're
  coding in the learning lab.

## Architecture

```text
src/labs/observability-reference/
  ObservabilityReference.tsx     dashboard composition and toolbar
  model.ts                      domain entities, metric catalog, selectors
  dashboard.ts                  reducer, persistence, import/export validation
  telemetry.ts                  deterministic simulated telemetry generator
  components/
    PanelCard.tsx               reusable panel/editor/actions
    MetricVisual.tsx            SVG line/area/bars, stat and table
  reference.css                 fully isolated, responsive styling
  reference.test.ts             pure domain-model tests
```

## Limits and honest production boundary

This is a **complete, runnable frontend reference**, **not a deployed
observability backend**. Metrics and thresholds are demonstrative; actual
CPU/RPS/latency come from a deterministic generator, **not live infrastructure**.
The live control starts/stops this simulator. No backend, WebSocket/SSE
server, authorization, or historical metrics database is provided.

To make this production-connected, replace `telemetry.ts` with a provider
that requests and subscribes to monitoring metrics (HTTP/SSE/WebSocket), then
add access controls, error/retry handling, server persistence, and
instrumentation. Module Federation is intentionally a later independent
exercise, not bundled into this Vite chart project.

## How to use

```bash
npm ci
npm run dev
```

Open the route above. Edit a card via its gear button, switch visualizations
and metrics, reorder with arrow buttons, pause the simulator, export JSON,
reload and verify the configuration survived, then reset it.

All reference styles are namespaced under `.oref`. The learning lab remains
available at `#/observability`, Price Charts at `#/charts`.
