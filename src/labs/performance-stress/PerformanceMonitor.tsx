import { useEffect, useState, type MutableRefObject } from 'react';

export interface ReactRenderCounters {
  commits: number;
  durationMs: number;
  maxDurationMs: number;
}

/** Samples measured frame intervals, long tasks and React Profiler commit durations. */
interface MonitorProps {
  counters: MutableRefObject<ReactRenderCounters>;
  running: boolean;
  onSafetyPause: () => void;
}

interface Snapshot {
  fps: number;
  slowFrames: number;
  maxFrameGapMs: number;
  longTasks: number | null;
  renderDurationMs: number;
  renderCommits: number;
  maxReactRenderMs: number;
  heapMB: number | null;
}

const EMPTY: Snapshot = {
  fps: 0,
  slowFrames: 0,
  maxFrameGapMs: 0,
  longTasks: null,
  renderDurationMs: 0,
  renderCommits: 0,
  maxReactRenderMs: 0,
  heapMB: null,
};

export function PerformanceMonitor({ counters, running, onSafetyPause }: MonitorProps) {
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const [status, setStatus] = useState('Собираем первые измерения…');

  useEffect(() => {
    let frame = 0;
    let lastFrame = 0;
    let lastSecond = performance.now();
    let frameCount = 0;
    let slowFrames = 0;
    let maxFrameGap = 0;
    let longTasks = 0;
    let supportedLongTasks = false;
    let consecutiveLowFps = 0;
    let observer: PerformanceObserver | null = null;

    if (typeof PerformanceObserver !== 'undefined') {
      try {
        observer = new PerformanceObserver((entries) => {
          longTasks += entries.getEntries().length;
        });
        observer.observe({ type: 'longtask', buffered: false });
        supportedLongTasks = true;
      } catch {
        observer.disconnect();
        observer = null;
      }
    }

    const measure = (now: number) => {
      if (document.visibilityState !== 'visible') {
        lastFrame = now;
        lastSecond = now;
        frameCount = 0;
        slowFrames = 0;
        maxFrameGap = 0;
        counters.current.commits = 0;
        counters.current.durationMs = 0;
        counters.current.maxDurationMs = 0;
        frame = requestAnimationFrame(measure);
        return;
      }

      if (lastFrame > 0) {
        const gap = now - lastFrame;
        if (gap > 50) slowFrames++;
        maxFrameGap = Math.max(maxFrameGap, gap);
      }
      lastFrame = now;
      frameCount++;

      const elapsed = now - lastSecond;
      if (elapsed >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsed);
        const heap = (performance as Performance & {
          memory?: { usedJSHeapSize?: number };
        }).memory?.usedJSHeapSize;
        setSnapshot({
          fps,
          slowFrames,
          maxFrameGapMs: Math.round(maxFrameGap),
          longTasks: supportedLongTasks ? longTasks : null,
          renderDurationMs: Math.round(counters.current.durationMs),
          renderCommits: counters.current.commits,
          maxReactRenderMs: Math.round(counters.current.maxDurationMs * 10) / 10,
          heapMB: typeof heap === 'number' ? Math.round(heap / 1048576) : null,
        });
        if (running && fps < 10) consecutiveLowFps++;
        else consecutiveLowFps = 0;
        if (consecutiveLowFps >= 3) {
          setStatus('Автопауза: FPS ниже 10 в трёх последовательных измерениях.');
          onSafetyPause();
          consecutiveLowFps = 0;
        } else {
          setStatus(running ? 'Baseline активен · показатели обновляются раз в секунду' : 'Графики на паузе · измерения продолжаются');
        }

        frameCount = 0;
        slowFrames = 0;
        maxFrameGap = 0;
        longTasks = 0;
        lastSecond = now;
        counters.current.commits = 0;
        counters.current.durationMs = 0;
        counters.current.maxDurationMs = 0;
      }

      frame = requestAnimationFrame(measure);
    };
    frame = requestAnimationFrame(measure);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [counters, running, onSafetyPause]);

  const quality = snapshot.fps >= 45 ? 'healthy' : snapshot.fps >= 25 ? 'warning' : 'danger';

  return (
    <section className="stress-monitor" aria-label="Live performance diagnostics">
      <div className="stress-monitor__heading">
        <div>
          <p className="stress-eyebrow">BROWSER PERFORMANCE · LIVE</p>
          <h2>Измерения в реальном времени</h2>
        </div>
        <span className={`stress-status stress-status--${quality}`}>{snapshot.fps} FPS</span>
      </div>
      <div className="stress-metrics">
        <div><span>FPS (примерно)</span><strong className={quality}>{snapshot.fps}</strong><small>rAF, кадры/с</small></div>
        <div><span>Задержки кадров</span><strong>{snapshot.slowFrames}</strong><small>интервал &gt; 50 мс за 1 с</small></div>
        <div><span>Макс. интервал</span><strong>{snapshot.maxFrameGapMs} <i>мс</i></strong><small>между rAF callbacks</small></div>
        <div><span>Long Tasks</span><strong>{snapshot.longTasks ?? '—'}</strong><small>{snapshot.longTasks === null ? 'API не поддерживается' : 'за 1 с, задачи > 50 мс'}</small></div>
        <div><span>React render</span><strong>{snapshot.renderDurationMs} <i>мс</i></strong><small>сумма Profiler за 1 с</small></div>
        <div><span>React commits</span><strong>{snapshot.renderCommits}</strong><small>срабатывания Profiler по панелям</small></div>
        <div><span>Худший React render</span><strong>{snapshot.maxReactRenderMs} <i>мс</i></strong><small>одна панель, actualDuration</small></div>
        <div><span>JS Heap</span><strong>{snapshot.heapMB ?? '—'} <i>{snapshot.heapMB === null ? '' : 'MB'}</i></strong><small>{snapshot.heapMB === null ? 'Только Chromium при доступности API' : 'usedJSHeapSize, приблизительно'}</small></div>
      </div>
      <p className="stress-monitor__note" role="status">{status} FPS измеряется через rAF и не равен точной частоте обновления экрана. React Profiler показывает длительность React render, не стоимость браузерного paint.</p>
    </section>
  );
}
