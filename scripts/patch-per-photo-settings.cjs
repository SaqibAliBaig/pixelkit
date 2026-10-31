const fs = require('fs');
let code = fs.readFileSync('src/components/converter/islands/ConverterApp.tsx', 'utf8');

// 1. Add per-job format and target options to FileJob interface
const oldFileJob = `interface FileJob {
  id: string;
  file: File;
  status: Status;
  result?: Blob;
  resultName?: string;
  error?: string;
  targetKb: number | null;
  targetOptions?: TargetSizeOptions;`;

const newFileJob = `interface FileJob {
  id: string;
  file: File;
  status: Status;
  result?: Blob;
  resultName?: string;
  error?: string;
  to?: string;
  toMime?: string;
  targetKb: number | null;
  targetSizeMode?: SizeControlMode;
  quality?: number;
  minKb?: number | null;
  maxKb?: number | null;
  targetOptions?: TargetSizeOptions;`;

code = code.replace(oldFileJob, newFileJob);

// 2. Replace updateStageDots with full per-photo dynamic logic
const oldUpdateStageDots = `  function updateStageDots(): void {
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
  }`;

const newUpdateStageDots = `  function updateStageDots(): void {
    const dotFormat = document.getElementById('pk-dot-format');
    const dotCompress = document.getElementById('pk-dot-compress');
    const dotCrop = document.getElementById('pk-dot-crop');
    const dotResize = document.getElementById('pk-dot-resize');

    const DOT_ACTIVE = 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-accent ring-2 ring-accent/25 transition-all shrink-0';
    const DOT_INACTIVE = 'pk-stage-dot inline-block h-2 w-2 rounded-full border-2 border-border/90 bg-surface transition-all shrink-0';

    const activeJob = selectedJobId ? state.jobs.find((j) => j.id === selectedJobId) : null;
    const defaultTo = (root.dataset.to || 'jpg').toLowerCase();

    // 1. Output Format Dot: enabled when a custom format is applied
    if (dotFormat) {
      let isFormatActive = false;
      if (currentToolMode === 'convert') {
        isFormatActive = true;
      } else if (activeJob) {
        isFormatActive = Boolean(activeJob.to && activeJob.to.toLowerCase() !== defaultTo);
      } else {
        isFormatActive = Boolean(state.to && state.to.toLowerCase() !== defaultTo);
      }
      dotFormat.className = isFormatActive ? DOT_ACTIVE : DOT_INACTIVE;
    }

    // 2. Compression Dot: enabled when target size limit or quality < 1.0 is applied
    if (dotCompress) {
      let isCompressActive = false;
      if (currentToolMode === 'compress') {
        isCompressActive = true;
      } else if (activeJob) {
        isCompressActive = activeJob.targetKb !== undefined && activeJob.targetKb !== null;
      } else {
        isCompressActive = Boolean(state.targetKb) || (typeof state.quality === 'number' && state.quality < 1.0);
      }
      dotCompress.className = isCompressActive ? DOT_ACTIVE : DOT_INACTIVE;
    }

    // 3. Crop Dot: enabled when aspect ratio is not original or custom box
    if (dotCrop) {
      let isCropActive = false;
      if (currentToolMode === 'crop') {
        isCropActive = true;
      } else if (activeJob) {
        isCropActive = (Boolean(activeJob.cropAspect) && activeJob.cropAspect !== 'original') || Boolean(activeJob.customCropBox);
      } else {
        isCropActive = Boolean(state.cropAspect) && state.cropAspect !== 'original';
      }
      dotCrop.className = isCropActive ? DOT_ACTIVE : DOT_INACTIVE;
    }

    // 4. Resize Dot: enabled when scale is not 100% or custom dimensions
    if (dotResize) {
      let isResizeActive = false;
      if (currentToolMode === 'resize') {
        isResizeActive = true;
      } else if (activeJob) {
        const scale = activeJob.scalePercent;
        const dims = activeJob.dimensions;
        isResizeActive = (scale !== undefined && scale !== null && scale !== 100) || (dims?.mode === 'custom');
      } else {
        const scale = state.scalePercent;
        const dims = state.dimensions;
        isResizeActive = (scale !== undefined && scale !== null && scale !== 100) || (dims?.mode === 'custom');
      }
      dotResize.className = isResizeActive ? DOT_ACTIVE : DOT_INACTIVE;
    }
  }`;

code = code.replace(oldUpdateStageDots, newUpdateStageDots);

