# PriceChart — Build a reusable line/area trading chart from scratch

An interactive, TradingView-style **line/area** chart learning project.

**Current state: starter scaffold only.** The chart is intentionally **not implemented**.
We will build Canvas rendering, axes, pan, zoom, crosshair and a reusable TypeScript API together, lesson by lesson.

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
  app/                 React application shell
  chart/
    core/              Shared types; other subsystems added as lessons progress
    react/             Generic <PriceChart<T>> placeholder
  demo/
    data/              Deterministic synthetic daily stock history
  styles/              Demo-only styles
  test/                Test utilities
docs/
  LEARNING_PLAN.md     Full stage-by-stage roadmap
  NEW_CHAT_PROMPT.md   Paste into a new ChatGPT conversation
```

## Learning rules

- **Do not implement the full chart ahead of the lessons.** We will pair-program it.
- Keep the chart implementation independent of the demo page.
- Never import a ready-made chart renderer.
- Explain geometry, lifecycle and TypeScript contracts before introducing a non-trivial abstraction.
- Preserve the user's code; improve it through review instead of wholesale replacement.
- No candle charts in the initial scope.

See [docs/LEARNING_PLAN.md](docs/LEARNING_PLAN.md) and [docs/NEW_CHAT_PROMPT.md](docs/NEW_CHAT_PROMPT.md).
