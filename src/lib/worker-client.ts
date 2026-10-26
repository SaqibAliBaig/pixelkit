/**
 * Promise-based RPC client around the conversion worker. Used by the
 * island (ConverterApp) — not the worker itself. Pools N workers and
 * dispatches jobs to idle ones.
 */

import type { ConvertRequest, WorkerMessage } from './worker/types';

export interface WorkerPoolOptions {
  size?: number;
  onProgress?: (id: string, percent: number) => void;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private idle: Worker[] = [];
  private queue: { req: ConvertRequest; resolve: (b: Blob) => void; reject: (e: Error) => void }[] = [];
  private inflight = new Map<Worker, { resolve: (b: Blob) => void; reject: (e: Error) => void }>();

  constructor(opts: WorkerPoolOptions = {}) {
    const size = opts.size ?? Math.max(2, Math.min(4, navigator.hardwareConcurrency || 2));
    for (let i = 0; i < size; i++) {
      const w = new Worker(new URL('./worker/convert.worker.ts', import.meta.url), {
        type: 'module',
      });
      w.addEventListener('message', (ev: MessageEvent<WorkerMessage>) =>
        this.handleMessage(w, ev.data, opts.onProgress)
      );
      w.addEventListener('error', (ev) => {
        const pending = this.inflight.get(w);
        if (pending) {
          pending.reject(new Error(ev.message || 'Worker error'));
          this.inflight.delete(w);
          this.idle.push(w);
          this.pump();
        }
      });
      this.workers.push(w);
      this.idle.push(w);
    }
  }

  convert(req: ConvertRequest): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.queue.push({ req, resolve, reject });
      this.pump();
    });
  }

  dispose(): void {
    for (const w of this.workers) w.terminate();
    this.workers = [];
    this.idle = [];
    this.queue = [];
    this.inflight.clear();
  }

  private pump(): void {
    while (this.idle.length > 0 && this.queue.length > 0) {
      const worker = this.idle.pop();
      const job = this.queue.shift();
      if (!worker || !job) return;
      this.inflight.set(worker, { resolve: job.resolve, reject: job.reject });
      worker.postMessage(job.req);
    }
  }

  private handleMessage(
    worker: Worker,
    msg: WorkerMessage,
    onProgress?: (id: string, percent: number) => void
  ): void {
    if (msg.type === 'progress') {
      onProgress?.(msg.id, msg.percent);
      return;
    }
    const pending = this.inflight.get(worker);
    if (!pending) return;
    if (msg.type === 'result') {
      pending.resolve(msg.blob);
    } else if (msg.type === 'error') {
      pending.reject(new Error(msg.message));
    }
    this.inflight.delete(worker);
    this.idle.push(worker);
    this.pump();
  }
}