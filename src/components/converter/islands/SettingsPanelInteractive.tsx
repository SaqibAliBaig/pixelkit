/**
 * SettingsPanelInteractive — thin helpers that read/write the settings
 * panel controls. Kept separate from ConverterApp so tests can wire the
 * panel without booting the whole app.
 */

export interface SettingsState {
  targetKb: number | null;
  autoOrient: boolean;
}

export interface SettingsRefs {
  select: HTMLSelectElement | null;
  value: HTMLElement | null;
  autoOrient: HTMLInputElement | null;
}

export function readSettings(refs: SettingsRefs): SettingsState {
  const raw = refs.select?.value ?? '';
  const targetKb = raw ? Number(raw) : null;
  return {
    targetKb: Number.isFinite(targetKb as number) && (targetKb as number) > 0 ? (targetKb as number) : null,
    autoOrient: refs.autoOrient?.checked ?? true,
  };
}

export function applySettingsToUI(refs: SettingsRefs, s: SettingsState): void {
  if (refs.select && !refs.select.disabled) {
    refs.select.value = s.targetKb ? String(s.targetKb) : '';
  }
  if (refs.value) {
    refs.value.textContent = s.targetKb ? `${s.targetKb} KB` : 'Best quality (no limit)';
  }
  if (refs.autoOrient) {
    refs.autoOrient.checked = s.autoOrient;
  }
}

export function lockTargetControl(refs: SettingsRefs, locked: boolean): void {
  if (refs.select) refs.select.disabled = locked;
}