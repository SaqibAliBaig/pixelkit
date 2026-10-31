const fs = require('fs');
let code = fs.readFileSync('src/components/converter/islands/ConverterApp.tsx', 'utf8');

// 1. Remove addMoreBtn and headerAddBtn queries, add deselectPhotoBtn
code = code.replace(
  `  const addMoreBtn = document.getElementById('pk-add-more-btn') as HTMLButtonElement | null;\n  const headerAddBtn = document.getElementById('pk-header-add-btn') as HTMLButtonElement | null;`,
  `  const deselectPhotoBtn = document.getElementById('pk-deselect-photo-btn') as HTMLButtonElement | null;`
);

// 2. Remove addMoreBtn and headerAddBtn click listeners
const addMoreListeners = `  addMoreBtn?.addEventListener('click', () => {
    activeFileInput.click();
  });

  headerAddBtn?.addEventListener('click', () => {
    activeFileInput.click();
  });`;

code = code.replace(addMoreListeners, '');

// 3. Remove addMoreBtn visibility logic in updateButtons
const addMoreInButtons = `    if (addMoreBtn) {
      addMoreBtn.classList.toggle('hidden', state.jobs.length === 0);
      addMoreBtn.disabled = state.converting;
    }`;

code = code.replace(addMoreInButtons, '');

// 4. Replace selectJob and updateActivePhotoBar
const oldSelectJob = `function selectJob(jobId: string, scrollIntoView = false): void {
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
  }`;

const newSelectJob = `function selectJob(jobId: string | null, scrollIntoView = false): void {
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
  }

  function updateActivePhotoBar(): void {
    // If no photo is explicitly selected, hide the active photo bar completely!
    if (!selectedJobId || state.jobs.length <= 1) {
      activePhotoBar?.classList.add('hidden');
      activePhotoBar?.classList.remove('flex');
      return;
    }

    const idx = state.jobs.findIndex((j) => j.id === selectedJobId);
    if (idx === -1) {
      selectedJobId = null;
      activePhotoBar?.classList.add('hidden');
      activePhotoBar?.classList.remove('flex');
      return;
    }

    activePhotoBar?.classList.remove('hidden');
    activePhotoBar?.classList.add('flex');

    const currentJob = state.jobs[idx];
    if (activePhotoCounter) {
      activePhotoCounter.textContent = \`(\${idx + 1} of \${state.jobs.length})\`;
    }
    if (activePhotoName && currentJob) {
      activePhotoName.textContent = currentJob.file.name;
    }
    if (targetPrevBtn) {
      targetPrevBtn.disabled = idx <= 0;
    }
    if (targetNextBtn) {
      targetNextBtn.disabled = idx >= state.jobs.length - 1;
    }
  }`;

code = code.replace(oldSelectJob, newSelectJob);

// 5. In renderFiles, wire selBadge click to deselect, and don't auto-select state.jobs[0]
code = code.replace(
  `const selBadge = node.querySelector('.pk-file-selected-badge');
      if (selBadge) selBadge.classList.toggle('hidden', !isSelected);`,
  `const selBadge = node.querySelector('.pk-file-selected-badge');
      if (selBadge) {
        selBadge.classList.toggle('hidden', !isSelected);
        (selBadge as HTMLElement).onclick = (e) => {
          e.stopPropagation();
          selectJob(null);
        };
      }`
);

// End of renderFiles: remove auto-defaulting to state.jobs[0]
code = code.replace(
  `if (!selectedJobId || !state.jobs.some((j) => j.id === selectedJobId)) {
      selectedJobId = state.jobs[0]?.id || null;
    }`,
  `if (selectedJobId && !state.jobs.some((j) => j.id === selectedJobId)) {
      selectedJobId = null;
    }`
);

// 6. Wire deselectPhotoBtn listener
const oldTargetListeners = `  // Target Photo Bar navigation
  targetPrevBtn?.addEventListener('click', () => {`;

const newTargetListeners = `  // Deselect button on active photo bar
  deselectPhotoBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    selectJob(null);
  });

  // Target Photo Bar navigation
  targetPrevBtn?.addEventListener('click', () => {`;

code = code.replace(oldTargetListeners, newTargetListeners);

fs.writeFileSync('src/components/converter/islands/ConverterApp.tsx', code, 'utf8');
console.log('ConverterApp.tsx successfully updated with toggle deselect and clean UI!');
