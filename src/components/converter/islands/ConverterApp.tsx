/**
 * ConverterApp — interactive TypeScript island for PixelKit.
 *
 * Full converter workflow:
 *   - Universal multi-format dropzone & auto-detection
 *   - Two-way format switcher (⇄ Swap Button)
 *   - Dynamic output format switching (JPG, PNG, WEBP, PDF, AVIF)
 *   - Exact KB, Max KB, Min-Max Range, and Manual Quality Slider (1–100%)
 *   - Working EXIF metadata preservation
 *   - "Download All as ZIP" archive (.zip)
 *   - Real image thumbnails (with instant natural resolution detection)
 *   - Interactive Before/After Visual Comparison Slider with Zoom & Pan inspection
 *   - Before/After dimension stats (e.g. 3024×4032 ➔ 1512×2016 px) and percentage savings (-74% saved)
 *   - Dimension presets (Passport, Square, Custom)
 *   - Multi-worker parallel processing
 */

// Polyfill Promise.try and Uint8Array.prototype.toHex for pdfjs-dist v6+
if (typeof (Promise as unknown as Record<string, unknown>).try !== 'function') {
  (Promise as unknown as Record<string, unknown>).try = function (fn: (...args: unknown[]) => unknown, ...args: unknown[]) {
    return new Promise((resolve) => resolve(fn(...args)));
  };
}
if (typeof (Uint8Array.prototype as unknown as Record<string, unknown>).toHex !== 'function') {
  (Uint8Array.prototype as unknown as Record<string, unknown>).toHex = function (this: Uint8Array): string {
    let hex = '';
    for (let i = 0; i < this.length; i++) {
      hex += (this[i] ?? 0).toString(16).padStart(2, '0');
    }
    return hex;
  };
}

import type {
  ConvertRequest,
  MergePdfRequest,
  WorkerMessage,
  DimensionOptions,
  DimensionUnit,
  TargetSizeMode,
  TargetSizeOptions,
  CropAspectPreset,
  CropAnchor,
  CustomCropBox,
  PdfOrientation,
  PdfPageSize,
  PdfMargin,
  } from '@lib/worker/types';
import { ASPECT_RATIOS } from '@lib/worker/adjustments';
import { PORTAL_PRESETS } from '@lib/portal-presets';
import { formatBytes } from '@lib/utils/filesize';
import { downloadBlob } from '@lib/utils/download';
import { mimeForExtension } from '@lib/engines';
import { createZipArchive } from '@lib/utils/zip';
import { readImageDimensionsFast } from '@lib/utils/image-dims';
import { extractEmbeddedImagesFromPdf } from '@lib/worker/pdf-extract';

// ---------- types ----------

type Status = 'queued' | 'working' | 'done' | 'error';

interface FileJob {
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
  targetOptions?: TargetSizeOptions;
  dimensions?: DimensionOptions;
  dpi?: number | null;
  scalePercent?: number;
  cropAspect?: CropAspectPreset;
  cropAnchor?: CropAnchor;
  customCropBox?: CustomCropBox;
  rotate?: number; // 0, 90, 180, 270
  flipH?: boolean;
  flipV?: boolean;
  grayscale?: boolean;
  originalSize: number;
  resultSize?: number;
  originalWidth?: number;
  originalHeight?: number;
  resultWidth?: number;
  resultHeight?: number;
  thumbUrl?: string;
  resultThumbUrl?: string;
  previewUrl?: string;
  resultPreviewUrl?: string;
  croppedPreviewUrl?: string;
  croppedWidth?: number;
  croppedHeight?: number;
  adjustedPreviewUrl?: string;
  adjustedWidth?: number;
  adjustedHeight?: number;
  pdfPageNumber?: number;
  pdfTotalPages?: number;
  renderedPageBlob?: Blob;
  pdfOrientation?: PdfOrientation;
  pdfPageSize?: PdfPageSize;
  pdfMargin?: PdfMargin;
}

type SizeControlMode = TargetSizeMode | 'quality';

interface State {
  jobs: FileJob[];
  converting: boolean;
  from: string;
  to: string;
  fromMime: string;
  toMime: string;
  targetKb: number | null;
  targetSizeMode: SizeControlMode;
  minKb: number | null;
  maxKb: number | null;
  quality: number; // 0.05 to 1.0
  preserveMetadata: boolean;
  cropAspect: CropAspectPreset;
  cropAnchor: CropAnchor;
  scalePercent: number | null;
  lockAspectRatio: boolean;
  unit: DimensionUnit;
  dpi: number | null;
  dimensions: DimensionOptions;
  grayscale: boolean;
  mergePdf: boolean;
  pdfOrientation: PdfOrientation;
  pdfPageSize: PdfPageSize;
  pdfMargin: PdfMargin;
  svgScale: number;
  autoOrient: boolean;
  stripTransparency: boolean;
  portalPreset: string | null;
}

// ---------- constants ----------

const hardwareCores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
// Scale up to 4 parallel workers on quad-core/multi-core machines for 2x-4x batch conversion speed
const MAX_WORKERS = Math.max(2, Math.min(4, Math.floor(hardwareCores / 2) || 2));

/**
 * Protect INP (< 200ms) on batch operations by yielding execution to the browser
 * event loop so input events (touch, scroll, click) and rendering stay responsive.
 */
