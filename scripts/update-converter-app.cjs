const fs = require('fs');
let code = fs.readFileSync('src/components/converter/islands/ConverterApp.tsx', 'utf8');

// 1. Update modeTabs type definition from HTMLButtonElement to HTMLElement
code = code.replace(
  "const modeTabs = document.querySelectorAll<HTMLButtonElement>('.pk-mode-tab');",
  "const modeTabs = document.querySelectorAll<HTMLElement>('.pk-mode-tab');"
);

// 2. In setToolMode, toggle .pk-stage-num and #pk-card-portal-discovery
const oldSetToolStart = "function setToolMode(mode: string, scroll = false): void {";
const newSetToolStart = `function setToolMode(mode: string, scroll = false): void {
    currentToolMode = mode;

    // Toggle stage number badges: hide when an individual tool is selected, show only in All-in-One
    const stageNums = document.querySelectorAll('.pk-stage-num');
    stageNums.forEach((el) => {
      el.classList.toggle('hidden', mode !== 'all');
    });

    // Toggle discovery card at the end of custom panel: only show on Home ("all" mode)
    const discoveryCard = document.getElementById('pk-card-portal-discovery');
    if (discoveryCard) {
      discoveryCard.classList.toggle('hidden', mode !== 'all');
    }`;

// Replace only the first occurrence of setToolMode header
const idxSetTool = code.indexOf(oldSetToolStart);
if (idxSetTool !== -1) {
  const nextCurrentToolMode = code.indexOf("currentToolMode = mode;", idxSetTool);
  code = code.substring(0, idxSetTool) + newSetToolStart + code.substring(nextCurrentToolMode + "currentToolMode = mode;".length);
}

// 3. Update convertBtn labels in updateButtons
const oldBtnChecks = `} else if (currentToolMode === 'crop') {
        btnText = 'Crop & Frame Now';
      } else if (currentToolMode === 'resize') {
        btnText = 'Resize Resolution Now';
      } else if (currentToolMode === 'passport') {`;

const newBtnChecks = `} else if (currentToolMode === 'crop') {
        btnText = 'Crop & Frame Now';
      } else if (currentToolMode === 'resize') {
        btnText = 'Resize Resolution Now';
      } else if (currentToolMode === 'compress') {
        btnText = 'Compress Image Now';
      } else if (currentToolMode === 'convert') {
        btnText = 'Convert Image Now';
      } else if (currentToolMode === 'passport') {`;

code = code.replace(oldBtnChecks, newBtnChecks);

// 4. Update modeTabs click listeners: if state.jobs.length === 0, allow following href!
const oldModeTabsListener = `  // Top Mode Segmented Bar Listeners
  modeTabs.forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const m = tab.dataset.mode;
      if (m) setToolMode(m, true);
    });
  });`;

const newModeTabsListener = `  // Top Mode Segmented Bar Listeners
  modeTabs.forEach((tab) => {
    tab.addEventListener('click', (e) => {
      const m = tab.dataset.mode;
      if (!m) return;
      if (state.jobs.length > 0) {
        // If files are already loaded in memory, prevent navigation so files aren't lost
        e.preventDefault();
        setToolMode(m, true);
      }
      // If no files are queued, let the browser follow href to /compress-image/, /convert/, etc.!
    });
  });`;

code = code.replace(oldModeTabsListener, newModeTabsListener);

fs.writeFileSync('src/components/converter/islands/ConverterApp.tsx', code, 'utf8');
console.log('ConverterApp.tsx successfully updated!');
