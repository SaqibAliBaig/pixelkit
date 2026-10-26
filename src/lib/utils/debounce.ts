/**
 * Debounce + throttle helpers. Used to keep settings-driven
 * re-computation cheap.
 */

export type AnyFn = (...args: unknown[]) => void;

export function debounce<T extends AnyFn>(fn: T, ms: number): T & { cancel: () => void } {
  let handle: ReturnType<typeof setTimeout> | null = null;
  const wrapped = function (this: unknown, ...args: Parameters<T>) {
    if (handle) clearTimeout(handle);
    handle = setTimeout(() => {
      handle = null;
      fn.apply(this, args);
    }, ms);
  } as T & { cancel: () => void };
  wrapped.cancel = () => {
    if (handle) {
      clearTimeout(handle);
      handle = null;
    }
  };
  return wrapped;
}

export function throttle<T extends AnyFn>(fn: T, ms: number): T {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = ms - (now - last);
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      last = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  } as T;
}