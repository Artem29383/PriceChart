# PriceChart — Roadmap for pair programming

**Goal:** Build a reusable, TradingView-like financial **Line / Area Chart** (not candlesticks) without importing a ready-made chart library. Our final component must accept independently typed datasets from arbitrary React applications, support smooth pan/zoom, axes, crosshair, thematic customization and historical data loading.

**Start:** The repository already contains the Vite + React + strict TypeScript scaffold, deterministic mock stock prices, a typed generic `PriceChart<T>` placeholder, a dark demo, and tests. **No chart renderer has been implemented.**

**Renderer:** Canvas 2D. D3 `d3-scale` / `d3-array` can assist with mathematical transformations but must not render the chart.

## Learning method

1. Study a concept in clear, technically correct language with a small example.
2. Set a *single bounded practical task*, with specific acceptance criteria.
3. The student writes the core code.
4. Review the student's code from GitHub (or a pasted snippet); point out actual mistakes, explain trade-offs, and give hints before complete solutions.
5. Supply complicated mathematical helpers or routine algorithms on request. We're not preparing for JS algorithm contests.
6. Verify behavior in a browser and run typecheck/test/build when practical.
7. Move to the next lesson only after the current implementation is understood.

The student already knows React/TS at Senior Frontend level and previously built SVG, Canvas, D3-scale lines, sampling and Chrome performance profiling in the **PulseBoard** project; don't re-teach those exercises from scratch.

## 00 — Environment and initial contracts

- Run `npm install`, `npm run dev` and open `http://127.0.0.1:5173/`.
- Confirm `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`.
- Inspect `PriceChart<T>`, understand inference from `data`, `getTime`, `getValue`.
- Inspect stock data shape and why history is deterministic.

**Acceptance:** App loads without proxy/service-worker failures, theme buttons work, tests pass.

## 01 — Render the first line and shaded area

- Create/mount a real Canvas inside the chart placeholder and clean up on unmount.
- Set correct canvas backing size for devicePixelRatio (HiDPI).
- Draw baseline grid, axes X/Y, price ticks on right and time labels at bottom.
- Implement data-to-pixel transformations and a smooth-enough purple price line.
- Add `createLinearGradient` area fill beneath line; respect chart padding.
- Handle empty data, one point and constant-price domain.
- TypeScript: DOM element types, null guards, return contracts and readonly inputs.

**Acceptance:** Purple line/gradient/axes match visual reference; no pan/zoom yet.

## 02 — Viewport / visible-range architecture

- Model `startIndex` (fractional) + `visibleCount`, independent of canvas pixels.
- Convert sample index ⇄ pixel; choose trading-sample indexing vs continuous wall-clock time.
- Use visible range only for vertical auto-scaling; support left/right margin.
- Test pure viewport coordinate calculations; don't mutate original data.
- TypeScript: Readonly, literal unions, model invariants, pure function signatures.

**Acceptance:** Changing the viewport model via temporary controls shows correct different slices of history.

## 03 — Pointer drag-to-pan

- Handle pointerdown/move/up/cancel; pointer capture and cleanup.
- Convert `deltaX` to fractional `startIndex` shift; clamp boundaries.
- Avoid selecting text while dragging, avoid full React rerenders per pointermove.
- Introduce requestAnimationFrame scheduling when appropriate.
- TypeScript: typed PointerEvent and discriminated interaction states.

**Acceptance:** Drag left/right works smoothly and is bounded by available history.

## 04 — Cursor-anchored wheel zoom

- Calculate zoom around cursor anchor; preserve data point beneath pointer.
- Wheel listener with `passive: false` only when preventing browser scroll.
- Clamp min and max visible span; handle resize and edges.
- TypeScript: pure functions for zoom and derived state.

**Acceptance:** Zoom doesn't jump horizontally or change the anchor unexpectedly.

## 05 — Crosshair and informative tooltip

- Crosshair with dashed vertical/horizontal guides.
- Find nearest actual observed point, hover dot, price/date labels at axes.
- Show latest-price badge at right, not only hover price.
- Handle pointerleave, missing values and overlapping labels.
- TypeScript: nullable state, generic `onHover` callback with original T.

**Acceptance:** Every overlay tracks pointer and clears on leave.

## 06 — Extract rendering controller and lifecycle

- Refactor only once a working chart exists; do not build a complex engine prematurely.
- Split base Canvas drawing from frequently changing crosshair overlay.
- Lifecycle: `create / update / destroy`, ResizeObserver, rAF cancellation, cleanup in React StrictMode.
- TypeScript: interface vs type, encapsulation, composition and strongly typed listener contracts.

**Acceptance:** No leaked observers/handlers and no full line redraw for every hover event.

## 07 — Universal React + TypeScript API

- Keep chart unaware of `StockPrice` or any single business DTO.
- Strengthen `PriceChart<T>` props and callbacks; prove inference with two unrelated datasets.
- Explore generics, keyof, indexed access, mapped and utility types as justified.
- Decide about `ref` methods for fitContent/setVisibleRange.
- Test update of data while retaining sensible viewport.

**Acceptance:** Same component works with different record keys and formats without `any` or unsafe type assertions.

## 08 — Theme, UX and range controls

- Themes Dark/Light/Colorful, color/thickness/gradient/axes customization.
- Accessible focus states, responsive width & height, DPR-aware resize.
- Time presets: 1D, 1W, 1M, 1Y, ALL.
- TypeScript: satisfies, Partial, Pick, narrowed option unions and defaults.

**Acceptance:** Polished dark chart matches source screenshot closely and remains usable in other themes.

## 09 — Real history and lazy loading

- External data access belongs outside renderer; typed adapter contract.
- Choose an API provider *after checking current documentation/licensing*.
- Async load older history when panning near left boundary, preserve viewport anchor.
- Loading, error, abort, stale responses, duplicate timestamps, weekends/sessions/timezones.
- Runtime schema checks when ingesting untrusted API responses.

**Acceptance:** Leftward pan can fetch additional historical data without visual jumps.

## 10 — Performance, tests and packaging

- Browser Performance profiles for 1k/10k/100k/1M observations.
- Visible range culling, devicePixelRatio costs and optional sampling (EveryNth, MinMax, LTTB).
- Unit tests for coordinate math, pan/zoom invariants; Playwright gesture checks.
- Document public API and minimal integration example; keep source distributable.
- Check `typecheck`, `lint`, `test`, `build`.

**Acceptance:** Finished working and explainable component, usable in another React application.

## Specific engineering principles

- Price values are finite numbers or null; time stamps in milliseconds since Unix epoch.
- The x-axis may use trading session/sample indices to avoid weekend gaps, while axis labels use real dates. Explore alternatives explicitly.
- Don't call setState on every mouse move; keep renderer state separate from React UI.
- Prefer one working renderer before adding layers or abstract interfaces.
- Keep UI accessible; watch out for high-DPI and resize.
- Always distinguish actual measured performance from estimates.

## Visual reference

Dark background; purple fluctuating stock price line; translucent purple area gradient; right price axis; bottom date axis; dashed crosshair; circle hover marker; selected date and price labels; last-price badge; theme selector; mouse drag and wheel zoom.

## Repository

https://github.com/Artem29383/PriceChart
