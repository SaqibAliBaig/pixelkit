const fs = require('fs');
let code = fs.readFileSync('src/components/converter/islands/ConverterApp.tsx', 'utf8');

// 1. Add syncSidebarToSelectedJob before selectJob
const oldSelectJob = `function selectJob(jobId: string | null, scrollIntoView = false): void {
    // If clicking the already selected photo, deselect it!
    if (jobId === selectedJobId) {
      selectedJobId = null;
    } else {
      selectedJobId = jobId;
    }

    // Update active highlight on all file item cards
    activeFileList.querySelectorAll<HTMLElement>('.pk-file-item').forEach((n) => {
      const isSelected = selectedJobId !== null && n.dataset.id === selectedJobId;
      n.classList.toggle('border-accent', isSelected);
      n.classList.toggle('ring-1', isSelected);
      n.classList.toggle('ring-accent/40', isSelected);
      n.classList.toggle('bg-accent/5', isSelected);
      n.classList.toggle('border-border', !isSelected);
      n.classList.toggle('bg-surface/90', !isSelected);

      const selBadge = n.querySelector('.pk-file-selected-badge');
      if (selBadge) selBadge.classList.toggle('hidden', !isSelected);

      if (isSelected && scrollIntoView) {
        n.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    updateActivePhotoBar();
  }`;

const newSelectJobWithSync = `function syncSidebarToSelectedJob(job: FileJob | null): void {
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
  }

  function selectJob(jobId: string | null, scrollIntoView = false): void {
    // If clicking the already selected photo, deselect it!
    if (jobId === selectedJobId) {
      selectedJobId = null;
    } else {
      selectedJobId = jobId;
    }

    // Update active highlight on all file item cards
    activeFileList.querySelectorAll<HTMLElement>('.pk-file-item').forEach((n) => {
      const isSelected = selectedJobId !== null && n.dataset.id === selectedJobId;
      n.classList.toggle('border-accent', isSelected);
      n.classList.toggle('ring-1', isSelected);
      n.classList.toggle('ring-accent/40', isSelected);
      n.classList.toggle('bg-accent/5', isSelected);
      n.classList.toggle('border-border', !isSelected);
      n.classList.toggle('bg-surface/90', !isSelected);

      const selBadge = n.querySelector('.pk-file-selected-badge');
      if (selBadge) selBadge.classList.toggle('hidden', !isSelected);

      if (isSelected && scrollIntoView) {
        n.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    const activeJob = selectedJobId ? state.jobs.find((j) => j.id === selectedJobId) || null : null;
    syncSidebarToSelectedJob(activeJob);
    updateActivePhotoBar();
  }`;

code = code.replace(oldSelectJob, newSelectJobWithSync);

// 2. In setScaleOption: if selectedJobId is present, apply ONLY to selected job!
const oldSetScaleOption = `async function setScaleOption(scale: string): Promise<void> {
    scaleBtns.forEach((btn) => {
      const isSelected = btn.dataset.scale === scale;
      btn.className = isSelected
        ? 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors bg-surface text-fg shadow-sm'
        : 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors text-muted hover:text-fg';
    });

    if (scale === 'custom') {
      state.scalePercent = null;
      customDimsContainer?.classList.remove('hidden');
      if (resizeHint) resizeHint.textContent = 'Custom (px)';
      updateCustomDimensions();
      await applyCustomDimensionsToJobs();
    } else {
      const pct = Number(scale);
      state.scalePercent = pct;
      customDimsContainer?.classList.add('hidden');
      if (resizeHint) {
        resizeHint.textContent = pct === 100 ? '100% (Original)' : \`\${pct}% Scale\`;
      }
      state.dimensions = pct === 100 ? { mode: 'original' } : { mode: 'custom', scalePercent: pct };
      await Promise.all(
        state.jobs.map(async (j) => {
          j.dimensions = state.dimensions.mode === 'original' ? { mode: 'original' } : { ...state.dimensions };
          if (j.status === 'done') j.status = 'queued';
          await generateJobAdjustedPreview(j);
        })
      );
      renderFiles();
      updateLiveDimensionsAndCardPreviews();
    }
  }`;

