import { useCallback, useMemo, useRef, useState, useEffect, Profiler, type ProfilerOnRenderCallback } from 'react';

import {
  generateSeries,
  MAX_TOTAL_POINTS,
  PRESETS,
  validateConfig,
  type StressConfig,
  type StressSeries,
} from './workload';
import { PerformanceMonitor, type ReactRenderCounters } from './PerformanceMonitor';
import './stress.css';

const COLORS = ['#ad95ff', '#6bd3dd', '#ffba75', '#82b9ff', '#f084bf', '#87d6a2'];
const PANEL_OPTIONS = [6, 12, 24, 48, 96] as const;
const POINT_OPTIONS = [300, 2000, 10_000, 30_000, 100_000] as const;
const UPDATE_OPTIONS = [5000, 1000, 250, 100] as const;

interface StressPlotProps {
  readonly series: StressSeries;
  readonly tick: number;
}

/**
 * Deliberately bad baseline: rebuild the entire path even though only the
 * last point changes. Do not add memoization here before recording a baseline.
 */
function StressPlot({ series, tick }: StressPlotProps) {
  const values = series.values;
  const count = values.length;
  const width = 710;
  const chartHeight = 128;
  let path = '';
  let last = 0;

  for (let i = 0; i < count; i++) {
    const raw = values[i] ?? 0;
    const value = i === count - 1 ? raw + Math.sin(tick / 3 + series.id) * 6 : raw;
    if (i === count - 1) last = value;
    const x = ((i / Math.max(1, count - 1)) * width).toFixed(2);
    const y = ((100 - value) / 100 * chartHeight).toFixed(2);
    path += `${i === 0 ? 'M' : 'L'}${x} ${y} `;
  }

  const color = COLORS[series.id % COLORS.length] ?? COLORS[0];
  return (
    <article className="stress-panel" style={{ '--stress-color': color } as React.CSSProperties}>
      <div className="stress-panel__header">
        <div>
          <small>SERVER / NODE-{String(series.id + 1).padStart(2, '0')}</small>
          <h3>CPU telemetry #{series.id + 1}</h3>
        </div>
        <strong>{last.toFixed(1)}%</strong>
      </div>
      <svg viewBox="0 0 710 150" aria-label={`Тестовый график номер ${series.id + 1}`} role="img">
        {[32, 64, 96].map((y) =>
          <line key={y} x1="0" x2="710" y1={y} y2={y} stroke="var(--stress-grid)" strokeDasharray="4 6"/>,
        )}
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <footer>
        <span>{count.toLocaleString('ru-RU')} точек</span>
        <span>SVG · пересчёт всех точек · тик #{tick}</span>
      </footer>
    </article>
  );
}

