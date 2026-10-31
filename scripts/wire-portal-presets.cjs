const fs = require('fs');

const path = 'src/components/converter/islands/ConverterApp.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add import
if (!code.includes("from '@lib/portal-presets';")) {
  code = code.replace(
    "import { ASPECT_RATIOS } from '@lib/worker/adjustments';",
    "import { ASPECT_RATIOS } from '@lib/worker/adjustments';\nimport { PORTAL_PRESETS, type PortalPreset } from '@lib/portal-presets';"
  );
}

// 2. Add portalPreset to State interface
if (!code.includes("portalPreset: string | null;")) {
  code = code.replace(
    "stripTransparency: boolean;\n}",
    "stripTransparency: boolean;\n  portalPreset: string | null;\n}"
  );
  // CRLF check
  code = code.replace(
    "stripTransparency: boolean;\r\n}",
    "stripTransparency: boolean;\r\n  portalPreset: string | null;\r\n}"
  );
}

// 3. Add portalPreset to initial state
if (!code.includes("portalPreset: null,")) {
  code = code.replace(
    "stripTransparency: true,\n  };",
    "stripTransparency: true,\n    portalPreset: null,\n  };"
  );
  // CRLF check
  code = code.replace(
    "stripTransparency: true,\r\n  };",
    "stripTransparency: true,\r\n    portalPreset: null,\r\n  };"
  );
}

// 4. Add element references
const portalRefs = `
  // Portal & Visa Presets Elements
  const portalPresetTrigger = document.getElementById('pk-portal-preset-trigger') as HTMLButtonElement | null;
  const portalPresetMenu = document.getElementById('pk-portal-preset-menu');
  const portalPresetChevron = document.getElementById('pk-portal-preset-chevron');
  const selectedPortalFlag = document.getElementById('pk-selected-portal-flag');
  const selectedPortalTitle = document.getElementById('pk-selected-portal-title');
  const selectedPortalDesc = document.getElementById('pk-selected-portal-desc');
  const portalPresetReset = document.getElementById('pk-portal-preset-reset');
  const portalAppliedSummary = document.getElementById('pk-portal-applied-summary');
  const portalPresetOptions = document.querySelectorAll<HTMLButtonElement>('.pk-portal-preset-option');
  const quickPortalChips = document.querySelectorAll<HTMLButtonElement>('.pk-quick-portal-chip');
`;

if (!code.includes('pk-portal-preset-trigger')) {
  code = code.replace(
    "const customEquivTag = document.getElementById('pk-custom-equiv-tag');",
    "const customEquivTag = document.getElementById('pk-custom-equiv-tag');\n" + portalRefs
  );
}

// 5. Add syncPortalPresetUi and applyPortalPreset functions
const portalFunctions = `
  function syncPortalPresetUi(id: string): void {
    const preset = PORTAL_PRESETS.find((p) => p.id === id) || PORTAL_PRESETS[0];
    const isNone = preset.id === 'none';

    portalPresetOptions.forEach((opt) => {
      const optId = opt.dataset.id || 'none';
      const isSelected = optId === preset.id;
      opt.setAttribute('aria-selected', String(isSelected));
      if (isSelected) {
        opt.className =
          'pk-portal-preset-option group flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer bg-accent/10 border border-accent/30';
      } else {
        opt.className =
          'pk-portal-preset-option group flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer hover:bg-bg/80 border border-transparent';
      }
      const check = opt.querySelector('.pk-portal-check');
      if (check) {
        check.classList.toggle('hidden', !isSelected);
      }
    });

    // Update Quick Chips
    quickPortalChips.forEach((chip) => {
      const chipId = chip.dataset.id;
      const isMatch = chipId === preset.id;
      if (isMatch) {
        chip.className =
          'pk-quick-portal-chip text-[11px] font-bold px-2.5 py-1 rounded-lg border border-accent bg-accent/15 text-accent whitespace-nowrap cursor-pointer transition-colors shadow-xs';
      } else {
        chip.className =
          'pk-quick-portal-chip text-[11px] font-medium px-2 py-1 rounded-lg border border-border bg-surface hover:border-accent/40 text-fg whitespace-nowrap cursor-pointer transition-colors';
      }
    });

    if (selectedPortalFlag) selectedPortalFlag.textContent = preset.flag;
    if (selectedPortalTitle) selectedPortalTitle.textContent = isNone ? 'Select Portal / Visa Preset…' : preset.name;
    if (selectedPortalDesc) {
      selectedPortalDesc.textContent = isNone
        ? 'Auto crop, dimensions & exact KB limit'
        : \`\${preset.dimLabel} · Max \${preset.targetKb} KB JPG\`;
    }

    if (portalPresetReset) {
      portalPresetReset.classList.toggle('hidden', isNone);
    }

    if (portalAppliedSummary) {
      if (!isNone && preset.portalSummary) {
        portalAppliedSummary.textContent = \`✓ \${preset.dimLabel} (\${preset.cropAspect} crop) · Max \${preset.targetKb} KB JPG — \${preset.portalSummary}\`;
        portalAppliedSummary.classList.remove('hidden');
      } else {
        portalAppliedSummary.classList.add('hidden');
      }
    }
  }

  function applyPortalPreset(id: string): void {
    const preset = PORTAL_PRESETS.find((p) => p.id === id);
    if (!preset || preset.id === 'none') {
      state.portalPreset = null;
      syncPortalPresetUi('none');
      setStatus('Switched to manual conversion controls.');
      return;
    }

    state.portalPreset = preset.id;

    // 1. Output Format -> JPG
    state.to = 'jpg';
    state.toMime = 'image/jpeg';
    if (outputSelect) {
      outputSelect.value = 'jpg';
    }
    syncCustomFormatUi('jpg');

    // 2. Target KB & Mode -> Max Size preset.targetKb
    state.targetKb = preset.targetKb;
    state.targetSizeMode = 'max';
    state.maxKb = preset.targetKb;
    if (targetSelect) {
      targetSelect.value = String(preset.targetKb);
    }
    syncCustomTargetUi(String(preset.targetKb));
    setSizeMode('max');

    // 3. Crop Aspect & Anchor -> preset.cropAspect, preset.cropAnchor
    state.cropAspect = preset.cropAspect;
    state.cropAnchor = preset.cropAnchor;
    if (cropAspectSelect) {
      cropAspectSelect.value = preset.cropAspect;
    }
    syncCustomCropUi(preset.cropAspect);

    // 4. Dimensions -> Exact pixel bounding dimensions with cover fit
    state.dimensions = {
      mode: 'custom',
      width: preset.width ?? undefined,
      height: preset.height ?? undefined,
      fit: 'cover',
      lockAspectRatio: false,
    };

    // 5. Apply to all loaded jobs
    state.jobs.forEach((j) => {
      j.cropAspect = preset.cropAspect;
      j.cropAnchor = preset.cropAnchor;
      j.customCropBox = undefined;
      j.dimensions = {
        mode: 'custom',
        width: preset.width ?? undefined,
        height: preset.height ?? undefined,
        fit: 'cover',
        lockAspectRatio: false,
      };
    });

    syncPortalPresetUi(preset.id);
    renderFiles();
    updateLiveDimensionsAndCardPreviews();
    updateButtons();
    setStatus(\`Applied \${preset.flag} \${preset.name}: \${preset.dimLabel}, Max \${preset.targetKb} KB JPG\`);
  }
`;