const newSetScaleOption = `async function setScaleOption(scale: string): Promise<void> {
    scaleBtns.forEach((btn) => {
      const isSelected = btn.dataset.scale === scale;
      btn.className = isSelected
        ? 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors bg-surface text-fg shadow-sm'
        : 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors text-muted hover:text-fg';
    });

    const dotResize = document.getElementById('pk-dot-resize');
    if (dotResize) {
      dotResize.className = scale !== '100'
        ? 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-accent ring-2 ring-accent/20 transition-all shrink-0'
        : 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-muted/40 transition-all shrink-0';
    }

    if (selectedJobId) {
      const targetJob = state.jobs.find((j) => j.id === selectedJobId);
      if (targetJob) {
        if (scale === 'custom') {
          targetJob.scalePercent = undefined;
          customDimsContainer?.classList.remove('hidden');
          if (resizeHint) resizeHint.textContent = 'Custom (px)';
          updateCustomDimensions();
          await applyCustomDimensionsToJobs();
        } else {
          const pct = Number(scale);
          targetJob.scalePercent = pct === 100 ? undefined : pct;
          targetJob.dimensions = pct === 100 ? { mode: 'original' } : { mode: 'custom', scalePercent: pct };
          customDimsContainer?.classList.add('hidden');
          if (resizeHint) {
            resizeHint.textContent = pct === 100 ? '100% (Original)' : \`\${pct}% Scale\`;
          }
          if (targetJob.status === 'done') targetJob.status = 'queued';
          await generateJobAdjustedPreview(targetJob);
        }
        renderFiles();
        updateLiveDimensionsAndCardPreviews();
        return;
      }
    }

    // If no single job selected, apply globally
    if (scale === 'custom') {
      state.scalePercent = null;
      customDimsContainer?.classList.remove('hidden');
      if (resizeHint) resizeHint.textContent = 'Custom (px)';
      updateCustomDimensions();
      await applyCustomDimensionsToJobs();
    } else {
      const pct = Number(scale);
      state.scalePercent = pct;
      customDimsContainer?.classList.add('hidden');
      if (resizeHint) {
        resizeHint.textContent = pct === 100 ? '100% (Original)' : \`\${pct}% Scale\`;
      }
      state.dimensions = pct === 100 ? { mode: 'original' } : { mode: 'custom', scalePercent: pct };
      await Promise.all(
        state.jobs.map(async (j) => {
          j.dimensions = state.dimensions.mode === 'original' ? { mode: 'original' } : { ...state.dimensions };
          j.scalePercent = pct === 100 ? undefined : pct;
          if (j.status === 'done') j.status = 'queued';
          await generateJobAdjustedPreview(j);
        })
      );
      renderFiles();
      updateLiveDimensionsAndCardPreviews();
    }
  }`;

code = code.replace(oldSetScaleOption, newSetScaleOption);

// 3. In cropAspectSelect: if selectedJobId is present, apply ONLY to selected job!
const oldCropAspectHandler = `cropAspectSelect?.addEventListener('change', async () => {
    state.cropAspect = (cropAspectSelect.value || 'original') as CropAspectPreset;
    syncCustomCropUi(state.cropAspect);
    await Promise.all(
      state.jobs.map(async (j) => {
        if (state.cropAspect === 'original') {
          j.cropAspect = 'original';
          j.customCropBox = undefined;
        } else {
          j.cropAspect = state.cropAspect;
        }
        await generateJobCroppedPreview(j);
      })
    );
    renderFiles();
    updateLiveDimensionsAndCardPreviews();
    const label = cropAspectSelect.options[cropAspectSelect.selectedIndex]?.text || state.cropAspect;
    setStatus(\`Crop preset: \${label}\`);
  });`;

