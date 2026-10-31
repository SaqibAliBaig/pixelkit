const fs = require('fs');
let code = fs.readFileSync('src/components/converter/islands/ConverterApp.tsx', 'utf8');

// 1. Add element queries after settingsModeBadge
const targetQuery = "const settingsModeBadge = document.getElementById('pk-settings-mode-badge');";
const newQueries = `const settingsModeBadge = document.getElementById('pk-settings-mode-badge');

  // Active Photo Target Bar Elements
  const activePhotoBar = document.getElementById('pk-active-photo-bar');
  const activePhotoCounter = document.getElementById('pk-active-photo-counter');
  const activePhotoName = document.getElementById('pk-active-photo-name');
  const targetPrevBtn = document.getElementById('pk-target-prev-btn') as HTMLButtonElement | null;
  const targetNextBtn = document.getElementById('pk-target-next-btn') as HTMLButtonElement | null;
  const applyToAllBtn = document.getElementById('pk-apply-to-all-btn') as HTMLButtonElement | null;

  // Multi-Photo Steppers in Crop & Resize Modals
  const cropStepper = document.getElementById('pk-crop-modal-stepper');
  const cropCounter = document.getElementById('pk-crop-modal-counter');
  const cropPrevBtn = document.getElementById('pk-crop-modal-prev-btn') as HTMLButtonElement | null;
  const cropNextBtn = document.getElementById('pk-crop-modal-next-btn') as HTMLButtonElement | null;

  const resizeStepper = document.getElementById('pk-resize-modal-stepper');
  const resizeCounter = document.getElementById('pk-resize-modal-counter');
  const resizePrevBtn = document.getElementById('pk-resize-modal-prev-btn') as HTMLButtonElement | null;
  const resizeNextBtn = document.getElementById('pk-resize-modal-next-btn') as HTMLButtonElement | null;

  let selectedJobId: string | null = null;`;

code = code.replace(targetQuery, newQueries);

// 2. Add selectJob and updateActivePhotoBar functions right before renderFiles
const targetBeforeRender = "function renderFiles(): void {";
const helperFuncs = `function selectJob(jobId: string, scrollIntoView = false): void {
    selectedJobId = jobId;
    const targetJob = state.jobs.find((j) => j.id === jobId);

    // Update active highlight on all file item cards
    activeFileList.querySelectorAll<HTMLElement>('.pk-file-item').forEach((n) => {
      const isSelected = n.dataset.id === jobId;
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
  }

  function updateActivePhotoBar(): void {
    if (state.jobs.length <= 1) {
      activePhotoBar?.classList.add('hidden');
      return;
    }

    activePhotoBar?.classList.remove('hidden');

    if (!selectedJobId || !state.jobs.some((j) => j.id === selectedJobId)) {
      selectedJobId = state.jobs[0]?.id || null;
    }

    const idx = state.jobs.findIndex((j) => j.id === selectedJobId);
    const currIdx = idx === -1 ? 0 : idx;
    const currentJob = state.jobs[currIdx];

    if (activePhotoCounter) {
      activePhotoCounter.textContent = \`\${currIdx + 1} of \${state.jobs.length}\`;
    }
    if (activePhotoName && currentJob) {
      activePhotoName.textContent = currentJob.file.name;
    }
    if (targetPrevBtn) {
      targetPrevBtn.disabled = currIdx <= 0;
    }
    if (targetNextBtn) {
      targetNextBtn.disabled = currIdx >= state.jobs.length - 1;
    }
  }

  function renderFiles(): void {`;

code = code.replace(targetBeforeRender, helperFuncs);

// 3. In renderFiles, wire card selection click and highlight
const targetNodeSetup = `node.dataset.id = job.id;
        isNew = true;
      }`;

const replacementNodeSetup = `node.dataset.id = job.id;
        isNew = true;
      }

      // Card Selection Click Listener
      node.onclick = (e) => {
        if ((e.target as HTMLElement).closest('button, a, input, select')) return;
        selectJob(job.id);
      };

      const isSelected = job.id === selectedJobId;
      node.classList.toggle('border-accent', isSelected);
      node.classList.toggle('ring-1', isSelected);
      node.classList.toggle('ring-accent/40', isSelected);
      node.classList.toggle('bg-accent/5', isSelected);
      node.classList.toggle('border-border', !isSelected);
      node.classList.toggle('bg-surface/90', !isSelected);

      const selBadge = node.querySelector('.pk-file-selected-badge');
      if (selBadge) selBadge.classList.toggle('hidden', !isSelected);`;

