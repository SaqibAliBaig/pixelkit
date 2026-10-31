const fs = require('fs');
let code = fs.readFileSync('src/components/converter/islands/ConverterApp.tsx', 'utf8');

// 1. Add updateStageDots function definition
const stageDotsFunc = `
  function updateStageDots(): void {
    const dotFormat = document.getElementById('pk-dot-format');
    const dotCompress = document.getElementById('pk-dot-compress');
    const dotCrop = document.getElementById('pk-dot-crop');
    const dotResize = document.getElementById('pk-dot-resize');

    const DOT_ACTIVE = 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-accent ring-2 ring-accent/25 transition-all shrink-0';
    const DOT_INACTIVE = 'pk-stage-dot inline-block h-2 w-2 rounded-full border-2 border-border/90 bg-surface transition-all shrink-0';

    const activeJob = selectedJobId ? state.jobs.find((j) => j.id === selectedJobId) : null;

    if (dotFormat) {
      const isFormatActive = currentToolMode === 'convert' || currentToolMode === 'all' || Boolean(state.to);
      dotFormat.className = isFormatActive ? DOT_ACTIVE : DOT_INACTIVE;
    }

    if (dotCompress) {
      const isCompressActive =
        currentToolMode === 'compress' ||
        Boolean(state.targetKb) ||
        (state.compressionMode && state.compressionMode !== 'max' && state.compressionMode !== 'quality') ||
        (typeof state.quality === 'number' && state.quality < 100);
      dotCompress.className = isCompressActive ? DOT_ACTIVE : DOT_INACTIVE;
    }

    if (dotCrop) {
      const jobAspect = activeJob ? activeJob.cropAspect : state.cropAspect;
      const hasCropBox = activeJob ? Boolean(activeJob.customCropBox) : false;
      const isCropActive =
        currentToolMode === 'crop' ||
        (Boolean(jobAspect) && jobAspect !== 'original') ||
        hasCropBox;
      dotCrop.className = isCropActive ? DOT_ACTIVE : DOT_INACTIVE;
    }

    if (dotResize) {
      const jobScale = activeJob ? activeJob.scalePercent : state.scalePercent;
      const jobDims = activeJob ? activeJob.dimensions : state.dimensions;
      const isResizeActive =
        currentToolMode === 'resize' ||
        (jobScale !== undefined && jobScale !== null && jobScale !== 100) ||
        (jobDims?.mode === 'custom');
      dotResize.className = isResizeActive ? DOT_ACTIVE : DOT_INACTIVE;
    }
  }
`;

// Insert updateStageDots right before syncSidebarToSelectedJob
code = code.replace('function syncSidebarToSelectedJob(job: FileJob | null): void {', `${stageDotsFunc}\n  function syncSidebarToSelectedJob(job: FileJob | null): void {`);

// 2. In setToolMode: update modeTabs classNames without flex/gap icons, and call updateStageDots()
const oldSetToolModeTabs = `    modeTabs.forEach((tab) => {
      const isSelected = tab.dataset.mode === mode;
      if (isSelected) {
        tab.className =
          'pk-mode-tab flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold bg-surface text-fg shadow-xs border border-border/40';
      } else {
        tab.className =
          'pk-mode-tab flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium text-muted hover:text-fg';
      }
    });`;

const newSetToolModeTabs = `    modeTabs.forEach((tab) => {
      const isSelected = tab.dataset.mode === mode;
      if (isSelected) {
        tab.className =
          'pk-mode-tab px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold bg-surface text-fg shadow-xs border border-border/50';
      } else {
        tab.className =
          'pk-mode-tab px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium text-muted hover:text-fg';
      }
    });`;

code = code.replace(oldSetToolModeTabs, newSetToolModeTabs);

// Add updateStageDots() call in setToolMode before updateButtons()
code = code.replace('updateMoreToolsToggle();\n    updateButtons();', 'updateMoreToolsToggle();\n    updateStageDots();\n    updateButtons();');

// 3. In updateTargetLabel: call updateStageDots()
code = code.replace(`    } else {
      targetValue.textContent = 'Best quality (no limit)';
    }
  }`, `    } else {
      targetValue.textContent = 'Best quality (no limit)';
    }
    updateStageDots();
  }`);

// 4. In cropAspectSelect listener: use updateStageDots()
code = code.replace(`    const dotCrop = document.getElementById('pk-dot-crop');
    if (dotCrop) {
      dotCrop.className = aspect !== 'original'
        ? 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-accent ring-2 ring-accent/20 transition-all shrink-0'
        : 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-muted/40 transition-all shrink-0';
    }`, `    updateStageDots();`);

// 5. In setScaleOption: use updateStageDots()
code = code.replace(`    const dotResize = document.getElementById('pk-dot-resize');
    if (dotResize) {
      dotResize.className = scale !== '100'
        ? 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-accent ring-2 ring-accent/20 transition-all shrink-0'
        : 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-muted/40 transition-all shrink-0';
    }`, `    updateStageDots();`);