if (!code.includes('function syncPortalPresetUi')) {
  code = code.replace(
    'function syncCustomFormatUi(toVal: string): void {',
    portalFunctions + '\n  function syncCustomFormatUi(toVal: string): void {'
  );
}

// 6. Add to closeAllCustomDropdowns
if (!code.includes('portalPresetMenu.classList.add(\'hidden\');')) {
  code = code.replace(
    "if (customTargetChevron) {\n      customTargetChevron.classList.remove('rotate-180');\n    }",
    "if (customTargetChevron) {\n      customTargetChevron.classList.remove('rotate-180');\n    }\n    if (portalPresetMenu) {\n      portalPresetMenu.classList.add('hidden');\n    }\n    if (portalPresetTrigger) {\n      portalPresetTrigger.setAttribute('aria-expanded', 'false');\n    }\n    if (portalPresetChevron) {\n      portalPresetChevron.classList.remove('rotate-180');\n    }"
  );
  // CRLF check
  code = code.replace(
    "if (customTargetChevron) {\r\n      customTargetChevron.classList.remove('rotate-180');\r\n    }",
    "if (customTargetChevron) {\r\n      customTargetChevron.classList.remove('rotate-180');\r\n    }\r\n    if (portalPresetMenu) {\r\n      portalPresetMenu.classList.add('hidden');\r\n    }\r\n    if (portalPresetTrigger) {\r\n      portalPresetTrigger.setAttribute('aria-expanded', 'false');\r\n    }\r\n    if (portalPresetChevron) {\r\n      portalPresetChevron.classList.remove('rotate-180');\r\n    }"
  );
}

// 7. Add event listeners for portal preset dropdown & chips
const portalListeners = `
  // Toggle Portal Presets dropdown menu
  portalPresetTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isClosed = portalPresetMenu?.classList.contains('hidden');
    closeAllCustomDropdowns();
    if (isClosed && portalPresetMenu) {
      portalPresetMenu.classList.remove('hidden');
      portalPresetTrigger.setAttribute('aria-expanded', 'true');
      portalPresetChevron?.classList.add('rotate-180');
    }
  });

  // Select Portal Preset option from menu
  portalPresetOptions.forEach((opt) => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = opt.dataset.id;
      if (id) {
        applyPortalPreset(id);
      }
      closeAllCustomDropdowns();
      portalPresetTrigger?.focus();
    });
  });

  // Quick Portal Chips (1-tap selection)
  quickPortalChips.forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const id = chip.dataset.id;
      if (id) {
        applyPortalPreset(id);
      }
    });
  });

  // Reset to manual controls
  portalPresetReset?.addEventListener('click', (e) => {
    e.preventDefault();
    applyPortalPreset('none');
  });
`;

if (!code.includes('Toggle Portal Presets dropdown menu')) {
  code = code.replace(
    "// Toggle Output Format dropdown menu",
    portalListeners + "\n  // Toggle Output Format dropdown menu"
  );
}

// 8. Add outside click exception for portalPresetWrapper
if (!code.includes("!target?.closest('#pk-portal-preset-wrapper')")) {
  code = code.replace(
    "!target?.closest('#pk-output-format-wrapper') &&",
    "!target?.closest('#pk-portal-preset-wrapper') &&\n      !target?.closest('#pk-output-format-wrapper') &&"
  );
}

fs.writeFileSync(path, code, 'utf8');
console.log('Successfully wired up Portal Presets in ConverterApp.tsx');