export function PerformanceStressLab() {
  const [draft, setDraft] = useState<StressConfig>(PRESETS.light);
  const [active, setActive] = useState<StressConfig>(PRESETS.light);
  const [running, setRunning] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [tick, setTick] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const counters = useRef<ReactRenderCounters>({ commits: 0, durationMs: 0, maxDurationMs: 0 });

  // The data is generated once per applied configuration, never on each tick.
  // This isolates render cost from initial fixture creation.
  const series = useMemo(() => generateSeries(active), [active]);
  const total = draft.panels * draft.pointsPerPanel;
  const validation = validateConfig(draft);
  const dangerous = total >= 200_000 || draft.intervalMs <= 250;

  useEffect(() => {
    if (!running || !mounted) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setTick((previous) => previous + 1);
      }
    }, active.intervalMs);
    return () => clearInterval(timer);
  }, [running, mounted, active.intervalMs]);

  const handleSafetyPause = useCallback(() => {
    setRunning(false);
    setMessage('Автопауза: FPS долго оставался ниже 10. Уменьши нагрузку или нажми «Лёгкий режим».');
  }, []);

  const recordProfile = useCallback<ProfilerOnRenderCallback>((_id, _phase, actualDuration) => {
    counters.current.commits += 1;
    counters.current.durationMs += actualDuration;
    counters.current.maxDurationMs = Math.max(counters.current.maxDurationMs, actualDuration);
  }, []);

  const apply = () => {
    if (validation) return;
    if (dangerous && !window.confirm(
      `Нагрузка: ${total.toLocaleString('ru-RU')} точек, ${draft.panels} графиков, обновление раз в ${draft.intervalMs} мс. Интерфейс может временно зависнуть. Продолжить?`,
    )) return;

    counters.current = { commits: 0, durationMs: 0, maxDurationMs: 0 };
    setActive({ ...draft });
    setMounted(true);
    setRunning(true);
    setTick(0);
    setMessage('Нагрузка запущена. Подожди несколько секунд и запиши FPS, Long Tasks и React render.');
  };

  const reset = () => {
    setRunning(false);
    setMounted(true);
    setDraft({ ...PRESETS.light });
    setActive({ ...PRESETS.light });
    setTick(0);
    counters.current = { commits: 0, durationMs: 0, maxDurationMs: 0 };
    setMessage('Лёгкий режим восстановлен. Чтобы начать измерение, нажми «Старт / применить».');
  };

  const isHeavy = active.panels * active.pointsPerPanel >= 200_000 || active.intervalMs <= 250;

  return (
    <section className="stress" aria-labelledby="stress-title">
      <div className="stress-intro">
        <div>
          <p className="stress-eyebrow">CLOUD X · PERFORMANCE ENGINEERING</p>
          <h1 id="stress-title">Performance Stress Lab</h1>
          <p>Специально неоптимизированный дашборд. Увеличиваем число панелей, размер временных рядов и частоту обновления, измеряем тормоза и затем исправляем их вместе.</p>
        </div>
        <div className="stress-intro__badge">BASELINE · NO OPTIMIZATIONS</div>
      </div>

      <div className="stress-alert">
        <strong>Почему эта версия медленная намеренно?</strong>
        <p>При каждом обновлении React перерисовывает ВСЕ графики, и каждый собирает SVG path заново из ВСЕХ точек. Никаких <code>React.memo</code>, downsampling и виртуализации. Иначе не увидим первоначальную проблему.</p>
      </div>

      <div className="stress-presets" role="group" aria-label="Готовые уровни нагрузки">
        <button type="button" onClick={() => setDraft({ ...PRESETS.light })}>01 · Light</button>
        <button type="button" onClick={() => setDraft({ ...PRESETS.medium })}>02 · Medium</button>
        <button type="button" onClick={() => setDraft({ ...PRESETS.heavy })}>03 · Heavy</button>
        <button type="button" onClick={() => setDraft({ ...PRESETS.extreme })}>04 · Extreme</button>
      </div>

      <div className="stress-controls">
        <div className="stress-controls__fields">
          <label>Графиков
            <select value={draft.panels} onChange={(event) => {
              const panels = Number(event.currentTarget.value);
              setDraft((prev) => ({ ...prev, panels }));
            }}>
              {PANEL_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label>Точек на график
            <select value={draft.pointsPerPanel} onChange={(event) => {
              const pointsPerPanel = Number(event.currentTarget.value);
              setDraft((prev) => ({ ...prev, pointsPerPanel }));
            }}>
              {POINT_OPTIONS.map((value) => <option key={value} value={value}>{value.toLocaleString('ru-RU')}</option>)}
            </select>
          </label>
          <label>Интервал обновления
            <select value={draft.intervalMs} onChange={(event) => {
              const intervalMs = Number(event.currentTarget.value);
              setDraft((prev) => ({ ...prev, intervalMs }));
            }}>
              {UPDATE_OPTIONS.map((value) => <option key={value} value={value}>{value < 1000 ? `${value} мс` : `${value / 1000} с`}</option>)}
            </select>
          </label>
          <div className="stress-controls__total">
            <small>ИТОГО ТОЧЕК В ПАМЯТИ</small>
            <strong>{total.toLocaleString('ru-RU')}</strong>
            <small>Лимит: {MAX_TOTAL_POINTS.toLocaleString('ru-RU')}</small>
          </div>
        </div>
        {validation && <p className="stress-controls__error" role="alert">{validation}</p>}
        <div className="stress-controls__actions">
          <button className="stress-button stress-button--primary" type="button" onClick={apply} disabled={Boolean(validation)}>
            <span aria-hidden="true">▶</span> Старт / применить
          </button>
          <button className="stress-button stress-button--pause" type="button" onClick={() => { setRunning(false); setMessage('Автообновления остановлены.'); }}>
            <span aria-hidden="true">Ⅱ</span> Пауза
          </button>
          <button className="stress-button" type="button" onClick={() => { setRunning(false); setMounted(false); setMessage('Все тяжёлые SVG-графики размонтированы.'); }}>
            <span aria-hidden="true">⊗</span> Снять графики
          </button>
          <button className="stress-button" type="button" onClick={reset}>
            <span aria-hidden="true">↺</span> Лёгкий режим
          </button>
        </div>
      </div>

      <PerformanceMonitor counters={counters} running={running && mounted} onSafetyPause={handleSafetyPause}/>

      {message && <div className="stress-message" role="status">{message} <button type="button" aria-label="Закрыть уведомление" onClick={() => setMessage(null)}>×</button></div>}

      <div className="stress-results">
        <div>
          <p className="stress-eyebrow">RENDER LOAD · INDEPENDENT CHART PANELS</p>
          <h2>Дашборд под нагрузкой</h2>
          <p>Фактически: {active.panels} графиков × {active.pointsPerPanel.toLocaleString('ru-RU')} точек; частота {active.intervalMs} мс; тик #{tick}.</p>
        </div>
        <span className={`stress-status stress-status--${running && mounted ? isHeavy ? 'warning' : 'healthy' : 'paused'}`}>
          {running && mounted ? 'RUNNING' : 'PAUSED'}
        </span>
      </div>

      {mounted ? (
        <div className="stress-grid">
          {series.map((item) => (
            <Profiler key={item.id} id={`stress-plot-${item.id}`} onRender={recordProfile}>
              <StressPlot series={item} tick={tick}/>
            </Profiler>
          ))}
        </div>
      ) : (
        <div className="stress-unmounted">
          <strong>Графики размонтированы.</strong>
          <p>Измеритель FPS продолжает работать. Сравни FPS без SVG с FPS при активных графиках.</p>
        </div>
      )}

      <aside className="stress-guide">
        <h2>Как будем искать проблему</h2>
        <ol>
          <li>Проверь Light и запиши показатели FPS, Long Tasks, React render.</li>
          <li>Запусти Medium, затем Heavy. Extreme — только после измерений и сохранения результатов.</li>
          <li>Открой Chrome DevTools → Performance, запиши 5–10 секунд и найди самые дорогие функции.</li>
          <li>Открой React DevTools → Profiler: проверь, сколько панелей рендерится на каждом тике.</li>
          <li>При тормозах нажми «Пауза», «Снять графики» или «Лёгкий режим».</li>
        </ol>
        <p>Сравниваем один и тот же сценарий до и после оптимизации. Это не настоящий бенчмарк GPU и не нагрузка на сервер — данные уже находятся в браузере.</p>
      </aside>
    </section>
  );
}