const newCropAspectHandler = `cropAspectSelect?.addEventListener('change', async () => {
    const aspect = (cropAspectSelect.value || 'original') as CropAspectPreset;
    syncCustomCropUi(aspect);

    const dotCrop = document.getElementById('pk-dot-crop');
    if (dotCrop) {
      dotCrop.className = aspect !== 'original'
        ? 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-accent ring-2 ring-accent/20 transition-all shrink-0'
        : 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-muted/40 transition-all shrink-0';
    }

    if (selectedJobId) {
      const targetJob = state.jobs.find((j) => j.id === selectedJobId);
      if (targetJob) {
        if (aspect === 'original') {
          targetJob.cropAspect = 'original';
          targetJob.customCropBox = undefined;
        } else {
          targetJob.cropAspect = aspect;
        }
        if (targetJob.status === 'done') targetJob.status = 'queued';
        await generateJobCroppedPreview(targetJob);
        renderFiles();
        updateLiveDimensionsAndCardPreviews();
        const label = cropAspectSelect.options[cropAspectSelect.selectedIndex]?.text || aspect;
        setStatus(\`Crop preset for \${targetJob.file.name}: \${label}\`);
        return;
      }
    }

    // If no single job selected, apply globally
    state.cropAspect = aspect;
    await Promise.all(
      state.jobs.map(async (j) => {
        if (state.cropAspect === 'original') {
          j.cropAspect = 'original';
          j.customCropBox = undefined;
        } else {
          j.cropAspect = state.cropAspect;
        }
        if (j.status === 'done') j.status = 'queued';
        await generateJobCroppedPreview(j);
      })
    );
    renderFiles();
    updateLiveDimensionsAndCardPreviews();
    const label = cropAspectSelect.options[cropAspectSelect.selectedIndex]?.text || state.cropAspect;
    setStatus(\`Crop preset: \${label}\`);
  });`;

code = code.replace(oldCropAspectHandler, newCropAspectHandler);

// 4. Update applyToAllBtn to ensure it copies selected job's settings to all photos
const oldApplyToAll = `applyToAllBtn?.addEventListener('click', () => {
    const activeJob = state.jobs.find((j) => j.id === selectedJobId) || state.jobs[0];
    if (!activeJob) return;

    for (const job of state.jobs) {
      if (activeJob.cropAspect) job.cropAspect = activeJob.cropAspect;
      if (activeJob.cropAnchor) job.cropAnchor = activeJob.cropAnchor;
      if (activeJob.customCropBox) job.customCropBox = { ...activeJob.customCropBox };
      if (activeJob.dimensions) job.dimensions = { ...activeJob.dimensions };
      if (activeJob.scalePercent) job.scalePercent = activeJob.scalePercent;
    }

    renderFiles();
    updateLiveDimensionsAndCardPreviews();
    setStatus(\`Applied crop and resize settings across all \${state.jobs.length} photos.\`);
  });`;

const newApplyToAll = `applyToAllBtn?.addEventListener('click', async () => {
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

code = code.replace(oldApplyToAll, newApplyToAll);

// 5. Add document click listener to deselect when clicking outside
const docClickListener = `
  // Clicking outside deselects the active card
  document.addEventListener('click', (e) => {
    if (!selectedJobId) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('.pk-file-item') ||
      target.closest('#pk-panel-custom') ||
      target.closest('#pk-active-photo-bar') ||
      target.closest('#pk-crop-modal') ||
      target.closest('#pk-resize-modal') ||
      target.closest('#pk-compare-modal')
    ) {
      return;
    }
    selectJob(null);
  });
`;

// Insert docClickListener right before mountConverterApp ends (near updateButtons)
const lastLines = `  updateFormatUi();
  renderFiles();
  setToolMode(initialToolMode, false);
  updateButtons();
}`;

const newLastLines = `  updateFormatUi();
  renderFiles();
  setToolMode(initialToolMode, false);
  updateButtons();
  ${docClickListener}
}`;

code = code.replace(lastLines, newLastLines);

fs.writeFileSync('src/components/converter/islands/ConverterApp.tsx', code, 'utf8');
console.log('ConverterApp.tsx successfully updated with independent sync, click-outside deselect, and dot indicators!');