code = code.replace(targetNodeSetup, replacementNodeSetup);

// 4. At the end of renderFiles, ensure selectedJobId and call updateActivePhotoBar
const targetRenderFilesEnd = `updateLiveDimensionsAndCardPreviews();
  }`;

const replacementRenderFilesEnd = `if (!selectedJobId || !state.jobs.some((j) => j.id === selectedJobId)) {
      selectedJobId = state.jobs[0]?.id || null;
    }
    updateActivePhotoBar();
    updateLiveDimensionsAndCardPreviews();
  }`;

code = code.replace(targetRenderFilesEnd, replacementRenderFilesEnd);

// 5. Update openCropModal target selection and modal stepper
const targetOpenCropJob = `function openCropModal(job?: FileJob): void {
    if (!cropModal) return;
    const targetJob = job || state.jobs[0];`;

const replacementOpenCropJob = `function openCropModal(job?: FileJob): void {
    if (!cropModal) return;
    const targetJob = job || state.jobs.find((j) => j.id === selectedJobId) || state.jobs[0];`;

code = code.replace(targetOpenCropJob, replacementOpenCropJob);

// 6. In openCropModal, update cropStepper
const targetCropModalFilename = `if (cropModalFilename) {
      cropModalFilename.textContent = \`\${targetJob.file.name}\${resizeDesc} · Drag box to frame\`;
    }`;

const replacementCropModalFilename = `if (cropModalFilename) {
      cropModalFilename.textContent = \`\${targetJob.file.name}\${resizeDesc} · Drag box to frame\`;
    }

    if (cropStepper) {
      if (state.jobs.length > 1) {
        cropStepper.classList.remove('hidden');
        cropStepper.classList.add('flex');
        const currIdx = state.jobs.findIndex((j) => j.id === targetJob.id);
        const displayIdx = currIdx === -1 ? 0 : currIdx;
        if (cropCounter) cropCounter.textContent = \`\${displayIdx + 1} / \${state.jobs.length}\`;
        if (cropPrevBtn) cropPrevBtn.disabled = displayIdx <= 0;
        if (cropNextBtn) cropNextBtn.disabled = displayIdx >= state.jobs.length - 1;
      } else {
        cropStepper.classList.add('hidden');
        cropStepper.classList.remove('flex');
      }
    }`;

code = code.replace(targetCropModalFilename, replacementCropModalFilename);

// 7. Update openResizeModal target selection and modal stepper
const targetOpenResizeJob = `function openResizeModal(job?: FileJob): void {
    if (!resizeModal) return;
    isGlobalResizeModal = !job;
    const targetJob = job || state.jobs[0];`;

const replacementOpenResizeJob = `function openResizeModal(job?: FileJob): void {
    if (!resizeModal) return;
    isGlobalResizeModal = !job;
    const targetJob = job || state.jobs.find((j) => j.id === selectedJobId) || state.jobs[0];`;

code = code.replace(targetOpenResizeJob, replacementOpenResizeJob);

// 8. In openResizeModal, update resizeStepper
const targetResizeFilename = `if (resizeFilename) {
      const isCropped = !!(targetJob?.croppedPreviewUrl || targetJob?.customCropBox);
      const cropBadge = isCropped ? ' · Cropped' : '';
      resizeFilename.textContent = job
        ? \`\${job.file.name}\${cropBadge}\`
        : (targetJob ? \`\${targetJob.file.name} (Global Settings)\${cropBadge}\` : 'All files in queue');
    }`;

const replacementResizeFilename = `if (resizeFilename) {
      const isCropped = !!(targetJob?.croppedPreviewUrl || targetJob?.customCropBox);
      const cropBadge = isCropped ? ' · Cropped' : '';
      resizeFilename.textContent = job
        ? \`\${job.file.name}\${cropBadge}\`
        : (targetJob ? \`\${targetJob.file.name} (Global Settings)\${cropBadge}\` : 'All files in queue');
    }

    if (resizeStepper) {
      if (state.jobs.length > 1) {
        resizeStepper.classList.remove('hidden');
        resizeStepper.classList.add('flex');
        const currIdx = state.jobs.findIndex((j) => j.id === targetJob?.id);
        const displayIdx = currIdx === -1 ? 0 : currIdx;
        if (resizeCounter) resizeCounter.textContent = \`\${displayIdx + 1} / \${state.jobs.length}\`;
        if (resizePrevBtn) resizePrevBtn.disabled = displayIdx <= 0;
        if (resizeNextBtn) resizeNextBtn.disabled = displayIdx >= state.jobs.length - 1;
      } else {
        resizeStepper.classList.add('hidden');
        resizeStepper.classList.remove('flex');
      }
    }`;

