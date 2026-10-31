const fs = require('fs');

let appCode = fs.readFileSync('src/components/converter/islands/ConverterApp.tsx', 'utf8');

// 1. Add savedMaxTargetValue and savedExactTargetValue
const targetDecl = '  let customUnit: \'kb\' | \'mb\' = state.targetKb && state.targetKb >= 1024 && state.targetKb % 1024 === 0 ? \'mb\' : \'kb\';';
const newDecl = `  let customUnit: 'kb' | 'mb' = state.targetKb && state.targetKb >= 1024 && state.targetKb % 1024 === 0 ? 'mb' : 'kb';
  let savedMaxTargetValue: string = initialTarget ? String(initialTarget) : '';
  let savedExactTargetValue: string = initialTarget ? String(initialTarget) : '100';`;

appCode = appCode.replace(targetDecl, newDecl);

// 2. Update applyPortalPreset for reset and preset
const resetTarget = `    if (!preset || preset.id === 'none') {
      state.portalPreset = null;
      syncPortalPresetUi('none');
      setStatus('Switched to manual conversion controls.');
      return;
    }`;

const resetReplacement = `    if (!preset || preset.id === 'none') {
      state.portalPreset = null;
      savedMaxTargetValue = '';
      savedExactTargetValue = '100';
      state.targetKb = null;
      if (targetSelect) {
        targetSelect.value = '';
      }
      syncCustomTargetUi('');
      setSizeMode('max');
      syncPortalPresetUi('none');
      setStatus('Switched to manual conversion controls.');
      return;
    }`;

appCode = appCode.replace(resetTarget, resetReplacement);

const presetSaveTarget = `    state.portalPreset = preset.id;

    // 1. Output Format -> JPG`;

const presetSaveRepl = `    state.portalPreset = preset.id;
    savedMaxTargetValue = String(preset.targetKb);
    savedExactTargetValue = String(preset.targetKb);

    // 1. Output Format -> JPG`;

appCode = appCode.replace(presetSaveTarget, presetSaveRepl);

// 3. Update setSizeMode
const oldSetSizeMode = `  // 2. Size Modes (Max Size, Exact Size, Range, Quality %)
  function setSizeMode(mode: SizeControlMode): void {
    state.targetSizeMode = mode;
    [modeMaxBtn, modeExactBtn, modeRangeBtn, modeQualityBtn].forEach((btn) => {
      if (!btn) return;
      const isSelected = btn.dataset.mode === mode;
      btn.className = isSelected
        ? 'flex-1 rounded-md py-1 font-medium transition-colors bg-surface text-fg shadow-sm cursor-pointer'
        : 'flex-1 rounded-md py-1 font-medium transition-colors text-muted hover:text-fg cursor-pointer';
    });

    if (mode === 'quality') {
      targetPresetContainer?.classList.add('hidden');
      customKbContainer?.classList.add('hidden');
      rangeKbContainer?.classList.add('hidden');
      qualityContainer?.classList.remove('hidden');
      state.targetKb = null;
    } else if (mode === 'range') {
      targetPresetContainer?.classList.add('hidden');
      customKbContainer?.classList.add('hidden');
      qualityContainer?.classList.add('hidden');
      rangeKbContainer?.classList.remove('hidden');
    } else if (mode === 'exact') {
      rangeKbContainer?.classList.add('hidden');
      qualityContainer?.classList.add('hidden');
      targetPresetContainer?.classList.remove('hidden');

      if (targetSelect) {
        // If currently on "Best quality (no limit)", select default 100 KB
        if (!targetSelect.value) {
          targetSelect.value = '100';
          state.targetKb = 100;
        } else if (targetSelect.value === 'custom') {
          updateCustomTargetFromInput();
        } else {
          state.targetKb = Number(targetSelect.value);
        }

        if (targetSelect.value === 'custom') {
          customKbContainer?.classList.remove('hidden');
        } else {
          customKbContainer?.classList.add('hidden');
        }
      }
      syncCustomTargetUi(targetSelect?.value || '100');
    } else {
      // mode === 'max'
      rangeKbContainer?.classList.add('hidden');
      qualityContainer?.classList.add('hidden');
      targetPresetContainer?.classList.remove('hidden');

      if (targetSelect) {
        if (targetSelect.value === 'custom') {
          customKbContainer?.classList.remove('hidden');
          updateCustomTargetFromInput();
        } else {
          customKbContainer?.classList.add('hidden');
          state.targetKb = targetSelect.value ? Number(targetSelect.value) : null;
        }
      }
      syncCustomTargetUi(targetSelect?.value || '');
    }
    updateTargetLabel();
  }`;