// 3. Update syncSidebarToSelectedJob to synchronize Output Format and Target Size to selected job
const oldSyncSidebar = `function syncSidebarToSelectedJob(job: FileJob | null): void {
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

const newSyncSidebar = `function syncSidebarToSelectedJob(job: FileJob | null): void {
    const defaultTo = root.dataset.to || 'jpg';
    if (job) {
      // 1. Output Format: sync to this specific job (or default)
      const jobTo = job.to || defaultTo;
      if (outputSelect) outputSelect.value = jobTo;
      syncCustomFormatUi(jobTo);

      // 2. Compression & Target Size: sync to this specific job (or default)
      const jobKbStr = job.targetKb !== undefined && job.targetKb !== null ? String(job.targetKb) : '';
      if (targetSelect) targetSelect.value = jobKbStr;
      syncCustomTargetUi(jobKbStr);
      updateTargetLabel();

      // 3. Crop UI: sync to this specific job
      const aspect = job.cropAspect || 'original';
      if (cropAspectSelect) cropAspectSelect.value = aspect;
      syncCustomCropUi(aspect);

      // 4. Scale / resize UI: sync to this specific job
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
    } else {
      // Return to global batch settings
      const globalTo = state.to || defaultTo;
      if (outputSelect) outputSelect.value = globalTo;
      syncCustomFormatUi(globalTo);

      const globalKbStr = state.targetKb !== null && state.targetKb !== undefined ? String(state.targetKb) : '';
      if (targetSelect) targetSelect.value = globalKbStr;
      syncCustomTargetUi(globalKbStr);
      updateTargetLabel();

      const aspect = state.cropAspect || 'original';
      if (cropAspectSelect) cropAspectSelect.value = aspect;
      syncCustomCropUi(aspect);

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
    }
    updateStageDots();
  }`;

code = code.replace(oldSyncSidebar, newSyncSidebar);

// 4. In customFormatOptions listener and outputSelect change listener: scope to selectedJobId
const oldFormatOptionClick = `    opt.addEventListener('click', () => {
      const val = opt.dataset.value;
      if (val) {
        if (outputSelect) {
          outputSelect.value = val;
          outputSelect.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          state.to = val;
          state.toMime = mimeForExtension(val) || \`image/\${val}\`;
          updateFormatUi();
          updateButtons();
          setStatus(\`Target output set to \${val.toUpperCase()}\`);
        }
      }
      closeAllCustomDropdowns();
      customFormatTrigger?.focus();
    });`;

const newFormatOptionClick = `    opt.addEventListener('click', () => {
      const val = opt.dataset.value;
      if (val) {
        if (selectedJobId) {
          const targetJob = state.jobs.find((j) => j.id === selectedJobId);
          if (targetJob) {
            targetJob.to = val;
            targetJob.toMime = mimeForExtension(val) || \`image/\${val}\`;
            if (targetJob.status === 'done') targetJob.status = 'queued';
            syncCustomFormatUi(val);
            renderFiles();
            updateLiveDimensionsAndCardPreviews();
            updateStageDots();
            closeAllCustomDropdowns();
            customFormatTrigger?.focus();
            setStatus(\`Format for \${targetJob.file.name}: \${val.toUpperCase()}\`);
            return;
          }
        }
        if (outputSelect) {
          outputSelect.value = val;
          outputSelect.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          state.to = val;
          state.toMime = mimeForExtension(val) || \`image/\${val}\`;
          updateFormatUi();
          updateButtons();
          updateStageDots();
          setStatus(\`Target output set to \${val.toUpperCase()}\`);
        }
      }
      closeAllCustomDropdowns();
      customFormatTrigger?.focus();
    });`;

code = code.replace(oldFormatOptionClick, newFormatOptionClick);

const oldOutputSelectChange = `  outputSelect?.addEventListener('change', () => {
    const val = outputSelect.value;
    state.to = val;
    state.toMime = mimeForExtension(val) || \`image/\${val}\`;
    updateFormatUi();
    updateButtons();
    setStatus(\`Target output set to \${val.toUpperCase()}\`);
  });`;

const newOutputSelectChange = `  outputSelect?.addEventListener('change', () => {
    const val = outputSelect.value;
    if (selectedJobId) {
      const targetJob = state.jobs.find((j) => j.id === selectedJobId);
      if (targetJob) {
        targetJob.to = val;
        targetJob.toMime = mimeForExtension(val) || \`image/\${val}\`;
        if (targetJob.status === 'done') targetJob.status = 'queued';
        syncCustomFormatUi(val);
        renderFiles();
        updateLiveDimensionsAndCardPreviews();
        updateStageDots();
        setStatus(\`Format for \${targetJob.file.name}: \${val.toUpperCase()}\`);
        return;
      }
    }
    state.to = val;
    state.toMime = mimeForExtension(val) || \`image/\${val}\`;
    updateFormatUi();
    updateButtons();
    updateStageDots();
    setStatus(\`Target output set to \${val.toUpperCase()}\`);
  });`;

code = code.replace(oldOutputSelectChange, newOutputSelectChange);

// 5. In customTargetOptions listener and targetSelect listener: scope to selectedJobId
const oldTargetOptionClick = `  // Select Target Size option
  customTargetOptions.forEach((opt) => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = opt.dataset.value ?? '';
      if (targetSelect) {
        targetSelect.value = val;
        targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      closeAllCustomDropdowns();
      customTargetTrigger?.focus();
    });
  });`;

const newTargetOptionClick = `  // Select Target Size option
  customTargetOptions.forEach((opt) => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = opt.dataset.value ?? '';
      if (selectedJobId) {
        const targetJob = state.jobs.find((j) => j.id === selectedJobId);
        if (targetJob) {
          if (val === 'custom') {
            targetJob.targetKb = null;
            customKbContainer?.classList.remove('hidden');
          } else {
            customKbContainer?.classList.add('hidden');
            targetJob.targetKb = val ? Number(val) : null;
            targetJob.targetSizeMode = state.targetSizeMode === 'exact' ? 'exact' : 'max';
            targetJob.maxKb = targetJob.targetKb;
          }
          if (targetJob.status === 'done') targetJob.status = 'queued';
          syncCustomTargetUi(val);
          updateTargetLabel();
          renderFiles();
          updateLiveDimensionsAndCardPreviews();
          updateStageDots();
          closeAllCustomDropdowns();
          customTargetTrigger?.focus();
          setStatus(val ? \`Target size for \${targetJob.file.name}: \${formatSizeLabel(Number(val))}\` : \`Quality for \${targetJob.file.name}: Best quality (no limit)\`);
          return;
        }
      }
      if (targetSelect) {
        targetSelect.value = val;
        targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      closeAllCustomDropdowns();
      customTargetTrigger?.focus();
    });
  });`;

code = code.replace(oldTargetOptionClick, newTargetOptionClick);

const oldTargetSelectChange = `  targetSelect?.addEventListener('change', () => {
    const v = targetSelect.value;
    if (state.targetSizeMode === 'exact') {
      savedExactTargetValue = v;
    } else if (state.targetSizeMode === 'max') {
      savedMaxTargetValue = v;
    }
    qualityContainer?.classList.add('hidden');
    if (v === 'custom') {
      customKbContainer?.classList.remove('hidden');
      updateCustomTargetFromInput();
    } else {
      customKbContainer?.classList.add('hidden');
      state.targetKb = v ? Number(v) : null;
    }
    syncCustomTargetUi(v);
    updateTargetLabel();
  });`;

const newTargetSelectChange = `  targetSelect?.addEventListener('change', () => {
    const v = targetSelect.value;
    if (selectedJobId) {
      const targetJob = state.jobs.find((j) => j.id === selectedJobId);
      if (targetJob) {
        if (v === 'custom') {
          customKbContainer?.classList.remove('hidden');
        } else {
          customKbContainer?.classList.add('hidden');
          targetJob.targetKb = v ? Number(v) : null;
          targetJob.targetSizeMode = state.targetSizeMode === 'exact' ? 'exact' : 'max';
          targetJob.maxKb = targetJob.targetKb;
        }
        if (targetJob.status === 'done') targetJob.status = 'queued';
        syncCustomTargetUi(v);
        updateTargetLabel();
        renderFiles();
        updateLiveDimensionsAndCardPreviews();
        updateStageDots();
        return;
      }
    }
    if (state.targetSizeMode === 'exact') {
      savedExactTargetValue = v;
    } else if (state.targetSizeMode === 'max') {
      savedMaxTargetValue = v;
    }
    qualityContainer?.classList.add('hidden');
    if (v === 'custom') {
      customKbContainer?.classList.remove('hidden');
      updateCustomTargetFromInput();
    } else {
      customKbContainer?.classList.add('hidden');
      state.targetKb = v ? Number(v) : null;
    }
    syncCustomTargetUi(v);
    updateTargetLabel();
    renderFiles();
    updateLiveDimensionsAndCardPreviews();
    updateStageDots();
  });`;

code = code.replace(oldTargetSelectChange, newTargetSelectChange);

// 6. Update updateTargetLabel to read selected job's targetKb
const oldUpdateTargetLabel = `  function updateTargetLabel(): void {
    if (!targetValue) return;
    if (state.targetSizeMode === 'quality') {
      targetValue.textContent = \`Quality \${Math.round(state.quality * 100)}%\`;
    } else if (state.targetSizeMode === 'range') {
      const min = state.minKb ? formatSizeLabel(state.minKb) : '0';
      const max = state.maxKb ? formatSizeLabel(state.maxKb) : 'Any';
      targetValue.textContent = \`Range: \${min}–\${max}\`;
    } else if (state.targetKb) {
      const prefix = state.targetSizeMode === 'exact' ? 'Exact ' : 'Max ';
      targetValue.textContent = \`\${prefix}\${formatSizeLabel(state.targetKb)}\`;
    } else {
      targetValue.textContent = 'Best quality (no limit)';
    }
    updateStageDots();
  }`;

const newUpdateTargetLabel = `  function updateTargetLabel(): void {
    if (!targetValue) return;
    const activeJob = selectedJobId ? state.jobs.find((j) => j.id === selectedJobId) : null;
    const currentTargetKb = activeJob ? activeJob.targetKb : state.targetKb;
    const currentSizeMode = activeJob?.targetSizeMode || state.targetSizeMode;
    const currentQuality = activeJob?.quality ?? state.quality;

    if (currentSizeMode === 'quality') {
      targetValue.textContent = \`Quality \${Math.round(currentQuality * 100)}%\`;
    } else if (currentSizeMode === 'range') {
      const min = state.minKb ? formatSizeLabel(state.minKb) : '0';
      const max = state.maxKb ? formatSizeLabel(state.maxKb) : 'Any';
      targetValue.textContent = \`Range: \${min}–\${max}\`;
    } else if (currentTargetKb) {
      const prefix = currentSizeMode === 'exact' ? 'Exact ' : 'Max ';
      targetValue.textContent = \`\${prefix}\${formatSizeLabel(currentTargetKb)}\`;
    } else {
      targetValue.textContent = 'Best quality (no limit)';
    }
    updateStageDots();
  }`;

code = code.replace(oldUpdateTargetLabel, newUpdateTargetLabel);

// 7. Update applyToAllBtn to copy ALL settings (to, targetKb, crop, resize, orientation)
const oldApplyToAll = `applyToAllBtn?.addEventListener('click', async () => {
    const activeJob = state.jobs.find((j) => j.id === selectedJobId);
    if (!activeJob) return;

    for (const job of state.jobs) {
      if (job.id === activeJob.id) continue;
      job.cropAspect = activeJob.cropAspect;
      job.cropAnchor = activeJob.cropAnchor;
      job.customCropBox = activeJob.customCropBox ? { ...activeJob.customCropBox } : undefined;
      job.dimensions = activeJob.dimensions ? { ...activeJob.dimensions } : undefined;
      job.scalePercent = activeJob.scalePercent;
      if (job.status === 'done') job.status = 'queued';
      await generateJobCroppedPreview(job);
      await generateJobAdjustedPreview(job);
    }

    renderFiles();
    updateLiveDimensionsAndCardPreviews();
    setStatus(\`Applied crop & resize from \${activeJob.file.name} to all \${state.jobs.length} photos.\`);
  });`;

const newApplyToAll = `applyToAllBtn?.addEventListener('click', async () => {
    const activeJob = state.jobs.find((j) => j.id === selectedJobId);
    if (!activeJob) return;

    for (const job of state.jobs) {
      if (job.id === activeJob.id) continue;
      job.to = activeJob.to;
      job.toMime = activeJob.toMime;
      job.targetKb = activeJob.targetKb;
      job.targetSizeMode = activeJob.targetSizeMode;
      job.quality = activeJob.quality;
      job.minKb = activeJob.minKb;
      job.maxKb = activeJob.maxKb;
      job.cropAspect = activeJob.cropAspect;
      job.cropAnchor = activeJob.cropAnchor;
      job.customCropBox = activeJob.customCropBox ? { ...activeJob.customCropBox } : undefined;
      job.dimensions = activeJob.dimensions ? { ...activeJob.dimensions } : undefined;
      job.scalePercent = activeJob.scalePercent;
      job.rotate = activeJob.rotate;
      job.flipH = activeJob.flipH;
      job.grayscale = activeJob.grayscale;
      if (job.status === 'done') job.status = 'queued';
      await generateJobCroppedPreview(job);
      await generateJobAdjustedPreview(job);
    }

    renderFiles();
    updateLiveDimensionsAndCardPreviews();
    updateStageDots();

    const originalText = applyToAllBtn.innerHTML;
    applyToAllBtn.innerHTML = '<span>Applied to All Photos ✓</span>';
    applyToAllBtn.classList.add('text-success');
    setTimeout(() => {
      applyToAllBtn.innerHTML = originalText;
      applyToAllBtn.classList.remove('text-success');
    }, 1800);

    setStatus(\`Applied format, compression, crop & resize from \${activeJob.file.name} to all \${state.jobs.length} photos.\`);
  });`;

code = code.replace(oldApplyToAll, newApplyToAll);

// 8. In startConversion: read each job's own targetExt, targetMime, and targetKb
const oldStartConversionReq = `      // When merging to a single multi-page PDF, encode each page to JPEG first so jsPDF can embed valid images!
      const targetMime = isMergePdf ? 'image/jpeg' : state.toMime;
      const targetExt = isMergePdf ? 'jpg' : state.to;

      // Build target options
      const targetOpts: TargetSizeOptions = {
        mode: state.targetSizeMode === 'quality' ? 'max' : state.targetSizeMode,
        targetKb: state.targetSizeMode === 'quality' ? null : state.targetKb,
        minKb: state.minKb,
        maxKb: state.maxKb,
      };

      const req: ConvertRequest = {
        id: job.id,
        from: fromExt,
        to: targetExt,
        fromMime: fileMime,
        toMime: targetMime,
        targetKb: state.targetSizeMode === 'quality' ? null : state.targetKb,`;

const newStartConversionReq = `      // When merging to a single multi-page PDF, encode each page to JPEG first so jsPDF can embed valid images!
      const targetExt = isMergePdf ? 'jpg' : (job.to || state.to);
      const targetMime = isMergePdf ? 'image/jpeg' : (job.toMime || mimeForExtension(targetExt) || state.toMime);
      const jobTargetKb = job.targetKb !== undefined ? job.targetKb : (state.targetSizeMode === 'quality' ? null : state.targetKb);
      const jobSizeMode = job.targetSizeMode || state.targetSizeMode;

      // Build target options
      const targetOpts: TargetSizeOptions = {
        mode: jobSizeMode === 'quality' ? 'max' : jobSizeMode,
        targetKb: jobSizeMode === 'quality' ? null : jobTargetKb,
        minKb: job.minKb ?? state.minKb,
        maxKb: job.maxKb ?? state.maxKb,
      };

      const req: ConvertRequest = {
        id: job.id,
        from: fromExt,
        to: targetExt,
        fromMime: fileMime,
        toMime: targetMime,
        targetKb: jobSizeMode === 'quality' ? null : jobTargetKb,`;

code = code.replace(oldStartConversionReq, newStartConversionReq);

// 9. In updateLiveDimensionsAndCardPreviews: display custom format & target size in card predicted text
const oldLiveDimsNote = `          const noteStr = notes.length ? \` · \${notes.join(' · ')}\` : '';
          liveDimsEl.textContent = \`Target: \${pred.w} × \${pred.h} px\${noteStr}\`;`;

const newLiveDimsNote = `          const defaultTo = (root.dataset.to || 'jpg').toUpperCase();
          const jobTo = (job.to || state.to).toUpperCase();
          if (job.to && job.to.toUpperCase() !== defaultTo) {
            notes.unshift(\`➔ \${jobTo}\`);
          }
          if (job.targetKb) {
            notes.push(\`Max \${formatSizeLabel(job.targetKb)}\`);
          }
          const noteStr = notes.length ? \` · \${notes.join(' · ')}\` : '';
          liveDimsEl.textContent = \`Target: \${pred.w} × \${pred.h} px\${noteStr}\`;`;

code = code.replace(oldLiveDimsNote, newLiveDimsNote);

fs.writeFileSync('src/components/converter/islands/ConverterApp.tsx', code, 'utf8');
console.log('Successfully patched ConverterApp.tsx with complete per-photo settings isolation and dynamic stage dots!');
