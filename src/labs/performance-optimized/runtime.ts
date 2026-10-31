type TickListener = (tick: number) => void;

/** Imperative tick channel; a heartbeat does not dispatch a React state update. */
export class TickBus {
  private listeners = new Set<TickListener>();
  private current = 0;

  get tick(): number {
    return this.current;
  }

  next(): void {
    this.current++;
    for (const listener of this.listeners) listener(this.current);
  }

  reset(): void {
    this.current = 0;
    for (const listener of this.listeners) listener(this.current);
  }

  subscribe(listener: TickListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
}

/**
 * One IntersectionObserver for the entire dashboard, not 96 observers.
 * With a 200px margin, panels render just before scrolling into view.
 */
export class VisibilityRegistry {
  private callbacks = new Map<Element, (visible: boolean) => void>();
  private observer: IntersectionObserver | null;

  constructor() {
    this.observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver((entries) => {
          for (const entry of entries) {
            this.callbacks.get(entry.target)?.(entry.isIntersecting);
          }
        }, { rootMargin: '200px 0px' });
  }

  observe(element: Element, callback: (visible: boolean) => void): () => void {
    if (!this.observer) {
      callback(true);
      return () => {};
    }
    this.callbacks.set(element, callback);
    this.observer.observe(element);
    return () => {
      this.observer?.unobserve(element);
      this.callbacks.delete(element);
    };
  }

  // Only call when the whole dashboard is permanently disposed.
  dispose(): void {
    this.observer?.disconnect();
    this.callbacks.clear();
  }
}