const newSetSizeMode = `  // 2. Size Modes (Max Size, Exact Size, Range, Quality %)
  function setSizeMode(mode: SizeControlMode): void {
    state.targetSizeMode = mode;
    [modeMaxBtn, modeExactBtn, modeRangeBtn, modeQualityBtn].forEach((btn) => {
      if (!btn) return;
      const isSelected = btn.dataset.mode === mode;
      btn.className = isSelected
        ? 'flex-1 rounded-md py-1 font-medium transition-colors bg-surface text-fg shadow-sm cursor-pointer'
        : 'flex-1 rounded-md py-1 font-medium transition-colors text-muted hover:text-fg cursor-pointer';
    });

    if (mode === 'quality') {
      targetPresetContainer?.classList.add('hidden');
      customKbContainer?.classList.add('hidden');
      rangeKbContainer?.classList.add('hidden');
      qualityContainer?.classList.remove('hidden');
      state.targetKb = null;
    } else if (mode === 'range') {
      targetPresetContainer?.classList.add('hidden');
      customKbContainer?.classList.add('hidden');
      qualityContainer?.classList.add('hidden');
      rangeKbContainer?.classList.remove('hidden');
    } else if (mode === 'exact') {
      rangeKbContainer?.classList.add('hidden');
      qualityContainer?.classList.add('hidden');
      targetPresetContainer?.classList.remove('hidden');

      if (targetSelect) {
        targetSelect.value = savedExactTargetValue || '100';
        if (targetSelect.value === 'custom') {
          customKbContainer?.classList.remove('hidden');
          updateCustomTargetFromInput();
        } else {
          customKbContainer?.classList.add('hidden');
          state.targetKb = Number(targetSelect.value);
        }
      }
      syncCustomTargetUi(targetSelect?.value || '100');
    } else {
      // mode === 'max'
      rangeKbContainer?.classList.add('hidden');
      qualityContainer?.classList.add('hidden');
      targetPresetContainer?.classList.remove('hidden');

      if (targetSelect) {
        targetSelect.value = savedMaxTargetValue;
        if (targetSelect.value === 'custom') {
          customKbContainer?.classList.remove('hidden');
          updateCustomTargetFromInput();
        } else {
          customKbContainer?.classList.add('hidden');
          state.targetKb = targetSelect.value ? Number(targetSelect.value) : null;
        }
      }
      syncCustomTargetUi(targetSelect?.value || '');
    }
    updateTargetLabel();
  }`;

if (appCode.includes(oldSetSizeMode)) {
  appCode = appCode.replace(oldSetSizeMode, newSetSizeMode);
  console.log('Replaced setSizeMode');
} else {
  // Try CRLF
  const oldSetSizeModeCr = oldSetSizeMode.replace(/\n/g, '\r\n');
  const newSetSizeModeCr = newSetSizeMode.replace(/\n/g, '\r\n');
  if (appCode.includes(oldSetSizeModeCr)) {
    appCode = appCode.replace(oldSetSizeModeCr, newSetSizeModeCr);
    console.log('Replaced setSizeMode (CRLF)');
  } else {
    console.error('Could not find oldSetSizeMode');
  }
}

// 4. Update targetSelect change event listener to store to savedMaxTargetValue / savedExactTargetValue
const oldTargetChange = `  targetSelect?.addEventListener('change', () => {
    const v = targetSelect.value;
    qualityContainer?.classList.add('hidden');`;

const newTargetChange = `  targetSelect?.addEventListener('change', () => {
    const v = targetSelect.value;
    if (state.targetSizeMode === 'exact') {
      savedExactTargetValue = v;
    } else if (state.targetSizeMode === 'max') {
      savedMaxTargetValue = v;
    }
    qualityContainer?.classList.add('hidden');`;

if (appCode.includes(oldTargetChange)) {
  appCode = appCode.replace(oldTargetChange, newTargetChange);
  console.log('Updated targetSelect change listener');
} else {
  const oldTargetChangeCr = oldTargetChange.replace(/\n/g, '\r\n');
  const newTargetChangeCr = newTargetChange.replace(/\n/g, '\r\n');
  if (appCode.includes(oldTargetChangeCr)) {
    appCode = appCode.replace(oldTargetChangeCr, newTargetChangeCr);
    console.log('Updated targetSelect change listener (CRLF)');
  } else {
    console.error('Could not find oldTargetChange');
  }
}

fs.writeFileSync('src/components/converter/islands/ConverterApp.tsx', appCode, 'utf8');
console.log('Finished updating ConverterApp.tsx');