// 6. In syncSidebarToSelectedJob: simplify and call updateStageDots()
const oldSyncSidebar = `function syncSidebarToSelectedJob(job: FileJob | null): void {
    const dotResize = document.getElementById('pk-dot-resize');
    const dotCrop = document.getElementById('pk-dot-crop');

    if (job) {
      // 1. Sync scale / resize UI to this specific job
      const scalePct = job.scalePercent ?? (job.dimensions?.scalePercent ?? (job.dimensions?.mode === 'custom' ? 'custom' : 100));
      const scaleStr = String(scalePct);
      scaleBtns.forEach((btn) => {
        const isSelected = btn.dataset.scale === scaleStr;
        btn.className = isSelected
          ? 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors bg-surface text-fg shadow-sm'
          : 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors text-muted hover:text-fg';
      });
      if (resizeHint) {
        resizeHint.textContent = scaleStr === '100' ? '100% (Original)' : (scaleStr === 'custom' ? 'Custom (px)' : \`\${scaleStr}% Scale\`);
      }
      if (dotResize) {
        const isCustomResize = scaleStr !== '100';
        dotResize.className = isCustomResize
          ? 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-accent ring-2 ring-accent/20 transition-all shrink-0'
          : 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-muted/40 transition-all shrink-0';
      }

      // 2. Sync crop UI to this specific job
      const aspect = job.cropAspect || 'original';
      if (cropAspectSelect) cropAspectSelect.value = aspect;
      syncCustomCropUi(aspect);
      if (dotCrop) {
        const isCustomCrop = aspect !== 'original' || Boolean(job.customCropBox);
        dotCrop.className = isCustomCrop
          ? 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-accent ring-2 ring-accent/20 transition-all shrink-0'
          : 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-muted/40 transition-all shrink-0';
      }
    } else {
      // Return to global batch settings
      const globalScale = state.scalePercent ?? 100;
      const scaleStr = String(globalScale);
      scaleBtns.forEach((btn) => {
        const isSelected = btn.dataset.scale === scaleStr;
        btn.className = isSelected
          ? 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors bg-surface text-fg shadow-sm'
          : 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors text-muted hover:text-fg';
      });
      if (resizeHint) {
        resizeHint.textContent = globalScale === 100 ? '100% (Original)' : \`\${globalScale}% Scale\`;
      }
      if (dotResize) {
        dotResize.className = globalScale !== 100
          ? 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-accent ring-2 ring-accent/20 transition-all shrink-0'
          : 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-muted/40 transition-all shrink-0';
      }

      const aspect = state.cropAspect || 'original';
      if (cropAspectSelect) cropAspectSelect.value = aspect;
      syncCustomCropUi(aspect);
      if (dotCrop) {
        dotCrop.className = aspect !== 'original'
          ? 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-accent ring-2 ring-accent/20 transition-all shrink-0'
          : 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-muted/40 transition-all shrink-0';
      }
    }
  }`;

const newSyncSidebar = `function syncSidebarToSelectedJob(job: FileJob | null): void {
    if (job) {
      // 1. Sync scale / resize UI to this specific job
      const scalePct = job.scalePercent ?? (job.dimensions?.scalePercent ?? (job.dimensions?.mode === 'custom' ? 'custom' : 100));
      const scaleStr = String(scalePct);
      scaleBtns.forEach((btn) => {
        const isSelected = btn.dataset.scale === scaleStr;
        btn.className = isSelected
          ? 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors bg-surface text-fg shadow-sm'
          : 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors text-muted hover:text-fg';
      });
      if (resizeHint) {
        resizeHint.textContent = scaleStr === '100' ? '100% (Original)' : (scaleStr === 'custom' ? 'Custom (px)' : \`\${scaleStr}% Scale\`);
      }

      // 2. Sync crop UI to this specific job
      const aspect = job.cropAspect || 'original';
      if (cropAspectSelect) cropAspectSelect.value = aspect;
      syncCustomCropUi(aspect);
    } else {
      // Return to global batch settings
      const globalScale = state.scalePercent ?? 100;
      const scaleStr = String(globalScale);
      scaleBtns.forEach((btn) => {
        const isSelected = btn.dataset.scale === scaleStr;
        btn.className = isSelected
          ? 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors bg-surface text-fg shadow-sm'
          : 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors text-muted hover:text-fg';
      });
      if (resizeHint) {
        resizeHint.textContent = globalScale === 100 ? '100% (Original)' : \`\${globalScale}% Scale\`;
      }

      const aspect = state.cropAspect || 'original';
      if (cropAspectSelect) cropAspectSelect.value = aspect;
      syncCustomCropUi(aspect);
    }
    updateStageDots();
  }`;

code = code.replace(oldSyncSidebar, newSyncSidebar);

// 7. Call updateStageDots() on mount initialization
code = code.replace('setToolMode(initialToolMode, false);\n  updateButtons();', 'setToolMode(initialToolMode, false);\n  updateButtons();\n  updateStageDots();');

fs.writeFileSync('src/components/converter/islands/ConverterApp.tsx', code, 'utf8');
console.log('Successfully patched ConverterApp.tsx with unified updateStageDots and clean nav styling!');
