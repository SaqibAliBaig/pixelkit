/**
 * Human-readable file sizes and KB-target parsing.
 */

const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const i = Math.min(
    UNITS.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(decimals)} ${UNITS[i]}`;
}

export function parseTargetKb(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function kbToBytes(kb: number): number {
  return Math.round(kb * 1024);
}

export function bytesToKb(bytes: number): number {
  return Math.round((bytes / 1024) * 10) / 10;
}