code = code.replace(targetResizeFilename, replacementResizeFilename);

// 9. Wire event listeners for target bar and modal steppers
const targetStudioListeners = `openResizeStudioBtn?.addEventListener('click', () => openResizeModal());
  openCropStudioBtn?.addEventListener('click', () => openCropModal());`;

const replacementStudioListeners = `openResizeStudioBtn?.addEventListener('click', () => {
    const targetJob = state.jobs.find((j) => j.id === selectedJobId) || state.jobs[0];
    openResizeModal(targetJob);
  });
  openCropStudioBtn?.addEventListener('click', () => {
    const targetJob = state.jobs.find((j) => j.id === selectedJobId) || state.jobs[0];
    openCropModal(targetJob);
  });

  // Target Photo Bar navigation
  targetPrevBtn?.addEventListener('click', () => {
    if (!selectedJobId) return;
    const currIdx = state.jobs.findIndex((j) => j.id === selectedJobId);
    if (currIdx > 0) {
      selectJob(state.jobs[currIdx - 1].id, true);
    }
  });

  targetNextBtn?.addEventListener('click', () => {
    if (!selectedJobId) return;
    const currIdx = state.jobs.findIndex((j) => j.id === selectedJobId);
    if (currIdx < state.jobs.length - 1) {
      selectJob(state.jobs[currIdx + 1].id, true);
    }
  });

  applyToAllBtn?.addEventListener('click', () => {
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
  });

  // Stepper inside Crop Modal
  cropPrevBtn?.addEventListener('click', () => {
    if (!activeCropJob) return;
    const currIdx = state.jobs.findIndex((j) => j.id === activeCropJob.id);
    if (currIdx > 0) {
      // Save current crop
      activeCropJob.customCropBox = {
        x: cropBoxState.x,
        y: cropBoxState.y,
        width: cropBoxState.w,
        height: cropBoxState.h,
      };
      activeCropJob.cropAspect = cropBoxState.ratioName;
      activeCropJob.cropAnchor = cropBoxState.anchor;
      generateJobCroppedPreview(activeCropJob);

      const nextJob = state.jobs[currIdx - 1];
      selectJob(nextJob.id);
      openCropModal(nextJob);
    }
  });

  cropNextBtn?.addEventListener('click', () => {
    if (!activeCropJob) return;
    const currIdx = state.jobs.findIndex((j) => j.id === activeCropJob.id);
    if (currIdx < state.jobs.length - 1) {
      // Save current crop
      activeCropJob.customCropBox = {
        x: cropBoxState.x,
        y: cropBoxState.y,
        width: cropBoxState.w,
        height: cropBoxState.h,
      };
      activeCropJob.cropAspect = cropBoxState.ratioName;
      activeCropJob.cropAnchor = cropBoxState.anchor;
      generateJobCroppedPreview(activeCropJob);

      const nextJob = state.jobs[currIdx + 1];
      selectJob(nextJob.id);
      openCropModal(nextJob);
    }
  });

  // Stepper inside Resize Modal
  resizePrevBtn?.addEventListener('click', () => {
    if (!activeResizeJob) return;
    const currIdx = state.jobs.findIndex((j) => j.id === activeResizeJob.id);
    if (currIdx > 0) {
      const nextJob = state.jobs[currIdx - 1];
      selectJob(nextJob.id);
      openResizeModal(nextJob);
    }
  });

  resizeNextBtn?.addEventListener('click', () => {
    if (!activeResizeJob) return;
    const currIdx = state.jobs.findIndex((j) => j.id === activeResizeJob.id);
    if (currIdx < state.jobs.length - 1) {
      const nextJob = state.jobs[currIdx + 1];
      selectJob(nextJob.id);
      openResizeModal(nextJob);
    }
  });`;

code = code.replace(targetStudioListeners, replacementStudioListeners);

fs.writeFileSync('src/components/converter/islands/ConverterApp.tsx', code, 'utf8');
console.log('ConverterApp.tsx successfully updated with multi-photo targeting and steppers!');
