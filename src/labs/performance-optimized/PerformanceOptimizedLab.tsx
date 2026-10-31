import {
  Profiler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ProfilerOnRenderCallback,
} from 'react';

import {
  generateSeries,
  MAX_TOTAL_POINTS,
  PRESETS,
  validateConfig,
  type StressConfig,
} from '../performance-stress/workload';
import { OptimizedPlot } from './OptimizedPlot';
import {
  OptimizedPerformanceMonitor,
  type ReactRenderCounters,
} from './OptimizedPerformanceMonitor';
import { TickBus, VisibilityRegistry } from './runtime';
import '../performance-stress/stress.css';
import './optimized.css';

const PANEL_OPTIONS = [6, 12, 24, 48, 96] as const;
const POINT_OPTIONS = [300, 2000, 10_000, 30_000, 100_000] as const;
const UPDATE_OPTIONS = [5000, 1000, 250, 100] as const;

/**
 * SAME generator, same profiles, same tick formula, same monitor definitions.
 * Only the UI rendering architecture changes. The baseline route is untouched.
 */
export function PerformanceOptimizedLab() {
  const [draft, setDraft] = useState<StressConfig>(PRESETS.light);
  const [active, setActive] = useState<StressConfig>(PRESETS.light);
  const [running, setRunning] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const counters = useRef<ReactRenderCounters>({ commits: 0, durationMs: 0, maxDurationMs: 0 });

  const bus = useMemo(() => new TickBus(), []);
  const visibility = useMemo(() => new VisibilityRegistry(), []);
  const series = useMemo(() => generateSeries(active), [active]);

  const total = draft.panels * draft.pointsPerPanel;
  const validation = validateConfig(draft);
  const dangerous = total >= 200_000 || draft.intervalMs <= 250;
  const isHeavy = active.panels * active.pointsPerPanel >= 200_000 || active.intervalMs <= 250;

  // One publisher, no React state update per tick. Only VISIBLE chart overlays subscribe.
  useEffect(() => {
    if (!running || !mounted) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') bus.next();
    }, active.intervalMs);
    return () => window.clearInterval(timer);
  }, [running, mounted, active.intervalMs, bus]);

  const handleSafetyPause = useCallback(() => {
    setRunning(false);
    setMessage('Автопауза: FPS ниже 10 в трёх замерах подряд. Верни лёгкий режим.');
  }, []);

  const onRender = useCallback<ProfilerOnRenderCallback>((_id, _phase, actualDuration) => {
    counters.current.commits += 1;
    counters.current.durationMs += actualDuration;
    counters.current.maxDurationMs = Math.max(counters.current.maxDurationMs, actualDuration);
  }, []);

  const apply = () => {
    if (validation) return;
    if (dangerous && !window.confirm(
      `Нагрузка: ${total.toLocaleString('ru-RU')} точек, ${draft.panels} графиков, обновление раз в ${draft.intervalMs} мс. Даже оптимизированный вариант может тормозить при первой загрузке. Продолжить?`,
    )) return;

    setRunning(false);
    setMounted(true);
    counters.current = { commits: 0, durationMs: 0, maxDurationMs: 0 };
    bus.reset();
    setActive({ ...draft });
    setRunning(true);
    setMessage('Оптимизированная нагрузка запущена. Для сравнения запиши FPS, Long Tasks и Bottom-up через 5–10 секунд.');
  };

  const reset = () => {
    setRunning(false);
    setMounted(true);
    setDraft({ ...PRESETS.light });
    setActive({ ...PRESETS.light });
    bus.reset();
    counters.current = { commits: 0, durationMs: 0, maxDurationMs: 0 };
    setMessage('Лёгкий режим восстановлен. Нажми «Старт / применить» для нового измерения.');
  };

  return (
    <section className="stress optimized-stress" aria-labelledby="optimized-title">
      <div className="stress-intro">
        <div>
          <p className="stress-eyebrow">CLOUD X · PERFORMANCE ENGINEERING · AFTER</p>
          <h1 id="optimized-title">Performance Optimized</h1>
          <p>Тот же стресс-тест, те же исходные Float32Array и настройки. Другая архитектура: Canvas, кэширование статического ряда, min/max-downsampling, отрисовка только видимых панелей, без React-рендеров на каждом тике.</p>
        </div>
        <div className="stress-intro__badge optimized-stress__badge">OPTIMIZED · SAME DATA</div>
      </div>

      <div className="optimized-explainer">
        <strong>Что изменено относительно baseline</strong>
        <div className="optimized-explainer__grid">
          <span>✓ Вместо миллиона повторных SVG-координат — Canvas и статическая линия</span>
          <span>✓ На тике меняется только короткий последний сегмент</span>
          <span>✓ Прорисовка только видимых графиков (IntersectionObserver)</span>
          <span>✓ Min/max LOD с сохранением локальных пиков</span>
          <span>✓ Один общий тикер, без массового setState и React re-render</span>
          <span>✓ ResizeObserver только на видимых графиках, учёт DPR</span>
        </div>
        <p>LOD снижает детализацию истории, сохраняя минимумы и максимумы групп. Это не пиксельно идентичная линия baseline, зато массивы данных и формула последней точки остаются теми же. Первый показ графика всё ещё требует O(N)-сканирования данных.</p>
        <a href="#/performance-stress">← Открыть исходный Stress Lab для сравнения</a>
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
              setDraft((previous) => ({ ...previous, panels }));
            }}>
              {PANEL_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label>Точек на график
            <select value={draft.pointsPerPanel} onChange={(event) => {
              const pointsPerPanel = Number(event.currentTarget.value);
              setDraft((previous) => ({ ...previous, pointsPerPanel }));
            }}>
              {POINT_OPTIONS.map((value) => <option key={value} value={value}>{value.toLocaleString('ru-RU')}</option>)}
            </select>
          </label>
          <label>Интервал обновления
            <select value={draft.intervalMs} onChange={(event) => {
              const intervalMs = Number(event.currentTarget.value);
              setDraft((previous) => ({ ...previous, intervalMs }));
            }}>
              {UPDATE_OPTIONS.map((value) => (
                <option key={value} value={value}>{value < 1000 ? `${value} мс` : `${value / 1000} с`}</option>
              ))}
            </select>
          </label>
          <div className="stress-controls__total">
            <small>ТЕ ЖЕ ТОЧКИ В ПАМЯТИ</small>
            <strong>{total.toLocaleString('ru-RU')}</strong>
            <small>Лимит: {MAX_TOTAL_POINTS.toLocaleString('ru-RU')}</small>
          </div>
        </div>
        {validation && <p className="stress-controls__error" role="alert">{validation}</p>}
        <div className="stress-controls__actions">
          <button className="stress-button stress-button--primary" type="button" onClick={apply} disabled={Boolean(validation)}>
            <span aria-hidden="true">▶</span> Старт / применить
          </button>
          <button className="stress-button stress-button--pause" type="button" onClick={() => {
            setRunning(false);
            setMessage('Тикер остановлен. Графики остаются на экране.');
          }}>
            <span aria-hidden="true">Ⅱ</span> Пауза
          </button>
          <button className="stress-button" type="button" onClick={() => {
            setRunning(false);
            setMounted(false);
            setMessage('Графики размонтированы; можно сравнить FPS без них.');
          }}>
            <span aria-hidden="true">⊗</span> Снять графики
          </button>
          <button className="stress-button" type="button" onClick={reset}>
            <span aria-hidden="true">↺</span> Лёгкий режим
          </button>
        </div>
      </div>

      <OptimizedPerformanceMonitor
        counters={counters}
        running={running && mounted}
        onSafetyPause={handleSafetyPause}
      />

      {message && (
        <div className="stress-message" role="status">
          {message}
          <button type="button" aria-label="Закрыть уведомление" onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      <div className="stress-results">
        <div>
          <p className="stress-eyebrow">CANVAS · IMPERATIVE UPDATES · LAZY VISIBLE PANELS</p>
          <h2>Те же данные, другой способ отрисовки</h2>
          <p>Фактически: {active.panels} графиков × {active.pointsPerPanel.toLocaleString('ru-RU')} точек, интервал {active.intervalMs} мс. Источник: тот же generateSeries.</p>
        </div>
        <span className={`stress-status stress-status--${running && mounted ? isHeavy ? 'warning' : 'healthy' : 'paused'}`}>
          {running && mounted ? 'RUNNING' : 'PAUSED'}
        </span>
      </div>

      {mounted ? (
        <div className="stress-grid">
          {series.map((item) => (
            <Profiler key={item.id} id={`optimized-plot-${item.id}`} onRender={onRender}>
              <OptimizedPlot series={item} bus={bus} visibility={visibility} />
            </Profiler>
          ))}
        </div>
      ) : (
        <div className="stress-unmounted">
          <strong>Графики размонтированы</strong>
          <p>FPS-монитор продолжает работать. Верни графики кнопкой «Старт / применить».</p>
        </div>
      )}

      <aside className="stress-guide">
        <h2>Как сравнивать честно</h2>
        <ol>
          <li>В <strong>Performance Stress Lab</strong> выбери Extreme: 96 / 10 000 / 100 мс и запиши 5–10 секунд после начала работы, не включая окно confirm.</li>
          <li>Затем здесь выбери такой же Extreme. Сделай запись на том же компьютере и в том же режиме Vite.</li>
          <li>Сравни FPS, Long Tasks, Main thread → Scripting и Bottom-up. Разница в React render не отражает стоимость Canvas painting.</li>
          <li>Прокрути вниз: новые графики отрисовываются по мере появления на экране. Измерь также стоимость первой прокрутки.</li>
          <li>Для наиболее честного сравнения FPS повтори оба теста через `npm run build` + `npm run preview`, а не только в dev-режиме.</li>
        </ol>
        <p>Отличие от baseline: оптимизированная версия намеренно пропускает невидимые панели и уменьшает разрешение длинной истории. Это и есть реальные продуктовые оптимизации, но они меняют объём отрисовки. Абсолютно одинаковыми остаются входные данные, параметры и частота генерации тиков.</p>
      </aside>
    </section>
  );
}