function yieldToMain(): Promise<void> {
  if (typeof window !== 'undefined' && 'scheduler' in window && typeof (window as any).scheduler?.yield === 'function') {
    return (window as any).scheduler.yield();
  }
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

// ---------- bootstrap ----------

export function mountConverterApp(): void {
  const root = document.getElementById('pk-converter-root');
  if (!root || root.dataset.pkMounted === '1') return;
  root.dataset.pkMounted = '1';

  // Unpack modals from <template> if present before querying modal DOM
  const modalsTemplate = document.getElementById('pk-modals-template') as HTMLTemplateElement | null;
  if (modalsTemplate && modalsTemplate.content) {
    modalsTemplate.parentNode?.insertBefore(modalsTemplate.content.cloneNode(true), modalsTemplate);
    modalsTemplate.remove();
  }

  const initialTarget = parseTargetKb(root.dataset.targetKb);
  const initialSizeModeRaw = root.dataset.sizeMode as SizeControlMode | undefined;
  const initialSizeMode: SizeControlMode =
    initialSizeModeRaw && ['max', 'exact', 'range', 'quality'].includes(initialSizeModeRaw)
      ? initialSizeModeRaw
      : 'max';
  const initialMinKb = parseTargetKb(root.dataset.minKb);
  const initialMaxKb = parseTargetKb(root.dataset.maxKb) ?? initialTarget;
  const initialUnitRaw = root.dataset.initialUnit as DimensionUnit | undefined;
  const initialUnit: DimensionUnit =
    initialUnitRaw && ['px', 'cm', 'mm', 'in'].includes(initialUnitRaw) ? initialUnitRaw : 'px';
  const initialWidthNum = root.dataset.initialWidth ? Number(root.dataset.initialWidth) : null;
  const initialHeightNum = root.dataset.initialHeight ? Number(root.dataset.initialHeight) : null;
  const initialDpiRaw = root.dataset.initialDpi ? Number(root.dataset.initialDpi) : null;
  const initialDpi =
    initialDpiRaw && Number.isFinite(initialDpiRaw) && initialDpiRaw > 0
      ? Math.round(initialDpiRaw)
      : null;
  const initialPreserveMetadata =
    root.dataset.preserveMetadata !== '' && root.dataset.preserveMetadata !== undefined
      ? root.dataset.preserveMetadata !== 'false'
      : root.dataset.initialTool !== 'exif';
  const initialCropAspectRaw = (root.dataset.cropAspect || '').trim() as CropAspectPreset;
  const initialCropAspect: CropAspectPreset =
    initialCropAspectRaw && (initialCropAspectRaw === 'original' || Boolean(ASPECT_RATIOS[initialCropAspectRaw]))
      ? initialCropAspectRaw
      : 'original';
  const initialMergePdf = root.dataset.mergePdf === 'true';

  const hasInitialCustomDims = Boolean(
    initialWidthNum && initialWidthNum > 0 && initialHeightNum && initialHeightNum > 0
  );
  const initialEffectiveDpi = initialDpi || 300;
  const initialPxWidth =
    hasInitialCustomDims && initialWidthNum
      ? unitToPx(initialWidthNum, initialUnit, initialEffectiveDpi)
      : undefined;
  const initialPxHeight =
    hasInitialCustomDims && initialHeightNum
      ? unitToPx(initialHeightNum, initialUnit, initialEffectiveDpi)
      : undefined;

  const state: State = {
    jobs: [],
    converting: false,
    from: root.dataset.from || 'jpg',
    to: root.dataset.to || 'png',
    fromMime: root.dataset.fromMime || 'image/jpeg',
    toMime: root.dataset.toMime || 'image/png',
    targetKb: initialTarget,
    targetSizeMode: initialSizeMode,
    minKb: initialMinKb,
    maxKb: initialMaxKb,
    quality: initialSizeMode === 'quality' ? 0.85 : 0.9,
    preserveMetadata: initialPreserveMetadata,
    cropAspect: initialCropAspect,
    cropAnchor: 'center',
    scalePercent: hasInitialCustomDims || initialUnit !== 'px' ? null : 100,
    lockAspectRatio: hasInitialCustomDims ? false : true,
    unit: initialUnit,
    dpi: initialDpi ?? (initialUnit !== 'px' ? 300 : null),
    dimensions: hasInitialCustomDims
      ? {
          mode: 'custom',
          width: initialPxWidth,
          height: initialPxHeight,
          unit: initialUnit,
          dpi: initialUnit !== 'px' ? initialEffectiveDpi : (initialDpi ?? undefined),
          fit: 'cover',
          lockAspectRatio: false,
          noUpscale: false,
        }
      : { mode: 'original' },
    grayscale: false,
    mergePdf: initialMergePdf,
    pdfOrientation: 'auto',
    pdfPageSize: 'a4',
    pdfMargin: 'none',
    svgScale: 2,
    autoOrient: true,
    stripTransparency: true,
    portalPreset: null,
  };

  // Elements
  const fileInput = document.getElementById('pk-file-input') as HTMLInputElement | null;
  const dropzone = document.getElementById('pk-dropzone');
  const fileList = document.getElementById('pk-file-list');
  const emptyState = document.getElementById('pk-empty-state');
  const filesHeader = document.getElementById('pk-files-header');
  const filesCount = document.getElementById('pk-files-count');
  const template = document.getElementById('pk-file-item-template') as HTMLTemplateElement | null;
  const convertBtn = document.getElementById('pk-convert-btn') as HTMLButtonElement | null;
  const deselectPhotoBtn = document.getElementById('pk-deselect-photo-btn') as HTMLButtonElement | null;
  const clearBtn = document.getElementById('pk-clear-btn') as HTMLButtonElement | null;
  const downloadAllBtn = document.getElementById('pk-download-all-btn') as HTMLButtonElement | null;
  const statusEl = document.getElementById('pk-status');
  const progressEl = document.getElementById('pk-progress');
  const progressFill = document.getElementById('pk-progress-fill');
  const progressPercent = document.getElementById('pk-progress-percent');
  const progressLabel = document.getElementById('pk-progress-label');

  // Settings Elements
  const outputSelect = document.getElementById('pk-output-format') as HTMLSelectElement | null;
  const inputBadge = document.getElementById('pk-detected-input-badge');
  const targetSelect = document.getElementById('pk-target-kb') as HTMLSelectElement | null;
  const targetValue = document.getElementById('pk-target-value');
  const targetPresetContainer = document.getElementById('pk-target-preset-container');
  const customKbContainer = document.getElementById('pk-custom-kb-container');
  const customKbInput = document.getElementById('pk-custom-kb-input') as HTMLInputElement | null;
  const rangeKbContainer = document.getElementById('pk-range-kb-container');
  const minKbInput = document.getElementById('pk-min-kb-input') as HTMLInputElement | null;
  const maxKbInput = document.getElementById('pk-max-kb-input') as HTMLInputElement | null;
  const qualityContainer = document.getElementById('pk-quality-container');
  const qualitySlider = document.getElementById('pk-quality-slider') as HTMLInputElement | null;
  const qualityValue = document.getElementById('pk-quality-value');

  // Mode buttons
  const modeMaxBtn = document.getElementById('pk-size-mode-max') as HTMLButtonElement | null;
  const modeExactBtn = document.getElementById('pk-size-mode-exact') as HTMLButtonElement | null;
  const modeRangeBtn = document.getElementById('pk-size-mode-range') as HTMLButtonElement | null;
  const modeQualityBtn = document.getElementById('pk-size-mode-quality') as HTMLButtonElement | null;
  const sizeModeHint = document.getElementById('pk-size-mode-hint');

  // Custom Dropdown Elements (Output Format & Crop Presets)
  const customFormatTrigger = document.getElementById('pk-custom-format-trigger') as HTMLButtonElement | null;
  const customFormatMenu = document.getElementById('pk-custom-format-menu');
  const customFormatChevron = document.getElementById('pk-custom-format-chevron');
  const selectedFormatBadge = document.getElementById('pk-selected-format-badge');
  const selectedFormatTitle = document.getElementById('pk-selected-format-title');
  const selectedFormatDesc = document.getElementById('pk-selected-format-desc');
  const customFormatOptions = document.querySelectorAll<HTMLButtonElement>('.pk-custom-format-option');

  const customCropTrigger = document.getElementById('pk-custom-crop-trigger') as HTMLButtonElement | null;
  const customCropMenu = document.getElementById('pk-custom-crop-menu');
  const customCropChevron = document.getElementById('pk-custom-crop-chevron');
  const selectedCropBadge = document.getElementById('pk-selected-crop-badge');
  const selectedCropTitle = document.getElementById('pk-selected-crop-title');
  const selectedCropDesc = document.getElementById('pk-selected-crop-desc');
  const customCropOptions = document.querySelectorAll<HTMLButtonElement>('.pk-custom-crop-option');

  // Custom Target Dropdown Elements & Unit Toggles (KB / MB)
  const customTargetTrigger = document.getElementById('pk-custom-target-trigger') as HTMLButtonElement | null;
  const customTargetMenu = document.getElementById('pk-custom-target-menu');
  const customTargetChevron = document.getElementById('pk-custom-target-chevron');
  const selectedTargetBadge = document.getElementById('pk-selected-target-badge');
  const selectedTargetTitle = document.getElementById('pk-selected-target-title');
  const selectedTargetDesc = document.getElementById('pk-selected-target-desc');
  const customTargetOptions = document.querySelectorAll<HTMLButtonElement>('.pk-custom-target-option');
  const customUnitKbBtn = document.getElementById('pk-custom-unit-kb') as HTMLButtonElement | null;
  const customUnitMbBtn = document.getElementById('pk-custom-unit-mb') as HTMLButtonElement | null;
  const customEquivTag = document.getElementById('pk-custom-equiv-tag');

  // Top Mode Segmented Bar Elements
  const modeTabs = document.querySelectorAll<HTMLElement>('.pk-mode-tab');
  const dropzonePrompt = document.getElementById('pk-dropzone-prompt');
  const stageFormat = document.getElementById('pk-stage-format');
  const stageCompress = document.getElementById('pk-stage-compress');
  const stageCrop = document.getElementById('pk-stage-crop');
  const stageResize = document.getElementById('pk-stage-resize');
  const stageDpi = document.getElementById('pk-stage-dpi');
  const stagesList = document.getElementById('pk-stages-list');
  const stageAdvanced = document.getElementById('pk-stage-advanced') as HTMLDetailsElement | null;
  const toggleMoreToolsWrapper = document.getElementById('pk-more-tools-toggle-wrapper');
  const toggleMoreToolsBtn = document.getElementById('pk-toggle-more-tools-btn') as HTMLButtonElement | null;
  const moreToolsLabel = document.getElementById('pk-more-tools-btn-label');
  const moreToolsAction = document.getElementById('pk-more-tools-action-text');
  const moreToolsChevron = document.getElementById('pk-more-tools-chevron');
  const moreToolsBadge = document.getElementById('pk-more-tools-active-badge');
  const settingsModeBadge = document.getElementById('pk-settings-mode-badge');

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

  let selectedJobId: string | null = null;
  let isMoreToolsOpen = false;
  const initialToolMode = root.dataset.initialTool || 'all';
  let currentToolMode = initialToolMode;

  // Tab Mode Elements & Portal Presets
  const tabCustom = document.getElementById('pk-tab-custom') as HTMLButtonElement | null;
  const tabPortal = document.getElementById('pk-tab-portal') as HTMLButtonElement | null;
  const panelCustom = document.getElementById('pk-panel-custom');
  const panelPortal = document.getElementById('pk-panel-portal');
  const portalActiveDot = document.getElementById('pk-portal-active-dot');
  const customActiveBanner = document.getElementById('pk-custom-active-preset-banner');
  const bannerFlag = document.getElementById('pk-banner-flag');
  const bannerName = document.getElementById('pk-banner-name');
  const bannerDetails = document.getElementById('pk-banner-details');
  const bannerReset = document.getElementById('pk-banner-reset') as HTMLButtonElement | null;
  const btnSwitchToPortal = document.getElementById('pk-btn-switch-to-portal') as HTMLButtonElement | null;
  const btnBackToCustom = document.getElementById('pk-btn-back-to-custom') as HTMLButtonElement | null;
  const portalPanelReset = document.getElementById('pk-portal-panel-reset') as HTMLButtonElement | null;
  let portalPresetCards = document.querySelectorAll<HTMLButtonElement>('.pk-portal-preset-card');
  function ensurePortalCardsHydrated(): void {
    const tpl = document.getElementById('pk-portal-cards-template') as HTMLTemplateElement | null;
    if (tpl && tpl.content) {
      tpl.parentNode?.insertBefore(tpl.content.cloneNode(true), tpl);
      tpl.remove();
      portalPresetCards = document.querySelectorAll<HTMLButtonElement>('.pk-portal-preset-card');
    }
  }
  const portalSearchInput = document.getElementById('pk-portal-search') as HTMLInputElement | null;
  const portalCatFilters = document.querySelectorAll<HTMLButtonElement>('.pk-cat-filter');
  const portalNoMatches = document.getElementById('pk-portal-no-matches');
  const initialActiveCatBtn = document.querySelector<HTMLButtonElement>('.pk-cat-filter.active');
  let activePortalCat = initialActiveCatBtn?.dataset.cat || 'all';
  const portalAppliedSummary = document.getElementById('pk-portal-applied-summary');

  const rangeUnitKbBtn = document.getElementById('pk-range-unit-kb') as HTMLButtonElement | null;
  const rangeUnitMbBtn = document.getElementById('pk-range-unit-mb') as HTMLButtonElement | null;
  let customUnit: 'kb' | 'mb' = state.targetKb && state.targetKb >= 1024 && state.targetKb % 1024 === 0 ? 'mb' : 'kb';
  let savedMaxTargetValue: string = initialTarget ? String(initialTarget) : '';
  let savedExactTargetValue: string = initialTarget ? String(initialTarget) : '100';
  let rangeUnit: 'kb' | 'mb' = 'kb';

  // Adjustments & Dimensions Elements
  const cropAspectSelect = document.getElementById('pk-crop-aspect') as HTMLSelectElement | null;
  const scaleBtns = document.querySelectorAll<HTMLButtonElement>('.pk-scale-btn');
  const resizeHint = document.getElementById('pk-resize-hint');
  const customDimsContainer = document.getElementById('pk-custom-dims-container');
  const dimWidthInput = document.getElementById('pk-dim-width') as HTMLInputElement | null;
  const dimHeightInput = document.getElementById('pk-dim-height') as HTMLInputElement | null;
  const dimWidthLabel = document.getElementById('pk-dim-width-label');
  const dimHeightLabel = document.getElementById('pk-dim-height-label');
  const dimUnitBtns = document.querySelectorAll<HTMLButtonElement>('.pk-dim-unit-btn');
  const dimDpiWrap = document.getElementById('pk-dim-dpi-wrap');
  const dimDpiSelect = document.getElementById('pk-dim-dpi') as HTMLSelectElement | null;
  const dimComputedPx = document.getElementById('pk-dim-computed-px');
  const cmPresetsRow = document.getElementById('pk-cm-presets-row');
  const cmPresetBtns = document.querySelectorAll<HTMLButtonElement>('.pk-cm-preset-btn');
  const dpiValueEl = document.getElementById('pk-dpi-value');
  const dpiBtns = document.querySelectorAll<HTMLButtonElement>('.pk-dpi-btn');
  const customDpiWrap = document.getElementById('pk-custom-dpi-wrap');
  const customDpiInput = document.getElementById('pk-custom-dpi-input') as HTMLInputElement | null;
  const dpiHint = document.getElementById('pk-dpi-hint');
  const exifStatusNote = document.getElementById('pk-exif-status-note');
  const lockAspectBtn = document.getElementById('pk-lock-aspect-btn') as HTMLButtonElement | null;
  const grayscaleCheckbox = document.getElementById('pk-grayscale-filter') as HTMLInputElement | null;
  const mergePdfContainer = document.getElementById('pk-pdf-options-container') || document.getElementById('pk-merge-pdf-container');
  const pdfPageSizeSelect = document.getElementById('pk-pdf-pagesize-select') as HTMLSelectElement | null;
  const mergePdfToggle = document.getElementById('pk-merge-pdf-toggle') as HTMLInputElement | null;
  const svgScaleContainer = document.getElementById('pk-svg-scale-container');
  const svgScaleSelect = document.getElementById('pk-svg-scale') as HTMLSelectElement | null;
  const svgScaleVal = document.getElementById('pk-svg-scale-val');
  if (svgScaleSelect) {
    state.svgScale = Number(svgScaleSelect.value) || 2;
  }
  const autoOrientCheckbox = document.getElementById('pk-auto-orient') as HTMLInputElement | null;
  const stripTransCheckbox = document.getElementById('pk-strip-transparency') as HTMLInputElement | null;
  const preserveMetadataCheckbox = document.getElementById('pk-preserve-metadata') as HTMLInputElement | null;

  // Crop Anchor & Live Dimensions Elements
  const cropAnchorContainer = document.getElementById('pk-crop-anchor-container');
  const cropAnchorLabel = document.getElementById('pk-crop-anchor-label');
  const cropAnchorBtns = document.querySelectorAll<HTMLButtonElement>('.pk-crop-anchor-btn');
  const liveDimOutput = document.getElementById('pk-live-dim-output');
  const cropConflictAlert = document.getElementById('pk-crop-conflict-alert');
  const cropConflictText = document.getElementById('pk-crop-conflict-text');

  // Dimension Presets & Fit Strategy Elements
  const dimPresetBtns = document.querySelectorAll<HTMLButtonElement>('.pk-dim-preset-btn');
  const fitModeBtns = document.querySelectorAll<HTMLButtonElement>('.pk-fit-mode-btn');
  const fitModeDesc = document.getElementById('pk-fit-mode-desc');
  const noUpscaleToggle = document.getElementById('pk-no-upscale-toggle') as HTMLInputElement | null;

  // Interactive Quick-Crop Modal Elements
  const cropModal = document.getElementById('pk-crop-modal');
  const cropModalRatioBadge = document.getElementById('pk-crop-modal-ratio-badge');
  const cropModalFilename = document.getElementById('pk-crop-modal-filename');
  const cropModalCloseBtn = document.getElementById('pk-crop-modal-close-btn');
  const cropModalCancelBtn = document.getElementById('pk-crop-cancel-btn');
  const cropModalApplyBtn = document.getElementById('pk-crop-apply-btn');
  const cropModalResetBtn = document.getElementById('pk-crop-reset-btn');
  const cropModalRatioBtns = document.querySelectorAll<HTMLButtonElement>('.pk-modal-ratio-btn');
  const cropModalAnchorTop = document.getElementById('pk-modal-anchor-top');
  const cropModalAnchorCenter = document.getElementById('pk-modal-anchor-center');
  const cropModalAnchorBottom = document.getElementById('pk-modal-anchor-bottom');
  const cropContainer = document.getElementById('pk-crop-container');
  const cropImgSource = document.getElementById('pk-crop-img-source') as HTMLImageElement | null;
  const cropBox = document.getElementById('pk-crop-box');
  const cropLiveSizeTag = document.getElementById('pk-crop-live-size-tag');
  const cropOrigDims = document.getElementById('pk-crop-orig-dims');
  const cropTargetDims = document.getElementById('pk-crop-target-dims');
  const cropMaskTop = document.getElementById('pk-crop-mask-top');
  const cropMaskBottom = document.getElementById('pk-crop-mask-bottom');
  const cropMaskLeft = document.getElementById('pk-crop-mask-left');
  const cropMaskRight = document.getElementById('pk-crop-mask-right');

  let activeCropJob: FileJob | null = null;
  const cropBoxState = {
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    ratio: null as number | null,
    ratioName: 'original' as CropAspectPreset,
    anchor: 'center' as CropAnchor,
  };

  // Comparison Modal Elements
  const compareModal = document.getElementById('pk-compare-modal');
  const compareTitle = document.getElementById('pk-compare-title');
  const compareMeta = document.getElementById('pk-compare-meta');
  const compareSavedBadge = document.getElementById('pk-compare-saved-badge');
  const compareImgOrig = document.getElementById('pk-compare-img-orig') as HTMLImageElement | null;
  const compareImgResult = document.getElementById('pk-compare-img-result') as HTMLImageElement | null;
  const compareOrigTag = document.getElementById('pk-compare-orig-tag');
  const compareToggleContainer = document.getElementById('pk-compare-toggle-container');
  const compareViewOrigBtn = document.getElementById('pk-compare-view-orig-btn') as HTMLButtonElement | null;
  const compareViewAdjBtn = document.getElementById('pk-compare-view-adj-btn') as HTMLButtonElement | null;
  const compareResTag = document.getElementById('pk-compare-res-tag');
  const compareTip = document.getElementById('pk-compare-tip');
  const compareClip = document.getElementById('pk-compare-clip-container');
  const compareHandle = document.getElementById('pk-compare-handle');
  const compareViewport = document.getElementById('pk-compare-viewport');
  const compareStage = document.getElementById('pk-compare-stage');
  const compareDlBtn = document.getElementById('pk-compare-dl-btn');
  const compareCloseBtn = document.getElementById('pk-compare-close-btn');
  const zoomInBtn = document.getElementById('pk-zoom-in-btn');
  const zoomOutBtn = document.getElementById('pk-zoom-out-btn');
  const zoomFitBtn = document.getElementById('pk-zoom-fit-btn');
  const zoomLevelEl = document.getElementById('pk-zoom-level');

  // Resize Studio Modal Elements
  const resizeModal = document.getElementById('pk-resize-modal');
  const resizeCloseBtn = document.getElementById('pk-resize-close-btn');
  const resizeCancelBtn = document.getElementById('pk-resize-cancel-btn');
  const resizeApplyBtn = document.getElementById('pk-resize-apply-btn');
  const resizeResetBtn = document.getElementById('pk-resize-reset-btn');
  const resizeBadge = document.getElementById('pk-resize-badge');
  const resizeFilename = document.getElementById('pk-resize-filename');
  const resizeGhostImg = document.getElementById('pk-resize-ghost-img') as HTMLImageElement | null;
  const resizePreviewBox = document.getElementById('pk-resize-preview-box');
  const resizeImgPreview = document.getElementById('pk-resize-img-preview') as HTMLImageElement | null;
  const resizeLiveBadge = document.getElementById('pk-resize-live-badge');
  const resizeSrcDims = document.getElementById('pk-resize-src-dims');
  const resizeTargetDims = document.getElementById('pk-resize-target-dims');
  const resizeSavingsTag = document.getElementById('pk-resize-savings-tag');
  const modalScaleVal = document.getElementById('pk-modal-scale-val');
  const modalScaleSlider = document.getElementById('pk-modal-scale-slider') as HTMLInputElement | null;
  const modalScaleBtns = document.querySelectorAll<HTMLButtonElement>('.pk-modal-scale-btn');
  const modalDimPresets = document.querySelectorAll<HTMLButtonElement>('.pk-modal-dim-preset');
  const modalLockBtn = document.getElementById('pk-modal-lock-btn');
  const modalLockIcon = document.getElementById('pk-modal-lock-icon');
  const modalLockLabel = document.getElementById('pk-modal-lock-label');
  const modalDimW = document.getElementById('pk-modal-dim-w') as HTMLInputElement | null;
  const modalDimH = document.getElementById('pk-modal-dim-h') as HTMLInputElement | null;
  const modalUnitBtns = document.querySelectorAll<HTMLButtonElement>('.pk-modal-unit-btn');
  const modalDpiSelect = document.getElementById('pk-modal-dpi') as HTMLSelectElement | null;
  const modalWLabel = document.getElementById('pk-modal-w-label');
  const modalHLabel = document.getElementById('pk-modal-h-label');
  const modalComputedPx = document.getElementById('pk-modal-computed-px');
  const modalFitBtns = document.querySelectorAll<HTMLButtonElement>('.pk-modal-fit-btn');
  const modalNoUpscale = document.getElementById('pk-modal-no-upscale') as HTMLInputElement | null;
  const openResizeStudioBtn = document.getElementById('pk-open-resize-studio-btn');
  const openCropStudioBtn = document.getElementById('pk-open-crop-studio-btn');

  type FitStrategy = 'contain' | 'cover' | 'fill';

  let activeResizeJob: FileJob | null = null;
  let isGlobalResizeModal = false;
  const resizeStudioState = {
    scalePercent: 100 as number | null,
    width: null as number | null,
    height: null as number | null,
    unit: 'px' as DimensionUnit,
    dpi: 300,
    unitWidth: null as number | null,
    unitHeight: null as number | null,
    lockAspect: true,
    fit: 'contain' as FitStrategy,
    noUpscale: true,
  };

  let activeCompareJob: FileJob | null = null;
  let zoomLevel = 1.0;
  let panX = 0;
  let panY = 0;
  let isDraggingSplit = false;
  let isPanning = false;
  let startPanX = 0;
  let startPanY = 0;
  let draggedJobId: string | null = null;

  if (!fileInput || !dropzone || !fileList || !template) {
    return;
  }

  const activeFileInput = fileInput;
  const activeDropzone = dropzone;
  const activeFileList = fileList;
  const activeTemplate = template;

  
  function filterPortalCards(): void {
    ensurePortalCardsHydrated();
    const query = (portalSearchInput?.value || '').trim().toLowerCase();

    // When the user enters a search term, expand category to 'all' so matching presets from any category are immediately surfaced
    if (query && activePortalCat !== 'all') {
      activePortalCat = 'all';
      portalCatFilters.forEach((b) => {
        const isAll = b.dataset.cat === 'all';
        b.className = isAll
          ? 'pk-cat-filter active shrink-0 whitespace-nowrap rounded-lg border border-accent bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent cursor-pointer transition-all shadow-xs'
          : 'pk-cat-filter shrink-0 whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted hover:text-fg hover:border-accent/40 cursor-pointer transition-all shadow-2xs';
      });
    }

    let visibleCount = 0;

    portalPresetCards.forEach((card) => {
      const cat = card.dataset.cat || '';
      const searchData = card.dataset.search || '';
      const matchesCat = activePortalCat === 'all' || cat === activePortalCat;
      const matchesQuery = !query || searchData.includes(query);

      const show = matchesCat && matchesQuery;
      card.classList.toggle('hidden', !show);
      if (show) visibleCount++;
    });

    if (portalNoMatches) {
      portalNoMatches.classList.toggle('hidden', visibleCount > 0);
    }
  }

  function selectCategoryFilter(cat: string): void {
    activePortalCat = cat;
    portalCatFilters.forEach((b) => {
      const isSelected = (b.dataset.cat || 'all') === cat;
      b.className = isSelected
        ? 'pk-cat-filter active shrink-0 whitespace-nowrap rounded-lg border border-accent bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent cursor-pointer transition-all shadow-xs'
        : 'pk-cat-filter shrink-0 whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted hover:text-fg hover:border-accent/40 cursor-pointer transition-all shadow-2xs';
    });
    filterPortalCards();
    const list = document.getElementById('pk-portal-cards-list');
    if (list) list.scrollTop = 0;
  }

  function switchSettingsTab(mode: 'custom' | 'portal'): void {
    if (mode === 'portal') {
      ensurePortalCardsHydrated();
      panelCustom?.classList.add('hidden');
      panelPortal?.classList.remove('hidden');
      tabCustom?.classList.remove('bg-surface', 'text-fg', 'shadow-xs', 'border', 'border-border/40');
      tabCustom?.classList.add('text-muted');
      tabCustom?.setAttribute('aria-selected', 'false');
      tabPortal?.classList.add('bg-surface', 'text-fg', 'shadow-xs', 'border', 'border-border/40');
      tabPortal?.classList.remove('text-muted');
      tabPortal?.setAttribute('aria-selected', 'true');
    } else {
      panelPortal?.classList.add('hidden');
      panelCustom?.classList.remove('hidden');
      tabPortal?.classList.remove('bg-surface', 'text-fg', 'shadow-xs', 'border', 'border-border/40');
      tabPortal?.classList.add('text-muted');
      tabPortal?.setAttribute('aria-selected', 'false');
      tabCustom?.classList.add('bg-surface', 'text-fg', 'shadow-xs', 'border', 'border-border/40');
      tabCustom?.classList.remove('text-muted');
      tabCustom?.setAttribute('aria-selected', 'true');
    }
  }

  function updateMoreToolsToggle(): void {
    if (!toggleMoreToolsBtn || !moreToolsAction || !moreToolsChevron) return;
    if (currentToolMode === 'all') {
      toggleMoreToolsWrapper?.classList.add('hidden');
      return;
    }

    toggleMoreToolsWrapper?.classList.remove('hidden');

    let activeSecondaryCount = 0;
    if (currentToolMode !== 'convert') {
      if (state.to !== (root?.dataset.to || 'jpg')) activeSecondaryCount++;
    }
    if (currentToolMode !== 'compress') {
      if (state.targetKb) activeSecondaryCount++;
    }
    if (currentToolMode !== 'crop') {
      if (state.cropAspect && state.cropAspect !== 'original') activeSecondaryCount++;
    }
    if (currentToolMode !== 'resize') {
      if ((state.scalePercent && state.scalePercent !== 100) || (state.dimensions && state.dimensions.mode !== 'original')) {
        activeSecondaryCount++;
      }
    }
    if (currentToolMode !== 'dpi' && currentToolMode !== 'resize') {
      if (state.dpi) activeSecondaryCount++;
    }

    if (moreToolsBadge) {
      if (activeSecondaryCount > 0) {
        moreToolsBadge.textContent = `${activeSecondaryCount} active`;
        moreToolsBadge.classList.remove('hidden');
      } else {
        moreToolsBadge.classList.add('hidden');
      }
    }

    if (isMoreToolsOpen) {
      moreToolsAction.textContent = 'Hide';
      moreToolsChevron.classList.add('rotate-180');
      toggleMoreToolsBtn.setAttribute('aria-expanded', 'true');
    } else {
      moreToolsAction.textContent = 'Show';
      moreToolsChevron.classList.remove('rotate-180');
      toggleMoreToolsBtn.setAttribute('aria-expanded', 'false');
    }
  }

  function setToolMode(mode: string, scroll = false): void {
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
    }

    modeTabs.forEach((tab) => {
      const isSelected = tab.dataset.mode === mode;
      if (isSelected) {
        tab.className =
          'pk-mode-tab shrink-0 whitespace-nowrap touch-manipulation px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold bg-surface text-fg shadow-xs border border-border/50';
        tab.setAttribute('aria-current', 'page');
      } else {
        tab.className =
          'pk-mode-tab shrink-0 whitespace-nowrap touch-manipulation px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium text-muted hover:text-fg';
        tab.removeAttribute('aria-current');
      }
    });

    if (settingsModeBadge) {
      settingsModeBadge.textContent =
        mode === 'all'
          ? 'All-in-One'
          : mode === 'passport'
            ? 'PRESETS'
            : mode === 'dpi'
              ? `${state.dpi || 300} DPI`
              : mode === 'exif'
                ? 'EXIF CLEAN'
                : mode.toUpperCase();
    }

    if (mode === 'passport') {
      switchSettingsTab('portal');
      if (dropzonePrompt) dropzonePrompt.textContent = 'Drop any photo or document for presets';
      updateButtons();
      return;
    }

    switchSettingsTab('custom');

    if (!stagesList) {
      updateButtons();
      return;
    }

    if (mode === 'all') {
      // Home page: Display all tools in 1-2-3-4-5 order with NO highlight
      if (stageFormat) stagesList.appendChild(stageFormat);
      if (stageCompress) stagesList.appendChild(stageCompress);
      if (stageCrop) stagesList.appendChild(stageCrop);
      if (stageResize) stagesList.appendChild(stageResize);
      if (stageDpi) stagesList.appendChild(stageDpi);
      if (toggleMoreToolsWrapper) {
        stagesList.appendChild(toggleMoreToolsWrapper);
        toggleMoreToolsWrapper.classList.add('hidden');
      }
      if (stageAdvanced) {
        stagesList.appendChild(stageAdvanced);
        stageAdvanced.classList.remove('border-accent', 'bg-accent/5', 'shadow-xs', 'ring-1', 'ring-accent/20');
        stageAdvanced.classList.add('border-border/80', 'bg-surface/40');
      }

      [stageFormat, stageCompress, stageCrop, stageResize, stageDpi].forEach((stage) => {
        stage?.classList.remove('hidden');
        stage?.classList.remove('border-accent', 'bg-accent/5', 'shadow-xs', 'ring-1', 'ring-accent/20');
        stage?.classList.add('border-border', 'bg-surface/40');
      });

      if (dropzonePrompt) dropzonePrompt.textContent = 'Drop any image or document here';
      updateStageDots();
      updateButtons();
      return;
    }

    // Dedicated single-tool pages or tabs
    let primary: HTMLElement | null = null;
    let pinnedSecondary: HTMLElement | null = null;
    let secondary: (HTMLElement | null)[] = [];
    let moreLabel = 'Additional Editing & Compression Tools';
    let dropPrompt = 'Drop any image or document here';

    const hasDistinctFormatPair =
      state.from.toLowerCase() !== state.to.toLowerCase() &&
      !(state.from.toLowerCase() === 'jpeg' && state.to.toLowerCase() === 'jpg');

    if (mode === 'convert') {
      primary = stageFormat;
      if (state.targetKb !== null || state.targetSizeMode === 'range' || state.targetSizeMode === 'quality') {
        pinnedSecondary = stageCompress;
        secondary = [stageCrop, stageResize, stageDpi];
      } else {
        secondary = [stageCompress, stageCrop, stageResize, stageDpi];
      }
      moreLabel = 'Add Compression, Crop, or Resize (Optional)';
      dropPrompt = state.mergePdf ? 'Drop multiple photos to merge into PDF' : 'Drop any photo or document to convert';
    } else if (mode === 'compress') {
      primary = stageCompress;
      if (hasDistinctFormatPair) {
        pinnedSecondary = stageFormat;
        secondary = [stageCrop, stageResize, stageDpi];
      } else {
        secondary = [stageFormat, stageCrop, stageResize, stageDpi];
      }
      moreLabel = 'Add Format, Crop, or Resize (Optional)';
      dropPrompt =
        state.targetSizeMode === 'exact'
          ? 'Drop any image or PDF to increase or set exact KB'
          : state.targetSizeMode === 'range' && state.minKb && state.maxKb
            ? `Drop any photo to compress to ${state.minKb}–${state.maxKb} KB`
            : 'Drop any photo to compress file size';
    } else if (mode === 'crop') {
      primary = stageCrop;
      secondary = [stageResize, stageFormat, stageCompress, stageDpi];
      moreLabel = 'Add Resize, Format, or Compression (Optional)';
      dropPrompt =
        state.cropAspect && state.cropAspect !== 'original'
          ? `Drop any photo to crop to ${state.cropAspect}`
          : 'Drop any photo to crop & frame';
    } else if (mode === 'resize') {
      primary = stageResize;
      secondary = [stageCrop, stageFormat, stageCompress, stageDpi];
      moreLabel = 'Add Crop, Format, or Compression (Optional)';
      dropPrompt =
        state.unit !== 'px'
          ? `Drop any photo to resize in ${state.unit.toUpperCase()}`
          : 'Drop any photo to resize resolution';
    } else if (mode === 'dpi') {
      primary = stageDpi;
      secondary = [stageResize, stageCompress, stageFormat, stageCrop];
      moreLabel = 'Add Resize, Compression, or Format (Optional)';
      dropPrompt = `Drop any photo to convert to ${state.dpi || 300} DPI`;
    } else if (mode === 'exif') {
      primary = stageFormat;
      secondary = [stageCompress, stageResize, stageCrop, stageDpi];
      moreLabel = 'Add Compression, Resize, or Crop (Optional)';
      dropPrompt = 'Drop any photo to strip EXIF & GPS metadata';
    }

    if (pinnedSecondary && mode === 'compress') {
      stagesList.appendChild(pinnedSecondary);
      pinnedSecondary.classList.remove('hidden');
      pinnedSecondary.classList.remove('border-border', 'bg-surface/40');
      pinnedSecondary.classList.add('border-accent', 'bg-accent/5', 'shadow-xs', 'ring-1', 'ring-accent/20');
    }

    if (primary) {
      stagesList.appendChild(primary);
      primary.classList.remove('hidden');
      if (mode === 'exif') {
        primary.classList.remove('border-accent', 'bg-accent/5', 'shadow-xs', 'ring-1', 'ring-accent/20');
        primary.classList.add('border-border', 'bg-surface/40');
      } else {
        primary.classList.remove('border-border', 'bg-surface/40');
        primary.classList.add('border-accent', 'bg-accent/5', 'shadow-xs', 'ring-1', 'ring-accent/20');
      }
    }

    if (pinnedSecondary && mode === 'convert') {
      stagesList.appendChild(pinnedSecondary);
      pinnedSecondary.classList.remove('hidden');
      pinnedSecondary.classList.remove('border-border', 'bg-surface/40');
      pinnedSecondary.classList.add('border-accent', 'bg-accent/5', 'shadow-xs', 'ring-1', 'ring-accent/20');
    }

    if (toggleMoreToolsWrapper) {
      stagesList.appendChild(toggleMoreToolsWrapper);
      toggleMoreToolsWrapper.classList.remove('hidden');
    }

    if (moreToolsLabel) moreToolsLabel.textContent = moreLabel;

    secondary.forEach((stage) => {
      if (!stage) return;
      stagesList.appendChild(stage);
      stage.classList.remove('border-accent', 'bg-accent/5', 'shadow-xs', 'ring-1', 'ring-accent/20');
      stage.classList.add('border-border', 'bg-surface/40');
      stage.classList.toggle('hidden', !isMoreToolsOpen);
    });

    if (stageAdvanced) {
      stagesList.appendChild(stageAdvanced);
      if (mode === 'exif') {
        stageAdvanced.open = true;
        stageAdvanced.classList.remove('border-border/80', 'bg-surface/40');
        stageAdvanced.classList.add('border-accent', 'bg-accent/5', 'shadow-xs', 'ring-1', 'ring-accent/20');
      }
    }

    if (dropzonePrompt) dropzonePrompt.textContent = dropPrompt;

    if (scroll && primary) {
      primary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    updateMoreToolsToggle();
    updateStageDots();
    updateButtons();
  }

  function syncPortalPresetUi(id: string): void {
    const preset = PORTAL_PRESETS.find((p) => p.id === id) || PORTAL_PRESETS[0]!;
    const isNone = preset.id === 'none';
    if (!isNone) {
      ensurePortalCardsHydrated();
    }

    // Auto-switch category filter if preset is outside current filtered category
    if (!isNone && preset.category && activePortalCat !== 'all' && activePortalCat !== preset.category) {
      selectCategoryFilter(preset.category);
    }

    // 1. Update full-width preset cards styling and check badge without altering .hidden
    portalPresetCards.forEach((card) => {
      const cardId = card.dataset.id || 'none';
      const isSelected = cardId === preset.id;
      card.setAttribute('aria-selected', String(isSelected));
      card.classList.toggle('border-accent', isSelected);
      card.classList.toggle('bg-accent/10', isSelected);
      card.classList.toggle('shadow-xs', isSelected);
      card.classList.toggle('border-border', !isSelected);
      card.classList.toggle('bg-surface', !isSelected);
      card.classList.toggle('shadow-2xs', !isSelected);
      const check = card.querySelector('.pk-portal-card-check');
      if (check) {
        check.classList.toggle('hidden', !isSelected);
      }
    });

    // 2. Active Dot on Tab
    if (portalActiveDot) {
      portalActiveDot.classList.toggle('hidden', isNone);
    }

    // 3. Custom Mode Active Banner
    const effectiveFmt = state.to.toUpperCase();
    const effectiveKbSummary =
      state.targetSizeMode === 'range' && state.minKb && state.maxKb
        ? `${state.minKb}–${state.maxKb} KB`
        : `Max ${state.targetKb ?? preset.targetKb} KB`;
    if (customActiveBanner) {
      customActiveBanner.classList.toggle('hidden', isNone);
    }
    if (bannerFlag) bannerFlag.textContent = preset.countryCode || preset.flag;
    if (bannerName) bannerName.textContent = `${preset.name} Active`;
    if (bannerDetails) bannerDetails.textContent = `${preset.dimLabel} · ${effectiveKbSummary} ${effectiveFmt}`;

    // 4. Panel Reset Buttons
    if (portalPanelReset) {
      portalPanelReset.classList.toggle('hidden', isNone);
    }

    // 5. Applied summary inside portal tab
    if (portalAppliedSummary) {
      if (!isNone && preset.portalSummary) {
        portalAppliedSummary.textContent = `✓ ${preset.dimLabel} (${preset.cropAspect} crop) · ${effectiveKbSummary} ${effectiveFmt} applied`;
        portalAppliedSummary.classList.remove('hidden');
      } else {
        portalAppliedSummary.classList.add('hidden');
      }
    }

    // 6. Synchronize DropZone locked badge
    const dropzoneBadge = document.getElementById('pk-locked-preset-badge');
    if (dropzoneBadge) {
      if (!isNone) {
        const effectiveKb = state.targetKb ?? preset.targetKb;
        const kbPart =
          state.targetSizeMode === 'range' && state.minKb && state.maxKb
            ? `${state.minKb}–${state.maxKb} KB`
            : effectiveKb
              ? `≤ ${formatSizeLabel(effectiveKb)}`
              : '';
        const dimPart = preset.dimLabel || '';
        const fmtSuffix = effectiveFmt === 'PDF' ? ' • PDF' : '';
        const labelText = kbPart && dimPart
          ? `Locked Preset: ${kbPart} • ${dimPart}${fmtSuffix}`
          : (dimPart ? `Locked Preset: ${preset.name} (${dimPart})` : `Locked Preset: ${preset.name}`);
        const span = dropzoneBadge.querySelector('span');
        if (span) span.textContent = labelText;
        dropzoneBadge.classList.remove('hidden');
      } else {
        dropzoneBadge.classList.add('hidden');
      }
    }
  }

  async function applyPortalPreset(id: string, isInitialBoot = false): Promise<void> {
    const preset = PORTAL_PRESETS.find((p) => p.id === id);
    if (!preset || preset.id === 'none') {
      state.portalPreset = null;
      savedMaxTargetValue = '';
      savedExactTargetValue = '100';
      state.targetKb = null;
      if (targetSelect) {
        targetSelect.value = '';
      }
      syncCustomTargetUi('');
      setSizeMode('max');

      // 1. Output Format -> Reset to default format
      const defaultTo = root?.dataset.to || 'jpg';
      state.to = defaultTo;
      state.toMime = root?.dataset.toMime || mimeForExtension(defaultTo) || 'image/jpeg';
      if (outputSelect) {
        outputSelect.value = defaultTo;
      }
      syncCustomFormatUi(defaultTo);

      // 2. Crop Aspect & Anchor -> Reset to Original
      state.cropAspect = 'original';
      state.cropAnchor = 'center';
      if (cropAspectSelect) {
        cropAspectSelect.value = 'original';
      }
      syncCustomCropUi('original');

      // 3. Dimensions & Scale -> Reset to 100% Original
      state.dimensions = { mode: 'original', noUpscale: true };
      state.scalePercent = 100;
      state.dpi = null;
      syncDpiUi();
      scaleBtns.forEach((btn) => {
        const isSelected = btn.dataset.scale === '100';
        btn.className = isSelected
          ? 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors bg-surface text-fg shadow-sm'
          : 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors text-muted hover:text-fg';
      });
      if (resizeHint) resizeHint.textContent = '100% (Original)';
      customDimsContainer?.classList.add('hidden');
      if (dimWidthInput) dimWidthInput.value = '';
      if (dimHeightInput) dimHeightInput.value = '';

      // 4. Reset crop and scale values on all loaded pics as well
      state.jobs.forEach((j) => {
        j.cropAspect = 'original';
        j.cropAnchor = 'center';
        j.customCropBox = undefined;
        j.croppedWidth = undefined;
        j.croppedHeight = undefined;
        j.dimensions = { mode: 'original', noUpscale: true };
        j.dpi = undefined;
        j.scalePercent = 100;
        j.targetKb = null;
        j.to = undefined;
        j.toMime = undefined;
        if (j.adjustedPreviewUrl) {
          URL.revokeObjectURL(j.adjustedPreviewUrl);
          j.adjustedPreviewUrl = undefined;
        }
        if (j.croppedPreviewUrl) {
          URL.revokeObjectURL(j.croppedPreviewUrl);
          j.croppedPreviewUrl = undefined;
        }
        j.adjustedWidth = undefined;
        j.adjustedHeight = undefined;
        if (j.status === 'done') {
          j.status = 'queued';
          j.result = undefined;
          if (j.resultPreviewUrl) {
            URL.revokeObjectURL(j.resultPreviewUrl);
            j.resultPreviewUrl = undefined;
          }
          if (j.resultThumbUrl) {
            if (j.resultThumbUrl !== j.resultPreviewUrl) URL.revokeObjectURL(j.resultThumbUrl);
            j.resultThumbUrl = undefined;
          }
        }
      });

      // 5. Update UI
      syncPortalPresetUi('none');
      if (selectedJobId) {
        const activeJob = state.jobs.find((j) => j.id === selectedJobId) || null;
        syncSidebarToSelectedJob(activeJob);
      }
    renderFiles();
      updateLiveDimensionsAndCardPreviews();
      updateStageDots();
      updateButtons();
      setStatus('Reset portal preset. Returned all photos and settings to default.');
      return;
    }

    const keepPdfOutput = isInitialBoot && (root?.dataset.to || '').toLowerCase() === 'pdf';
    const nextTo = keepPdfOutput ? 'pdf' : 'jpg';
    const nextMime = keepPdfOutput ? 'application/pdf' : 'image/jpeg';
    const explicitPageKb = isInitialBoot && initialTarget ? initialTarget : preset.targetKb;
    const preserveRange = isInitialBoot && initialSizeMode === 'range' && initialMinKb && initialMaxKb;

    state.portalPreset = preset.id;
    savedMaxTargetValue = String(explicitPageKb);
    savedExactTargetValue = String(explicitPageKb);

    // 1. Output Format -> JPG (or PDF if dedicated PDF portal page)
    state.to = nextTo;
    state.toMime = nextMime;
    if (outputSelect) {
      outputSelect.value = nextTo;
    }
    syncCustomFormatUi(nextTo);

    // 2. Target KB & Mode
    if (preserveRange) {
      state.minKb = initialMinKb;
      state.maxKb = initialMaxKb;
      state.targetKb = initialMaxKb;
      state.targetSizeMode = 'range';
      if (minKbInput) minKbInput.value = String(initialMinKb);
      if (maxKbInput) maxKbInput.value = String(initialMaxKb);
      setSizeMode('range');
    } else {
      state.targetKb = explicitPageKb;
      state.targetSizeMode = 'max';
      state.maxKb = explicitPageKb;
      if (targetSelect) {
        const hasOpt = Array.from(targetSelect.options).some((o) => o.value === String(explicitPageKb));
        targetSelect.value = hasOpt ? String(explicitPageKb) : 'custom';
        if (targetSelect.value === 'custom' && customKbInput) {
          customKbInput.value = String(explicitPageKb);
        }
      }
      setSizeMode('max');
      syncCustomTargetUi(targetSelect?.value || String(explicitPageKb));
    }

    // 3. Crop Aspect & Anchor -> preset.cropAspect, preset.cropAnchor
    state.cropAspect = preset.cropAspect;
    state.cropAnchor = preset.cropAnchor;
    if (cropAspectSelect) {
      cropAspectSelect.value = preset.cropAspect;
    }
    syncCustomCropUi(preset.cropAspect);

    // 4. Dimensions -> Exact pixel bounding dimensions with cover fit + official DPI
    const presetDpi = preset.id === 'pan-card' ? 200 : preset.category === 'social' ? null : 300;
    state.dpi = presetDpi;
    syncDpiUi();
    state.scalePercent = null;
    state.dimensions = {
      mode: 'custom',
      width: preset.width ?? undefined,
      height: preset.height ?? undefined,
      dpi: presetDpi ?? undefined,
      fit: 'cover',
      lockAspectRatio: false,
    };
    scaleBtns.forEach((btn) => {
      const isSelected = btn.dataset.scale === 'custom';
      btn.className = isSelected
        ? 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors bg-surface text-fg shadow-sm'
        : 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors text-muted hover:text-fg';
    });
    if (resizeHint) resizeHint.textContent = `${preset.width}×${preset.height} px`;

    // 5. Apply to all loaded jobs
    state.jobs.forEach((j) => {
      j.cropAspect = preset.cropAspect;
      j.cropAnchor = preset.cropAnchor;
      j.customCropBox = undefined;
      j.croppedWidth = undefined;
      j.croppedHeight = undefined;
      j.scalePercent = undefined;
      j.dpi = presetDpi;
      j.dimensions = {
        mode: 'custom',
        width: preset.width ?? undefined,
        height: preset.height ?? undefined,
        dpi: presetDpi ?? undefined,
        fit: 'cover',
        lockAspectRatio: false,
      };
      j.targetKb = state.targetKb;
      j.minKb = state.minKb;
      j.maxKb = state.maxKb;
      j.targetSizeMode = state.targetSizeMode;
      j.to = nextTo;
      j.toMime = nextMime;
      if (j.status === 'done') {
        j.status = 'queued';
        j.result = undefined;
      }
    });

    syncPortalPresetUi(preset.id);
    if (selectedJobId) {
      const activeJob = state.jobs.find((j) => j.id === selectedJobId) || null;
      syncSidebarToSelectedJob(activeJob);
    }
    renderFiles();
    updateLiveDimensionsAndCardPreviews();
    updateStageDots();
    updateButtons();
    const kbLabel = preserveRange ? `${state.minKb}–${state.maxKb} KB` : `Max ${state.targetKb} KB`;
    setStatus(`Applied ${preset.flag} ${preset.name}: ${preset.dimLabel}, ${kbLabel} ${nextTo.toUpperCase()}`);
  }

  function syncCustomFormatUi(toVal: string): void {
    const isExplicitJpeg = toVal.toLowerCase() === 'jpeg';
    const norm = isExplicitJpeg ? 'jpg' : toVal.toLowerCase();
    customFormatOptions.forEach((opt) => {
      const val = (opt.dataset.value || '').toLowerCase();
      const isSelected = val === norm;
      opt.setAttribute('aria-selected', String(isSelected));
      if (isSelected) {
        opt.className =
          'pk-custom-format-option w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer group bg-accent/10 border border-accent/30';
        if (selectedFormatBadge) selectedFormatBadge.textContent = isExplicitJpeg ? 'JPEG' : (opt.dataset.badge || val.toUpperCase());
        if (selectedFormatTitle) selectedFormatTitle.textContent = isExplicitJpeg ? 'JPEG (.jpeg)' : (opt.dataset.title || val.toUpperCase());
        if (selectedFormatDesc) selectedFormatDesc.textContent = isExplicitJpeg ? 'Strict .jpeg portal extension' : (opt.dataset.desc || '');
      } else {
        opt.className =
          'pk-custom-format-option w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer group hover:bg-bg/80 border border-transparent';
      }
      const check = opt.querySelector('.pk-option-check');
      if (check) {
        check.classList.toggle('hidden', !isSelected);
      }
    });
  }

  function syncCustomCropUi(cropVal: string): void {
    const norm = cropVal || 'original';
    customCropOptions.forEach((opt) => {
      const val = opt.dataset.value || 'original';
      const isSelected = val === norm;
      opt.setAttribute('aria-selected', String(isSelected));
      if (isSelected) {
        opt.className =
          'pk-custom-crop-option w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer group bg-accent/10 border border-accent/30';
        if (selectedCropBadge) selectedCropBadge.textContent = opt.dataset.badge || val.toUpperCase();
        if (selectedCropTitle) selectedCropTitle.textContent = val === 'original' ? 'Original Aspect' : (opt.dataset.title || val);
        if (selectedCropDesc) selectedCropDesc.textContent = opt.dataset.desc || '';
      } else {
        opt.className =
          'pk-custom-crop-option w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer group hover:bg-bg/80 border border-transparent';
      }
      const check = opt.querySelector('.pk-crop-option-check');
      if (check) {
        check.classList.toggle('hidden', !isSelected);
      }
    });

    if (cropAnchorContainer) {
      cropAnchorContainer.classList.toggle('hidden', norm === 'original');
    }
    const cropHint = document.getElementById('pk-crop-hint');
    if (cropHint) {
      const presetLabels: Record<string, string> = {
        original: 'Original',
        '1:1': '1:1 Square',
        '3.5:4.5': '3.5×4.5 ID',
        '4:5': '4:5 Portrait',
        '4:3': '4:3 Std',
        '16:9': '16:9 Wide',
        '9:16': '9:16 Story',
        '3:2': '3:2 Classic',
        '3:4': '3:4 Portrait',
        '5:7': '5:7 Canada',
        '2:1': '2:1 Signature',
        '3:1': '3:1 Header',
        '4:1': '4:1 LinkedIn',
      };
      cropHint.textContent = presetLabels[norm] || norm;
    }
  }

  function formatSizeLabel(kb: number): string {
    if (kb >= 1024) {
      const mb = kb / 1024;
      return mb % 1 === 0 ? `${mb} MB` : `${mb.toFixed(1)} MB (${kb.toLocaleString()} KB)`;
    }
    return `${kb} KB`;
  }

  function syncCustomTargetUi(targetVal: string): void {
    const isExact = state.targetSizeMode === 'exact';
    customTargetOptions.forEach((opt) => {
      const val = opt.dataset.value ?? '';
      const isSelected = val === targetVal;
      opt.setAttribute('aria-selected', String(isSelected));

      if (val === '') {
        opt.classList.toggle('hidden', isExact);
      }

      const rawTitle = opt.dataset.title || '';
      let displayTitle = rawTitle;
      if (val && val !== 'custom') {
        if (isExact) {
          displayTitle = rawTitle.replace(/^Under\s+/i, 'Exact ');
          if (!displayTitle.startsWith('Exact ')) displayTitle = `Exact ${displayTitle}`;
        } else {
          displayTitle = rawTitle.replace(/^Exact\s+/i, 'Under ');
          if (!displayTitle.startsWith('Under ')) displayTitle = `Under ${displayTitle}`;
        }
      }

      const titleEl = opt.querySelector('span.font-semibold');
      if (titleEl) titleEl.textContent = displayTitle;

      if (isSelected) {
        opt.className =
          'pk-custom-target-option w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer group bg-accent/10 border border-accent/30';
        if (val === 'custom' && state.targetKb && state.targetKb > 0) {
          const customLabel = formatSizeLabel(state.targetKb);
          if (selectedTargetBadge) selectedTargetBadge.textContent = customLabel;
          if (selectedTargetTitle) selectedTargetTitle.textContent = `${isExact ? 'Exact ' : 'Under '}${customLabel}`;
        } else {
          if (selectedTargetBadge) selectedTargetBadge.textContent = opt.dataset.badge || (val ? `${val} KB` : 'AUTO');
          if (selectedTargetTitle) selectedTargetTitle.textContent = displayTitle;
        }
        if (selectedTargetDesc) selectedTargetDesc.textContent = opt.dataset.desc || '';
      } else {
        opt.className =
          'pk-custom-target-option w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer group hover:bg-bg/80 border border-transparent';
      }
      const check = opt.querySelector('.pk-target-check, .pk-target-option-check');
      if (check) {
        check.classList.toggle('hidden', !isSelected);
      }
    });
  }

  async function generateFastThumbnail(file: File | Blob, maxDim = 200): Promise<string | null> {
    const ext = 'name' in file ? (file.name.split('.').pop()?.toLowerCase() || '') : (file.type.split('/')[1] || 'jpg');
    if (!['jpg', 'jpeg', 'png', 'webp', 'bmp', 'avif'].includes(ext) && !file.type.startsWith('image/')) {
      return null;
    }
    try {
      let bmp: ImageBitmap | null = null;
      try {
        bmp = await createImageBitmap(file, { resizeWidth: maxDim, resizeQuality: 'low' });
      } catch {
        try {
          bmp = await createImageBitmap(file);
        } catch {
          return null;
        }
      }
      if (!bmp) return null;

      let targetW = bmp.width;
      let targetH = bmp.height;
      if (Math.max(targetW, targetH) > maxDim) {
        const scale = maxDim / Math.max(targetW, targetH);
        targetW = Math.max(1, Math.round(targetW * scale));
        targetH = Math.max(1, Math.round(targetH * scale));
      }

      let blob: Blob | null = null;
      if (typeof OffscreenCanvas !== 'undefined') {
        const oc = new OffscreenCanvas(targetW, targetH);
        const ctx = oc.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'low';
          ctx.drawImage(bmp, 0, 0, targetW, targetH);
          blob = await oc.convertToBlob({ type: 'image/jpeg', quality: 0.75 });
        }
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'low';
          ctx.drawImage(bmp, 0, 0, targetW, targetH);
          blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.75));
        }
      }

      bmp.close?.();
      return blob ? URL.createObjectURL(blob) : null;
    } catch {
      return null;
    }
  }

  async function renderImageTransformCanvas(
    job: FileJob,
    applyScale: boolean
  ): Promise<{ blob: Blob | null; width: number; height: number } | null> {
    if (!job.previewUrl) return null;
    const srcW = job.originalWidth;
    const srcH = job.originalHeight;
    if (!srcW || !srcH) return null;

    const aspect = job.cropAspect ?? state.cropAspect;
    const anchor = job.cropAnchor || state.cropAnchor || 'center';

    let cropX = 0;
    let cropY = 0;
    let cropW = srcW;
    let cropH = srcH;

    const hasCustomBox = !!job.customCropBox;
    const hasAspectCrop = !hasCustomBox && !!(aspect && aspect !== 'original' && ASPECT_RATIOS[aspect]);

    if (hasCustomBox && job.customCropBox) {
      cropX = Math.max(0, Math.min(srcW - 1, Math.round(job.customCropBox.x * srcW)));
      cropY = Math.max(0, Math.min(srcH - 1, Math.round(job.customCropBox.y * srcH)));
      cropW = Math.max(10, Math.min(srcW - cropX, Math.round(job.customCropBox.width * srcW)));
      cropH = Math.max(10, Math.min(srcH - cropY, Math.round(job.customCropBox.height * srcH)));
    } else if (hasAspectCrop && ASPECT_RATIOS[aspect]) {
      const targetRatio = ASPECT_RATIOS[aspect];
      const srcRatio = srcW / srcH;
      if (srcRatio > targetRatio) {
        cropW = Math.round(srcH * targetRatio);
        cropX = Math.round((srcW - cropW) / 2);
      } else {
        cropH = Math.round(srcW / targetRatio);
        if (anchor === 'top') {
          cropY = 0;
        } else if (anchor === 'bottom') {
          cropY = Math.max(0, srcH - cropH);
        } else {
          cropY = Math.round((srcH - cropH) / 2);
        }
      }
    }

    let canvasW = cropW;
    let canvasH = cropH;
    let drawX = 0;
    let drawY = 0;
    let drawW = cropW;
    let drawH = cropH;

    if (applyScale) {
      const dims = job.dimensions ?? state.dimensions;
      const scalePct = dims.mode === 'original'
        ? null
        : (dims.scalePercent ?? (dims.mode === 'custom' && (dims.width || dims.height) ? null : state.scalePercent));
      const noUpscale = dims.noUpscale !== false;

      if (scalePct && scalePct > 0 && scalePct !== 100) {
        let s = scalePct / 100;
        if (noUpscale && s > 1.0) s = 1.0;
        const scaledW = Math.max(10, Math.round(cropW * s));
        const scaledH = Math.max(10, Math.round(cropH * s));
        canvasW = scaledW;
        canvasH = scaledH;
        drawW = scaledW;
        drawH = scaledH;
      } else if (dims.mode === 'custom' && dims.width && dims.height) {
        const reqW = dims.width;
        const reqH = dims.height;
        const fit = dims.fit || (dims.lockAspectRatio !== false ? 'contain' : 'fill');
        canvasW = reqW;
        canvasH = reqH;

        if (fit === 'cover') {
          let s = Math.max(reqW / cropW, reqH / cropH);
          if (noUpscale && s > 1.0) s = 1.0;
          drawW = Math.round(cropW * s);
          drawH = Math.round(cropH * s);
          drawX = Math.round((reqW - drawW) / 2);
          drawY = Math.round((reqH - drawH) / 2);
        } else if (fit === 'fill') {
          drawW = reqW;
          drawH = reqH;
          drawX = 0;
          drawY = 0;
        } else {
          let s = Math.min(reqW / cropW, reqH / cropH);
          if (noUpscale && s > 1.0) s = 1.0;
          drawW = Math.max(10, Math.round(cropW * s));
          drawH = Math.max(10, Math.round(cropH * s));
          drawX = Math.round((reqW - drawW) / 2);
          drawY = Math.round((reqH - drawH) / 2);
        }
      } else if (dims.mode === 'passport') {
        canvasW = 413;
        canvasH = 531;
        let s = Math.min(413 / cropW, 531 / cropH);
        drawW = Math.max(10, Math.round(cropW * s));
        drawH = Math.max(10, Math.round(cropH * s));
        drawX = Math.round((413 - drawW) / 2);
        drawY = Math.round((531 - drawH) / 2);
      } else if (dims.mode === 'square') {
        canvasW = 600;
        canvasH = 600;
        let s = Math.min(600 / cropW, 600 / cropH);
        drawW = Math.max(10, Math.round(cropW * s));
        drawH = Math.max(10, Math.round(cropH * s));
        drawX = Math.round((600 - drawW) / 2);
        drawY = Math.round((600 - drawH) / 2);
      }
    }

    const deg = ((job.rotate ?? 0) % 360 + 360) % 360;
    const isFlippedH = !!job.flipH;
    const isFlippedV = !!job.flipV;
    const isGray = !!(job.grayscale ?? state.grayscale);
    const isSwapped = deg === 90 || deg === 270;
    const finalW = isSwapped ? canvasH : canvasW;
    const finalH = isSwapped ? canvasW : canvasH;

    try {
      let sourceBmp: ImageBitmap | HTMLImageElement;
      if (job.file) {
        try {
          sourceBmp = await createImageBitmap(job.file);
        } catch {
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Image failed to load for adjusted preview'));
            img.src = job.previewUrl!;
          });
          sourceBmp = img;
        }
      } else {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Image failed to load for adjusted preview'));
          img.src = job.previewUrl!;
        });
        sourceBmp = img;
      }

      // Cap preview canvas dimensions to max 800px for instant rendering and low memory footprint
      const MAX_PREVIEW_PX = 800;
      let previewW = finalW;
      let previewH = finalH;
      let pScale = 1.0;
      if (Math.max(finalW, finalH) > MAX_PREVIEW_PX) {
        pScale = MAX_PREVIEW_PX / Math.max(finalW, finalH);
        previewW = Math.max(10, Math.round(finalW * pScale));
        previewH = Math.max(10, Math.round(finalH * pScale));
      }

      const canvas = document.createElement('canvas');
      canvas.width = previewW;
      canvas.height = previewH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, previewW, previewH);

        if (isGray) {
          ctx.filter = 'grayscale(100%)';
        }

        ctx.save();
        ctx.translate(previewW / 2, previewH / 2);

        if (deg !== 0) {
          ctx.rotate((deg * Math.PI) / 180);
        }

        const scaleX = isFlippedH ? -1 : 1;
        const scaleY = isFlippedV ? -1 : 1;
        if (scaleX !== 1 || scaleY !== 1) {
          ctx.scale(scaleX, scaleY);
        }

        const scaledDrawX = drawX * pScale;
        const scaledDrawY = drawY * pScale;
        const scaledDrawW = drawW * pScale;
        const scaledDrawH = drawH * pScale;
        const scaledCanvasW = canvasW * pScale;
        const scaledCanvasH = canvasH * pScale;

        ctx.drawImage(
          sourceBmp,
          cropX,
          cropY,
          cropW,
          cropH,
          -scaledCanvasW / 2 + scaledDrawX,
          -scaledCanvasH / 2 + scaledDrawY,
          scaledDrawW,
          scaledDrawH
        );

        ctx.restore();

        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.80));
        if ('close' in sourceBmp && typeof (sourceBmp as ImageBitmap).close === 'function') {
          (sourceBmp as ImageBitmap).close();
        }
        return { blob, width: finalW, height: finalH };
      }

      if ('close' in sourceBmp && typeof (sourceBmp as ImageBitmap).close === 'function') {
        (sourceBmp as ImageBitmap).close();
      }
      return null;
    } catch (e) {
      console.warn('Could not generate preview canvas:', e);
      return null;
    }
  }

  async function generateJobCroppedPreview(job: FileJob): Promise<void> {
    if (!job.previewUrl || !job.originalWidth || !job.originalHeight) return;
    const aspect = job.cropAspect ?? state.cropAspect;
    const hasCustomBox = !!job.customCropBox;
    const deg = ((job.rotate ?? 0) % 360 + 360) % 360;
    const hasTransform = deg !== 0 || !!job.flipH || !!job.flipV || !!(job.grayscale ?? state.grayscale);
    const hasCrop = hasCustomBox || (aspect && aspect !== 'original');

    if (!hasCrop && !hasTransform) {
      if (job.croppedPreviewUrl && job.croppedPreviewUrl !== job.adjustedPreviewUrl) {
        URL.revokeObjectURL(job.croppedPreviewUrl);
      }
      job.croppedPreviewUrl = undefined;
      job.croppedWidth = undefined;
      job.croppedHeight = undefined;
      return;
    }

    const res = await renderImageTransformCanvas(job, false);
    if (res && res.blob) {
      if (job.croppedPreviewUrl && job.croppedPreviewUrl !== job.adjustedPreviewUrl) {
        URL.revokeObjectURL(job.croppedPreviewUrl);
      }
      job.croppedPreviewUrl = URL.createObjectURL(res.blob);
      job.croppedWidth = res.width;
      job.croppedHeight = res.height;
    }
  }

  async function generateJobAdjustedPreview(job: FileJob): Promise<void> {
    if (!job.previewUrl || !job.originalWidth || !job.originalHeight) return;

    // Ensure base cropped preview is cleanly generated first
    await generateJobCroppedPreview(job);

    const dims = job.dimensions ?? state.dimensions;
    const scalePct = dims.mode === 'original'
      ? null
      : (dims.scalePercent ?? (dims.mode === 'custom' && (dims.width || dims.height) ? null : state.scalePercent));
    const hasResize = (scalePct && scalePct !== 100) || (dims && dims.mode === 'custom' && Boolean(dims.width || dims.height)) || dims.mode === 'passport' || dims.mode === 'square';

    if (!hasResize) {
      if (job.adjustedPreviewUrl && job.adjustedPreviewUrl !== job.croppedPreviewUrl) {
        URL.revokeObjectURL(job.adjustedPreviewUrl);
      }
      job.adjustedPreviewUrl = undefined;
      job.adjustedWidth = job.croppedWidth || job.originalWidth;
      job.adjustedHeight = job.croppedHeight || job.originalHeight;
      return;
    }

    const res = await renderImageTransformCanvas(job, true);
    if (res && res.blob) {
      if (job.adjustedPreviewUrl && job.adjustedPreviewUrl !== job.croppedPreviewUrl) {
        URL.revokeObjectURL(job.adjustedPreviewUrl);
      }
      job.adjustedPreviewUrl = URL.createObjectURL(res.blob);
      job.adjustedWidth = res.width;
      job.adjustedHeight = res.height;
    }
  }

  function calculatePredictedDimensions(
    srcW: number,
    srcH: number,
    aspect: CropAspectPreset,
    scalePct: number | null,
    dims: DimensionOptions,
    customCropBox?: CustomCropBox,
    rotate?: number
  ): { w: number; h: number; conflict: boolean; conflictMsg: string; srcMP: number; predMP: number } {
    let w = srcW;
    let h = srcH;
    let conflict = false;
    let conflictMsg = '';

    // 1. Crop calculation
    if (customCropBox) {
      w = Math.max(10, Math.round(customCropBox.width * srcW));
      h = Math.max(10, Math.round(customCropBox.height * srcH));
    } else if (aspect && aspect !== 'original' && ASPECT_RATIOS[aspect]) {
      const targetRatio = ASPECT_RATIOS[aspect];
      const srcRatio = srcW / srcH;
      if (srcRatio > targetRatio) {
        w = Math.round(srcH * targetRatio);
      } else {
        h = Math.round(srcW / targetRatio);
      }
    }

    const fit = dims.fit || (dims.lockAspectRatio !== false ? 'contain' : 'fill');
    const noUpscale = dims.noUpscale !== false;

    // 2. Scale & Resize calculation (applies to the cropped w & h)
    const effectiveScale = dims.mode === 'original'
      ? null
      : (dims.scalePercent ?? (dims.mode === 'custom' && (dims.width || dims.height) ? null : scalePct));

    if (effectiveScale && effectiveScale > 0 && effectiveScale !== 100) {
      let s = effectiveScale / 100;
      if (noUpscale && s > 1.0) s = 1.0;
      w = Math.max(10, Math.round(w * s));
      h = Math.max(10, Math.round(h * s));
    } else if (dims.mode === 'custom' && dims.width && dims.height) {
      const reqW = dims.width;
      const reqH = dims.height;

      if (fit === 'fill' && aspect && aspect !== 'original' && ASPECT_RATIOS[aspect]) {
        const customRatio = reqW / reqH;
        const expectedRatio = ASPECT_RATIOS[aspect];
        if (Math.abs(customRatio - expectedRatio) > 0.05) {
          conflict = true;
          conflictMsg = `Custom ${reqW}×${reqH} px conflicts with the ${aspect} crop ratio. 'Fit Within' or aspect ratio lock recommended.`;
        }
      }
      w = reqW;
      h = reqH;
    } else if (dims.mode === 'passport') {
      w = 413;
      h = 531;
    } else if (dims.mode === 'square') {
      w = 600;
      h = 600;
    }

    const deg = ((rotate ?? 0) % 360 + 360) % 360;
    if (deg === 90 || deg === 270) {
      const tmp = w;
      w = h;
      h = tmp;
    }

    const hasSvg =
      state.to === 'svg' ||
      state.from === 'svg' ||
      state.jobs.some((j) => j.file.name.toLowerCase().endsWith('.svg'));
    if (hasSvg && state.svgScale && state.svgScale !== 1) {
      w = Math.round(w * state.svgScale);
      h = Math.round(h * state.svgScale);
    }

    const srcMP = Number(((srcW * srcH) / 1_000_000).toFixed(1));
    const predMP = Number(((w * h) / 1_000_000).toFixed(1));

    return { w, h, conflict, conflictMsg, srcMP, predMP };
  }

  function updateLiveDimensionsAndCardPreviews(): void {
    // 1. Toggle Crop Anchor visibility
    const isCropping = state.cropAspect !== 'original';
    if (cropAnchorContainer) {
      cropAnchorContainer.classList.toggle('hidden', !isCropping);
    }

    // 2. Compute predicted output for settings panel badge
    const firstJobWithDims = state.jobs.find((j) => j.originalWidth && j.originalHeight);
    if (firstJobWithDims && firstJobWithDims.originalWidth && firstJobWithDims.originalHeight) {
      const pred = calculatePredictedDimensions(
        firstJobWithDims.originalWidth,
        firstJobWithDims.originalHeight,
        firstJobWithDims.cropAspect ?? state.cropAspect,
        state.scalePercent,
        state.dimensions,
        firstJobWithDims.customCropBox,
        firstJobWithDims.rotate
      );

      if (liveDimOutput) {
        const scaleText = state.scalePercent && state.scalePercent !== 100 ? ` · ${state.scalePercent}% Scale` : '';
        const cropText = firstJobWithDims.customCropBox
          ? ` · Custom Crop`
          : (state.cropAspect !== 'original' ? ` · ${state.cropAspect} Crop` : '');
        const hasSvgText =
          state.to === 'svg' ||
          state.from === 'svg' ||
          firstJobWithDims.file.name.toLowerCase().endsWith('.svg');
        const svgText = hasSvgText ? ` · ${state.svgScale}x SVG Vector` : '';
        liveDimOutput.textContent = `${firstJobWithDims.originalWidth}×${firstJobWithDims.originalHeight} (${pred.srcMP} MP) ➔ ${pred.w}×${pred.h} (${pred.predMP} MP)${cropText}${scaleText}${svgText}`;
      }

      if (cropConflictAlert) {
        cropConflictAlert.classList.toggle('hidden', !pred.conflict);
        if (cropConflictText && pred.conflict) {
          cropConflictText.textContent = pred.conflictMsg;
        }
      }
    } else if (liveDimOutput) {
      liveDimOutput.textContent = 'Auto (detected on upload)';
      if (cropConflictAlert) cropConflictAlert.classList.add('hidden');
    }

    // 3. Update each card's thumbnail framing & predicted dimension badge
    const items = activeFileList.querySelectorAll<HTMLElement>('.pk-file-item');
    items.forEach((item) => {
      const id = item.dataset.id;
      const job = state.jobs.find((j) => j.id === id);
      if (!job) return;

      const img = item.querySelector<HTMLImageElement>('.pk-file-img-preview');
      const liveDimsEl = item.querySelector<HTMLElement>('.pk-file-live-dims');

      // Update Card Thumbnail Live Framing
      if (img) {
        const hasCustomBitmap = Boolean(job.resultThumbUrl || job.resultPreviewUrl || job.adjustedPreviewUrl || job.croppedPreviewUrl);
        if (hasCustomBitmap) {
          const targetSrc = (job.resultThumbUrl || job.resultPreviewUrl || job.adjustedPreviewUrl || job.croppedPreviewUrl)!;
          if (img.getAttribute('data-src') !== targetSrc) {
            img.setAttribute('data-src', targetSrc);
            img.src = targetSrc;
          }
          img.style.transform = '';
          img.style.filter = '';
          img.style.aspectRatio = 'auto';
          img.style.objectFit = 'cover';
        } else {
          const currentSrc = job.thumbUrl || job.previewUrl;
          if (currentSrc && img.getAttribute('data-src') !== currentSrc) {
            img.setAttribute('data-src', currentSrc);
            img.src = currentSrc;
          }
          const deg = job.rotate ?? 0;
          const sx = job.flipH ? -1 : 1;
          const isGray = job.grayscale ?? state.grayscale;
          const trans: string[] = [];
          if (deg !== 0) trans.push(`rotate(${deg}deg)`);
          if (sx !== 1) trans.push(`scaleX(${sx})`);
          img.style.transform = trans.join(' ');
          img.style.filter = isGray ? 'grayscale(100%)' : '';

          const aspect = job.cropAspect ?? state.cropAspect;
          const anchor = job.cropAnchor ?? state.cropAnchor;

          if (aspect && aspect !== 'original' && ASPECT_RATIOS[aspect]) {
            img.style.aspectRatio = `${ASPECT_RATIOS[aspect]}`;
            img.style.objectFit = 'cover';
            const posMap: Record<CropAnchor, string> = {
              top: 'top center',
              center: 'center center',
              bottom: 'bottom center',
            };
            img.style.objectPosition = posMap[anchor] || 'center center';
          } else {
            img.style.aspectRatio = 'auto';
            img.style.objectFit = 'cover';
            img.style.objectPosition = 'center center';
          }
        }
      }

      // Update Card Predicted Dimensions
      if (liveDimsEl) {
        if (job.status === 'queued' && job.originalWidth && job.originalHeight) {
          const jobDims = job.dimensions ?? state.dimensions;
          const jobScale = jobDims.mode === 'original'
            ? null
            : (jobDims.scalePercent ?? (jobDims.mode === 'custom' && (jobDims.width || jobDims.height) ? null : state.scalePercent));
          const pred = calculatePredictedDimensions(
            job.originalWidth,
            job.originalHeight,
            job.cropAspect ?? state.cropAspect,
            jobScale,
            jobDims,
            job.customCropBox,
            job.rotate
          );
          const notes: string[] = [];
          if (job.customCropBox) notes.push('Custom Framing');
          else if (job.cropAspect && job.cropAspect !== 'original') notes.push(`${job.cropAspect} Crop`);

          if (jobScale && jobScale !== 100) {
            notes.push(`${jobScale}% Scale`);
          } else if (jobDims && jobDims.mode === 'custom' && jobDims.width && jobDims.height) {
            notes.push(`Resized to ${pred.w}×${pred.h} px`);
          }

          const isSvgJob =
            state.to === 'svg' ||
            state.from === 'svg' ||
            job.file.name.toLowerCase().endsWith('.svg');
          if (isSvgJob) {
            notes.push(`${state.svgScale}x SVG Vector`);
          }

          const deg = job.rotate ?? 0;
          if (deg !== 0) notes.push(`${deg}° Rotate`);
          if (job.flipH) notes.push('Flip');
          if (job.grayscale ?? state.grayscale) notes.push('B&W');

          const defaultTo = (root?.dataset.to || 'jpg').toUpperCase();
          const jobTo = (job.to || state.to).toUpperCase();
          if (job.to && job.to.toUpperCase() !== defaultTo) {
            notes.unshift(`➔ ${jobTo}`);
          }
          if (job.targetKb) {
            const effMode = job.targetSizeMode || state.targetSizeMode;
            const prefix = effMode === 'exact' ? 'Exact' : effMode === 'range' ? 'Range ≤' : 'Max';
            notes.push(`${prefix} ${formatSizeLabel(job.targetKb)}`);
          }
          const effDpi = job.dpi ?? state.dpi;
          if (effDpi) {
            notes.push(`${effDpi} DPI`);
          }
          if (!state.preserveMetadata && currentToolMode === 'exif') {
            notes.push('Strip EXIF');
          }
          const noteStr = notes.length ? ` · ${notes.join(' · ')}` : '';
          liveDimsEl.textContent = `Target: ${pred.w} × ${pred.h} px${noteStr}`;
          liveDimsEl.classList.remove('hidden');
        } else {
          liveDimsEl.classList.add('hidden');
        }
      }
    });
  }

  function setCropAnchor(anchor: CropAnchor): void {
    state.cropAnchor = anchor;
    cropAnchorBtns.forEach((btn) => {
      const isSel = btn.dataset.anchor === anchor;
      btn.className = isSel
        ? 'pk-crop-anchor-btn rounded-md py-1 font-medium transition-colors bg-surface text-fg shadow-sm flex items-center justify-center gap-1 cursor-pointer'
        : 'pk-crop-anchor-btn rounded-md py-1 font-medium transition-colors text-muted hover:text-fg flex items-center justify-center gap-1 cursor-pointer';
    });
    if (cropAnchorLabel) {
      const map: Record<CropAnchor, string> = {
        top: 'Top / Face',
        center: 'Center (Balanced)',
        bottom: 'Bottom',
      };
      cropAnchorLabel.textContent = map[anchor];
    }
    if (selectedJobId && !state.jobs.some((j) => j.id === selectedJobId)) {
      selectedJobId = null;
    }
    updateActivePhotoBar();
    updateLiveDimensionsAndCardPreviews();
  }

  function syncPdfOptionsUi(): void {
    document.querySelectorAll<HTMLButtonElement>('.pk-pdf-orientation-btn').forEach((btn) => {
      const isSelected = btn.dataset.orientation === state.pdfOrientation;
      if (isSelected) {
        btn.classList.add('border-accent/40', 'bg-accent/15', 'text-accent');
        btn.classList.remove('border-border', 'bg-surface', 'text-fg');
      } else {
        btn.classList.remove('border-accent/40', 'bg-accent/15', 'text-accent');
        btn.classList.add('border-border', 'bg-surface', 'text-fg');
      }
    });

    if (pdfPageSizeSelect && pdfPageSizeSelect.value !== state.pdfPageSize) {
      pdfPageSizeSelect.value = state.pdfPageSize;
    }

    document.querySelectorAll<HTMLButtonElement>('.pk-pdf-margin-btn').forEach((btn) => {
      const isSelected = btn.dataset.margin === state.pdfMargin;
      if (isSelected) {
        btn.classList.add('border-accent/40', 'bg-accent/15', 'text-accent');
        btn.classList.remove('border-border', 'bg-surface', 'text-fg');
      } else {
        btn.classList.remove('border-accent/40', 'bg-accent/15', 'text-accent');
        btn.classList.add('border-border', 'bg-surface', 'text-fg');
      }
    });

    if (mergePdfToggle && mergePdfToggle.checked !== state.mergePdf) {
      mergePdfToggle.checked = state.mergePdf;
    }
  }

  function updateFormatUi(): void {
    syncCustomFormatUi(state.to);
    syncCustomCropUi(state.cropAspect);
    syncCustomTargetUi(targetSelect?.value || (state.targetKb ? String(state.targetKb) : ''));
    updateLiveDimensionsAndCardPreviews();
    if (mergePdfContainer) {
      mergePdfContainer.classList.toggle('hidden', state.to !== 'pdf');
    }
    const hasSvg =
      state.jobs.some((j) => j.file.name.toLowerCase().endsWith('.svg')) ||
      state.from === 'svg' ||
      state.to === 'svg';
    if (svgScaleContainer) {
      svgScaleContainer.classList.toggle('hidden', !hasSvg);
    }
  }

  // ---------- worker pool ----------

  const workers: Worker[] = [];
  for (let i = 0; i < MAX_WORKERS; i++) {
    workers.push(createWorker());
  }
  const idle: Worker[] = [...workers];
  const queue: { job: FileJob; req: ConvertRequest }[] = [];
  let pending = 0;

  function createWorker(): Worker {
    const w = new Worker(new URL('../../../lib/worker/convert.worker.ts', import.meta.url), {
      type: 'module',
    });
    w.addEventListener('message', (e: MessageEvent<WorkerMessage>) => handleWorkerMessage(w, e.data));
    w.addEventListener('error', (e) => {
      console.error('[pk worker error]', e);
    });
    return w;
  }

  function handleWorkerMessage(w: Worker, msg: WorkerMessage): void {
    if (msg.type === 'result') {
      const job = state.jobs.find((j) => j.id === msg.id);
      if (job) {
        const isMergePdf = state.mergePdf && state.to === 'pdf' && state.jobs.length > 1;
        job.status = isMergePdf ? 'working' : 'done';
        job.result = msg.blob;
        job.resultName = isMergePdf ? job.file.name.replace(/\.[^.]+$/, '.pdf') : msg.filename;
        job.resultSize = msg.resultSize;
        job.originalWidth = msg.originalWidth ?? job.originalWidth;
        job.originalHeight = msg.originalHeight ?? job.originalHeight;
        job.resultWidth = msg.resultWidth;
        job.resultHeight = msg.resultHeight;

        // If worker decoded non-native source (like HEIC), attach real preview
        if (msg.originalPreviewBlob && !job.previewUrl) {
          job.previewUrl = URL.createObjectURL(msg.originalPreviewBlob);
        }

        if (msg.blob && (isMergePdf || !msg.filename.endsWith('.pdf'))) {
          job.resultPreviewUrl = URL.createObjectURL(msg.blob);
          generateFastThumbnail(new File([msg.blob], msg.filename, { type: msg.blob.type })).then((thumb) => {
            if (thumb) {
              job.resultThumbUrl = thumb;
              updateSingleCardNode(job);
            }
          });
        }
        if (!job.result) {
          job.status = 'error';
        }
        updateSingleCardNode(job);
      }
      pending--;
      idle.push(w);
      pump();
      scheduleUpdateProgress();
      updateButtons();
    } else if (msg.type === 'error') {
      const job = state.jobs.find((j) => j.id === msg.id);
      if (job) {
        job.status = 'error';
        job.error = msg.message;
        updateSingleCardNode(job);
      }
      pending--;
      idle.push(w);
      pump();
      scheduleUpdateProgress();
      updateButtons();
    }
  }

  function pump(): void {
    while (idle.length > 0 && queue.length > 0) {
      const w = idle.pop();
      const item = queue.shift();
      if (!w || !item) continue;
      item.job.status = 'working';
      updateSingleCardNode(item.job);
      const req: ConvertRequest = item.req;
      w.postMessage(req);
    }
    if (queue.length === 0 && pending === 0) {
      if (state.mergePdf && state.to === 'pdf' && state.jobs.some((j) => (j.status === 'done' || j.status === 'working') && j.result)) {
        mergeCompletedPdfJobs();
      } else {
        state.converting = false;
        setStatus(state.jobs.some((j) => j.status === 'error') ? 'Some files had errors.' : 'Done! All files converted.');
        updateButtons();
      }
    }
  }

  async function mergeCompletedPdfJobs(): Promise<void> {
    const validJobs = state.jobs.filter((j) => (j.status === 'done' || j.status === 'working') && j.result);
    if (!validJobs.length) {
      state.converting = false;
      updateButtons();
      return;
    }
    setStatus(`Merging ${validJobs.length} pages into a single PDF document…`);

    const mergeId = `pk-merged-${Date.now()}`;
    const pages = validJobs.map((j) => ({
      blob: j.result!,
      width: j.resultWidth || 800,
      height: j.resultHeight || 1000,
    }));

    const worker = idle.pop() || createWorker();

    const onMergeMessage = async (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;
      if (msg.id !== mergeId) return;
      worker.removeEventListener('message', onMergeMessage);
      idle.push(worker);

      if (msg.type === 'result') {
        const mergedBlob = msg.blob;
        const mergedName = msg.filename;
        const totalOrig = validJobs.reduce((acc, j) => acc + (j.originalSize || j.file.size), 0);
        const firstPreview = validJobs[0]?.resultPreviewUrl || validJobs[0]?.previewUrl;

        for (const j of state.jobs) {
          if (j.previewUrl && j.previewUrl !== firstPreview) URL.revokeObjectURL(j.previewUrl);
          if (j.resultPreviewUrl && j.resultPreviewUrl !== firstPreview) URL.revokeObjectURL(j.resultPreviewUrl);
        }

        state.jobs = [
          {
            id: mergeId,
            file: new File([mergedBlob], mergedName, { type: 'application/pdf' }),
            status: 'done',
            result: mergedBlob,
            resultName: mergedName,
            previewUrl: firstPreview,
            originalSize: totalOrig,
            resultSize: mergedBlob.size,
            targetKb: state.targetKb,
            pdfTotalPages: pages.length,
          },
        ];

        downloadBlob(mergedBlob, mergedName);
        setStatus(`Successfully merged ${pages.length} pages into ${mergedName}`);
      } else if (msg.type === 'error') {
        console.error('[PixelKit Merge PDF Error]', msg.message);
        setStatus('Error merging PDF pages: ' + msg.message);
      }

      state.converting = false;
    renderFiles();
      updateButtons();
      updateProgress();
    };

    worker.addEventListener('message', onMergeMessage);
    const req: MergePdfRequest = {
      type: 'merge-pdf',
      id: mergeId,
      pages,
      title: 'PixelKit Merged Document',
      pdfOptions: {
        orientation: state.pdfOrientation,
        pageSize: state.pdfPageSize,
        margin: state.pdfMargin,
      },
    };
    worker.postMessage(req);
  }

  // ---------- input handlers (Universal Any-to-Any) ----------

  async function addFiles(files: FileList | File[]): Promise<void> {
    const arr = Array.from(files);
    if (!arr.length) return;

    let extractedPdfCount = 0;

    let fileCount = 0;
    for (const file of arr) {
      fileCount++;
      // Protect INP (< 200ms) on batch mobile uploads by yielding to the browser event loop
      if (fileCount > 1 && fileCount % 2 === 0) {
        await yieldToMain();
      }
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      // Multi-page PDF page inspection & extraction
      if (ext === 'pdf') {
        try {
          setStatus(`Inspecting ${file.name} for images…`);
          const buf = await file.arrayBuffer();
          let extracted = extractEmbeddedImagesFromPdf(buf);

          // If no direct photo streams found, try full page render fallback
          if (!extracted.length) {
            try {
              const { extractPdfImagesOrPages } = await import('@lib/worker/pdf-decode');
              extracted = await extractPdfImagesOrPages(file);
            } catch (err) {
              console.warn('[PixelKit PDF Page Render Fallback Warn]', err);
            }
          }

          if (extracted.length > 0) {
            extractedPdfCount += extracted.length;
            const baseName = file.name.replace(/\.[^.]+$/, '');
            for (const item of extracted) {
              const subName = extracted.length > 1
                ? `${baseName}-${item.isDirectImage ? 'image' : 'page'}-${item.index}.jpg`
                : `${baseName}.jpg`;
              const imgFile = new File([item.blob], subName, { type: 'image/jpeg' });
              const previewUrl = URL.createObjectURL(item.blob);

              const pageJob: FileJob = {
                id: `pk-${Date.now()}-${item.index}-${Math.random().toString(36).slice(2, 8)}`,
                file: imgFile,
                status: 'queued',
                targetKb: state.targetKb,
                originalSize: item.blob.size,
                previewUrl,
                renderedPageBlob: item.blob,
                originalWidth: item.width,
                originalHeight: item.height,
                pdfPageNumber: item.index,
                pdfTotalPages: item.total,
              };

              if (state.cropAspect && state.cropAspect !== 'original') {
                pageJob.cropAspect = state.cropAspect;
                pageJob.cropAnchor = state.cropAnchor;
              }
              if (state.scalePercent && state.scalePercent !== 100) {
                pageJob.dimensions = { mode: 'custom', scalePercent: state.scalePercent };
              } else if (state.dimensions && state.dimensions.mode !== 'original') {
                pageJob.dimensions = { ...state.dimensions };
              }

              generateFastThumbnail(item.blob).then((thumb) => {
                if (thumb) {
                  pageJob.thumbUrl = thumb;
                  updateSingleCardNode(pageJob);
                }
              });
              state.jobs.push(pageJob);
            }
            continue;
          }
        } catch (pdfErr) {
          console.error('[PixelKit PDF Extraction Error]', pdfErr);
        }
      }

      // Standard single-file handling (images or unextracted documents)
      let previewUrl: string | undefined;

      const job: FileJob = {
        id: `pk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        status: 'queued',
        targetKb: state.targetKb,
        targetSizeMode: state.targetSizeMode,
        minKb: state.minKb,
        maxKb: state.maxKb,
        dpi: state.dpi,
        originalSize: file.size,
      };

      // Create preview for native browser-renderable image formats & read dimensions
      if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'avif'].includes(ext)) {
        try {
          previewUrl = URL.createObjectURL(file);
          job.previewUrl = previewUrl;
          if (ext === 'svg') {
            job.thumbUrl = previewUrl;
          } else {
            generateFastThumbnail(file).then((thumb) => {
              if (thumb) {
                job.thumbUrl = thumb;
                updateSingleCardNode(job);
              }
            });
          }

          // Read natural resolution fast from file header (<0.1ms) without allocating full uncompressed pixel bitmaps
          readImageDimensionsFast(file)
            .then((dims) => {
              if (dims) return dims;
              return createImageBitmap(file).then((bmp) => {
                const w = bmp.width;
                const h = bmp.height;
                bmp.close?.();
                return { width: w, height: h };
              });
            })
            .then((dims) => {
              job.originalWidth = dims.width;
              job.originalHeight = dims.height;
              if (state.cropAspect && state.cropAspect !== 'original') {
                job.cropAspect = state.cropAspect;
                job.cropAnchor = state.cropAnchor;
              }
              if (state.scalePercent && state.scalePercent !== 100) {
                job.dimensions = { mode: 'custom', scalePercent: state.scalePercent };
              } else if (state.dimensions && state.dimensions.mode !== 'original') {
                job.dimensions = { ...state.dimensions };
                generateJobAdjustedPreview(job).then(() => {
                  updateSingleCardNode(job);
                  updateLiveDimensionsAndCardPreviews();
                });
              }
              updateSingleCardNode(job);
              updateLiveDimensionsAndCardPreviews();
            })
            .catch(() => {});
        } catch {
          // ignore preview error
        }
      }

      state.jobs.push(job);
    }

    if (inputBadge && arr[0]) {
      const detectedExt = extractedPdfCount > 0 ? 'JPG' : (arr[0].name.split('.').pop()?.toUpperCase() || state.from.toUpperCase());
      const totalCount = state.jobs.length;
      inputBadge.textContent = totalCount === 1 ? detectedExt : `${detectedExt} (+${totalCount - 1})`;
    }

    updateFormatUi();
    if (extractedPdfCount > 0) {
      setStatus(`Extracted and lined up ${extractedPdfCount} image${extractedPdfCount === 1 ? '' : 's'} from PDF (${state.jobs.length} total in queue).`);
    } else {
      setStatus(`Added ${arr.length} file${arr.length === 1 ? '' : 's'} (${state.jobs.length} total in queue). No size cap limit.`);
    }
    renderFiles();
    updateLiveDimensionsAndCardPreviews();
    updateButtons();

    if (arr.length === 1 && state.jobs.length >= 1) {
      const latestJob = state.jobs[state.jobs.length - 1];
      if (currentToolMode === 'crop') {
        setTimeout(() => openCropModal(latestJob), 80);
      } else if (
        currentToolMode === 'resize' &&
        (!state.dimensions || state.dimensions.mode === 'original') &&
        (state.scalePercent === 100 || state.scalePercent === null)
      ) {
        setTimeout(() => openResizeModal(latestJob), 80);
      }
    }
  }

  activeFileInput.addEventListener('change', () => {
    if (activeFileInput.files && activeFileInput.files.length > 0) {
      const selected = Array.from(activeFileInput.files);
      activeFileInput.value = '';
      // Yield to let native file picker close and paint frame before CPU work
      requestAnimationFrame(() => {
        addFiles(selected);
      });
    }
  });

  // If user selected files during deferred boot, ingest them immediately
  if (activeFileInput.files && activeFileInput.files.length > 0) {
    const preExisting = Array.from(activeFileInput.files);
    activeFileInput.value = '';
    requestAnimationFrame(() => {
      addFiles(preExisting);
    });
  }

  // Robust Drag & Drop support across dropzone, file list, converter root, and whole window
  const converterRoot = document.getElementById('pk-converter-root') || activeDropzone;
  let dragCounter = 0;
  let lastDropTimestamp = 0;

  // Dropzone click & keyboard activation
  activeDropzone.addEventListener('click', (e) => {
    if (Date.now() - lastDropTimestamp < 500) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // If target is the native overlay input, allow native file picker dispatch
    if ((e.target as HTMLElement).closest('input, button')) return;
    activeFileInput.click();
  });
  activeDropzone.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement !== activeFileInput) {
      e.preventDefault();
      activeFileInput.click();
    }
  });

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter++;
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    if (activeDropzone.dataset.dragover !== 'true') {
      activeDropzone.dataset.dragover = 'true';
      activeDropzone.classList.add('border-accent', 'bg-bg/70');
    }
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    if (activeDropzone.dataset.dragover !== 'true') {
      activeDropzone.dataset.dragover = 'true';
      activeDropzone.classList.add('border-accent', 'bg-bg/70');
    }
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      activeDropzone.dataset.dragover = 'false';
      activeDropzone.classList.remove('border-accent', 'bg-bg/70');
    }
  };

  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    lastDropTimestamp = Date.now();
    dragCounter = 0;
    activeDropzone.dataset.dragover = 'false';
    activeDropzone.classList.remove('border-accent', 'bg-bg/70');

    // Yield to browser to paint dropzone visual reset before parsing files
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const dt = e.dataTransfer;
    if (!dt) return;

    // 1. Files from standard dt.files
    const droppedFiles: File[] = [];
    if (dt.files && dt.files.length > 0) {
      for (let i = 0; i < dt.files.length; i++) {
        const file = dt.files[i];
        if (file && (file.size > 0 || file.name)) {
          droppedFiles.push(file);
        }
      }
    }

    // 2. Fallback to dt.items if dt.files was empty (e.g. Chrome/Windows desktop drag)
    if (droppedFiles.length === 0 && dt.items && dt.items.length > 0) {
      for (let i = 0; i < dt.items.length; i++) {
        const item = dt.items[i];
        if (item && item.kind === 'file') {
          const file = item.getAsFile();
          if (file) droppedFiles.push(file);
        }
      }
    }

    if (droppedFiles.length > 0) {
      await addFiles(droppedFiles);
      return;
    }

    // 3. Fallback: URL Dragging from another tab or web page
    const uri = dt.getData('text/uri-list') || dt.getData('text/plain') || dt.getData('URL');
    if (uri && (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:image/'))) {
      try {
        setStatus('Fetching dragged image URL…');
        const res = await fetch(uri);
        const blob = await res.blob();
        const urlParts = uri.split('?')[0]?.split('/') || [];
        const rawName = urlParts[urlParts.length - 1] || 'dragged-image.png';
        const file = new File([blob], rawName, { type: blob.type || 'image/png' });
        await addFiles([file]);
      } catch (err) {
        console.warn('[PixelKit URL drag]', err);
        setStatus('Could not load dragged image URL (CORS or network restriction).');
      }
    }
  };

  // Bind drag events to dropzone, file list, and converter root
  [activeDropzone, converterRoot, activeFileList].forEach((el) => {
    if (el) {
      el.addEventListener('dragenter', (e) => onDragEnter(e as DragEvent));
      el.addEventListener('dragover', (e) => onDragOver(e as DragEvent));
      el.addEventListener('dragleave', (e) => onDragLeave(e as DragEvent));
      el.addEventListener('drop', (e) => onDrop(e as DragEvent));
    }
  });

  // Global window listeners: prevent browser navigation on dragover & catch drops anywhere on window
  window.addEventListener('dragenter', (e) => e.preventDefault());
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  });
  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    onDrop(e);
  });

  // Clipboard Paste (Ctrl+V / Cmd+V)
  window.addEventListener('paste', (e: ClipboardEvent) => {
    const activeTag = (document.activeElement?.tagName || '').toLowerCase();
    if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
      return;
    }

    if (!e.clipboardData) return;
    const items = e.clipboardData.items;
    const filesToPaste: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          const ext = file.type.split('/')[1] || 'png';
          const name =
            file.name && file.name !== 'image.png'
              ? file.name
              : `screenshot-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.${ext}`;
          filesToPaste.push(new File([file], name, { type: file.type }));
        }
      }
    }

    if (filesToPaste.length > 0) {
      e.preventDefault();
      addFiles(filesToPaste);
      setStatus(`Pasted ${filesToPaste.length} image${filesToPaste.length === 1 ? '' : 's'} from clipboard.`);
    }
  });



  // ---------- Settings Listeners ----------

  function closeAllCustomDropdowns(): void {
    if (customFormatMenu) {
      customFormatMenu.classList.add('hidden');
    }
    if (customFormatTrigger) {
      customFormatTrigger.setAttribute('aria-expanded', 'false');
    }
    if (customFormatChevron) {
      customFormatChevron.classList.remove('rotate-180');
    }

    if (customCropMenu) {
      customCropMenu.classList.add('hidden');
    }
    if (customCropTrigger) {
      customCropTrigger.setAttribute('aria-expanded', 'false');
    }
    if (customCropChevron) {
      customCropChevron.classList.remove('rotate-180');
    }

    if (customTargetMenu) {
      customTargetMenu.classList.add('hidden');
    }
    if (customTargetTrigger) {
      customTargetTrigger.setAttribute('aria-expanded', 'false');
    }
    if (customTargetChevron) {
      customTargetChevron.classList.remove('rotate-180');
    }
  }

  
  // Top Mode Segmented Bar Listeners
  modeTabs.forEach((tab) => {
    tab.addEventListener('click', (e) => {
      const m = tab.dataset.mode;
      if (!m) return;
      e.preventDefault();
      setToolMode(m, false);
    });
  });

  // Tab Mode Switching
  tabCustom?.addEventListener('click', () => {
    switchSettingsTab('custom');
    if (currentToolMode === 'passport') {
      setToolMode('all', false);
    }
  });
  tabPortal?.addEventListener('click', () => setToolMode('passport', false));
  btnSwitchToPortal?.addEventListener('click', () => setToolMode('passport', false));
  btnBackToCustom?.addEventListener('click', () => setToolMode('all', false));

  toggleMoreToolsBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    isMoreToolsOpen = !isMoreToolsOpen;
    setToolMode(currentToolMode, false);
  });

  // Filter and Category Event Listeners
  portalSearchInput?.addEventListener('input', () => {
    filterPortalCards();
  });

  portalCatFilters.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectCategoryFilter(btn.dataset.cat || 'all');
    });
  });

  // Select Portal Preset Card (delegated so cards lazy-hydrated from <template> also work seamlessly)
  document.getElementById('pk-portal-cards-list')?.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLButtonElement>('.pk-portal-preset-card');
    if (!card) return;
    e.preventDefault();
    const id = card.dataset.id;
    if (id) {
      if (state.portalPreset === id) {
        applyPortalPreset('none');
      } else {
        applyPortalPreset(id);
      }
    }
  });

  // Reset to manual controls
  bannerReset?.addEventListener('click', (e) => {
    e.preventDefault();
    applyPortalPreset('none');
  });
  portalPanelReset?.addEventListener('click', (e) => {
    e.preventDefault();
    applyPortalPreset('none');
  });

  // Toggle Output Format dropdown menu
  customFormatTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isClosed = customFormatMenu?.classList.contains('hidden');
    closeAllCustomDropdowns();
    if (isClosed && customFormatMenu) {
      customFormatMenu.classList.remove('hidden');
      customFormatTrigger.setAttribute('aria-expanded', 'true');
      customFormatChevron?.classList.add('rotate-180');
    }
  });

  // Toggle Crop Presets dropdown menu
  customCropTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isClosed = customCropMenu?.classList.contains('hidden');
    closeAllCustomDropdowns();
    if (isClosed && customCropMenu) {
      customCropMenu.classList.remove('hidden');
      customCropTrigger.setAttribute('aria-expanded', 'true');
      customCropChevron?.classList.add('rotate-180');
    }
  });

  // Toggle Target Size Presets dropdown menu
  customTargetTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isClosed = customTargetMenu?.classList.contains('hidden');
    closeAllCustomDropdowns();
    if (isClosed && customTargetMenu) {
      customTargetMenu.classList.remove('hidden');
      customTargetTrigger.setAttribute('aria-expanded', 'true');
      customTargetChevron?.classList.add('rotate-180');
    }
  });

  // Select Output Format option
  customFormatOptions.forEach((opt) => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = opt.dataset.value;
      if (val) {
        if (outputSelect) {
          outputSelect.value = val;
          outputSelect.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          state.to = val;
          state.toMime = mimeForExtension(val) || `image/${val}`;
          updateFormatUi();
          updateButtons();
          setStatus(`Target output set to ${val.toUpperCase()}`);
        }
      }
      closeAllCustomDropdowns();
      customFormatTrigger?.focus();
    });
  });

  // Select Crop Preset option
  customCropOptions.forEach((opt) => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = opt.dataset.value;
      if (val) {
        if (cropAspectSelect) {
          cropAspectSelect.value = val;
          cropAspectSelect.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          state.cropAspect = (val || 'original') as CropAspectPreset;
          syncCustomCropUi(val);
        }
      }
      closeAllCustomDropdowns();
      customCropTrigger?.focus();
    });
  });

  // Select Target Size option
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
          setStatus(val ? `Target size for ${targetJob.file.name}: ${formatSizeLabel(Number(val))}` : `Quality for ${targetJob.file.name}: Best quality (no limit)`);
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
  });

  // Close menus on outside click or Escape
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (
      !target?.closest('#pk-output-format-wrapper') &&
      !target?.closest('#pk-crop-aspect-wrapper') &&
      !target?.closest('#pk-target-preset-container') &&
      !target?.closest('#pk-target-kb-wrapper')
    ) {
      closeAllCustomDropdowns();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllCustomDropdowns();
    }
  });

  // 1. Output Format Selection
  outputSelect?.addEventListener('change', () => {
    const val = outputSelect.value;
    if (selectedJobId) {
      const targetJob = state.jobs.find((j) => j.id === selectedJobId);
      if (targetJob) {
        targetJob.to = val;
        targetJob.toMime = mimeForExtension(val) || `image/${val}`;
        if (targetJob.status === 'done') targetJob.status = 'queued';
        syncCustomFormatUi(val);
    renderFiles();
        updateLiveDimensionsAndCardPreviews();
        updateStageDots();
        setStatus(`Format for ${targetJob.file.name}: ${val.toUpperCase()}`);
        return;
      }
    }
    state.to = val;
    state.toMime = mimeForExtension(val) || `image/${val}`;
    for (const j of state.jobs) {
      if (!j.to) {
        if (j.status === 'done') {
          j.status = 'queued';
          j.result = undefined;
          if (j.resultPreviewUrl) {
            URL.revokeObjectURL(j.resultPreviewUrl);
            j.resultPreviewUrl = undefined;
          }
          if (j.resultThumbUrl) {
            if (j.resultThumbUrl !== j.resultPreviewUrl) URL.revokeObjectURL(j.resultThumbUrl);
            j.resultThumbUrl = undefined;
          }
        }
      }
    }
    updateFormatUi();
    renderFiles();
    updateButtons();
    updateStageDots();
    setStatus(`Target output set to ${val.toUpperCase()}`);
  });

  // 1b. PDF Options Suite
  document.querySelectorAll<HTMLButtonElement>('.pk-pdf-orientation-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const orient = btn.dataset.orientation as PdfOrientation;
      if (orient) {
        state.pdfOrientation = orient;
        syncPdfOptionsUi();
      }
    });
  });

  pdfPageSizeSelect?.addEventListener('change', () => {
    state.pdfPageSize = (pdfPageSizeSelect.value as PdfPageSize) || 'a4';
    syncPdfOptionsUi();
  });

  document.querySelectorAll<HTMLButtonElement>('.pk-pdf-margin-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const margin = btn.dataset.margin as PdfMargin;
      if (margin) {
        state.pdfMargin = margin;
        syncPdfOptionsUi();
      }
    });
  });

  // 1c. Merge Multiple Files into Single PDF
  mergePdfToggle?.addEventListener('change', () => {
    state.mergePdf = mergePdfToggle.checked;
    for (const j of state.jobs) {
      if (j.status === 'done') {
        j.status = 'queued';
        j.result = undefined;
        if (j.resultPreviewUrl) {
          URL.revokeObjectURL(j.resultPreviewUrl);
          j.resultPreviewUrl = undefined;
        }
      }
    }
    renderFiles();
    updateButtons();
    setStatus(
      state.mergePdf
        ? 'Merge enabled: files will be combined into a single multi-page PDF.'
        : 'Separate outputs: each file will convert to an individual document.'
    );
  });

  // 1c. SVG Rasterization Scale (DPI Multiplier)
  svgScaleSelect?.addEventListener('change', () => {
    const scale = Number(svgScaleSelect.value) || 2;
    state.svgScale = scale;
    if (svgScaleVal) {
      const labels: Record<number, string> = {
        1: '1x · 96 DPI',
        2: '2x · 192 DPI',
        3: '3x · 300 DPI',
        4: '4x · 600 DPI',
      };
      svgScaleVal.textContent = labels[scale] || `${scale}x`;
    }
    setStatus(`SVG scale set to ${scale}x`);
    updateLiveDimensionsAndCardPreviews();
  });

  // 2. Size Modes (Max Size, Exact Size, Range, Quality %)
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
      sizeModeHint?.classList.add('hidden');
      state.targetKb = null;
    } else if (mode === 'range') {
      targetPresetContainer?.classList.add('hidden');
      customKbContainer?.classList.add('hidden');
      qualityContainer?.classList.add('hidden');
      rangeKbContainer?.classList.remove('hidden');
      sizeModeHint?.classList.add('hidden');
      updateRangeTargetFromInput();
    } else if (mode === 'exact') {
      rangeKbContainer?.classList.add('hidden');
      qualityContainer?.classList.add('hidden');
      targetPresetContainer?.classList.remove('hidden');
      sizeModeHint?.classList.remove('hidden');

      if (targetSelect) {
        const nextVal = savedExactTargetValue || '100';
        const hasOption = Array.from(targetSelect.options).some((o) => o.value === nextVal);
        targetSelect.value = hasOption ? nextVal : 'custom';
        if (targetSelect.value === 'custom') {
          customKbContainer?.classList.remove('hidden');
          if (customKbInput && !customKbInput.value && nextVal && nextVal !== 'custom') {
            customKbInput.value = nextVal;
          }
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
      sizeModeHint?.classList.add('hidden');

      if (targetSelect) {
        const hasOption = !savedMaxTargetValue || Array.from(targetSelect.options).some((o) => o.value === savedMaxTargetValue);
        targetSelect.value = hasOption ? savedMaxTargetValue : 'custom';
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

    for (const j of state.jobs) {
      if (!selectedJobId || j.id === selectedJobId) {
        j.targetSizeMode = mode;
        j.targetKb = state.targetKb;
        j.minKb = state.minKb;
        j.maxKb = state.maxKb;
        if (j.status === 'done') j.status = 'queued';
      }
    }
    updateTargetLabel();
    renderFiles();
    updateLiveDimensionsAndCardPreviews();
    updateButtons();
  }

  modeMaxBtn?.addEventListener('click', () => setSizeMode('max'));
  modeExactBtn?.addEventListener('click', () => setSizeMode('exact'));
  modeRangeBtn?.addEventListener('click', () => setSizeMode('range'));
  modeQualityBtn?.addEventListener('click', () => setSizeMode('quality'));

  // 3. Target Preset & Custom Size (KB & MB support)
  function updateCustomTargetFromInput(): void {
    const rawVal = customKbInput?.value ? Number(customKbInput.value) : 0;
    if (rawVal > 0) {
      if (customUnit === 'mb') {
        state.targetKb = Math.round(rawVal * 1024);
        if (customEquivTag) {
          customEquivTag.textContent = `${rawVal} MB = ${state.targetKb.toLocaleString()} KB`;
          customEquivTag.classList.remove('hidden');
        }
      } else {
        state.targetKb = Math.round(rawVal);
        if (customEquivTag) {
          if (rawVal >= 1024) {
            const inMb = (rawVal / 1024).toFixed(1).replace(/\.0$/, '');
            customEquivTag.textContent = `${rawVal.toLocaleString()} KB ≈ ${inMb} MB`;
            customEquivTag.classList.remove('hidden');
          } else {
            customEquivTag.classList.add('hidden');
          }
        }
      }
    } else {
      state.targetKb = null;
      if (customEquivTag) customEquivTag.classList.add('hidden');
    }
    if (targetSelect?.value === 'custom') {
      syncCustomTargetUi('custom');
    }
    updateTargetLabel();
  }

  function updateRangeTargetFromInput(): void {
    const minVal = minKbInput?.value ? Number(minKbInput.value) : 0;
    const maxVal = maxKbInput?.value ? Number(maxKbInput.value) : 0;
    if (rangeUnit === 'mb') {
      state.minKb = minVal > 0 ? Math.round(minVal * 1024) : null;
      state.maxKb = maxVal > 0 ? Math.round(maxVal * 1024) : null;
    } else {
      state.minKb = minVal > 0 ? Math.round(minVal) : null;
      state.maxKb = maxVal > 0 ? Math.round(maxVal) : null;
    }
    state.targetKb = state.maxKb;
    updateTargetLabel();
  }

  targetSelect?.addEventListener('change', () => {
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
  });

  customKbInput?.addEventListener('input', updateCustomTargetFromInput);

  customUnitKbBtn?.addEventListener('click', () => {
    if (customUnit === 'kb') return;
    customUnit = 'kb';
    customUnitKbBtn.className = 'rounded-lg px-2.5 py-1 font-semibold transition-colors bg-surface text-fg shadow-sm cursor-pointer';
    if (customUnitMbBtn) {
      customUnitMbBtn.className = 'rounded-lg px-2.5 py-1 font-semibold transition-colors text-muted hover:text-fg cursor-pointer';
    }
    if (customKbInput) {
      const current = Number(customKbInput.value);
      if (current > 0) {
        customKbInput.value = String(Math.round(current * 1024));
      }
      customKbInput.placeholder = 'e.g. 500';
      customKbInput.step = '1';
      customKbInput.min = '5';
    }
    updateCustomTargetFromInput();
  });

  customUnitMbBtn?.addEventListener('click', () => {
    if (customUnit === 'mb') return;
    customUnit = 'mb';
    customUnitMbBtn.className = 'rounded-lg px-2.5 py-1 font-semibold transition-colors bg-surface text-fg shadow-sm cursor-pointer';
    if (customUnitKbBtn) {
      customUnitKbBtn.className = 'rounded-lg px-2.5 py-1 font-semibold transition-colors text-muted hover:text-fg cursor-pointer';
    }
    if (customKbInput) {
      const current = Number(customKbInput.value);
      if (current > 0) {
        customKbInput.value = String(Math.round((current / 1024) * 10) / 10);
      }
      customKbInput.placeholder = 'e.g. 2';
      customKbInput.step = '0.1';
      customKbInput.min = '0.1';
    }
    updateCustomTargetFromInput();
  });

  minKbInput?.addEventListener('input', updateRangeTargetFromInput);
  maxKbInput?.addEventListener('input', updateRangeTargetFromInput);

  rangeUnitKbBtn?.addEventListener('click', () => {
    if (rangeUnit === 'kb') return;
    rangeUnit = 'kb';
    rangeUnitKbBtn.className = 'rounded-md px-2 py-0.5 font-medium transition-colors bg-surface text-fg shadow-sm cursor-pointer';
    if (rangeUnitMbBtn) {
      rangeUnitMbBtn.className = 'rounded-md px-2 py-0.5 font-medium transition-colors text-muted hover:text-fg cursor-pointer';
    }
    if (minKbInput && minKbInput.value) {
      minKbInput.value = String(Math.round(Number(minKbInput.value) * 1024));
      minKbInput.placeholder = '20';
    }
    if (maxKbInput && maxKbInput.value) {
      maxKbInput.value = String(Math.round(Number(maxKbInput.value) * 1024));
      maxKbInput.placeholder = '50';
    }
    updateRangeTargetFromInput();
  });

  rangeUnitMbBtn?.addEventListener('click', () => {
    if (rangeUnit === 'mb') return;
    rangeUnit = 'mb';
    rangeUnitMbBtn.className = 'rounded-md px-2 py-0.5 font-medium transition-colors bg-surface text-fg shadow-sm cursor-pointer';
    if (rangeUnitKbBtn) {
      rangeUnitKbBtn.className = 'rounded-md px-2 py-0.5 font-medium transition-colors text-muted hover:text-fg cursor-pointer';
    }
    if (minKbInput && minKbInput.value) {
      minKbInput.value = String(Math.round((Number(minKbInput.value) / 1024) * 10) / 10);
      minKbInput.placeholder = '0.5';
    }
    if (maxKbInput && maxKbInput.value) {
      maxKbInput.value = String(Math.round((Number(maxKbInput.value) / 1024) * 10) / 10);
      maxKbInput.placeholder = '2';
    }
    updateRangeTargetFromInput();
  });

  // 4. Quality Slider (1–100%)
  qualitySlider?.addEventListener('input', () => {
    const val = Number(qualitySlider.value);
    state.quality = val / 100;
    if (qualityValue) {
      qualityValue.textContent = `${val}%`;
    }
    if (state.targetSizeMode === 'quality') {
      updateTargetLabel();
    }
  });

  function updateTargetLabel(): void {
    if (!targetValue) return;
    const activeJob = selectedJobId ? state.jobs.find((j) => j.id === selectedJobId) : null;
    const currentTargetKb = activeJob ? activeJob.targetKb : state.targetKb;
    const currentSizeMode = activeJob?.targetSizeMode || state.targetSizeMode;
    const currentQuality = activeJob?.quality ?? state.quality;

    if (currentSizeMode === 'quality') {
      targetValue.textContent = `Quality ${Math.round(currentQuality * 100)}%`;
    } else if (currentSizeMode === 'range') {
      const min = state.minKb ? formatSizeLabel(state.minKb) : '0';
      const max = state.maxKb ? formatSizeLabel(state.maxKb) : 'Any';
      targetValue.textContent = `Range: ${min}–${max}`;
    } else if (currentTargetKb) {
      const prefix = currentSizeMode === 'exact' ? 'Exact ' : 'Max ';
      targetValue.textContent = `${prefix}${formatSizeLabel(currentTargetKb)}`;
    } else {
      targetValue.textContent = 'Best quality (no limit)';
    }
    updateStageDots();
  }

  // 5. Aspect Ratio Crop Presets
  cropAspectSelect?.addEventListener('change', async () => {
    const aspect = (cropAspectSelect.value || 'original') as CropAspectPreset;
    syncCustomCropUi(aspect);

    updateStageDots();

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
    renderFiles();
        updateLiveDimensionsAndCardPreviews();
        const label = cropAspectSelect.options[cropAspectSelect.selectedIndex]?.text || aspect;
        setStatus(`Crop preset for ${targetJob.file.name}: ${label}`);
        return;
      }
    }

    // If no single job selected, apply globally
    state.cropAspect = aspect;
    for (const j of state.jobs) {
      if (state.cropAspect === 'original') {
        j.cropAspect = 'original';
        j.customCropBox = undefined;
      } else {
        j.cropAspect = state.cropAspect;
      }
      if (j.status === 'done') j.status = 'queued';
    }
    renderFiles();
    updateLiveDimensionsAndCardPreviews();
    const label = cropAspectSelect.options[cropAspectSelect.selectedIndex]?.text || state.cropAspect;
    setStatus(`Crop preset: ${label}`);
  });

  // 5b. Crop Focal Anchor (Top/Face, Center, Bottom)
  cropAnchorBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const anchor = (btn.dataset.anchor || 'center') as CropAnchor;
      setCropAnchor(anchor);
      for (const j of state.jobs) {
        j.cropAnchor = anchor;
      }
    renderFiles();
      updateLiveDimensionsAndCardPreviews();
      setStatus(`Crop focal anchor: ${anchor.toUpperCase()}`);
    });
  });

  // 6. Resize Controls (Scale % & Custom Dimensions with Aspect Ratio Lock)
  let customDimDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function applyCustomDimensionsToJobs(): Promise<void> {
    state.jobs.forEach((j) => {
      j.dimensions = state.dimensions.mode === 'original' ? { mode: 'original' } : { ...state.dimensions };
      if (j.status === 'done') j.status = 'queued';
    });
    await Promise.all(state.jobs.map((j) => generateJobAdjustedPreview(j)));
    renderFiles();
    updateLiveDimensionsAndCardPreviews();
  }

  function queueCustomDimensionsPreview(): void {
    if (customDimDebounceTimer) clearTimeout(customDimDebounceTimer);
    customDimDebounceTimer = setTimeout(() => {
      applyCustomDimensionsToJobs();
    }, 120);
  }

  async function setScaleOption(scale: string): Promise<void> {
    scaleBtns.forEach((btn) => {
      const isSelected = btn.dataset.scale === scale;
      btn.className = isSelected
        ? 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors bg-surface text-fg shadow-sm'
        : 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors text-muted hover:text-fg';
    });

    updateStageDots();

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
            resizeHint.textContent = pct === 100 ? '100% (Original)' : `${pct}% Scale`;
          }
          if (targetJob.status === 'done') targetJob.status = 'queued';
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
        resizeHint.textContent = pct === 100 ? '100% (Original)' : `${pct}% Scale`;
      }
      state.dimensions = pct === 100 ? { mode: 'original' } : { mode: 'custom', scalePercent: pct };
      for (const j of state.jobs) {
        j.dimensions = state.dimensions.mode === 'original' ? { mode: 'original' } : { ...state.dimensions };
        j.scalePercent = pct === 100 ? undefined : pct;
        if (j.status === 'done') j.status = 'queued';
      }
    renderFiles();
      updateLiveDimensionsAndCardPreviews();
    }
  }

  scaleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const scale = btn.dataset.scale || '100';
      setScaleOption(scale);
    });
  });

  // Aspect Ratio Lock Button
  lockAspectBtn?.addEventListener('click', () => {
    state.lockAspectRatio = !state.lockAspectRatio;
    lockAspectBtn.dataset.locked = String(state.lockAspectRatio);
    if (state.lockAspectRatio) {
      lockAspectBtn.classList.remove('text-muted');
      lockAspectBtn.classList.add('text-accent');
      lockAspectBtn.title = 'Aspect Ratio Locked';
    } else {
      lockAspectBtn.classList.remove('text-accent');
      lockAspectBtn.classList.add('text-muted');
      lockAspectBtn.title = 'Aspect Ratio Unlocked';
    }
    updateCustomDimensions();
    updateLiveDimensionsAndCardPreviews();
    queueCustomDimensionsPreview();
  });

  function getActiveAspectRatio(): number {
    const cropRatio = state.cropAspect !== 'original' ? ASPECT_RATIOS[state.cropAspect] : undefined;
    if (typeof cropRatio === 'number') {
      return cropRatio;
    }
    const firstJob = state.jobs.find((j) => j.originalWidth && j.originalHeight);
    if (firstJob && firstJob.originalWidth && firstJob.originalHeight) {
      return firstJob.originalWidth / firstJob.originalHeight;
    }
    return 16 / 9;
  }

  function syncDimUnitUi(): void {
    const u = state.unit;
    const effDpi = state.dpi || Number(dimDpiSelect?.value) || 300;

    dimUnitBtns.forEach((btn) => {
      const isSel = btn.dataset.unit === u;
      btn.className = isSel
        ? 'pk-dim-unit-btn rounded-md px-2 py-0.5 font-semibold cursor-pointer bg-accent/15 text-accent'
        : 'pk-dim-unit-btn rounded-md px-2 py-0.5 font-semibold cursor-pointer text-muted hover:text-fg';
    });

    dimDpiWrap?.classList.toggle('hidden', u === 'px');
    cmPresetsRow?.classList.toggle('hidden', u === 'px');

    if (dimDpiSelect && state.dpi && ['72', '96', '150', '200', '300', '600'].includes(String(state.dpi))) {
      dimDpiSelect.value = String(state.dpi);
    }

    if (dimWidthLabel) dimWidthLabel.textContent = `Width (${u})`;
    if (dimHeightLabel) dimHeightLabel.textContent = `Height (${u})`;

    if (dimWidthInput) {
      dimWidthInput.step = u === 'px' ? '1' : 'any';
      dimWidthInput.placeholder = u === 'cm' ? 'e.g. 3.5' : u === 'mm' ? 'e.g. 35' : u === 'in' ? 'e.g. 2' : 'e.g. 1920';
    }
    if (dimHeightInput) {
      dimHeightInput.step = u === 'px' ? '1' : 'any';
      dimHeightInput.placeholder = u === 'cm' ? 'e.g. 4.5' : u === 'mm' ? 'e.g. 45' : u === 'in' ? 'e.g. 2' : 'e.g. 1080';
    }

    const rawW = dimWidthInput?.value ? Number(dimWidthInput.value) : 0;
    const rawH = dimHeightInput?.value ? Number(dimHeightInput.value) : 0;
    if (dimComputedPx) {
      if (u !== 'px' && rawW > 0 && rawH > 0) {
        const pxW = unitToPx(rawW, u, effDpi);
        const pxH = unitToPx(rawH, u, effDpi);
        dimComputedPx.textContent = `${rawW} × ${rawH} ${u} @ ${effDpi} DPI = ${pxW} × ${pxH} px`;
        dimComputedPx.classList.remove('hidden');
      } else {
        dimComputedPx.classList.add('hidden');
      }
    }
  }

  function syncDpiUi(): void {
    const activeDpi = state.dpi;
    const selectedPill = !activeDpi
      ? 'auto'
      : ['72', '150', '200', '300', '600'].includes(String(activeDpi))
        ? String(activeDpi)
        : 'custom';

    dpiBtns.forEach((btn) => {
      const isSel = btn.dataset.dpi === selectedPill;
      btn.className = isSel
        ? 'pk-dpi-btn flex-1 rounded-md py-1.5 font-medium transition-colors cursor-pointer touch-manipulation bg-surface text-fg shadow-xs'
        : 'pk-dpi-btn flex-1 rounded-md py-1.5 font-medium transition-colors cursor-pointer touch-manipulation text-muted hover:text-fg';
    });

    customDpiWrap?.classList.toggle('hidden', selectedPill !== 'custom');
    if (selectedPill === 'custom' && customDpiInput && activeDpi) {
      customDpiInput.value = String(activeDpi);
    }

    if (dpiValueEl) {
      dpiValueEl.textContent = activeDpi ? `${activeDpi} DPI` : 'Auto (Original)';
    }
    if (dpiHint) {
      dpiHint.classList.toggle('hidden', !activeDpi && currentToolMode !== 'dpi');
    }
    if (dimDpiSelect && activeDpi && ['72', '96', '150', '200', '300', '600'].includes(String(activeDpi))) {
      dimDpiSelect.value = String(activeDpi);
    }
    if (modalDpiSelect && activeDpi && ['72', '96', '150', '200', '300', '600'].includes(String(activeDpi))) {
      modalDpiSelect.value = String(activeDpi);
    }
    if (currentToolMode === 'dpi') {
      if (settingsModeBadge) settingsModeBadge.textContent = `${activeDpi || 300} DPI`;
      if (dropzonePrompt) dropzonePrompt.textContent = `Drop any photo to convert to ${activeDpi || 300} DPI`;
      const dropBadge = document.getElementById('pk-locked-preset-badge');
      const span = dropBadge?.querySelector('span');
      if (dropBadge && span) {
        if (activeDpi) {
          span.textContent = `Active Mode: ${activeDpi} DPI Print Header • 100% Lossless`;
          dropBadge.classList.remove('hidden');
        } else {
          dropBadge.classList.add('hidden');
        }
      }
    }
    updateStageDots();
  }

  dimUnitBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextUnit = (btn.dataset.unit || 'px') as DimensionUnit;
      if (nextUnit === state.unit) return;
      const prevUnit = state.unit;
      const effDpi = state.dpi || Number(dimDpiSelect?.value) || 300;
      if (nextUnit !== 'px' && !state.dpi) {
        state.dpi = effDpi;
        syncDpiUi();
      }
      if (dimWidthInput && dimWidthInput.value) {
        const prevW = Number(dimWidthInput.value);
        if (prevW > 0) {
          const pxW = unitToPx(prevW, prevUnit, effDpi);
          dimWidthInput.value = String(pxToUnit(pxW, nextUnit, effDpi));
        }
      }
      if (dimHeightInput && dimHeightInput.value) {
        const prevH = Number(dimHeightInput.value);
        if (prevH > 0) {
          const pxH = unitToPx(prevH, prevUnit, effDpi);
          dimHeightInput.value = String(pxToUnit(pxH, nextUnit, effDpi));
        }
      }
      state.unit = nextUnit;
      syncDimUnitUi();
      updateCustomDimensions();
      updateLiveDimensionsAndCardPreviews();
      queueCustomDimensionsPreview();
    });
  });

  dimDpiSelect?.addEventListener('change', () => {
    const nextDpi = Number(dimDpiSelect.value) || 300;
    state.dpi = nextDpi;
    state.jobs.forEach((j) => {
      j.dpi = nextDpi;
      if (j.status === 'done') j.status = 'queued';
    });
    syncDpiUi();
    syncDimUnitUi();
    updateCustomDimensions();
    updateLiveDimensionsAndCardPreviews();
    queueCustomDimensionsPreview();
    updateButtons();
  });

  cmPresetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const u = (btn.dataset.unit || 'cm') as DimensionUnit;
      const w = btn.dataset.w || '';
      const h = btn.dataset.h || '';
      const d = Number(btn.dataset.dpi) || 300;
      state.unit = u;
      state.dpi = d;
      state.scalePercent = null;
      state.lockAspectRatio = false;
      if (lockAspectBtn) {
        lockAspectBtn.dataset.locked = 'false';
        lockAspectBtn.classList.remove('text-accent');
        lockAspectBtn.classList.add('text-muted');
        lockAspectBtn.title = 'Aspect Ratio Unlocked';
      }
      if (dimWidthInput) dimWidthInput.value = w;
      if (dimHeightInput) dimHeightInput.value = h;
      syncDpiUi();
      syncDimUnitUi();
      updateCustomDimensions();
      updateLiveDimensionsAndCardPreviews();
      queueCustomDimensionsPreview();
      updateButtons();
      setStatus(`Applied physical preset: ${w} × ${h} ${u} @ ${d} DPI (${state.dimensions.width} × ${state.dimensions.height} px)`);
    });
  });

  dpiBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const raw = btn.dataset.dpi || 'auto';
      if (raw === 'auto') {
        state.dpi = null;
      } else if (raw === 'custom') {
        customDpiWrap?.classList.remove('hidden');
        const customVal = Number(customDpiInput?.value) || 300;
        state.dpi = Math.max(36, Math.min(2400, Math.round(customVal)));
      } else {
        state.dpi = Number(raw) || 300;
      }
      state.jobs.forEach((j) => {
        j.dpi = state.dpi;
        if (j.status === 'done') j.status = 'queued';
      });
      syncDpiUi();
      if (state.unit !== 'px' && state.scalePercent === null) {
        syncDimUnitUi();
        updateCustomDimensions();
        queueCustomDimensionsPreview();
      }
      renderFiles();
      updateLiveDimensionsAndCardPreviews();
      updateButtons();
      setStatus(state.dpi ? `Print resolution set to ${state.dpi} DPI.` : 'Print resolution reset to Auto (Original).');
    });
  });

  customDpiInput?.addEventListener('input', () => {
    const val = Number(customDpiInput.value);
    if (Number.isFinite(val) && val >= 36 && val <= 2400) {
      state.dpi = Math.round(val);
      state.jobs.forEach((j) => {
        j.dpi = state.dpi;
        if (j.status === 'done') j.status = 'queued';
      });
      syncDpiUi();
      if (state.unit !== 'px' && state.scalePercent === null) {
        syncDimUnitUi();
        updateCustomDimensions();
        queueCustomDimensionsPreview();
      }
      renderFiles();
      updateLiveDimensionsAndCardPreviews();
      updateButtons();
    }
  });

  dimWidthInput?.addEventListener('input', () => {
    if (state.lockAspectRatio && dimWidthInput.value) {
      const w = Number(dimWidthInput.value);
      if (w > 0) {
        const effDpi = state.dpi || Number(dimDpiSelect?.value) || 300;
        const ratio = getActiveAspectRatio();
        const pxW = unitToPx(w, state.unit, effDpi);
        const pxH = Math.max(10, Math.round(pxW / ratio));
        if (dimHeightInput) dimHeightInput.value = String(pxToUnit(pxH, state.unit, effDpi));
      }
    }
    syncDimUnitUi();
    updateCustomDimensions();
    updateLiveDimensionsAndCardPreviews();
    queueCustomDimensionsPreview();
  });

  dimHeightInput?.addEventListener('input', () => {
    if (state.lockAspectRatio && dimHeightInput.value) {
      const h = Number(dimHeightInput.value);
      if (h > 0) {
        const effDpi = state.dpi || Number(dimDpiSelect?.value) || 300;
        const ratio = getActiveAspectRatio();
        const pxH = unitToPx(h, state.unit, effDpi);
        const pxW = Math.max(10, Math.round(pxH * ratio));
        if (dimWidthInput) dimWidthInput.value = String(pxToUnit(pxW, state.unit, effDpi));
      }
    }
    syncDimUnitUi();
    updateCustomDimensions();
    updateLiveDimensionsAndCardPreviews();
    queueCustomDimensionsPreview();
  });

  function updateCustomDimensions(): void {
    const rawW = dimWidthInput?.value ? Number(dimWidthInput.value) : undefined;
    const rawH = dimHeightInput?.value ? Number(dimHeightInput.value) : undefined;
    const effDpi = state.dpi || Number(dimDpiSelect?.value) || 300;
    const pxW = rawW && rawW > 0 ? unitToPx(rawW, state.unit, effDpi) : undefined;
    const pxH = rawH && rawH > 0 ? unitToPx(rawH, state.unit, effDpi) : undefined;
    const hasBothExact = Boolean(pxW && pxH && !state.lockAspectRatio);

    state.dimensions = {
      mode: pxW || pxH ? 'custom' : 'original',
      width: pxW,
      height: pxH,
      unit: state.unit,
      dpi: state.unit !== 'px' ? effDpi : (state.dpi ?? undefined),
      lockAspectRatio: state.lockAspectRatio,
      fit: hasBothExact ? (state.dimensions.fit === 'fill' ? 'fill' : 'cover') : (state.dimensions.fit || 'contain'),
      noUpscale: hasBothExact ? false : (state.dimensions.noUpscale !== false),
    };

    if (resizeHint) {
      if (pxW && pxH) {
        resizeHint.textContent =
          state.unit === 'px'
            ? `${pxW}×${pxH} px`
            : `${rawW}×${rawH} ${state.unit} (${pxW}×${pxH} px)`;
      } else {
        resizeHint.textContent = `Custom (${state.unit})`;
      }
    }
    syncDimUnitUi();
    updateStageDots();
  }

  // Quick Dimension Presets (Web HD, Passport, Visa, Banner)
  dimPresetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const w = btn.dataset.w;
      const h = btn.dataset.h;
      if (dimWidthInput && w) dimWidthInput.value = w;
      if (dimHeightInput && h) dimHeightInput.value = h;
      updateCustomDimensions();
      updateLiveDimensionsAndCardPreviews();
      queueCustomDimensionsPreview();
      setStatus(`Applied dimension preset: ${w}×${h} px`);
    });
  });

  // Bounding Box Strategy (Fit Within, Fill & Crop, Exact)
  fitModeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const fit = (btn.dataset.fit || 'contain') as 'contain' | 'cover' | 'fill';
      state.dimensions.fit = fit;
      fitModeBtns.forEach((b) => {
        const isSel = b.dataset.fit === fit;
        b.className = isSel
          ? 'pk-fit-mode-btn rounded-md py-1 font-medium transition-colors bg-surface text-fg shadow-sm cursor-pointer'
          : 'pk-fit-mode-btn rounded-md py-1 font-medium transition-colors text-muted hover:text-fg cursor-pointer';
      });
      if (fitModeDesc) {
        const map: Record<string, string> = {
          contain: 'Fit Within (Contain)',
          cover: 'Fill & Crop (Center Crop)',
          fill: 'Exact Stretch (May Distort)',
        };
        fitModeDesc.textContent = map[fit] || fit;
      }
      updateCustomDimensions();
      updateLiveDimensionsAndCardPreviews();
      queueCustomDimensionsPreview();
      setStatus(`Fitting strategy: ${fit}`);
    });
  });

  // Guardrail: Do Not Upscale
  noUpscaleToggle?.addEventListener('change', () => {
    state.dimensions.noUpscale = noUpscaleToggle.checked;
    updateCustomDimensions();
    updateLiveDimensionsAndCardPreviews();
    setStatus(
      noUpscaleToggle.checked
        ? 'Do Not Upscale enabled: smaller images will not be enlarged.'
        : 'Do Not Upscale disabled: images will scale to exact dimensions.'
    );
  });

  // 7. Grayscale / Black & White Filter
  grayscaleCheckbox?.addEventListener('change', () => {
    state.grayscale = grayscaleCheckbox.checked;
    setStatus(state.grayscale ? 'Monochrome / Grayscale filter enabled.' : 'Color output restored.');
    renderFiles();
    updateLiveDimensionsAndCardPreviews();
  });

  // 6. Advanced Checkboxes
  autoOrientCheckbox?.addEventListener('change', () => {
    state.autoOrient = autoOrientCheckbox.checked;
  });

  stripTransCheckbox?.addEventListener('change', () => {
    state.stripTransparency = stripTransCheckbox.checked;
  });

  preserveMetadataCheckbox?.addEventListener('change', () => {
    state.preserveMetadata = preserveMetadataCheckbox.checked;
    exifStatusNote?.classList.toggle('hidden', state.preserveMetadata);
    state.jobs.forEach((j) => {
      if (j.status === 'done') j.status = 'queued';
    });
    renderFiles();
    updateLiveDimensionsAndCardPreviews();
    updateButtons();
    setStatus(
      state.preserveMetadata
        ? 'EXIF metadata preservation enabled.'
        : 'Privacy mode active: EXIF, GPS & camera metadata will be stripped.'
    );
  });


  function resetJobAdjustments(job: FileJob): void {
    job.customCropBox = undefined;
    job.cropAspect = 'original';
    job.cropAnchor = 'center';
    job.croppedWidth = undefined;
    job.croppedHeight = undefined;
    job.dimensions = { mode: 'original', noUpscale: true };
    job.scalePercent = 100;
    job.rotate = 0;
    job.flipH = false;
    job.flipV = false;
    job.grayscale = false;
    job.targetKb = null;
    job.to = undefined;
    job.toMime = undefined;
    if (job.adjustedPreviewUrl) {
      URL.revokeObjectURL(job.adjustedPreviewUrl);
      job.adjustedPreviewUrl = undefined;
    }
    if (job.croppedPreviewUrl) {
      URL.revokeObjectURL(job.croppedPreviewUrl);
      job.croppedPreviewUrl = undefined;
    }
    job.adjustedWidth = undefined;
    job.adjustedHeight = undefined;
    if (job.status === 'done') {
      job.status = 'queued';
      job.result = undefined;
      if (job.resultPreviewUrl) {
        URL.revokeObjectURL(job.resultPreviewUrl);
        job.resultPreviewUrl = undefined;
      }
    }
    if (selectedJobId === job.id) {
      syncSidebarToSelectedJob(job);
    }
    setStatus(`Reset adjustments for ${job.file.name}`);
    renderFiles();
    updateButtons();
    updateLiveDimensionsAndCardPreviews();
    updateStageDots();
  }

  // ---------- Before / After Comparison Modal Controller ----------

  function updateTransform(): void {
    if (compareStage) {
      compareStage.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
    }
    if (zoomLevelEl) {
      zoomLevelEl.textContent = `${Math.round(zoomLevel * 100)}%`;
    }
  }

  function setSplitPercent(pct: number): void {
    const isDone = activeCompareJob?.status === 'done' && !!activeCompareJob?.result;
    const clamped = Math.max(0, Math.min(100, pct));
    if (compareClip) {
      if (isDone) {
        compareClip.style.clipPath = `inset(0 ${100 - clamped}% 0 0)`;
        (compareClip.style as unknown as { webkitClipPath?: string }).webkitClipPath = `inset(0 ${100 - clamped}% 0 0)`;
      } else {
        compareClip.style.clipPath = 'none';
        (compareClip.style as unknown as { webkitClipPath?: string }).webkitClipPath = 'none';
      }
    }
    if (compareHandle) compareHandle.style.left = `${clamped}%`;
  }

  async function openCompareModal(job: FileJob): Promise<void> {
    if (!compareModal) return;
    activeCompareJob = job;

    // Ensure source preview URL and natural resolution are available
    if (!job.previewUrl && job.file) {
      job.previewUrl = URL.createObjectURL(job.file);
    }
    if ((!job.originalWidth || !job.originalHeight) && job.file) {
      try {
        const dims = await readImageDimensionsFast(job.file);
        if (dims) {
          job.originalWidth = dims.width;
          job.originalHeight = dims.height;
        } else {
          const bmp = await createImageBitmap(job.file);
          job.originalWidth = bmp.width;
          job.originalHeight = bmp.height;
          bmp.close?.();
        }
      } catch {
        // non-blocking fallback
      }
    }

    const hasAdjustments = !!(
      job.customCropBox ||
      (job.cropAspect && job.cropAspect !== 'original') ||
      (job.dimensions && job.dimensions.mode !== 'original' && job.dimensions.scalePercent !== 100) ||
      (job.rotate ?? 0) !== 0 ||
      job.flipH ||
      (job.grayscale ?? state.grayscale)
    );

    if (hasAdjustments && !job.adjustedPreviewUrl && job.status !== 'done') {
      await generateJobAdjustedPreview(job);
    }

    const isDone = job.status === 'done' && !!job.result;
    if (isDone && !job.resultPreviewUrl && job.result) {
      job.resultPreviewUrl = URL.createObjectURL(job.result);
    }

    const isAdjusted = !isDone && !!(job.adjustedPreviewUrl || job.croppedPreviewUrl);
    const uneditedOrigSrc = job.previewUrl || (job.file ? URL.createObjectURL(job.file) : '');
    const adjustedSrc = job.adjustedPreviewUrl || job.croppedPreviewUrl || uneditedOrigSrc;

    if (compareTitle) {
      const effW = isDone
        ? (job.resultWidth || job.adjustedWidth || job.croppedWidth || job.originalWidth)
        : (job.adjustedWidth || job.croppedWidth || job.originalWidth);
      const effH = isDone
        ? (job.resultHeight || job.adjustedHeight || job.croppedHeight || job.originalHeight)
        : (job.adjustedHeight || job.croppedHeight || job.originalHeight);
      const dimStr = effW && effH ? ` (${effW}×${effH}px)` : '';
      const suffix = isDone
        ? ` · Visual Comparison${dimStr}`
        : (isAdjusted ? ` · Live Preview${dimStr}` : ' · Full Resolution Preview');
      compareTitle.textContent = `${job.file.name}${suffix}`;
    }

    // Build rich before / after stats header
    if (compareMeta) {
      const origDim = job.originalWidth && job.originalHeight ? `${job.originalWidth}×${job.originalHeight}px` : 'Original';
      const origSize = formatBytes(job.file.size);

      if (isDone && job.result) {
        const resDim = job.resultWidth && job.resultHeight ? `${job.resultWidth}×${job.resultHeight}px` : origDim;
        const resSize = formatBytes(job.result.size);
        compareMeta.innerHTML = `
          <span class="font-medium text-fg">Before:</span> <span>${origSize} (${origDim})</span>
          <span class="text-accent font-bold">➔</span>
          <span class="font-medium text-fg">After:</span> <span>${resSize} (${resDim})</span>
        `;
      } else if (hasAdjustments) {
        const effW = job.adjustedWidth || job.croppedWidth || job.originalWidth;
        const effH = job.adjustedHeight || job.croppedHeight || job.originalHeight;
        const adjDim = effW && effH ? `${effW}×${effH}px` : 'Adjusted';
        const notes: string[] = [];
        if (job.customCropBox) notes.push('Custom Framing');
        else if (job.cropAspect && job.cropAspect !== 'original') notes.push(`${job.cropAspect} Crop`);

        const dims = job.dimensions ?? state.dimensions;
        const scalePct = dims.mode === 'original'
          ? null
          : (dims.scalePercent ?? (dims.mode === 'custom' && (dims.width || dims.height) ? null : state.scalePercent));
        if (scalePct && scalePct !== 100) {
          notes.push(`${scalePct}% Scale`);
        } else if (dims.mode === 'custom' && (dims.width || dims.height)) {
          notes.push(`Custom Size (${effW}×${effH}px)`);
        }

        const deg = job.rotate ?? 0;
        if (deg !== 0) notes.push(`${deg}° Rotate`);
        if (job.flipH) notes.push('Flipped');
        if (job.grayscale ?? state.grayscale) notes.push('B&W');

        const noteStr = notes.length ? ` (${notes.join(', ')})` : '';
        compareMeta.innerHTML = `
          <span class="font-medium text-fg">Adjusted Output:</span> <span>${adjDim}${noteStr}</span>
          <span class="text-muted">· Source: ${origSize} (${origDim})</span>
        `;
      } else {
        compareMeta.innerHTML = `
          <span class="font-medium text-fg">Source:</span> <span>${origSize} (${origDim})</span>
          <span class="text-muted">· High-fidelity preview (Scroll to zoom, drag to pan)</span>
        `;
      }
    }

    if (isDone) {
      // 1. Hide the pre-conversion toggle buttons
      if (compareToggleContainer) compareToggleContainer.classList.add('hidden');

      // 2. Show Before / After tags
      if (compareOrigTag) {
        compareOrigTag.textContent = 'Original (Before)';
        compareOrigTag.classList.remove('hidden');
      }
      if (compareResTag) {
        compareResTag.textContent = 'Converted (After)';
        compareResTag.classList.remove('hidden');
      }

      // 3. Show split slider handle
      if (compareHandle) compareHandle.classList.remove('hidden');

      // 4. Set images
      if (compareImgOrig) {
        compareImgOrig.src = uneditedOrigSrc;
        compareImgOrig.style.transform = '';
        compareImgOrig.style.filter = '';
      }
      if (compareImgResult) {
        compareImgResult.src = job.resultPreviewUrl || adjustedSrc;
        compareImgResult.style.transform = '';
        compareImgResult.style.filter = '';
      }

      // 5. Saved badge and download button
      if (compareSavedBadge) {
        if (job.result && job.result.size < job.file.size) {
          const savedPct = Math.round(((job.file.size - job.result.size) / job.file.size) * 100);
          compareSavedBadge.textContent = `-${savedPct}% saved`;
          compareSavedBadge.classList.remove('hidden');
        } else {
          compareSavedBadge.classList.add('hidden');
        }
      }
      if (compareDlBtn) compareDlBtn.classList.remove('hidden');

      if (compareTip) {
        compareTip.textContent = 'Drag split handle to compare · Scroll or pinch to zoom';
      }
    } else {
      // Not converted yet: Live preview / framing inspection
      if (compareSavedBadge) compareSavedBadge.classList.add('hidden');
      if (compareDlBtn) compareDlBtn.classList.add('hidden');
      if (compareHandle) compareHandle.classList.add('hidden');
      if (compareResTag) compareResTag.classList.add('hidden');

      if (compareClip) {
        compareClip.style.clipPath = 'none';
        (compareClip.style as unknown as { webkitClipPath?: string }).webkitClipPath = 'none';
      }

      if (hasAdjustments) {
        if (compareOrigTag) compareOrigTag.classList.add('hidden');
        if (compareToggleContainer) compareToggleContainer.classList.remove('hidden');

        let currentBeforeMode: 'orig' | 'adj' = 'adj';

        const updateToggleButtons = () => {
          const needsCss = currentBeforeMode === 'adj' && !job.adjustedPreviewUrl && !job.croppedPreviewUrl;
          const trans: string[] = [];
          if (needsCss) {
            const deg = job.rotate ?? 0;
            const sx = job.flipH ? -1 : 1;
            if (deg !== 0) trans.push(`rotate(${deg}deg)`);
            if (sx !== 1) trans.push(`scaleX(${sx})`);
          }
          const transformStr = trans.join(' ');
          const isGray = job.grayscale ?? state.grayscale;
          const filterStr = needsCss && isGray ? 'grayscale(100%)' : '';

          if (currentBeforeMode === 'orig') {
            if (compareViewOrigBtn) {
              compareViewOrigBtn.className = 'px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-accent text-accent-fg font-bold transition-colors cursor-pointer';
            }
            if (compareViewAdjBtn) {
              compareViewAdjBtn.className = 'px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-muted hover:text-fg transition-colors cursor-pointer';
            }
            if (compareImgOrig) {
              compareImgOrig.src = uneditedOrigSrc;
              compareImgOrig.style.transform = '';
              compareImgOrig.style.filter = '';
            }
            if (compareImgResult) {
              compareImgResult.src = uneditedOrigSrc;
              compareImgResult.style.transform = '';
              compareImgResult.style.filter = '';
            }
          } else {
            if (compareViewOrigBtn) {
              compareViewOrigBtn.className = 'px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-muted hover:text-fg transition-colors cursor-pointer';
            }
            if (compareViewAdjBtn) {
              compareViewAdjBtn.className = 'px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-accent text-accent-fg font-bold transition-colors cursor-pointer';
            }
            if (compareImgOrig) {
              compareImgOrig.src = adjustedSrc;
              compareImgOrig.style.transform = transformStr;
              compareImgOrig.style.filter = filterStr;
            }
            if (compareImgResult) {
              compareImgResult.src = adjustedSrc;
              compareImgResult.style.transform = transformStr;
              compareImgResult.style.filter = filterStr;
            }
          }
        };

        if (compareViewOrigBtn) {
          compareViewOrigBtn.onclick = (e) => {
            e.stopPropagation();
            currentBeforeMode = 'orig';
            updateToggleButtons();
          };
        }
        if (compareViewAdjBtn) {
          compareViewAdjBtn.onclick = (e) => {
            e.stopPropagation();
            currentBeforeMode = 'adj';
            updateToggleButtons();
          };
        }

        updateToggleButtons();
      } else {
        if (compareToggleContainer) compareToggleContainer.classList.add('hidden');
        if (compareOrigTag) {
          const origDim = job.originalWidth && job.originalHeight ? `${job.originalWidth}×${job.originalHeight}px` : 'Original';
          compareOrigTag.textContent = `High-Res Source (${origDim})`;
          compareOrigTag.classList.remove('hidden');
        }
        if (compareImgOrig) {
          compareImgOrig.src = uneditedOrigSrc;
          compareImgOrig.style.transform = '';
          compareImgOrig.style.filter = '';
        }
        if (compareImgResult) {
          compareImgResult.src = uneditedOrigSrc;
          compareImgResult.style.transform = '';
          compareImgResult.style.filter = '';
        }
      }

      if (compareTip) {
        compareTip.textContent = 'High-fidelity preview · Scroll or pinch to zoom';
      }
    }

    // Reset split & zoom
    setSplitPercent(50);
    zoomLevel = 1.0;
    panX = 0;
    panY = 0;
    updateTransform();

    compareModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeCompareModal(): void {
    if (!compareModal) return;
    compareModal.classList.add('hidden');
    document.body.style.overflow = '';
    activeCompareJob = null;
  }

  compareCloseBtn?.addEventListener('click', closeCompareModal);
  compareModal?.addEventListener('click', (e) => {
    if (e.target === compareModal) closeCompareModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && compareModal && !compareModal.classList.contains('hidden')) {
      closeCompareModal();
    }
  });

  // Modal download button
  compareDlBtn?.addEventListener('click', () => {
    if (activeCompareJob?.result && activeCompareJob?.resultName) {
      downloadBlob(activeCompareJob.result, activeCompareJob.resultName);
    }
  });

  // Zoom controls
  zoomInBtn?.addEventListener('click', () => {
    zoomLevel = Math.min(5.0, zoomLevel + 0.25);
    updateTransform();
  });
  zoomOutBtn?.addEventListener('click', () => {
    zoomLevel = Math.max(0.5, zoomLevel - 0.25);
    updateTransform();
  });
  zoomFitBtn?.addEventListener('click', () => {
    if (compareStage) {
      compareStage.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
      setTimeout(() => {
        if (compareStage) compareStage.style.transition = '';
      }, 220);
    }
    zoomLevel = 1.0;
    panX = 0;
    panY = 0;
    updateTransform();
  });

  // Mouse wheel zoom in viewport
  compareViewport?.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    zoomLevel = Math.max(0.5, Math.min(5.0, zoomLevel + delta));
    updateTransform();
  }, { passive: false });

  // Split handle dragging (Mouse + Touch via Pointer Events with capture and RAF throttling)
  let compareRafId: number | null = null;
  let cachedCompareRect: DOMRect | null = null;
  let pendingSplitPercent: number | null = null;

  function scheduleCompareTransform(): void {
    if (compareRafId !== null) return;
    compareRafId = requestAnimationFrame(() => {
      compareRafId = null;
      if (pendingSplitPercent !== null) {
        setSplitPercent(pendingSplitPercent);
        pendingSplitPercent = null;
      }
      if (isPanning) {
        updateTransform();
      }
    });
  }

  function handleSplitMove(clientX: number): void {
    if (!cachedCompareRect && compareViewport) {
      cachedCompareRect = compareViewport.getBoundingClientRect();
    }
    if (!cachedCompareRect || cachedCompareRect.width <= 0) return;
    const pct = ((clientX - cachedCompareRect.left) / cachedCompareRect.width) * 100;
    pendingSplitPercent = pct;
    scheduleCompareTransform();
  }

  compareHandle?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingSplit = true;
    cachedCompareRect = compareViewport?.getBoundingClientRect() || null;
    try {
      compareHandle.setPointerCapture(e.pointerId);
    } catch (_) {}
  });

  compareHandle?.addEventListener('pointermove', (e) => {
    if (isDraggingSplit) {
      handleSplitMove(e.clientX);
    }
  });

  const stopHandleDrag = (e: PointerEvent): void => {
    if (isDraggingSplit) {
      isDraggingSplit = false;
      cachedCompareRect = null;
      try {
        compareHandle?.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  compareHandle?.addEventListener('pointerup', stopHandleDrag);
  compareHandle?.addEventListener('pointercancel', stopHandleDrag);

  compareViewport?.addEventListener('pointerdown', (e) => {
    if (!compareViewport) return;
    cachedCompareRect = compareViewport.getBoundingClientRect();
    const isComparing = activeCompareJob && activeCompareJob.status === 'done' && compareHandle && !compareHandle.classList.contains('hidden');

    if (isComparing) {
      const currentPercent = parseFloat(compareHandle?.style.left || '50') / 100;
      const handleX = cachedCompareRect.left + (cachedCompareRect.width * currentPercent);
      if (Math.abs(e.clientX - handleX) < 48 || zoomLevel === 1.0) {
        isDraggingSplit = true;
        handleSplitMove(e.clientX);
        return;
      }
    }

    if (zoomLevel > 1.0) {
      isPanning = true;
      startPanX = e.clientX - panX;
      startPanY = e.clientY - panY;
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (isDraggingSplit) {
      handleSplitMove(e.clientX);
    } else if (isPanning) {
      panX = e.clientX - startPanX;
      panY = e.clientY - startPanY;
      scheduleCompareTransform();
    }
  });

  window.addEventListener('pointerup', () => {
    isDraggingSplit = false;
    isPanning = false;
    cachedCompareRect = null;
  });

  // ---------- Quick-Crop & Framing Modal Controller ----------

  function openCropModal(job?: FileJob): void {
    if (!cropModal) return;
    const targetJob = job || state.jobs.find((j) => j.id === selectedJobId) || state.jobs[0];
    if (!targetJob && !state.jobs.length) {
      setStatus('Please add at least one image to crop.');
      return;
    }
    if (!targetJob) return;
    activeCropJob = targetJob;

    const srcUrl = targetJob.adjustedPreviewUrl || targetJob.croppedPreviewUrl || targetJob.previewUrl || (targetJob.file && targetJob.file.type !== 'application/pdf' && !targetJob.file.name.endsWith('.pdf') ? URL.createObjectURL(targetJob.file) : '');
    if (cropImgSource) {
      cropImgSource.src = srcUrl;
    }

    const currentDims = targetJob.dimensions || state.dimensions;
    const currentScale = currentDims?.scalePercent ?? state.scalePercent;
    let resizeDesc = '';
    if (currentScale && currentScale !== 100) {
      resizeDesc = ` · Scaled ${currentScale}%`;
    } else if (currentDims?.mode === 'custom' && currentDims.width && currentDims.height) {
      resizeDesc = ` · Resized ${currentDims.width}×${currentDims.height} px`;
    }

    if (cropModalFilename) {
      cropModalFilename.textContent = `${targetJob.file.name}${resizeDesc} · Drag box to frame`;
    }

    if (cropStepper) {
      if (state.jobs.length > 1) {
        cropStepper.classList.remove('hidden');
        cropStepper.classList.add('flex');
        const currIdx = state.jobs.findIndex((j) => j.id === targetJob.id);
        const displayIdx = currIdx === -1 ? 0 : currIdx;
        if (cropCounter) cropCounter.textContent = `${displayIdx + 1} / ${state.jobs.length}`;
        if (cropPrevBtn) cropPrevBtn.disabled = displayIdx <= 0;
        if (cropNextBtn) cropNextBtn.disabled = displayIdx >= state.jobs.length - 1;
      } else {
        cropStepper.classList.add('hidden');
        cropStepper.classList.remove('flex');
      }
    }
    if (cropOrigDims) {
      cropOrigDims.textContent = targetJob.originalWidth && targetJob.originalHeight
        ? `${targetJob.originalWidth} × ${targetJob.originalHeight} px`
        : 'Detecting…';
    }

    // Default ratio from job or fallback to state.cropAspect or 'original'
    const currentAspect = targetJob.cropAspect ?? (state.cropAspect !== 'original' ? state.cropAspect : 'original');
    cropBoxState.ratioName = currentAspect;
    cropBoxState.ratio = currentAspect === 'original' ? null : (ASPECT_RATIOS[currentAspect] ?? 1.0);
    cropBoxState.anchor = targetJob.cropAnchor ?? state.cropAnchor ?? 'center';

    const syncCropDimensions = () => {
      const realW = cropImgSource?.naturalWidth || targetJob.originalWidth;
      const realH = cropImgSource?.naturalHeight || targetJob.originalHeight;
      if (realW && realH) {
        targetJob.originalWidth = realW;
        targetJob.originalHeight = realH;
        if (cropOrigDims) {
          cropOrigDims.textContent = `${realW} × ${realH} px`;
        }
      }
      if (targetJob.customCropBox) {
        cropBoxState.x = targetJob.customCropBox.x;
        cropBoxState.y = targetJob.customCropBox.y;
        cropBoxState.w = targetJob.customCropBox.width;
        cropBoxState.h = targetJob.customCropBox.height;
      } else {
        recomputeCropBoxFromRatio();
      }
      updateCropBoxUI();
    };

    if (cropImgSource && cropImgSource.complete && cropImgSource.naturalWidth) {
      syncCropDimensions();
    } else if (cropImgSource) {
      cropImgSource.onload = syncCropDimensions;
    }

    if (targetJob.customCropBox) {
      cropBoxState.x = targetJob.customCropBox.x;
      cropBoxState.y = targetJob.customCropBox.y;
      cropBoxState.w = targetJob.customCropBox.width;
      cropBoxState.h = targetJob.customCropBox.height;
    } else {
      recomputeCropBoxFromRatio();
    }

    syncCropModalRatioBtns();
    syncCropModalAnchorBtns();
    updateCropBoxUI();

    cropModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeCropModal(): void {
    if (!cropModal) return;
    cropModal.classList.add('hidden');
    document.body.style.overflow = '';
    activeCropJob = null;
  }

  function recomputeCropBoxFromRatio(): void {
    const imgW = activeCropJob?.originalWidth || cropImgSource?.naturalWidth || 1000;
    const imgH = activeCropJob?.originalHeight || cropImgSource?.naturalHeight || 1000;
    const imgRatio = imgW / imgH;

    if (!cropBoxState.ratio || cropBoxState.ratioName === 'original') {
      cropBoxState.x = 0;
      cropBoxState.y = 0;
      cropBoxState.w = 1;
      cropBoxState.h = 1;
    } else {
      const targetRatio = cropBoxState.ratio;
      if (imgRatio > targetRatio) {
        const boxH = 0.9;
        const boxW = Math.min(0.95, (boxH * targetRatio) / imgRatio);
        cropBoxState.w = boxW;
        cropBoxState.h = boxH;
        cropBoxState.x = (1 - boxW) / 2;
        cropBoxState.y = (1 - boxH) / 2;
      } else {
        const boxW = 0.9;
        const boxH = Math.min(0.95, (boxW * imgRatio) / targetRatio);
        cropBoxState.w = boxW;
        cropBoxState.h = boxH;
        cropBoxState.x = (1 - boxW) / 2;
        if (cropBoxState.anchor === 'top') {
          cropBoxState.y = 0.05;
        } else if (cropBoxState.anchor === 'bottom') {
          cropBoxState.y = 0.95 - boxH;
        } else {
          cropBoxState.y = (1 - boxH) / 2;
        }
      }
    }
  }

  function updateCropBoxUI(): void {
    if (!cropBox) return;

    cropBoxState.w = Math.max(0.1, Math.min(1, cropBoxState.w));
    cropBoxState.h = Math.max(0.1, Math.min(1, cropBoxState.h));
    cropBoxState.x = Math.max(0, Math.min(1 - cropBoxState.w, cropBoxState.x));
    cropBoxState.y = Math.max(0, Math.min(1 - cropBoxState.h, cropBoxState.y));

    cropBox.style.left = `${cropBoxState.x * 100}%`;
    cropBox.style.top = `${cropBoxState.y * 100}%`;
    cropBox.style.width = `${cropBoxState.w * 100}%`;
    cropBox.style.height = `${cropBoxState.h * 100}%`;

    if (cropMaskTop) {
      cropMaskTop.style.height = `${cropBoxState.y * 100}%`;
    }
    if (cropMaskBottom) {
      cropMaskBottom.style.top = `${(cropBoxState.y + cropBoxState.h) * 100}%`;
      cropMaskBottom.style.height = `${Math.max(0, (1 - (cropBoxState.y + cropBoxState.h)) * 100)}%`;
    }
    if (cropMaskLeft) {
      cropMaskLeft.style.top = `${cropBoxState.y * 100}%`;
      cropMaskLeft.style.height = `${cropBoxState.h * 100}%`;
      cropMaskLeft.style.width = `${cropBoxState.x * 100}%`;
    }
    if (cropMaskRight) {
      cropMaskRight.style.top = `${cropBoxState.y * 100}%`;
      cropMaskRight.style.height = `${cropBoxState.h * 100}%`;
      cropMaskRight.style.left = `${(cropBoxState.x + cropBoxState.w) * 100}%`;
      cropMaskRight.style.width = `${Math.max(0, (1 - (cropBoxState.x + cropBoxState.w)) * 100)}%`;
    }

    if (activeCropJob?.originalWidth && activeCropJob?.originalHeight) {
      const pxW = Math.round(cropBoxState.w * activeCropJob.originalWidth);
      const pxH = Math.round(cropBoxState.h * activeCropJob.originalHeight);

      const dims = activeCropJob.dimensions ?? state.dimensions;
      const scalePct = dims?.scalePercent ?? state.scalePercent;
      if (scalePct && scalePct !== 100) {
        const outW = Math.round((pxW * scalePct) / 100);
        const outH = Math.round((pxH * scalePct) / 100);
        if (cropLiveSizeTag) cropLiveSizeTag.textContent = `${pxW}×${pxH} ➔ ${outW}×${outH} px (${scalePct}%)`;
        if (cropTargetDims) cropTargetDims.textContent = `${outW} × ${outH} px (${scalePct}% Scale)`;
      } else if (dims?.mode === 'custom' && dims.width && dims.height) {
        if (cropLiveSizeTag) cropLiveSizeTag.textContent = `${pxW}×${pxH} ➔ ${dims.width}×${dims.height} px`;
        if (cropTargetDims) cropTargetDims.textContent = `${dims.width} × ${dims.height} px (Custom)`;
      } else {
        if (cropLiveSizeTag) cropLiveSizeTag.textContent = `${pxW} × ${pxH} px`;
        if (cropTargetDims) cropTargetDims.textContent = `${pxW} × ${pxH} px`;
      }
    }

    if (cropModalRatioBadge) {
      cropModalRatioBadge.textContent = cropBoxState.ratioName.toUpperCase();
    }
  }

  let isDraggingCropBox = false;
  let isResizingHandle: string | null = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialBoxX = 0;
  let initialBoxY = 0;
  let initialBoxW = 0;
  let initialBoxH = 0;
  let cropRafId: number | null = null;
  let cachedCropContainerRect: DOMRect | null = null;
  let pendingCropX = 0;
  let pendingCropY = 0;

  function scheduleCropBoxUpdate(): void {
    if (cropRafId !== null) return;
    cropRafId = requestAnimationFrame(() => {
      cropRafId = null;
      if (!isDraggingCropBox && !isResizingHandle) return;
      if (!cachedCropContainerRect && cropContainer) {
        cachedCropContainerRect = cropContainer.getBoundingClientRect();
      }
      const rect = cachedCropContainerRect;
      if (!rect || rect.width <= 0 || rect.height <= 0) return;

      const dx = (pendingCropX - dragStartX) / rect.width;
      const dy = (pendingCropY - dragStartY) / rect.height;

      if (isDraggingCropBox) {
        cropBoxState.x = Math.max(0, Math.min(1 - cropBoxState.w, initialBoxX + dx));
        cropBoxState.y = Math.max(0, Math.min(1 - cropBoxState.h, initialBoxY + dy));
        updateCropBoxUI();
      } else if (isResizingHandle) {
        const imgRatio = (activeCropJob?.originalWidth || 1) / (activeCropJob?.originalHeight || 1);
        const ratio = cropBoxState.ratio;

        if (isResizingHandle === 'se') {
          let newW = Math.max(0.05, Math.min(1 - initialBoxX, initialBoxW + dx));
          let newH = Math.max(0.05, Math.min(1 - initialBoxY, initialBoxH + dy));
          if (ratio) {
            newH = (newW * imgRatio) / ratio;
            if (initialBoxY + newH > 1) {
              newH = 1 - initialBoxY;
              newW = (newH * ratio) / imgRatio;
            }
          }
          cropBoxState.w = Math.max(0.05, newW);
          cropBoxState.h = Math.max(0.05, newH);
        } else if (isResizingHandle === 'sw') {
          let newX = Math.max(0, Math.min(initialBoxX + initialBoxW - 0.05, initialBoxX + dx));
          let newW = (initialBoxX + initialBoxW) - newX;
          let newH = Math.max(0.05, Math.min(1 - initialBoxY, initialBoxH + dy));
          if (ratio) {
            newH = (newW * imgRatio) / ratio;
            if (initialBoxY + newH > 1) {
              newH = 1 - initialBoxY;
              newW = (newH * ratio) / imgRatio;
              newX = (initialBoxX + initialBoxW) - newW;
            }
          }
          cropBoxState.x = Math.max(0, newX);
          cropBoxState.w = Math.max(0.05, newW);
          cropBoxState.h = Math.max(0.05, newH);
        } else if (isResizingHandle === 'ne') {
          let newW = Math.max(0.05, Math.min(1 - initialBoxX, initialBoxW + dx));
          let newY = Math.max(0, Math.min(initialBoxY + initialBoxH - 0.05, initialBoxY + dy));
          let newH = (initialBoxY + initialBoxH) - newY;
          if (ratio) {
            newH = (newW * imgRatio) / ratio;
            newY = (initialBoxY + initialBoxH) - newH;
            if (newY < 0) {
              newY = 0;
              newH = initialBoxY + initialBoxH;
              newW = (newH * ratio) / imgRatio;
            }
          }
          cropBoxState.y = Math.max(0, newY);
          cropBoxState.w = Math.max(0.05, newW);
          cropBoxState.h = Math.max(0.05, newH);
        } else if (isResizingHandle === 'nw') {
          let newX = Math.max(0, Math.min(initialBoxX + initialBoxW - 0.05, initialBoxX + dx));
          let newW = (initialBoxX + initialBoxW) - newX;
          let newY = Math.max(0, Math.min(initialBoxY + initialBoxH - 0.05, initialBoxY + dy));
          let newH = (initialBoxY + initialBoxH) - newY;
          if (ratio) {
            newH = (newW * imgRatio) / ratio;
            newY = (initialBoxY + initialBoxH) - newH;
            if (newY < 0) {
              newY = 0;
              newH = initialBoxY + initialBoxH;
              newW = (newH * ratio) / imgRatio;
              newX = (initialBoxX + initialBoxW) - newW;
            }
          }
          cropBoxState.x = Math.max(0, newX);
          cropBoxState.y = Math.max(0, newY);
          cropBoxState.w = Math.max(0.05, newW);
          cropBoxState.h = Math.max(0.05, newH);
        }
        updateCropBoxUI();
      }
    });
  }

  cropBox?.addEventListener('pointerdown', (e) => {
    const handleEl = (e.target as HTMLElement).closest('.pk-crop-handle') as HTMLElement | null;
    if (handleEl) {
      isResizingHandle = handleEl.dataset.handle || 'se';
    } else {
      isDraggingCropBox = true;
    }
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    pendingCropX = e.clientX;
    pendingCropY = e.clientY;
    initialBoxX = cropBoxState.x;
    initialBoxY = cropBoxState.y;
    initialBoxW = cropBoxState.w;
    initialBoxH = cropBoxState.h;
    cachedCropContainerRect = cropContainer?.getBoundingClientRect() || null;
    try {
      cropBox.setPointerCapture(e.pointerId);
    } catch (_) {}
    e.preventDefault();
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDraggingCropBox && !isResizingHandle) return;
    pendingCropX = e.clientX;
    pendingCropY = e.clientY;
    scheduleCropBoxUpdate();
  });

  const stopCropDrag = (e?: PointerEvent) => {
    if (isDraggingCropBox || isResizingHandle) {
      isDraggingCropBox = false;
      isResizingHandle = null;
      cachedCropContainerRect = null;
      if (e && cropBox) {
        try {
          cropBox.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
    }
  };

  window.addEventListener('pointerup', stopCropDrag);
  window.addEventListener('pointercancel', stopCropDrag);

  function syncCropModalRatioBtns(): void {
    cropModalRatioBtns.forEach((btn) => {
      const isSel = btn.dataset.ratio === cropBoxState.ratioName;
      btn.className = isSel
        ? 'pk-modal-ratio-btn h-8 px-3 rounded-lg font-semibold border border-accent/40 bg-accent/10 text-accent cursor-pointer shrink-0 text-xs whitespace-nowrap flex items-center justify-center transition-colors'
        : 'pk-modal-ratio-btn h-8 px-3 rounded-lg font-medium border border-border bg-surface text-fg hover:border-accent/40 cursor-pointer shrink-0 text-xs whitespace-nowrap flex items-center justify-center transition-colors';
    });
  }

  function syncCropModalAnchorBtns(): void {
    const a = cropBoxState.anchor;
    if (cropModalAnchorTop) {
      cropModalAnchorTop.className = a === 'top'
        ? 'h-7 px-2.5 rounded-md border border-accent/40 bg-accent/10 text-accent font-semibold text-xs cursor-pointer flex items-center justify-center transition-colors'
        : 'h-7 px-2.5 rounded-md border border-border bg-surface text-muted hover:text-fg font-medium text-xs cursor-pointer flex items-center justify-center transition-colors';
    }
    if (cropModalAnchorCenter) {
      cropModalAnchorCenter.className = a === 'center'
        ? 'h-7 px-2.5 rounded-md border border-accent/40 bg-accent/10 text-accent font-semibold text-xs cursor-pointer flex items-center justify-center transition-colors'
        : 'h-7 px-2.5 rounded-md border border-border bg-surface text-muted hover:text-fg font-medium text-xs cursor-pointer flex items-center justify-center transition-colors';
    }
    if (cropModalAnchorBottom) {
      cropModalAnchorBottom.className = a === 'bottom'
        ? 'h-7 px-2.5 rounded-md border border-accent/40 bg-accent/10 text-accent font-semibold text-xs cursor-pointer flex items-center justify-center transition-colors'
        : 'h-7 px-2.5 rounded-md border border-border bg-surface text-muted hover:text-fg font-medium text-xs cursor-pointer flex items-center justify-center transition-colors';
    }
  }

  cropModalRatioBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const r = (btn.dataset.ratio || '1:1') as CropAspectPreset;
      cropBoxState.ratioName = r;
      cropBoxState.ratio = r === 'original' ? null : (ASPECT_RATIOS[r] ?? 1.0);
      recomputeCropBoxFromRatio();
      syncCropModalRatioBtns();
      updateCropBoxUI();
    });
  });

  cropModalAnchorTop?.addEventListener('click', () => {
    cropBoxState.anchor = 'top';
    cropBoxState.y = 0;
    syncCropModalAnchorBtns();
    updateCropBoxUI();
  });

  cropModalAnchorCenter?.addEventListener('click', () => {
    cropBoxState.anchor = 'center';
    cropBoxState.y = Math.max(0, (1 - cropBoxState.h) / 2);
    syncCropModalAnchorBtns();
    updateCropBoxUI();
  });

  cropModalAnchorBottom?.addEventListener('click', () => {
    cropBoxState.anchor = 'bottom';
    cropBoxState.y = Math.max(0, 1 - cropBoxState.h);
    syncCropModalAnchorBtns();
    updateCropBoxUI();
  });

  cropModalResetBtn?.addEventListener('click', () => {
    recomputeCropBoxFromRatio();
    updateCropBoxUI();
  });

  cropModalCloseBtn?.addEventListener('click', closeCropModal);
  cropModalCancelBtn?.addEventListener('click', closeCropModal);
  cropModal?.addEventListener('click', (e) => {
    if (e.target === cropModal) closeCropModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cropModal && !cropModal.classList.contains('hidden')) {
      closeCropModal();
    }
  });

  cropModalApplyBtn?.addEventListener('click', async () => {
    if (activeCropJob) {
      activeCropJob.customCropBox = {
        x: cropBoxState.x,
        y: cropBoxState.y,
        width: cropBoxState.w,
        height: cropBoxState.h,
      };
      activeCropJob.cropAspect = cropBoxState.ratioName;
      activeCropJob.cropAnchor = cropBoxState.anchor;
      setStatus(`Applied custom framing to ${activeCropJob.file.name}`);
      if (activeCropJob.status === 'done') {
        activeCropJob.status = 'queued';
        updateButtons();
      }
      const cropHint = document.getElementById('pk-crop-hint');
      if (cropHint) {
        cropHint.textContent = cropBoxState.ratioName === 'original' ? 'Custom' : cropBoxState.ratioName;
      }
      await generateJobCroppedPreview(activeCropJob);
      await generateJobAdjustedPreview(activeCropJob);
    renderFiles();
      updateLiveDimensionsAndCardPreviews();
      closeCropModal();
    }
  });

  // ---------- Interactive Resize & Scale Studio Controller ----------

  function getResizeBaseDimensions(): { w: number; h: number } {
    const w = activeResizeJob?.croppedWidth || activeResizeJob?.originalWidth || cropImgSource?.naturalWidth || 1000;
    const h = activeResizeJob?.croppedHeight || activeResizeJob?.originalHeight || cropImgSource?.naturalHeight || 1000;
    return { w, h };
  }

  function openResizeModal(job?: FileJob): void {
    if (!resizeModal) return;
    isGlobalResizeModal = !job;
    const targetJob = job || state.jobs.find((j) => j.id === selectedJobId) || state.jobs[0];
    activeResizeJob = targetJob || null;

    if (!targetJob && !state.jobs.length) {
      setStatus('Please add at least one image to resize.');
      return;
    }

    const baseSrcUrl = targetJob?.croppedPreviewUrl || targetJob?.previewUrl || (targetJob?.file && targetJob.file.type !== 'application/pdf' && !targetJob.file.name.endsWith('.pdf') ? URL.createObjectURL(targetJob.file) : '');
    if (resizeImgPreview && baseSrcUrl) {
      resizeImgPreview.src = baseSrcUrl;
    }
    if (resizeGhostImg && baseSrcUrl) {
      resizeGhostImg.src = baseSrcUrl;
    }

    if (resizeFilename) {
      const isCropped = !!(targetJob?.croppedPreviewUrl || targetJob?.customCropBox);
      const cropBadge = isCropped ? ' · Cropped' : '';
      resizeFilename.textContent = job
        ? `${job.file.name}${cropBadge}`
        : (targetJob ? `${targetJob.file.name} (Global Settings)${cropBadge}` : 'All files in queue');
    }

    if (resizeStepper) {
      if (state.jobs.length > 1) {
        resizeStepper.classList.remove('hidden');
        resizeStepper.classList.add('flex');
        const currIdx = state.jobs.findIndex((j) => j.id === targetJob?.id);
        const displayIdx = currIdx === -1 ? 0 : currIdx;
        if (resizeCounter) resizeCounter.textContent = `${displayIdx + 1} / ${state.jobs.length}`;
        if (resizePrevBtn) resizePrevBtn.disabled = displayIdx <= 0;
        if (resizeNextBtn) resizeNextBtn.disabled = displayIdx >= state.jobs.length - 1;
      } else {
        resizeStepper.classList.add('hidden');
        resizeStepper.classList.remove('flex');
      }
    }

    // Init state from job or global settings
    const currentDims = job ? (job.dimensions || state.dimensions) : state.dimensions;
    const hasCustomExactDims = currentDims?.mode === 'custom' && Boolean(currentDims.width || currentDims.height) && !currentDims.scalePercent;
    const currentScale = hasCustomExactDims
      ? null
      : (job ? (job.dimensions?.scalePercent ?? state.scalePercent ?? 100) : (state.scalePercent ?? 100));
    resizeStudioState.scalePercent = currentScale;
    resizeStudioState.unit = currentDims?.unit || state.unit || 'px';
    resizeStudioState.dpi = currentDims?.dpi || state.dpi || 300;
    resizeStudioState.lockAspect = currentDims?.lockAspectRatio ?? state.lockAspectRatio ?? true;
    resizeStudioState.fit = currentDims?.fit ?? state.dimensions.fit ?? 'contain';
    resizeStudioState.noUpscale = currentDims?.noUpscale ?? state.dimensions.noUpscale ?? true;

    const { w: srcW, h: srcH } = getResizeBaseDimensions();

    if (currentDims.mode === 'custom' && currentDims.width && currentDims.height) {
      resizeStudioState.width = currentDims.width;
      resizeStudioState.height = currentDims.height;
    } else if (currentScale && currentScale !== 100) {
      resizeStudioState.width = Math.round((srcW * currentScale) / 100);
      resizeStudioState.height = Math.round((srcH * currentScale) / 100);
    } else {
      resizeStudioState.width = srcW;
      resizeStudioState.height = srcH;
    }

    if (resizeStudioState.unit === 'px') {
      resizeStudioState.unitWidth = resizeStudioState.width;
      resizeStudioState.unitHeight = resizeStudioState.height;
    } else {
      const panelW = dimWidthInput?.value ? Number(dimWidthInput.value) : 0;
      const panelH = dimHeightInput?.value ? Number(dimHeightInput.value) : 0;
      if (
        panelW > 0 &&
        panelH > 0 &&
        state.unit === resizeStudioState.unit &&
        unitToPx(panelW, resizeStudioState.unit, resizeStudioState.dpi) === resizeStudioState.width &&
        unitToPx(panelH, resizeStudioState.unit, resizeStudioState.dpi) === resizeStudioState.height
      ) {
        resizeStudioState.unitWidth = panelW;
        resizeStudioState.unitHeight = panelH;
      } else {
        resizeStudioState.unitWidth = pxToUnit(
          resizeStudioState.width || srcW,
          resizeStudioState.unit,
          resizeStudioState.dpi
        );
        resizeStudioState.unitHeight = pxToUnit(
          resizeStudioState.height || srcH,
          resizeStudioState.unit,
          resizeStudioState.dpi
        );
      }
    }

    syncResizeStudioUi();

    resizeModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeResizeModal(): void {
    if (!resizeModal) return;
    resizeModal.classList.add('hidden');
    document.body.style.overflow = '';
    activeResizeJob = null;
  }

  function syncResizeStudioUi(): void {
    const { w: srcW, h: srcH } = getResizeBaseDimensions();

    // Scale buttons
    modalScaleBtns.forEach((btn) => {
      const s = btn.dataset.scale;
      const isSel = (s === 'custom' && !resizeStudioState.scalePercent) || (Number(s) === resizeStudioState.scalePercent);
      btn.className = isSel
        ? 'pk-modal-scale-btn py-1.5 rounded-lg border border-accent/40 bg-accent/10 text-accent font-semibold cursor-pointer transition-all'
        : 'pk-modal-scale-btn py-1.5 rounded-lg border border-transparent hover:border-border text-muted hover:text-fg cursor-pointer transition-all';
    });

    if (modalScaleVal) {
      modalScaleVal.textContent = resizeStudioState.scalePercent ? `${resizeStudioState.scalePercent}%` : 'Custom';
    }
    if (modalScaleSlider && resizeStudioState.scalePercent) {
      modalScaleSlider.value = String(resizeStudioState.scalePercent);
    }
    if (resizeBadge) {
      resizeBadge.textContent = resizeStudioState.scalePercent ? `${resizeStudioState.scalePercent}%` : 'CUSTOM';
    }

    // Unit pills & Print DPI select
    modalUnitBtns.forEach((btn) => {
      const isSel = btn.dataset.unit === resizeStudioState.unit;
      btn.className = isSel
        ? 'pk-modal-unit-btn rounded-md px-2.5 py-1 font-semibold bg-accent/15 text-accent cursor-pointer'
        : 'pk-modal-unit-btn rounded-md px-2.5 py-1 font-medium text-muted hover:text-fg cursor-pointer';
    });
    if (modalDpiSelect && ['72', '96', '150', '200', '300', '600'].includes(String(resizeStudioState.dpi))) {
      modalDpiSelect.value = String(resizeStudioState.dpi);
    }
    if (modalWLabel) modalWLabel.textContent = `Width (${resizeStudioState.unit})`;
    if (modalHLabel) modalHLabel.textContent = `Height (${resizeStudioState.unit})`;

    // Input values
    const dispW =
      resizeStudioState.unit === 'px'
        ? resizeStudioState.width
        : (resizeStudioState.unitWidth ??
            (resizeStudioState.width
              ? pxToUnit(resizeStudioState.width, resizeStudioState.unit, resizeStudioState.dpi)
              : null));
    const dispH =
      resizeStudioState.unit === 'px'
        ? resizeStudioState.height
        : (resizeStudioState.unitHeight ??
            (resizeStudioState.height
              ? pxToUnit(resizeStudioState.height, resizeStudioState.unit, resizeStudioState.dpi)
              : null));

    if (modalDimW && dispW !== null && document.activeElement !== modalDimW) {
      modalDimW.value = String(dispW);
    }
    if (modalDimH && dispH !== null && document.activeElement !== modalDimH) {
      modalDimH.value = String(dispH);
    }

    if (modalComputedPx) {
      if (resizeStudioState.unit !== 'px' && resizeStudioState.width && resizeStudioState.height && dispW && dispH) {
        modalComputedPx.textContent = `${dispW} × ${dispH} ${resizeStudioState.unit} @ ${resizeStudioState.dpi} DPI = ${resizeStudioState.width} × ${resizeStudioState.height} px`;
        modalComputedPx.classList.remove('hidden');
      } else {
        modalComputedPx.classList.add('hidden');
      }
    }

    // Lock button
    if (modalLockIcon) modalLockIcon.textContent = resizeStudioState.lockAspect ? '🔒' : '🔓';
    if (modalLockLabel) modalLockLabel.textContent = resizeStudioState.lockAspect ? 'Proportions Locked' : 'Free Aspect';
    if (modalLockBtn) {
      modalLockBtn.className = resizeStudioState.lockAspect
        ? 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-accent bg-accent/10 border border-accent/30 hover:bg-accent/20 transition-colors cursor-pointer'
        : 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-muted bg-surface border border-border hover:text-fg transition-colors cursor-pointer';
    }

    // Fit buttons
    modalFitBtns.forEach((btn) => {
      const isSel = btn.dataset.fit === resizeStudioState.fit;
      btn.className = isSel
        ? 'pk-modal-fit-btn flex-1 rounded-md py-1 text-[11px] font-medium bg-surface text-fg shadow-sm cursor-pointer'
        : 'pk-modal-fit-btn flex-1 rounded-md py-1 text-[11px] font-medium text-muted hover:text-fg cursor-pointer';
    });

    if (modalNoUpscale) {
      modalNoUpscale.checked = resizeStudioState.noUpscale;
    }

    // Calculate predicted target dims
    const targetW = resizeStudioState.width || srcW;
    const targetH = resizeStudioState.height || srcH;

    const isCropped = !!(activeResizeJob?.croppedPreviewUrl || activeResizeJob?.customCropBox);
    if (resizeSrcDims) resizeSrcDims.textContent = `${srcW} × ${srcH} px${isCropped ? ' (Cropped)' : ''}`;
    if (resizeTargetDims) resizeTargetDims.textContent = `${targetW} × ${targetH} px`;
    if (resizeLiveBadge) resizeLiveBadge.textContent = `${targetW} × ${targetH} px`;

    // Dynamic Visual Scaling of the Preview Box
    let scaleX = 1.0;
    let scaleY = 1.0;

    if (resizeStudioState.scalePercent) {
      const s = Math.max(0.1, Math.min(1.0, resizeStudioState.scalePercent / 100));
      scaleX = s;
      scaleY = s;
    } else {
      const rawScaleX = targetW / srcW;
      const rawScaleY = targetH / srcH;
      const maxScale = Math.max(rawScaleX, rawScaleY);
      if (maxScale > 1.0) {
        scaleX = Math.max(0.1, rawScaleX / maxScale);
        scaleY = Math.max(0.1, rawScaleY / maxScale);
      } else {
        scaleX = Math.max(0.1, Math.min(1.0, rawScaleX));
        scaleY = Math.max(0.1, Math.min(1.0, rawScaleY));
      }
    }

    if (resizePreviewBox) {
      resizePreviewBox.style.width = `${(scaleX * 100).toFixed(1)}%`;
      resizePreviewBox.style.height = `${(scaleY * 100).toFixed(1)}%`;
    }

    if (resizeImgPreview) {
      if (resizeStudioState.fit === 'cover') {
        resizeImgPreview.style.objectFit = 'cover';
      } else if (resizeStudioState.fit === 'fill') {
        resizeImgPreview.style.objectFit = 'fill';
      } else {
        resizeImgPreview.style.objectFit = 'contain';
      }
    }

    if (resizeSavingsTag) {
      const srcPixels = srcW * srcH;
      const targetPixels = targetW * targetH;
      if (targetPixels < srcPixels) {
        const drop = Math.round(((srcPixels - targetPixels) / srcPixels) * 100);
        resizeSavingsTag.textContent = `-${drop}% total pixels (smaller file)`;
        resizeSavingsTag.className = 'text-success font-semibold flex items-center gap-1 font-mono';
      } else if (targetPixels > srcPixels) {
        const inc = Math.round(((targetPixels - srcPixels) / srcPixels) * 100);
        resizeSavingsTag.textContent = `+${inc}% upscaled pixels`;
        resizeSavingsTag.className = 'text-amber-500 font-semibold flex items-center gap-1 font-mono';
      } else {
        resizeSavingsTag.textContent = '100% natural resolution';
        resizeSavingsTag.className = 'text-muted font-semibold flex items-center gap-1 font-mono';
      }
    }
  }

  // Event listeners for resize modal with RAF throttling
  let resizeStudioRafId: number | null = null;
  function scheduleResizeStudioUi(): void {
    if (resizeStudioRafId !== null) return;
    resizeStudioRafId = requestAnimationFrame(() => {
      resizeStudioRafId = null;
      syncResizeStudioUi();
    });
  }

  function animateResizeBoxTransition(): void {
    if (resizePreviewBox) {
      resizePreviewBox.style.transition = 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1), height 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
      setTimeout(() => {
        if (resizePreviewBox) resizePreviewBox.style.transition = '';
      }, 220);
    }
  }

  modalScaleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      animateResizeBoxTransition();
      const s = btn.dataset.scale;
      const { w: srcW, h: srcH } = getResizeBaseDimensions();
      if (s === 'custom') {
        resizeStudioState.scalePercent = null;
      } else {
        const pct = Number(s);
        resizeStudioState.scalePercent = pct;
        resizeStudioState.width = Math.round((srcW * pct) / 100);
        resizeStudioState.height = Math.round((srcH * pct) / 100);
        resizeStudioState.unitWidth = pxToUnit(resizeStudioState.width, resizeStudioState.unit, resizeStudioState.dpi);
        resizeStudioState.unitHeight = pxToUnit(resizeStudioState.height, resizeStudioState.unit, resizeStudioState.dpi);
      }
      syncResizeStudioUi();
    });
  });

  modalScaleSlider?.addEventListener('input', () => {
    const pct = Number(modalScaleSlider.value);
    resizeStudioState.scalePercent = pct;
    const { w: srcW, h: srcH } = getResizeBaseDimensions();
    resizeStudioState.width = Math.round((srcW * pct) / 100);
    resizeStudioState.height = Math.round((srcH * pct) / 100);
    resizeStudioState.unitWidth = pxToUnit(resizeStudioState.width, resizeStudioState.unit, resizeStudioState.dpi);
    resizeStudioState.unitHeight = pxToUnit(resizeStudioState.height, resizeStudioState.unit, resizeStudioState.dpi);
    scheduleResizeStudioUi();
  });

  modalDimPresets.forEach((btn) => {
    btn.addEventListener('click', () => {
      animateResizeBoxTransition();
      const w = Number(btn.dataset.w);
      const h = Number(btn.dataset.h);
      if (w && h) {
        resizeStudioState.width = w;
        resizeStudioState.height = h;
        resizeStudioState.unitWidth = pxToUnit(w, resizeStudioState.unit, resizeStudioState.dpi);
        resizeStudioState.unitHeight = pxToUnit(h, resizeStudioState.unit, resizeStudioState.dpi);
        resizeStudioState.scalePercent = null;
        if (modalDimW) modalDimW.value = String(resizeStudioState.unitWidth);
        if (modalDimH) modalDimH.value = String(resizeStudioState.unitHeight);
        syncResizeStudioUi();
      }
    });
  });

  modalUnitBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextUnit = (btn.dataset.unit || 'px') as DimensionUnit;
      if (nextUnit === resizeStudioState.unit) return;
      const { w: srcW, h: srcH } = getResizeBaseDimensions();
      const curPxW = resizeStudioState.width || srcW;
      const curPxH = resizeStudioState.height || srcH;
      resizeStudioState.unit = nextUnit;
      resizeStudioState.unitWidth = pxToUnit(curPxW, nextUnit, resizeStudioState.dpi);
      resizeStudioState.unitHeight = pxToUnit(curPxH, nextUnit, resizeStudioState.dpi);
      if (modalDimW) modalDimW.value = String(resizeStudioState.unitWidth);
      if (modalDimH) modalDimH.value = String(resizeStudioState.unitHeight);
      syncResizeStudioUi();
    });
  });

  modalDpiSelect?.addEventListener('change', () => {
    const nextDpi = Number(modalDpiSelect.value) || 300;
    resizeStudioState.dpi = nextDpi;
    if (resizeStudioState.unit !== 'px' && resizeStudioState.unitWidth && resizeStudioState.unitHeight) {
      resizeStudioState.width = unitToPx(resizeStudioState.unitWidth, resizeStudioState.unit, nextDpi);
      resizeStudioState.height = unitToPx(resizeStudioState.unitHeight, resizeStudioState.unit, nextDpi);
      resizeStudioState.scalePercent = null;
    }
    syncResizeStudioUi();
  });

  modalLockBtn?.addEventListener('click', () => {
    resizeStudioState.lockAspect = !resizeStudioState.lockAspect;
    syncResizeStudioUi();
  });

  modalDimW?.addEventListener('input', () => {
    const val = Number(modalDimW.value);
    if (val > 0) {
      resizeStudioState.unitWidth = val;
      const pxW = unitToPx(val, resizeStudioState.unit, resizeStudioState.dpi);
      resizeStudioState.width = pxW;
      resizeStudioState.scalePercent = null;
      if (resizeStudioState.lockAspect) {
        const { w: srcW, h: srcH } = getResizeBaseDimensions();
        const pxH = Math.max(10, Math.round((pxW * srcH) / srcW));
        resizeStudioState.height = pxH;
        resizeStudioState.unitHeight = pxToUnit(pxH, resizeStudioState.unit, resizeStudioState.dpi);
        if (modalDimH) modalDimH.value = String(resizeStudioState.unitHeight);
      }
      scheduleResizeStudioUi();
    }
  });

  modalDimH?.addEventListener('input', () => {
    const val = Number(modalDimH.value);
    if (val > 0) {
      resizeStudioState.unitHeight = val;
      const pxH = unitToPx(val, resizeStudioState.unit, resizeStudioState.dpi);
      resizeStudioState.height = pxH;
      resizeStudioState.scalePercent = null;
      if (resizeStudioState.lockAspect) {
        const { w: srcW, h: srcH } = getResizeBaseDimensions();
        const pxW = Math.max(10, Math.round((pxH * srcW) / srcH));
        resizeStudioState.width = pxW;
        resizeStudioState.unitWidth = pxToUnit(pxW, resizeStudioState.unit, resizeStudioState.dpi);
        if (modalDimW) modalDimW.value = String(resizeStudioState.unitWidth);
      }
      scheduleResizeStudioUi();
    }
  });

  modalFitBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      resizeStudioState.fit = (btn.dataset.fit || 'contain') as FitStrategy;
      syncResizeStudioUi();
    });
  });

  modalNoUpscale?.addEventListener('change', () => {
    resizeStudioState.noUpscale = modalNoUpscale.checked;
    syncResizeStudioUi();
  });

  resizeResetBtn?.addEventListener('click', () => {
    const { w: srcW, h: srcH } = getResizeBaseDimensions();
    resizeStudioState.scalePercent = 100;
    resizeStudioState.width = srcW;
    resizeStudioState.height = srcH;
    resizeStudioState.unitWidth = pxToUnit(srcW, resizeStudioState.unit, resizeStudioState.dpi);
    resizeStudioState.unitHeight = pxToUnit(srcH, resizeStudioState.unit, resizeStudioState.dpi);
    resizeStudioState.lockAspect = true;
    resizeStudioState.fit = 'contain';
    resizeStudioState.noUpscale = true;
    if (modalDimW) modalDimW.value = String(resizeStudioState.unitWidth);
    if (modalDimH) modalDimH.value = String(resizeStudioState.unitHeight);
    syncResizeStudioUi();
  });

  resizeCloseBtn?.addEventListener('click', closeResizeModal);
  resizeCancelBtn?.addEventListener('click', closeResizeModal);
  resizeModal?.addEventListener('click', (e) => {
    if (e.target === resizeModal) closeResizeModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && resizeModal && !resizeModal.classList.contains('hidden')) {
      closeResizeModal();
    }
  });

  resizeApplyBtn?.addEventListener('click', async () => {
    const { w: srcW, h: srcH } = getResizeBaseDimensions();
    const hasScaleChange = resizeStudioState.scalePercent !== null && resizeStudioState.scalePercent !== 100;
    const hasDimChange = Boolean(
      (resizeStudioState.width && resizeStudioState.width !== srcW) ||
      (resizeStudioState.height && resizeStudioState.height !== srcH)
    );

    let dims: DimensionOptions;
    if (hasScaleChange) {
      dims = {
        mode: 'custom',
        scalePercent: resizeStudioState.scalePercent!,
        width: resizeStudioState.width || Math.round((srcW * resizeStudioState.scalePercent!) / 100),
        height: resizeStudioState.height || Math.round((srcH * resizeStudioState.scalePercent!) / 100),
        lockAspectRatio: resizeStudioState.lockAspect,
        fit: resizeStudioState.fit,
        noUpscale: resizeStudioState.noUpscale,
      };
    } else if (hasDimChange || resizeStudioState.unit !== 'px') {
      dims = {
        mode: 'custom',
        width: resizeStudioState.width || srcW,
        height: resizeStudioState.height || srcH,
        unit: resizeStudioState.unit,
        dpi: resizeStudioState.unit !== 'px' ? resizeStudioState.dpi : (state.dpi ?? undefined),
        scalePercent: undefined,
        lockAspectRatio: resizeStudioState.lockAspect,
        fit: resizeStudioState.fit,
        noUpscale: resizeStudioState.noUpscale,
      };
    } else {
      dims = { mode: 'original', noUpscale: resizeStudioState.noUpscale };
    }

    if (resizeStudioState.unit !== 'px') {
      state.dpi = resizeStudioState.dpi;
      syncDpiUi();
    }

    if (!isGlobalResizeModal && activeResizeJob) {
      activeResizeJob.dimensions = dims;
      if (resizeStudioState.unit !== 'px') {
        activeResizeJob.dpi = resizeStudioState.dpi;
      }
      if (activeResizeJob.status === 'done') {
        activeCropJob = null;
        activeResizeJob.status = 'queued';
        updateButtons();
      }
      await generateJobAdjustedPreview(activeResizeJob);
      const resDesc = hasScaleChange
        ? `${resizeStudioState.scalePercent}% Scale`
        : dims.mode === 'custom'
          ? `${dims.width}×${dims.height}px`
          : 'Original Size';
      setStatus(`Applied resize (${resDesc}) to ${activeResizeJob.file.name}`);
    } else {
      state.dimensions = dims;
      state.scalePercent = resizeStudioState.scalePercent;
      await Promise.all(
        state.jobs.map(async (j) => {
          j.dimensions = dims;
          if (resizeStudioState.unit !== 'px') j.dpi = resizeStudioState.dpi;
          if (j.status === 'done') j.status = 'queued';
          await generateJobAdjustedPreview(j);
        })
      );
      setStatus('Applied resize settings to all files in queue.');
    }

    state.unit = resizeStudioState.unit;
    state.lockAspectRatio = resizeStudioState.lockAspect;

    if (resizeHint) {
      resizeHint.textContent = resizeStudioState.scalePercent
        ? (resizeStudioState.scalePercent === 100 ? '100% (Original)' : `${resizeStudioState.scalePercent}% Scale`)
        : resizeStudioState.unit === 'px'
          ? `${resizeStudioState.width}×${resizeStudioState.height}px`
          : `${resizeStudioState.unitWidth}×${resizeStudioState.unitHeight} ${resizeStudioState.unit} (${resizeStudioState.width}×${resizeStudioState.height}px)`;
    }

    // Sync right-hand Settings Panel UI controls
    if (resizeStudioState.scalePercent) {
      scaleBtns.forEach((b) => {
        const isSel = b.dataset.scale === String(resizeStudioState.scalePercent);
        b.className = isSel
          ? 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors bg-surface text-fg shadow-sm'
          : 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors text-muted hover:text-fg';
      });
      customDimsContainer?.classList.add('hidden');
    } else {
      scaleBtns.forEach((b) => {
        const isSel = b.dataset.scale === 'custom';
        b.className = isSel
          ? 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors bg-surface text-fg shadow-sm'
          : 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors text-muted hover:text-fg';
      });
      customDimsContainer?.classList.remove('hidden');
      const uW = resizeStudioState.unit === 'px' ? resizeStudioState.width : resizeStudioState.unitWidth;
      const uH = resizeStudioState.unit === 'px' ? resizeStudioState.height : resizeStudioState.unitHeight;
      if (dimWidthInput && uW) dimWidthInput.value = String(uW);
      if (dimHeightInput && uH) dimHeightInput.value = String(uH);
      syncDimUnitUi();
    }
    renderFiles();
    updateLiveDimensionsAndCardPreviews();
    updateButtons();
    closeResizeModal();
  });

  openResizeStudioBtn?.addEventListener('click', () => {
    const targetJob = state.jobs.find((j) => j.id === selectedJobId) || state.jobs[0];
    openResizeModal(targetJob);
  });
  openCropStudioBtn?.addEventListener('click', () => {
    const targetJob = state.jobs.find((j) => j.id === selectedJobId) || state.jobs[0];
    openCropModal(targetJob);
  });

  // Deselect button on active photo bar
  deselectPhotoBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    selectJob(null);
  });

  // Target Photo Bar navigation
  targetPrevBtn?.addEventListener('click', () => {
    if (!selectedJobId) return;
    const currIdx = state.jobs.findIndex((j) => j.id === selectedJobId);
    if (currIdx > 0 && state.jobs[currIdx - 1]) {
      selectJob(state.jobs[currIdx - 1]!.id, true);
    }
  });

  targetNextBtn?.addEventListener('click', () => {
    if (!selectedJobId) return;
    const currIdx = state.jobs.findIndex((j) => j.id === selectedJobId);
    if (currIdx < state.jobs.length - 1 && state.jobs[currIdx + 1]) {
      selectJob(state.jobs[currIdx + 1]!.id, true);
    }
  });

  applyToAllBtn?.addEventListener('click', async () => {
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
      if (activeJob.customCropBox) {
        await generateJobCroppedPreview(job);
      }
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

    setStatus(`Applied format, compression, crop & resize from ${activeJob.file.name} to all ${state.jobs.length} photos.`);
  });

  // Stepper inside Crop Modal
  cropPrevBtn?.addEventListener('click', () => {
    if (!activeCropJob) return;
    const currIdx = state.jobs.findIndex((j) => j.id === activeCropJob!.id);
    if (currIdx > 0 && state.jobs[currIdx - 1]) {
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

      const nextJob = state.jobs[currIdx - 1]!;
      selectJob(nextJob.id);
      openCropModal(nextJob);
    }
  });

  cropNextBtn?.addEventListener('click', () => {
    if (!activeCropJob) return;
    const currIdx = state.jobs.findIndex((j) => j.id === activeCropJob!.id);
    if (currIdx < state.jobs.length - 1 && state.jobs[currIdx + 1]) {
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

      const nextJob = state.jobs[currIdx + 1]!;
      selectJob(nextJob.id);
      openCropModal(nextJob);
    }
  });

  // Stepper inside Resize Modal
  resizePrevBtn?.addEventListener('click', () => {
    if (!activeResizeJob) return;
    const currIdx = state.jobs.findIndex((j) => j.id === activeResizeJob!.id);
    if (currIdx > 0 && state.jobs[currIdx - 1]) {
      const nextJob = state.jobs[currIdx - 1]!;
      selectJob(nextJob.id);
      openResizeModal(nextJob);
    }
  });

  resizeNextBtn?.addEventListener('click', () => {
    if (!activeResizeJob) return;
    const currIdx = state.jobs.findIndex((j) => j.id === activeResizeJob!.id);
    if (currIdx < state.jobs.length - 1 && state.jobs[currIdx + 1]) {
      const nextJob = state.jobs[currIdx + 1]!;
      selectJob(nextJob.id);
      openResizeModal(nextJob);
    }
  });

  // ---------- actions ----------

  async function startConversion(): Promise<void> {
    if (state.converting) return;
    const pendingJobs = state.jobs.filter((j) => j.status === 'queued');
    if (!pendingJobs.length) return;

    state.converting = true;
    setStatus(`Converting & compressing ${pendingJobs.length} file${pendingJobs.length === 1 ? '' : 's'}…`);
    updateButtons();

    const isMergePdf = state.mergePdf && state.to === 'pdf' && state.jobs.length > 1;

    let jobCount = 0;
    for (const job of pendingJobs) {
      jobCount++;
      // Protect INP (< 200ms) by yielding between batch job configurations
      if (jobCount > 1 && jobCount % 3 === 0) {
        await yieldToMain();
      }
      job.status = 'queued';

      // Detect individual file MIME type for universal input support
      const fileExt = job.file.name.split('.').pop()?.toLowerCase() || '';
      let fileMime = mimeForExtension(fileExt) || state.fromMime;
      let fileToSend: File = job.file;
      let fromExt = fileExt || state.from;

      // Handle PDF inputs: ensure we have a rendered page blob from the main thread
      // to completely avoid pdfjs-dist DOM errors inside the Web Worker.
      if (fileExt === 'pdf' || fileMime === 'application/pdf' || job.pdfPageNumber) {
        let pageBlob = job.renderedPageBlob;
        if (!pageBlob) {
          try {
            const { extractPdfImagesOrPages } = await import('@lib/worker/pdf-decode');
            const extracted = await extractPdfImagesOrPages(job.file);
            const pageNum = job.pdfPageNumber || 1;
            const targetItem = extracted.find((it) => it.index === pageNum) || extracted[0];
            if (targetItem) {
              pageBlob = targetItem.blob;
              job.renderedPageBlob = pageBlob;
              if (!job.previewUrl) {
                job.previewUrl = URL.createObjectURL(pageBlob);
              }
              if (!job.originalWidth) {
                job.originalWidth = targetItem.width;
                job.originalHeight = targetItem.height;
              }
            }
          } catch (e) {
            console.error('[PixelKit PDF Page Decode Error]', e);
          }
        }

        if (pageBlob) {
          const pageSuffix = job.pdfTotalPages && job.pdfTotalPages > 1 ? `-page-${job.pdfPageNumber || 1}` : '';
          const pageImgName = `${job.file.name.replace(/\.[^.]+$/, '')}${pageSuffix}.jpg`;
          fileToSend = new File([pageBlob], pageImgName, { type: 'image/jpeg' });
          fromExt = 'jpg';
          fileMime = 'image/jpeg';
        } else {
          job.status = 'error';
          job.error = 'Could not decode PDF document.';
          updateSingleCardNode(job);
          continue;
        }
      }

      // When merging to a single multi-page PDF, encode each page to JPEG first so jsPDF can embed valid images!
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
        targetKb: jobSizeMode === 'quality' ? null : jobTargetKb,
        autoOrient: state.autoOrient,
        preserveMetadata: state.preserveMetadata,
        quality: jobSizeMode === 'quality' ? state.quality : undefined,
        stripTransparency: state.stripTransparency,
        cropAspect: job.cropAspect ?? state.cropAspect,
        cropAnchor: job.cropAnchor ?? state.cropAnchor,
        customCropBox: job.customCropBox,
        rotate: job.rotate ?? 0,
        flipH: job.flipH ?? false,
        flipV: job.flipV ?? false,
        grayscale: job.grayscale ?? state.grayscale,
        dimensions: job.dimensions ?? state.dimensions,
        dpi: job.dpi ?? state.dpi ?? undefined,
        targetOptions: targetOpts,
        svgScale: state.svgScale,
        pdfPageNumber: job.pdfPageNumber,
        pdfTotalPages: job.pdfTotalPages,
        pdfOptions: {
          orientation: job.pdfOrientation ?? state.pdfOrientation,
          pageSize: job.pdfPageSize ?? state.pdfPageSize,
          margin: job.pdfMargin ?? state.pdfMargin,
        },
        file: fileToSend,
      };

      queue.push({ job, req });
      pending++;
    }
    updateProgress();
    updateButtons();
    pump();
  }

   convertBtn?.addEventListener('click', startConversion);



  clearBtn?.addEventListener('click', () => {
    if (state.converting) return;
    // Revoke object URLs to avoid memory leaks
    for (const j of state.jobs) {
      if (j.previewUrl) URL.revokeObjectURL(j.previewUrl);
      if (j.thumbUrl && j.thumbUrl !== j.previewUrl) URL.revokeObjectURL(j.thumbUrl);
      if (j.resultPreviewUrl) URL.revokeObjectURL(j.resultPreviewUrl);
      if (j.resultThumbUrl && j.resultThumbUrl !== j.resultPreviewUrl) URL.revokeObjectURL(j.resultThumbUrl);
      if (j.adjustedPreviewUrl) URL.revokeObjectURL(j.adjustedPreviewUrl);
      if (j.croppedPreviewUrl && j.croppedPreviewUrl !== j.adjustedPreviewUrl) URL.revokeObjectURL(j.croppedPreviewUrl);
    }
    state.jobs = [];
    selectedJobId = null;
    activePhotoBar?.classList.add('hidden');
    syncSidebarToSelectedJob(null);
    scheduleRenderFiles();
    updateButtons();
    updateProgress();
    updateStageDots();
    setStatus('Cleared.');
  });

  // ---------- "Download All as ZIP" archive (.zip) ----------

  downloadAllBtn?.addEventListener('click', async () => {
    const done = state.jobs.filter((j) => j.status === 'done' && j.result && j.resultName);
    if (!done.length) return;

    if (done.length === 1 && done[0]?.result && done[0]?.resultName) {
      downloadBlob(done[0].result, done[0].resultName);
      return;
    }

    try {
      downloadAllBtn.disabled = true;
      const originalText = downloadAllBtn.innerHTML;
      downloadAllBtn.innerHTML = `
        <span class="animate-spin inline-block mr-1">⟳</span>
        <span>Creating ZIP archive…</span>
      `;

      const zipFiles = done.map((j) => ({
        name: j.resultName!,
        blob: j.result!,
      }));

      const zipBlob = await createZipArchive(zipFiles);
      const zipFilename = `PixelKit-converted-${Date.now()}.zip`;
      downloadBlob(zipBlob, zipFilename);
      setStatus(`Downloaded ${done.length} files as ${zipFilename}`);

      downloadAllBtn.innerHTML = originalText;
      downloadAllBtn.disabled = false;
    } catch (err) {
      console.error('[PixelKit ZIP error]', err);
      // Fallback to sequential downloads if ZIP fails
      for (let i = 0; i < done.length; i++) {
        const j = done[i];
        if (!j || !j.result || !j.resultName) continue;
        await delay(120 * i);
        downloadBlob(j.result, j.resultName);
      }
      downloadAllBtn.disabled = false;
    }
  });

  // ---------- single-card updates & scheduled rendering ----------

  let renderScheduled = false;
  function scheduleRenderFiles(): void {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
    renderFiles();
    });
  }

  function updateSingleCardNode(job: FileJob): void {
    if (!activeFileList) return;
    const node = activeFileList.querySelector<HTMLElement>(`.pk-file-item[data-id="${job.id}"]`);
    if (!node) return;

    const imgPreview = node.querySelector<HTMLImageElement>('.pk-file-img-preview');
    const thumbBadge = node.querySelector<HTMLElement>('.pk-file-thumb-badge');
    const statusBadge = node.querySelector<HTMLElement>('.pk-file-status-badge');
    const origSize = node.querySelector<HTMLElement>('.pk-file-orig-size');
    const arrow = node.querySelector<HTMLElement>('.pk-file-arrow');
    const resultSize = node.querySelector<HTMLElement>('.pk-file-result-size');
    const savedBadge = node.querySelector<HTMLElement>('.pk-file-saved-badge');
    const meta = node.querySelector<HTMLElement>('.pk-file-meta');
    const editToggleBtn = node.querySelector<HTMLButtonElement>('.pk-tool-edit-toggle');
    const toolsContainer = node.querySelector<HTMLElement>('.pk-file-tools');
    const cardFooter = node.querySelector<HTMLElement>('.pk-card-footer');
    const actions = node.querySelector<HTMLElement>('.pk-file-actions');

    // 1. Status badge
    if (statusBadge) {
      if (job.status === 'queued') {
        statusBadge.textContent = 'Queued';
        statusBadge.className = 'pk-file-status-badge text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface border border-border text-muted';
      } else if (job.status === 'working') {
        statusBadge.textContent = 'Converting…';
        statusBadge.className = 'pk-file-status-badge text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 animate-pulse';
      } else if (job.status === 'done') {
        statusBadge.textContent = 'Ready';
        statusBadge.className = 'pk-file-status-badge text-[11px] font-medium px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30';
      } else if (job.status === 'error') {
        statusBadge.textContent = 'Failed';
        statusBadge.className = 'pk-file-status-badge text-[11px] font-medium px-2 py-0.5 rounded-full bg-danger/15 text-danger border border-danger/30';
      }
    }

    // 2. Thumbnail / Display URL
    const isPdfOutput = job.resultName?.endsWith('.pdf') || job.file.type === 'application/pdf';
    const displayUrl = isPdfOutput
      ? (job.adjustedPreviewUrl || job.croppedPreviewUrl || job.thumbUrl || job.previewUrl)
      : (job.resultThumbUrl || job.resultPreviewUrl || job.adjustedPreviewUrl || job.croppedPreviewUrl || job.thumbUrl || job.previewUrl);
    if (imgPreview && displayUrl) {
      if (imgPreview.getAttribute('data-src') !== displayUrl) {
        imgPreview.setAttribute('data-src', displayUrl);
        imgPreview.src = displayUrl;
      }
      if (job.resultPreviewUrl || job.adjustedPreviewUrl || job.croppedPreviewUrl) {
        imgPreview.style.transform = '';
        imgPreview.style.filter = '';
      }
      imgPreview.classList.remove('hidden');
      thumbBadge?.classList.add('hidden');
    }

    // 3. Before -> After dimensions and size
    const origExt = (job.file.name.split('.').pop() || '').toUpperCase();
    if (origSize) {
      const origDimStr = job.originalWidth && job.originalHeight ? ` (${job.originalWidth}×${job.originalHeight})` : '';
      const newOrigSize = `${formatBytes(job.originalSize || job.file.size)}${origDimStr} · ${origExt}`;
      if (origSize.textContent !== newOrigSize) origSize.textContent = newOrigSize;
    }

    if (job.status === 'done' && job.result) {
      const destExt = (job.resultName?.split('.').pop() || state.to).toUpperCase();
      if (arrow) arrow.classList.remove('hidden');
      if (resultSize) {
        const resDimStr = job.resultWidth && job.resultHeight ? ` (${job.resultWidth}×${job.resultHeight})` : '';
        const newResSize = `${formatBytes(job.result.size)}${resDimStr} · ${destExt}`;
        if (resultSize.textContent !== newResSize) resultSize.textContent = newResSize;
        resultSize.classList.remove('hidden');
      }

      // Percentage reduction
      if (savedBadge) {
        if (job.result.size < job.file.size) {
          const reduction = Math.round(((job.file.size - job.result.size) / job.file.size) * 100);
          savedBadge.textContent = `-${reduction}% saved`;
          savedBadge.className = 'pk-file-saved-badge rounded-md bg-success/15 border border-success/30 px-2 py-0.5 text-[11px] font-bold text-success';
          savedBadge.classList.remove('hidden');
        } else if (job.result.size > job.file.size) {
          const increase = Math.round(((job.result.size - job.file.size) / job.file.size) * 100);
          savedBadge.textContent = `+${increase}%`;
          savedBadge.className = 'pk-file-saved-badge rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-500';
          savedBadge.classList.remove('hidden');
        } else {
          savedBadge.classList.add('hidden');
        }
      }
    } else {
      if (arrow) arrow.classList.add('hidden');
      if (resultSize) resultSize.classList.add('hidden');
      if (savedBadge) savedBadge.classList.add('hidden');
    }

    // 4. Metadata / Error
    if (meta) {
      const metaParts: string[] = [];
      if (job.error) {
        metaParts.push(`Error: ${job.error}`);
      } else {
        if (
          job.originalWidth &&
          job.originalHeight &&
          job.resultWidth &&
          job.resultHeight &&
          (job.resultWidth !== job.originalWidth || job.resultHeight !== job.originalHeight)
        ) {
          metaParts.push(`Resized: ${job.originalWidth}×${job.originalHeight} ➔ ${job.resultWidth}×${job.resultHeight}px`);
        }
        if (job.status === 'done') {
          const appliedDpi = job.dpi ?? state.dpi;
          if (appliedDpi) metaParts.push(`${appliedDpi} DPI print header`);
          if (!state.preserveMetadata) metaParts.push('EXIF stripped');
        }
      }
      if (metaParts.length > 0) {
        meta.textContent = metaParts.join(' · ');
        meta.classList.remove('hidden');
      } else {
        meta.classList.add('hidden');
      }
    }

    // 5. Tools & Footers
    if (editToggleBtn) {
      if (job.status === 'done' || job.status === 'working') {
        editToggleBtn.className = 'pk-tool-edit-toggle hidden';
        editToggleBtn.setAttribute('aria-expanded', 'false');
      }
    }
    if (toolsContainer) {
      if (job.status === 'done' || job.status === 'working') {
        toolsContainer.classList.add('hidden');
      }
    }
    if (cardFooter) {
      cardFooter.classList.toggle('hidden', job.status === 'working');
    }

    // 6. Actions (Compare, Copy, Download)
    if (actions) {
      const currentActionsStatus = actions.dataset.status;
      if (job.status === 'done' && job.result && job.resultName) {
        if (currentActionsStatus !== 'done') {
          actions.dataset.status = 'done';
          actions.innerHTML = '';

          // Compare button
          if (job.resultPreviewUrl || job.previewUrl) {
            const cmpBtn = document.createElement('button');
            cmpBtn.type = 'button';
            cmpBtn.className =
              'inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-fg hover:border-accent hover:text-accent shadow-sm transition-colors cursor-pointer';
            cmpBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
              <span>Compare</span>
            `;
            cmpBtn.addEventListener('click', () => openCompareModal(job));
            actions.appendChild(cmpBtn);
          }

          // Copy button
          if (
            job.result &&
            !job.resultName?.endsWith('.pdf') &&
            typeof navigator !== 'undefined' &&
            navigator.clipboard
          ) {
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className =
              'pk-copy-img-btn inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-fg hover:border-accent hover:text-accent shadow-sm transition-colors cursor-pointer';
            copyBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            `;
            copyBtn.addEventListener('click', async () => {
              try {
                let copyBlob: Blob = job.result!;
                if (copyBlob.type !== 'image/png') {
                  const bmp = await createImageBitmap(copyBlob);
                  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
                  const ctx = canvas.getContext('2d')!;
                  ctx.drawImage(bmp, 0, 0);
                  bmp.close?.();
                  copyBlob = await canvas.convertToBlob({ type: 'image/png' });
                }
                await navigator.clipboard.write([
                  new ClipboardItem({ 'image/png': copyBlob }),
                ]);
                copyBtn.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-success">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span class="text-success font-bold">Copied!</span>
                `;
                setStatus(`Copied ${job.resultName || 'image'} to clipboard! Ready to paste.`);
                setTimeout(() => {
                  copyBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy</span>
                  `;
                }, 2200);
              } catch (err) {
                console.warn('[PixelKit Clipboard copy]', err);
                setStatus('Could not copy image (clipboard permission denied or unsupported).');
              }
            });
            actions.appendChild(copyBtn);
          }

          // Download button
          const dlBtn = document.createElement('button');
          dlBtn.type = 'button';
          dlBtn.className =
            'inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-fg hover:opacity-90 shadow-sm transition-opacity cursor-pointer';
          dlBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Download</span>
          `;
          dlBtn.addEventListener('click', () => downloadBlob(job.result!, job.resultName!));
          actions.appendChild(dlBtn);
        }
      } else {
        if (currentActionsStatus !== job.status) {
          actions.dataset.status = job.status;
          actions.innerHTML = '';
        }
      }
    }
  }

  // ---------- render ----------

  
  function updateStageDots(): void {
    const dotFormat = document.getElementById('pk-dot-format');
    const dotCompress = document.getElementById('pk-dot-compress');
    const dotCrop = document.getElementById('pk-dot-crop');
    const dotResize = document.getElementById('pk-dot-resize');

    const DOT_ACTIVE = 'pk-stage-dot inline-block h-2 w-2 rounded-full bg-accent ring-2 ring-accent/25 transition-all shrink-0';
    const DOT_INACTIVE = 'pk-stage-dot inline-block h-2 w-2 rounded-full border-2 border-border/90 bg-surface transition-all shrink-0';

    const activeJob = selectedJobId ? state.jobs.find((j) => j.id === selectedJobId) : null;
    const defaultTo = (root?.dataset.to || 'jpg').toLowerCase();

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

    // 2. Compression Dot: enabled when target size limit or custom quality % mode is applied
    if (dotCompress) {
      let isCompressActive = false;
      if (currentToolMode === 'compress') {
        isCompressActive = true;
      } else if (activeJob) {
        isCompressActive =
          (activeJob.targetKb !== undefined && activeJob.targetKb !== null) ||
          (activeJob.targetSizeMode === 'quality' && typeof activeJob.quality === 'number' && activeJob.quality < 1.0);
      } else {
        isCompressActive =
          Boolean(state.targetKb) ||
          (state.targetSizeMode === 'quality' && typeof state.quality === 'number' && state.quality < 1.0);
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

    // 5. DPI Dot: enabled when print resolution DPI is set or in dedicated dpi mode
    const dotDpi = document.getElementById('pk-dot-dpi');
    if (dotDpi) {
      const isDpiActive = currentToolMode === 'dpi' || Boolean(activeJob?.dpi ?? state.dpi);
      dotDpi.className = isDpiActive ? DOT_ACTIVE : DOT_INACTIVE;
    }
  }

  function syncSidebarToSelectedJob(job: FileJob | null): void {
    const defaultTo = root?.dataset.to || 'jpg';
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
        resizeHint.textContent = scaleStr === '100' ? '100% (Original)' : (scaleStr === 'custom' ? 'Custom (px)' : `${scaleStr}% Scale`);
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

      const globalScale = state.dimensions?.mode === 'custom' ? 'custom' : (state.scalePercent ?? 100);
      const scaleStr = String(globalScale);
      scaleBtns.forEach((btn) => {
        const isSelected = btn.dataset.scale === scaleStr;
        btn.className = isSelected
          ? 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors bg-surface text-fg shadow-sm'
          : 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors text-muted hover:text-fg';
      });
      if (resizeHint) {
        resizeHint.textContent =
          globalScale === 'custom'
            ? (state.unit !== 'px' ? `Custom (${state.unit} @ ${state.dpi || 300} DPI)` : 'Custom (px)')
            : globalScale === 100
            ? '100% (Original)'
            : `${globalScale}% Scale`;
      }
    }
    updateStageDots();
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
      activePhotoCounter.textContent = `(${idx + 1} of ${state.jobs.length})`;
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
  }

  function renderFiles(): void {
    if (!state.jobs.length) {
      activeFileList.querySelectorAll('.pk-file-item').forEach((n) => n.remove());
      emptyState?.classList.remove('hidden');
      filesHeader?.classList.add('hidden');
      updateLiveDimensionsAndCardPreviews();
      return;
    }
    emptyState?.classList.add('hidden');
    filesHeader?.classList.remove('hidden');
    if (filesCount) filesCount.textContent = `${state.jobs.length} file${state.jobs.length === 1 ? '' : 's'} selected`;

    const existingNodes = new Map<string, HTMLElement>();
    activeFileList.querySelectorAll<HTMLElement>('.pk-file-item').forEach((n) => {
      if (n.dataset.id) existingNodes.set(n.dataset.id, n);
    });

    const currentJobIds = new Set(state.jobs.map((j) => j.id));
    for (const [id, n] of existingNodes.entries()) {
      if (!currentJobIds.has(id)) {
        n.remove();
        existingNodes.delete(id);
      }
    }

    for (const job of state.jobs) {
      let isNew = false;
      let node: HTMLElement | null = existingNodes.get(job.id) || null;
      if (!node) {
        node = activeTemplate.content.firstElementChild?.cloneNode(true) as HTMLElement | null;
        if (!node) continue;
        node.dataset.id = job.id;
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
      if (selBadge) {
        selBadge.classList.toggle('hidden', !isSelected);
        (selBadge as HTMLElement).onclick = (e) => {
          e.stopPropagation();
          selectJob(null);
        };
      }

      const thumbBtn = node.querySelector('.pk-file-thumb-btn') as HTMLElement | null;
      const imgPreview = node.querySelector('.pk-file-img-preview') as HTMLImageElement | null;
      const thumbBadge = node.querySelector('.pk-file-thumb-badge') as HTMLElement | null;
      const name = node.querySelector('.pk-file-name') as HTMLElement | null;
      const statusBadge = node.querySelector('.pk-file-status-badge') as HTMLElement | null;
      const origSize = node.querySelector('.pk-file-orig-size') as HTMLElement | null;
      const arrow = node.querySelector('.pk-file-arrow') as HTMLElement | null;
      const resultSize = node.querySelector('.pk-file-result-size') as HTMLElement | null;
      const savedBadge = node.querySelector('.pk-file-saved-badge') as HTMLElement | null;
      const meta = node.querySelector('.pk-file-meta') as HTMLElement | null;
      const actions = node.querySelector('.pk-file-actions') as HTMLElement | null;

      // 1. Real Image Thumbnail / Badge
      const isPdfOutput = job.resultName?.endsWith('.pdf') || job.file.type === 'application/pdf';
      const displayUrl = isPdfOutput
        ? (job.adjustedPreviewUrl || job.croppedPreviewUrl || job.thumbUrl || job.previewUrl)
        : (job.resultThumbUrl || job.resultPreviewUrl || job.adjustedPreviewUrl || job.croppedPreviewUrl || job.thumbUrl || job.previewUrl);
      if (imgPreview && displayUrl) {
        if (imgPreview.getAttribute('data-src') !== displayUrl) {
          imgPreview.setAttribute('data-src', displayUrl);
          imgPreview.src = displayUrl;
        }
        if (job.resultPreviewUrl || job.adjustedPreviewUrl || job.croppedPreviewUrl) {
          imgPreview.style.transform = '';
          imgPreview.style.filter = '';
        }
        imgPreview.onerror = () => {
          imgPreview.classList.add('hidden');
          thumbBadge?.classList.remove('hidden');
        };
        imgPreview.classList.remove('hidden');
        thumbBadge?.classList.add('hidden');
      } else if (thumbBadge) {
        const ext = (job.resultName?.split('.').pop() || job.file.name.split('.').pop() || state.to).toUpperCase();
        if (thumbBadge.textContent !== ext) thumbBadge.textContent = ext;
        thumbBadge.classList.remove('hidden');
        imgPreview?.classList.add('hidden');
      }

      // 2. Page order badge for Multi-Page PDF
      const orderBadge = node.querySelector('.pk-page-order-badge') as HTMLElement | null;
      if (orderBadge) {
        if (state.mergePdf && state.to === 'pdf' && state.jobs.length > 1) {
          orderBadge.textContent = `#${state.jobs.indexOf(job) + 1}`;
          orderBadge.classList.remove('hidden');
        } else {
          orderBadge.classList.add('hidden');
        }
      }

      // 3. Filename
      if (name) {
        const displayName = job.pdfPageNumber && job.pdfTotalPages
          ? `${job.file.name} (Page ${job.pdfPageNumber}/${job.pdfTotalPages})`
          : (job.id.startsWith('pk-merged-') && job.pdfTotalPages
            ? `${job.resultName || job.file.name} (${job.pdfTotalPages} pages merged)`
            : (job.resultName || job.file.name));
        if (name.textContent !== displayName) {
          name.textContent = displayName;
          name.title = displayName;
        }
      }

      // 4. Status Badge
      if (statusBadge) {
        if (job.status === 'queued') {
          statusBadge.textContent = 'Queued';
          statusBadge.className = 'pk-file-status-badge text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface border border-border text-muted';
        } else if (job.status === 'working') {
          const isMergePdf = state.mergePdf && state.to === 'pdf' && state.jobs.length > 1;
          statusBadge.textContent = isMergePdf && job.result ? 'Page Ready' : 'Converting…';
          statusBadge.className = 'pk-file-status-badge text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 animate-pulse';
        } else if (job.status === 'done') {
          statusBadge.textContent = 'Ready';
          statusBadge.className = 'pk-file-status-badge text-[11px] font-medium px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30';
        } else if (job.status === 'error') {
          statusBadge.textContent = 'Failed';
          statusBadge.className = 'pk-file-status-badge text-[11px] font-medium px-2 py-0.5 rounded-full bg-danger/15 text-danger border border-danger/30';
        }
      }

      // 5. Before -> After Stats
      const origExt = (job.file.name.split('.').pop() || '').toUpperCase();
      if (origSize) {
        const origDimStr = job.originalWidth && job.originalHeight ? ` (${job.originalWidth}×${job.originalHeight})` : '';
        const newOrigSize = `${formatBytes(job.originalSize || job.file.size)}${origDimStr} · ${origExt}`;
        if (origSize.textContent !== newOrigSize) origSize.textContent = newOrigSize;
      }

      if (job.status === 'done' && job.result) {
        const isMergePdf = state.mergePdf && state.to === 'pdf' && state.jobs.length > 1;
        const destExt = isMergePdf ? 'PDF' : (job.resultName?.split('.').pop() || state.to).toUpperCase();
        if (arrow) arrow.classList.remove('hidden');
        if (resultSize) {
          const resDimStr = job.resultWidth && job.resultHeight ? ` (${job.resultWidth}×${job.resultHeight})` : '';
          const newResSize = `${formatBytes(job.result.size)}${resDimStr} · ${destExt}`;
          if (resultSize.textContent !== newResSize) resultSize.textContent = newResSize;
          resultSize.classList.remove('hidden');
        }

        // Percentage reduction
        if (savedBadge) {
          if (job.result.size < job.file.size) {
            const reduction = Math.round(((job.file.size - job.result.size) / job.file.size) * 100);
            savedBadge.textContent = `-${reduction}% saved`;
            savedBadge.className = 'pk-file-saved-badge rounded-md bg-success/15 border border-success/30 px-2 py-0.5 text-[11px] font-bold text-success';
            savedBadge.classList.remove('hidden');
          } else if (job.result.size > job.file.size) {
            const increase = Math.round(((job.result.size - job.file.size) / job.file.size) * 100);
            savedBadge.textContent = `+${increase}%`;
            savedBadge.className = 'pk-file-saved-badge rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-500';
            savedBadge.classList.remove('hidden');
          } else {
            savedBadge.classList.add('hidden');
          }
        }
      } else {
        if (arrow) arrow.classList.add('hidden');
        if (resultSize) resultSize.classList.add('hidden');
        if (savedBadge) savedBadge.classList.add('hidden');
      }

      // 6. Metadata / Dimensions Change
      if (meta) {
        const metaParts: string[] = [];
        if (job.error) {
          metaParts.push(`Error: ${job.error}`);
        } else {
          if (
            job.originalWidth &&
            job.originalHeight &&
            job.resultWidth &&
            job.resultHeight &&
            (job.resultWidth !== job.originalWidth || job.resultHeight !== job.originalHeight)
          ) {
            metaParts.push(`Resized: ${job.originalWidth}×${job.originalHeight} ➔ ${job.resultWidth}×${job.resultHeight}px`);
          }
          if (job.status === 'done') {
            const appliedDpi = job.dpi ?? state.dpi;
            if (appliedDpi) metaParts.push(`${appliedDpi} DPI print header`);
            if (!state.preserveMetadata) metaParts.push('EXIF stripped');
          }
        }
        if (metaParts.length > 0) {
          meta.textContent = metaParts.join(' · ');
          meta.classList.remove('hidden');
        } else {
          meta.classList.add('hidden');
        }
      }

      // 7. Per-file Quick Adjustments (Rotate, Flip, Grayscale, Crop, Resize)
      const editToggleBtn = node.querySelector('.pk-tool-edit-toggle') as HTMLButtonElement | null;
      const toolsContainer = node.querySelector('.pk-file-tools') as HTMLElement | null;
      const cardFooter = node.querySelector('.pk-card-footer') as HTMLElement | null;

      const hasJobAdjustments = Boolean(
        job.customCropBox ||
        (job.cropAspect && job.cropAspect !== 'original') ||
        (job.dimensions && job.dimensions.mode !== 'original' && job.dimensions.scalePercent !== 100) ||
        (job.rotate ?? 0) !== 0 ||
        job.flipH ||
        job.grayscale
      );

      if (editToggleBtn) {
        const isConvertingOrDone = job.status === 'done' || job.status === 'working';
        if (isConvertingOrDone) {
          editToggleBtn.className = 'pk-tool-edit-toggle hidden';
          editToggleBtn.setAttribute('aria-expanded', 'false');
        } else if (hasJobAdjustments) {
          editToggleBtn.className = 'pk-tool-edit-toggle inline-flex h-7 items-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold text-accent bg-accent/10 border border-accent/40 shadow-sm transition-colors cursor-pointer';
          editToggleBtn.setAttribute('aria-expanded', 'true');
        } else {
          editToggleBtn.className = 'pk-tool-edit-toggle inline-flex h-7 items-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold text-muted hover:text-accent hover:bg-accent/10 border border-border/60 transition-colors cursor-pointer';
          editToggleBtn.setAttribute('aria-expanded', 'false');
        }
      }

      if (toolsContainer) {
        toolsContainer.classList.toggle('hidden', job.status === 'done' || job.status === 'working' || !hasJobAdjustments);
      }
      if (cardFooter) {
        cardFooter.classList.toggle('hidden', job.status === 'working');
      }

      const rotateCcwBtn = node.querySelector('.pk-tool-rotate-ccw') as HTMLButtonElement | null;
      const rotateCwBtn = node.querySelector('.pk-tool-rotate-cw') as HTMLButtonElement | null;
      const flipHBtn = node.querySelector('.pk-tool-flip-h') as HTMLButtonElement | null;
      const grayscaleBtn = node.querySelector('.pk-tool-grayscale') as HTMLButtonElement | null;
      const transformBadge = node.querySelector('.pk-transform-badge') as HTMLElement | null;

      function updateJobPreviewTransform(): void {
        const deg = job.rotate ?? 0;
        const sx = job.flipH ? -1 : 1;
        const isGray = job.grayscale ?? state.grayscale;
        const hasRenderedBitmap = Boolean(job.resultPreviewUrl || job.adjustedPreviewUrl || job.croppedPreviewUrl);

        if (imgPreview) {
          if (hasRenderedBitmap) {
            imgPreview.style.transform = '';
            imgPreview.style.filter = '';
          } else {
            const trans: string[] = [];
            if (deg !== 0) trans.push(`rotate(${deg}deg)`);
            if (sx !== 1) trans.push(`scaleX(${sx})`);
            imgPreview.style.transform = trans.join(' ');
            imgPreview.style.filter = isGray ? 'grayscale(100%)' : '';
          }
        }

        if (grayscaleBtn) {
          grayscaleBtn.classList.toggle('text-accent', isGray);
          grayscaleBtn.classList.toggle('bg-accent/10', isGray);
        }

        if (transformBadge) {
          const tags: string[] = [];
          if (deg !== 0) tags.push(`↻ ${deg}°`);
          if (sx !== 1) tags.push('⇄ Flip');
          if (isGray) tags.push('B&W');
          if (tags.length > 0) {
            transformBadge.textContent = tags.join(' · ');
            transformBadge.classList.remove('hidden');
          } else {
            transformBadge.classList.add('hidden');
          }
        }
      }

      updateJobPreviewTransform();

      const cropBtn = node.querySelector('.pk-tool-crop') as HTMLButtonElement | null;
      if (cropBtn) {
        const isCropped = !!(job.customCropBox || (job.cropAspect && job.cropAspect !== 'original'));
        if (isCropped) {
          const cropW = job.croppedWidth || (job.customCropBox ? Math.round(job.customCropBox.width * (job.originalWidth || 1000)) : null);
          const cropH = job.croppedHeight || (job.customCropBox ? Math.round(job.customCropBox.height * (job.originalHeight || 1000)) : null);
          const cropText = cropW && cropH ? `${cropW}×${cropH}` : 'Cropped';
          cropBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2v14a2 2 0 0 0 2 2h14"></path>
              <path d="M18 22V8a2 2 0 0 0-2-2H2"></path>
            </svg>
            <span class="text-[11px] font-bold">${cropText}</span>
          `;
          cropBtn.className = 'pk-tool-crop inline-flex h-7 items-center gap-1 px-2 rounded-lg text-xs font-semibold bg-accent/15 text-accent border border-accent/40 shadow-sm transition-colors cursor-pointer';
        } else {
          cropBtn.className = 'pk-tool-crop inline-flex h-7 items-center gap-1 px-2 rounded-lg text-xs font-medium text-muted hover:text-accent hover:bg-accent/10 border border-border/60 transition-colors cursor-pointer';
          cropBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2v14a2 2 0 0 0 2 2h14"></path>
              <path d="M18 22V8a2 2 0 0 0-2-2H2"></path>
            </svg>
            <span class="text-[11px]">Crop</span>
          `;
        }
      }

      const resizeBtn = node.querySelector('.pk-tool-resize') as HTMLButtonElement | null;
      if (resizeBtn) {
        const jDims = job.dimensions ?? state.dimensions;
        const jScale = jDims.mode === 'original'
          ? null
          : (jDims.scalePercent ?? (jDims.mode === 'custom' && (jDims.width || jDims.height) ? null : state.scalePercent));
        const isResized = (jScale && jScale !== 100) || (jDims && jDims.mode === 'custom' && Boolean(jDims.width || jDims.height));
        if (isResized) {
          const resLabel = jScale && jScale !== 100
            ? `${jScale}%`
            : (job.adjustedWidth && job.adjustedHeight ? `${job.adjustedWidth}×${job.adjustedHeight}` : 'Resized');
          resizeBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
            <span class="text-[11px] font-bold">${resLabel}</span>
          `;
          resizeBtn.className = 'pk-tool-resize inline-flex h-7 items-center gap-1 px-2 rounded-lg text-xs font-semibold bg-accent/15 text-accent border border-accent/40 shadow-sm transition-colors cursor-pointer';
        } else {
          resizeBtn.className = 'pk-tool-resize inline-flex h-7 items-center gap-1 px-2 rounded-lg text-xs font-medium text-muted hover:text-accent hover:bg-accent/10 border border-border/60 transition-colors cursor-pointer';
          resizeBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
            <span class="text-[11px]">Resize</span>
          `;
        }
      }

      const resetAllBtn = node.querySelector('.pk-tool-reset-all') as HTMLButtonElement | null;
      if (resetAllBtn) {
        if (hasJobAdjustments) {
          resetAllBtn.className = 'pk-tool-reset-all inline-flex h-7 items-center gap-1 px-2 rounded-lg text-[11px] font-bold bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 transition-all cursor-pointer';
          resetAllBtn.title = `Reset adjustments for ${job.file.name} back to original`;
        } else {
          resetAllBtn.className = 'pk-tool-reset-all inline-flex h-7 items-center gap-1 px-2 rounded-lg text-[11px] font-medium text-muted hover:text-danger hover:bg-danger/10 border border-border/60 transition-colors cursor-pointer';
          resetAllBtn.title = `Reset adjustments for ${job.file.name}`;
        }
      }

      // 8. Attach event listeners once per card
      if (isNew) {
        if (thumbBtn) {
          thumbBtn.addEventListener('click', () => {
            if (job.resultPreviewUrl || job.adjustedPreviewUrl || job.croppedPreviewUrl || job.previewUrl) {
              openCompareModal(job);
            }
          });
        }

        node.addEventListener('dragstart', (e) => {
          draggedJobId = job.id;
          if (e.dataTransfer) {
            e.dataTransfer.setData('text/plain', job.id);
            e.dataTransfer.effectAllowed = 'move';
          }
          node.classList.add('opacity-40');
        });

        node.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          node.classList.add('border-accent');
        });

        node.addEventListener('dragleave', () => {
          node.classList.remove('border-accent');
        });

        node.addEventListener('drop', (e) => {
          e.preventDefault();
          node.classList.remove('border-accent');
          if (draggedJobId && draggedJobId !== job.id) {
            const fromIdx = state.jobs.findIndex((j) => j.id === draggedJobId);
            const toIdx = state.jobs.findIndex((j) => j.id === job.id);
            if (fromIdx >= 0 && toIdx >= 0) {
              const [moved] = state.jobs.splice(fromIdx, 1);
              if (moved) {
                state.jobs.splice(toIdx, 0, moved);
    renderFiles();
              }
            }
          }
        });

        node.addEventListener('dragend', () => {
          node.classList.remove('opacity-40', 'border-accent');
          draggedJobId = null;
        });

        const rmBtn = node.querySelector('.pk-file-remove-btn') as HTMLButtonElement | null;
        if (rmBtn) {
          rmBtn.setAttribute('aria-label', `Remove ${job.file.name}`);
          rmBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (job.status === 'working') return;
            if (job.previewUrl) URL.revokeObjectURL(job.previewUrl);
            if (job.thumbUrl && job.thumbUrl !== job.previewUrl) URL.revokeObjectURL(job.thumbUrl);
            if (job.resultPreviewUrl) URL.revokeObjectURL(job.resultPreviewUrl);
            if (job.resultThumbUrl && job.resultThumbUrl !== job.resultPreviewUrl) URL.revokeObjectURL(job.resultThumbUrl);
            if (job.adjustedPreviewUrl) URL.revokeObjectURL(job.adjustedPreviewUrl);
            if (job.croppedPreviewUrl && job.croppedPreviewUrl !== job.adjustedPreviewUrl) URL.revokeObjectURL(job.croppedPreviewUrl);
            state.jobs = state.jobs.filter((j) => j.id !== job.id);
    renderFiles();
            updateButtons();
            updateProgress();
          });
        }

        if (editToggleBtn) {
          editToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!toolsContainer) return;
            const isCurrentlyHidden = toolsContainer.classList.contains('hidden');
            const hasCurrentAdjustments = Boolean(
              job.customCropBox ||
              (job.cropAspect && job.cropAspect !== 'original') ||
              (job.dimensions && job.dimensions.mode !== 'original' && job.dimensions.scalePercent !== 100) ||
              (job.rotate ?? 0) !== 0 ||
              job.flipH ||
              job.grayscale
            );
            if (isCurrentlyHidden) {
              toolsContainer.classList.remove('hidden');
              editToggleBtn.className = 'pk-tool-edit-toggle inline-flex h-7 items-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold text-accent bg-accent/10 border border-accent/40 shadow-sm transition-colors cursor-pointer';
              editToggleBtn.setAttribute('aria-expanded', 'true');
            } else {
              toolsContainer.classList.add('hidden');
              if (!hasCurrentAdjustments) {
                editToggleBtn.className = 'pk-tool-edit-toggle inline-flex h-7 items-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold text-muted hover:text-accent hover:bg-accent/10 border border-border/60 transition-colors cursor-pointer';
              }
              editToggleBtn.setAttribute('aria-expanded', 'false');
            }
          });
        }

        rotateCcwBtn?.addEventListener('click', async (e) => {
          e.stopPropagation();
          job.rotate = (((job.rotate ?? 0) - 90) % 360 + 360) % 360;
          if (job.status === 'done') {
            job.status = 'queued';
            job.result = undefined;
            if (job.resultPreviewUrl) {
              URL.revokeObjectURL(job.resultPreviewUrl);
              job.resultPreviewUrl = undefined;
            }
            updateButtons();
          }
          if (job.adjustedPreviewUrl) {
            URL.revokeObjectURL(job.adjustedPreviewUrl);
            job.adjustedPreviewUrl = undefined;
          }
          if (job.croppedPreviewUrl) {
            URL.revokeObjectURL(job.croppedPreviewUrl);
            job.croppedPreviewUrl = undefined;
          }
          updateJobPreviewTransform();
    renderFiles();
          updateLiveDimensionsAndCardPreviews();
        });

        rotateCwBtn?.addEventListener('click', async (e) => {
          e.stopPropagation();
          job.rotate = (((job.rotate ?? 0) + 90) % 360 + 360) % 360;
          if (job.status === 'done') {
            job.status = 'queued';
            job.result = undefined;
            if (job.resultPreviewUrl) {
              URL.revokeObjectURL(job.resultPreviewUrl);
              job.resultPreviewUrl = undefined;
            }
            updateButtons();
          }
          if (job.adjustedPreviewUrl) {
            URL.revokeObjectURL(job.adjustedPreviewUrl);
            job.adjustedPreviewUrl = undefined;
          }
          if (job.croppedPreviewUrl) {
            URL.revokeObjectURL(job.croppedPreviewUrl);
            job.croppedPreviewUrl = undefined;
          }
          updateJobPreviewTransform();
    renderFiles();
          updateLiveDimensionsAndCardPreviews();
        });

        flipHBtn?.addEventListener('click', async (e) => {
          e.stopPropagation();
          job.flipH = !job.flipH;
          if (job.status === 'done') {
            job.status = 'queued';
            job.result = undefined;
            if (job.resultPreviewUrl) {
              URL.revokeObjectURL(job.resultPreviewUrl);
              job.resultPreviewUrl = undefined;
            }
            updateButtons();
          }
          if (job.adjustedPreviewUrl) {
            URL.revokeObjectURL(job.adjustedPreviewUrl);
            job.adjustedPreviewUrl = undefined;
          }
          if (job.croppedPreviewUrl) {
            URL.revokeObjectURL(job.croppedPreviewUrl);
            job.croppedPreviewUrl = undefined;
          }
          updateJobPreviewTransform();
    renderFiles();
          updateLiveDimensionsAndCardPreviews();
        });

        grayscaleBtn?.addEventListener('click', async (e) => {
          e.stopPropagation();
          const current = job.grayscale ?? state.grayscale;
          job.grayscale = !current;
          if (job.status === 'done') {
            job.status = 'queued';
            job.result = undefined;
            if (job.resultPreviewUrl) {
              URL.revokeObjectURL(job.resultPreviewUrl);
              job.resultPreviewUrl = undefined;
            }
            updateButtons();
          }
          if (job.adjustedPreviewUrl) {
            URL.revokeObjectURL(job.adjustedPreviewUrl);
            job.adjustedPreviewUrl = undefined;
          }
          if (job.croppedPreviewUrl) {
            URL.revokeObjectURL(job.croppedPreviewUrl);
            job.croppedPreviewUrl = undefined;
          }
          updateJobPreviewTransform();
    renderFiles();
          updateLiveDimensionsAndCardPreviews();
        });

        cropBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          openCropModal(job);
        });

        resizeBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          openResizeModal(job);
        });

        resetAllBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          resetJobAdjustments(job);
        });
      }

      // 9. Action buttons
      if (actions) {
        const currentActionsStatus = actions.dataset.status;
        if (job.status === 'done' && job.result && job.resultName) {
          if (currentActionsStatus !== 'done') {
            actions.dataset.status = 'done';
            actions.innerHTML = '';

            // Compare button (Before/After split slider)
            if (job.resultPreviewUrl || job.previewUrl) {
              const cmpBtn = document.createElement('button');
              cmpBtn.type = 'button';
              cmpBtn.className =
                'inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-fg hover:border-accent hover:text-accent shadow-sm transition-colors cursor-pointer';
              cmpBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <polyline points="9 21 3 21 3 15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
                <span>Compare</span>
              `;
              cmpBtn.addEventListener('click', () => openCompareModal(job));
              actions.appendChild(cmpBtn);
            }

            // "Copy to Clipboard" button
            if (
              job.result &&
              !job.resultName?.endsWith('.pdf') &&
              typeof navigator !== 'undefined' &&
              navigator.clipboard
            ) {
              const copyBtn = document.createElement('button');
              copyBtn.type = 'button';
              copyBtn.className =
                'pk-copy-img-btn inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-fg hover:border-accent hover:text-accent shadow-sm transition-colors cursor-pointer';
              copyBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copy</span>
              `;

              copyBtn.addEventListener('click', async () => {
                try {
                  let copyBlob: Blob = job.result!;
                  if (copyBlob.type !== 'image/png') {
                    const bmp = await createImageBitmap(copyBlob);
                    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
                    const ctx = canvas.getContext('2d')!;
                    ctx.drawImage(bmp, 0, 0);
                    bmp.close?.();
                    copyBlob = await canvas.convertToBlob({ type: 'image/png' });
                  }

                  await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': copyBlob }),
                  ]);

                  copyBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-success">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span class="text-success font-bold">Copied!</span>
                  `;
                  setStatus(`Copied ${job.resultName || 'image'} to clipboard! Ready to paste.`);
                  setTimeout(() => {
                    copyBtn.innerHTML = `
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      <span>Copy</span>
                    `;
                  }, 2200);
                } catch (err) {
                  console.warn('[PixelKit Clipboard copy]', err);
                  setStatus('Could not copy image (clipboard permission denied or unsupported).');
                }
              });

              actions.appendChild(copyBtn);
            }

            // Download button
            const dlBtn = document.createElement('button');
            dlBtn.type = 'button';
            dlBtn.className =
              'inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-fg hover:opacity-90 shadow-sm transition-opacity cursor-pointer';
            dlBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Download</span>
            `;
            dlBtn.addEventListener('click', () => downloadBlob(job.result!, job.resultName!));
            actions.appendChild(dlBtn);
          }
        } else {
          if (currentActionsStatus !== 'queued') {
            actions.dataset.status = 'queued';
            actions.innerHTML = '';
          }
        }
      }

      activeFileList.appendChild(node);
    }
    updateLiveDimensionsAndCardPreviews();
  }

  function updateButtons(): void {
    const pendingJobs = state.jobs.filter((j) => j.status === 'queued').length;
    const doneJobs = state.jobs.filter((j) => j.status === 'done').length;

    if (convertBtn) {
      convertBtn.disabled = state.converting || pendingJobs === 0;
      const isMerge = state.mergePdf && state.to === 'pdf' && state.jobs.length > 1;
      
      let btnText = 'Convert & Compress Now';
      if (isMerge) {
        btnText = 'Merge & Convert to Single PDF';
      } else if (currentToolMode === 'dpi') {
        btnText = `Apply ${state.dpi || 300} DPI Now`;
      } else if (currentToolMode === 'exif') {
        btnText = state.preserveMetadata ? 'Convert Image Now' : 'Remove EXIF Metadata Now';
      } else if (currentToolMode === 'crop') {
        btnText = 'Crop & Frame Now';
      } else if (currentToolMode === 'resize') {
        btnText = state.unit !== 'px' ? `Resize in ${state.unit.toUpperCase()} Now` : 'Resize Resolution Now';
      } else if (currentToolMode === 'compress') {
        btnText =
          state.targetSizeMode === 'exact' && state.targetKb
            ? `Apply Exact ${formatSizeLabel(state.targetKb)} Size Now`
            : 'Compress Image Now';
      } else if (currentToolMode === 'convert') {
        btnText = 'Convert Image Now';
      } else if (currentToolMode === 'passport') {
        btnText = 'Apply Portal Specs & Convert';
      } else {
        const hasCrop = state.cropAspect && state.cropAspect !== 'original';
        const hasResize =
          (state.scalePercent && state.scalePercent !== 100) ||
          (state.dimensions && state.dimensions.mode !== 'original');
        const hasCompress = Boolean(state.targetKb);

        if (hasCrop && hasResize && hasCompress) {
          btnText = 'Crop, Resize & Compress Now';
        } else if (hasCrop && hasCompress) {
          btnText = 'Crop & Compress Now';
        } else if (hasResize && hasCompress) {
          btnText = 'Resize & Compress Now';
        } else if (hasCrop && hasResize) {
          btnText = 'Crop & Resize Now';
        } else if (hasCompress) {
          btnText = 'Convert & Compress Now';
        } else {
          btnText = 'Convert Image Now';
        }
      }

      convertBtn.innerHTML = state.converting
        ? '<span class="animate-spin inline-block mr-1.5">⟳</span> Converting…'
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> <span>${btnText}</span>`;
    }
    if (clearBtn) clearBtn.disabled = state.converting || state.jobs.length === 0;



    if (filesHeader && filesCount) {
      filesHeader.classList.toggle('hidden', state.jobs.length === 0);
      filesCount.textContent = `${state.jobs.length} file${state.jobs.length === 1 ? '' : 's'} selected`;
    }

    if (downloadAllBtn) {
      downloadAllBtn.classList.toggle('hidden', doneJobs < 2);
      downloadAllBtn.disabled = state.converting;
    }

    // Toggle Active badge on Crop, Resize & Color Filters accordion
    const editingActiveBadge = document.getElementById('pk-editing-active-badge');
    if (editingActiveBadge) {
      const hasGlobalEdits =
        !state.preserveMetadata ||
        (state.cropAspect && state.cropAspect !== 'original') ||
        (state.scalePercent && state.scalePercent !== 100) ||
        (state.dimensions && state.dimensions.mode !== 'original') ||
        Boolean(state.grayscale);
      const hasAnyJobEdits = state.jobs.some((j) =>
        Boolean(
          j.customCropBox ||
          (j.cropAspect && j.cropAspect !== 'original') ||
          (j.dimensions && j.dimensions.mode !== 'original' && j.dimensions.scalePercent !== 100) ||
          (j.rotate ?? 0) !== 0 ||
          j.flipH ||
          j.grayscale
        )
      );
      editingActiveBadge.classList.toggle('hidden', !hasGlobalEdits && !hasAnyJobEdits);
    }
  }

  let progressRafId: number | null = null;
  function scheduleUpdateProgress(): void {
    if (progressRafId !== null) return;
    progressRafId = requestAnimationFrame(() => {
      progressRafId = null;
      updateProgress();
    });
  }

  function updateProgress(): void {
    if (!progressEl || !progressFill || !progressPercent || !progressLabel) return;
    const total = state.jobs.length;
    const done = state.jobs.filter((j) => j.status === 'done' || j.status === 'error').length;
    const working = state.jobs.some((j) => j.status === 'working');

    if (!state.converting && !working) {
      progressEl.classList.add('hidden');
      return;
    }
    progressEl.classList.remove('hidden');
    const pct = total ? Math.round((done / total) * 100) : 0;
    progressFill.style.width = `${pct}%`;
    progressPercent.textContent = `${pct}%`;
    progressLabel.textContent = state.converting ? 'Processing files…' : 'Done';
    progressEl.setAttribute('aria-valuenow', String(pct));
  }

  function setStatus(msg: string): void {
    if (statusEl) statusEl.textContent = msg;
  }

  // Initial render & format UI setup
  if (preserveMetadataCheckbox) {
    preserveMetadataCheckbox.checked = state.preserveMetadata;
  }
  exifStatusNote?.classList.toggle('hidden', state.preserveMetadata);
  if (mergePdfToggle) {
    mergePdfToggle.checked = state.mergePdf;
  }
  if (cropAspectSelect) {
    cropAspectSelect.value = state.cropAspect;
  }
  syncCustomCropUi(state.cropAspect);
  setSizeMode(state.targetSizeMode);
  syncDimUnitUi();
  syncDpiUi();
  updateFormatUi();
  renderFiles();
  setToolMode(initialToolMode, false);

  function applyExternalResizeDims(payload: {
    unit: DimensionUnit;
    width: number;
    height: number;
    dpi: number;
  }): void {
    const u = payload.unit || 'px';
    const d = payload.dpi && payload.dpi > 0 ? Math.round(payload.dpi) : 300;
    const w = Number(payload.width);
    const h = Number(payload.height);
    if (!(w > 0 && h > 0)) return;

    if (currentToolMode !== 'resize' && currentToolMode !== 'all') {
      setToolMode('resize', false);
    } else {
      switchSettingsTab('custom');
    }

    state.unit = u;
    state.dpi = d;
    state.scalePercent = null;
    state.lockAspectRatio = false;
    if (lockAspectBtn) {
      lockAspectBtn.dataset.locked = 'false';
      lockAspectBtn.classList.remove('text-accent');
      lockAspectBtn.classList.add('text-muted');
      lockAspectBtn.title = 'Aspect Ratio Unlocked';
    }
    scaleBtns.forEach((b) => {
      const isSel = b.dataset.scale === 'custom';
      b.className = isSel
        ? 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors bg-surface text-fg shadow-sm'
        : 'pk-scale-btn flex-1 rounded-md py-1 font-medium transition-colors text-muted hover:text-fg';
    });
    customDimsContainer?.classList.remove('hidden');
    if (dimWidthInput) dimWidthInput.value = String(w);
    if (dimHeightInput) dimHeightInput.value = String(h);

    syncDpiUi();
    syncDimUnitUi();
    updateCustomDimensions();

    const dropBadge = document.getElementById('pk-locked-preset-badge');
    const span = dropBadge?.querySelector('span');
    if (dropBadge && span && state.dimensions.width && state.dimensions.height) {
      span.textContent =
        u === 'px'
          ? `Preset: ${state.dimensions.width} × ${state.dimensions.height} px • ${d} DPI`
          : `Preset: ${w} × ${h} ${u} @ ${d} DPI (${state.dimensions.width} × ${state.dimensions.height} px)`;
      dropBadge.classList.remove('hidden');
    }

    applyCustomDimensionsToJobs();
    updateButtons();
    setStatus(
      `Ready to resize photos to ${w} × ${h} ${u} @ ${d} DPI (${state.dimensions.width} × ${state.dimensions.height} px). Drop an image below!`
    );
    root?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  window.addEventListener('pk:set-resize-dims', (ev: Event) => {
    delete (window as unknown as Record<string, unknown>).__pkPendingResizeDims;
    const detail = (ev as CustomEvent).detail;
    if (detail) applyExternalResizeDims(detail);
  });

  const pendingDims = (window as unknown as Record<string, unknown>).__pkPendingResizeDims as
    | { unit: DimensionUnit; width: number; height: number; dpi: number }
    | undefined;
  if (pendingDims) {
    delete (window as unknown as Record<string, unknown>).__pkPendingResizeDims;
    applyExternalResizeDims(pendingDims);
  }
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const urlPreset = searchParams?.get('preset') || searchParams?.get('portal');
  const initialPreset = urlPreset || root.dataset.preset;
  if (initialPreset) {
    applyPortalPreset(initialPreset, !urlPreset);
    switchSettingsTab('portal');
    const activeCard = document.querySelector<HTMLButtonElement>(`.pk-portal-preset-card[data-id="${initialPreset}"]`);
    const cardsList = document.getElementById('pk-portal-cards-list');
    if (activeCard && cardsList) {
      const listRect = cardsList.getBoundingClientRect();
      const cardRect = activeCard.getBoundingClientRect();
      if (cardRect.top < listRect.top) {
        cardsList.scrollTop -= (listRect.top - cardRect.top + 8);
      } else if (cardRect.bottom > listRect.bottom) {
        cardsList.scrollTop += (cardRect.bottom - listRect.bottom + 8);
      }
    }
  }

  // Universal URL Query Parameter Overrides (?tool=, ?from=, ?to=, ?kb=, ?minKb=, ?maxKb=, ?mode=, ?crop=, ?dpi=, ?unit=, ?w=, ?h=, ?merge=)
  if (searchParams && Array.from(searchParams.keys()).length > 0) {
    const qFrom = searchParams.get('from')?.toLowerCase();
    const qTo = searchParams.get('to')?.toLowerCase();
    const qTool = searchParams.get('tool')?.toLowerCase();
    const qMode = searchParams.get('mode')?.toLowerCase() as SizeControlMode | undefined;
    const qKb = parseTargetKb(searchParams.get('kb') || searchParams.get('size') || undefined);
    const qMinKb = parseTargetKb(searchParams.get('minKb') || undefined);
    const qMaxKb = parseTargetKb(searchParams.get('maxKb') || undefined);
    const qCrop = searchParams.get('crop') as CropAspectPreset | null;
    const qDpi = Number(searchParams.get('dpi') || 0);
    const qUnit = searchParams.get('unit')?.toLowerCase() as DimensionUnit | undefined;
    const qW = Number(searchParams.get('w') || 0);
    const qH = Number(searchParams.get('h') || 0);
    const qMerge = searchParams.get('merge');

    if (qFrom) {
      state.from = qFrom;
      state.fromMime = mimeForExtension(qFrom) || state.fromMime;
      if (inputBadge) inputBadge.textContent = qFrom.toUpperCase();
    }
    if (qTo && mimeForExtension(qTo)) {
      state.to = qTo;
      state.toMime = mimeForExtension(qTo)!;
      if (outputSelect) outputSelect.value = qTo === 'jpeg' ? 'jpg' : qTo;
      syncCustomFormatUi(qTo);
      updateFormatUi();
    }
    if (qMerge === '1' || qMerge === 'true') {
      state.mergePdf = true;
      if (mergePdfToggle) mergePdfToggle.checked = true;
    }
    if (qMinKb && qMaxKb) {
      state.minKb = qMinKb;
      state.maxKb = qMaxKb;
      state.targetKb = qMaxKb;
      if (minKbInput) minKbInput.value = String(qMinKb);
      if (maxKbInput) maxKbInput.value = String(qMaxKb);
      setSizeMode('range');
    } else if (qKb) {
      state.targetKb = qKb;
      savedMaxTargetValue = String(qKb);
      savedExactTargetValue = String(qKb);
      const targetMode: SizeControlMode = qMode && ['max', 'exact', 'range', 'quality'].includes(qMode) ? qMode : 'max';
      if (targetSelect) {
        const hasOpt = Array.from(targetSelect.options).some((o) => o.value === String(qKb));
        targetSelect.value = hasOpt ? String(qKb) : 'custom';
        if (!hasOpt && customKbInput) customKbInput.value = String(qKb);
      }
      setSizeMode(targetMode);
      syncCustomTargetUi(targetSelect?.value || 'custom');
    } else if (qMode && ['max', 'exact', 'range', 'quality'].includes(qMode)) {
      setSizeMode(qMode);
    }
    if (qCrop && (qCrop === 'original' || ASPECT_RATIOS[qCrop])) {
      state.cropAspect = qCrop;
      if (cropAspectSelect) cropAspectSelect.value = qCrop;
      syncCustomCropUi(qCrop);
    }
    if (qDpi >= 36 && qDpi <= 2400) {
      state.dpi = Math.round(qDpi);
      syncDpiUi();
    }
    if (qW > 0 && qH > 0) {
      const unitUse: DimensionUnit = qUnit && ['px', 'cm', 'mm', 'in'].includes(qUnit) ? qUnit : state.unit;
      applyExternalResizeDims({
        unit: unitUse,
        width: qW,
        height: qH,
        dpi: state.dpi || 300,
      });
    } else if (qUnit && ['px', 'cm', 'mm', 'in'].includes(qUnit)) {
      state.unit = qUnit;
      if (qUnit !== 'px') {
        state.scalePercent = null;
        customDimsContainer?.classList.remove('hidden');
      }
      syncDimUnitUi();
    }
    if (qTool && ['all', 'convert', 'compress', 'crop', 'resize', 'passport', 'dpi', 'exif'].includes(qTool)) {
      setToolMode(qTool, false);
    } else if (qFrom || qTo || qKb || qMinKb || qCrop || qDpi > 0) {
      setToolMode(currentToolMode, false);
    }
  }
  updateButtons();
  updateStageDots();
  
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

}

// ---------- helpers ----------

function parseTargetKb(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function unitToPx(val: number, unit: DimensionUnit, dpi: number): number {
  const safeDpi = dpi > 0 ? dpi : 300;
  if (unit === 'cm') return Math.max(10, Math.round((val / 2.54) * safeDpi));
  if (unit === 'mm') return Math.max(10, Math.round((val / 25.4) * safeDpi));
  if (unit === 'in') return Math.max(10, Math.round(val * safeDpi));
  return Math.max(10, Math.round(val));
}

function pxToUnit(px: number, unit: DimensionUnit, dpi: number): number {
  const safeDpi = dpi > 0 ? dpi : 300;
  if (unit === 'cm') return Math.round(((px * 2.54) / safeDpi) * 100) / 100;
  if (unit === 'mm') return Math.round(((px * 25.4) / safeDpi) * 10) / 10;
  if (unit === 'in') return Math.round((px / safeDpi) * 1000) / 1000;
  return Math.round(px);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
