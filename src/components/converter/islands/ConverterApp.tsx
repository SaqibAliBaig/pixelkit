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
  WorkerMessage,
  DimensionOptions,
  TargetSizeMode,
  TargetSizeOptions,
  CropAspectPreset,
  CropAnchor,
  CustomCropBox,
} from '@lib/worker/types';
import { ASPECT_RATIOS } from '@lib/worker/adjustments';
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
  targetKb: number | null;
  targetOptions?: TargetSizeOptions;
  dimensions?: DimensionOptions;
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
  dimensions: DimensionOptions;
  grayscale: boolean;
  mergePdf: boolean;
  svgScale: number;
  autoOrient: boolean;
  stripTransparency: boolean;
}

// ---------- constants ----------

const MAX_WORKERS = Math.max(1, Math.min(2, ((navigator.hardwareConcurrency || 4) >= 4 ? 2 : 1)));

// ---------- bootstrap ----------

export function mountConverterApp(): void {
  const root = document.getElementById('pk-converter-root');
  if (!root || root.dataset.pkMounted === '1') return;
  root.dataset.pkMounted = '1';

  const initialTarget = parseTargetKb(root.dataset.targetKb);

  const state: State = {
    jobs: [],
    converting: false,
    from: root.dataset.from || 'jpg',
    to: root.dataset.to || 'png',
    fromMime: root.dataset.fromMime || 'image/jpeg',
    toMime: root.dataset.toMime || 'image/png',
    targetKb: initialTarget,
    targetSizeMode: 'max',
    minKb: null,
    maxKb: initialTarget,
    quality: 0.9,
    preserveMetadata: true,
    cropAspect: 'original',
    cropAnchor: 'center',
    scalePercent: 100,
    lockAspectRatio: true,
    dimensions: { mode: 'original' },
    grayscale: false,
    mergePdf: false,
    svgScale: 2,
    autoOrient: true,
    stripTransparency: true,
  };

  // Elements
  const fileInput = document.getElementById('pk-file-input') as HTMLInputElement | null;
  const dropzone = document.getElementById('pk-dropzone');
  const fileList = document.getElementById('pk-file-list');
  const emptyState = document.getElementById('pk-empty-state');
  const template = document.getElementById('pk-file-item-template') as HTMLTemplateElement | null;
  const convertBtn = document.getElementById('pk-convert-btn') as HTMLButtonElement | null;
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
  const rangeUnitKbBtn = document.getElementById('pk-range-unit-kb') as HTMLButtonElement | null;
  const rangeUnitMbBtn = document.getElementById('pk-range-unit-mb') as HTMLButtonElement | null;
  let customUnit: 'kb' | 'mb' = state.targetKb && state.targetKb >= 1024 && state.targetKb % 1024 === 0 ? 'mb' : 'kb';
  let rangeUnit: 'kb' | 'mb' = 'kb';

  // Adjustments & Dimensions Elements
  const cropAspectSelect = document.getElementById('pk-crop-aspect') as HTMLSelectElement | null;
  const scaleBtns = document.querySelectorAll<HTMLButtonElement>('.pk-scale-btn');
  const resizeHint = document.getElementById('pk-resize-hint');
  const customDimsContainer = document.getElementById('pk-custom-dims-container');
  const dimWidthInput = document.getElementById('pk-dim-width') as HTMLInputElement | null;
  const dimHeightInput = document.getElementById('pk-dim-height') as HTMLInputElement | null;
  const lockAspectBtn = document.getElementById('pk-lock-aspect-btn') as HTMLButtonElement | null;
  const grayscaleCheckbox = document.getElementById('pk-grayscale-filter') as HTMLInputElement | null;
  const mergePdfContainer = document.getElementById('pk-merge-pdf-container');
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

  function syncCustomFormatUi(toVal: string): void {
    const norm = toVal.toLowerCase() === 'jpeg' ? 'jpg' : toVal.toLowerCase();
    customFormatOptions.forEach((opt) => {
      const val = (opt.dataset.value || '').toLowerCase();
      const isSelected = val === norm;
      opt.setAttribute('aria-selected', String(isSelected));
      if (isSelected) {
        opt.className =
          'pk-custom-format-option w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer group bg-accent/10 border border-accent/30';
        if (selectedFormatBadge) selectedFormatBadge.textContent = opt.dataset.badge || val.toUpperCase();
        if (selectedFormatTitle) selectedFormatTitle.textContent = opt.dataset.title || val.toUpperCase();
        if (selectedFormatDesc) selectedFormatDesc.textContent = opt.dataset.desc || '';
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
        if (selectedCropTitle) selectedCropTitle.textContent = opt.dataset.title || val;
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
        '4:3': '4:3 Std',
        '16:9': '16:9 Wide',
        '9:16': '9:16 Story',
        '3:2': '3:2 Classic',
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
        if (selectedTargetBadge) selectedTargetBadge.textContent = opt.dataset.badge || (val ? `${val} KB` : 'AUTO');
        if (selectedTargetTitle) selectedTargetTitle.textContent = displayTitle;
        if (selectedTargetDesc) selectedTargetDesc.textContent = opt.dataset.desc || '';
      } else {
        opt.className =
          'pk-custom-target-option w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer group hover:bg-bg/80 border border-transparent';
      }
      const check = opt.querySelector('.pk-target-option-check');
      if (check) {
        check.classList.toggle('hidden', !isSelected);
      }
    });
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

      // Cap preview canvas dimensions to max 1600px for instant rendering and low memory footprint
      const MAX_PREVIEW_PX = 1600;
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

        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
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
        if (job.resultPreviewUrl || job.adjustedPreviewUrl || job.croppedPreviewUrl) {
          const targetSrc = (job.resultPreviewUrl || job.adjustedPreviewUrl || job.croppedPreviewUrl)!;
          if (img.getAttribute('data-src') !== targetSrc) {
            img.setAttribute('data-src', targetSrc);
            img.src = targetSrc;
          }
          img.style.transform = '';
          img.style.filter = '';
          img.style.aspectRatio = 'auto';
          img.style.objectFit = 'cover';
        } else {
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

          const noteStr = notes.length ? ` · ${notes.join(' + ')}` : '';
          liveDimsEl.textContent = `${pred.srcMP} MP ➔ ${pred.predMP} MP (${pred.w}×${pred.h} px${noteStr})`;
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
    updateLiveDimensionsAndCardPreviews();
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
        job.status = 'done';
        job.result = msg.blob;
        job.resultName = isMergePdf ? job.file.name.replace(/\.[^.]+$/, '.jpg') : msg.filename;
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
        }
        if (!job.result) {
          job.status = 'error';
        }
        updateSingleCardNode(job);
      }
      pending--;
      idle.push(w);
      pump();
      updateProgress();
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
      updateProgress();
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
      if (state.mergePdf && state.to === 'pdf' && state.jobs.some((j) => j.status === 'done' && j.result)) {
        mergeCompletedPdfJobs();
      } else {
        state.converting = false;
        setStatus(state.jobs.some((j) => j.status === 'error') ? 'Some files had errors.' : 'Done! All files converted.');
        updateButtons();
      }
    }
  }

  async function mergeCompletedPdfJobs(): Promise<void> {
    const validJobs = state.jobs.filter((j) => j.status === 'done' && j.result);
    if (!validJobs.length) {
      state.converting = false;
      updateButtons();
      return;
    }
    setStatus(`Merging ${validJobs.length} pages into a single PDF document…`);

    try {
      const { mergeImagesToPdf } = await import('@lib/worker/pdf');
      const pages = validJobs.map((j) => ({
        jpegBlob: j.result!,
        widthPx: j.resultWidth || 800,
        heightPx: j.resultHeight || 1000,
      }));

      const mergedBlob = await mergeImagesToPdf(pages, 'PixelKit Merged Document');
      const mergedName = `PixelKit-merged-${Date.now()}.pdf`;

      const totalOrig = validJobs.reduce((acc, j) => acc + j.originalSize, 0);

      // Preserve first page's visual image preview for the card thumbnail
      const firstPreview = validJobs[0]?.resultPreviewUrl || validJobs[0]?.previewUrl;

      for (const j of state.jobs) {
        if (j.previewUrl && j.previewUrl !== firstPreview) URL.revokeObjectURL(j.previewUrl);
        if (j.resultPreviewUrl && j.resultPreviewUrl !== firstPreview) URL.revokeObjectURL(j.resultPreviewUrl);
      }

      state.jobs = [
        {
          id: `pk-merged-${Date.now()}`,
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
    } catch (err) {
      console.error('[PixelKit Merge PDF Error]', err);
      setStatus('Error merging PDF pages.');
    } finally {
      state.converting = false;
      renderFiles();
      updateButtons();
      updateProgress();
    }
  }

  // ---------- input handlers (Universal Any-to-Any) ----------

  async function addFiles(files: FileList | File[]): Promise<void> {
    const arr = Array.from(files);
    if (!arr.length) return;

    let extractedPdfCount = 0;

    for (const file of arr) {
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
        originalSize: file.size,
      };

      // Create preview for native browser-renderable image formats & read dimensions
      if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'avif'].includes(ext)) {
        try {
          previewUrl = URL.createObjectURL(file);
          job.previewUrl = previewUrl;

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
      setStatus(`Extracted and lined up ${extractedPdfCount} image${extractedPdfCount === 1 ? '' : 's'} from PDF.`);
    } else {
      setStatus(`Added ${arr.length} file${arr.length === 1 ? '' : 's'}.`);
    }
    renderFiles();
    updateLiveDimensionsAndCardPreviews();
    updateButtons();
  }

  activeFileInput.addEventListener('change', () => {
    if (activeFileInput.files) addFiles(activeFileInput.files);
    activeFileInput.value = '';
  });

  // Drag & drop
  ;(['dragenter', 'dragover'] as const).forEach((ev) => {
    activeDropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      activeDropzone.dataset.dragover = 'true';
      activeDropzone.classList.add('border-accent', 'bg-bg/70');
    });
  });
  ;(['dragleave', 'drop'] as const).forEach((ev) => {
    activeDropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      activeDropzone.dataset.dragover = 'false';
      activeDropzone.classList.remove('border-accent', 'bg-bg/70');
    });
  });
  activeDropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    const dt = (e as DragEvent).dataTransfer;
    if (!dt) return;

    if (dt.files?.length) {
      addFiles(dt.files);
      return;
    }

    // URL Dragging from another tab or web page
    const uri = dt.getData('text/uri-list') || dt.getData('text/plain') || dt.getData('URL');
    if (uri && (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:image/'))) {
      try {
        setStatus('Fetching dragged image URL…');
        const res = await fetch(uri);
        const blob = await res.blob();
        const urlParts = uri.split('?')[0]?.split('/') || [];
        const rawName = urlParts[urlParts.length - 1] || 'dragged-image.png';
        const file = new File([blob], rawName, { type: blob.type || 'image/png' });
        addFiles([file]);
      } catch (err) {
        console.warn('[PixelKit URL drag]', err);
        setStatus('Could not load dragged image URL (CORS or network restriction).');
      }
    }
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
    state.to = val;
    state.toMime = mimeForExtension(val) || `image/${val}`;
    updateFormatUi();
    updateButtons();
    setStatus(`Target output set to ${val.toUpperCase()}`);
  });

  // 1b. Merge Multiple Files into Single PDF
  mergePdfToggle?.addEventListener('change', () => {
    state.mergePdf = mergePdfToggle.checked;
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
    if (state.targetSizeMode === 'quality') {
      targetValue.textContent = `Quality ${Math.round(state.quality * 100)}%`;
    } else if (state.targetSizeMode === 'range') {
      const min = state.minKb ? formatSizeLabel(state.minKb) : '0';
      const max = state.maxKb ? formatSizeLabel(state.maxKb) : 'Any';
      targetValue.textContent = `Range: ${min}–${max}`;
    } else if (state.targetKb) {
      const prefix = state.targetSizeMode === 'exact' ? 'Exact ' : 'Max ';
      targetValue.textContent = `${prefix}${formatSizeLabel(state.targetKb)}`;
    } else {
      targetValue.textContent = 'Best quality (no limit)';
    }
  }

  // 5. Aspect Ratio Crop Presets
  cropAspectSelect?.addEventListener('change', async () => {
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
    setStatus(`Crop preset: ${label}`);
  });

  // 5b. Crop Focal Anchor (Top/Face, Center, Bottom)
  cropAnchorBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const anchor = (btn.dataset.anchor || 'center') as CropAnchor;
      setCropAnchor(anchor);
      await Promise.all(
        state.jobs.map(async (j) => {
          j.cropAnchor = anchor;
          await generateJobCroppedPreview(j);
        })
      );
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

  dimWidthInput?.addEventListener('input', () => {
    if (state.lockAspectRatio && dimWidthInput.value) {
      const w = Number(dimWidthInput.value);
      if (w > 0) {
        const ratio = getActiveAspectRatio();
        const calculatedH = Math.max(10, Math.round(w / ratio));
        if (dimHeightInput) dimHeightInput.value = String(calculatedH);
      }
    }
    updateCustomDimensions();
    updateLiveDimensionsAndCardPreviews();
    queueCustomDimensionsPreview();
  });

  dimHeightInput?.addEventListener('input', () => {
    if (state.lockAspectRatio && dimHeightInput.value) {
      const h = Number(dimHeightInput.value);
      if (h > 0) {
        const ratio = getActiveAspectRatio();
        const calculatedW = Math.max(10, Math.round(h * ratio));
        if (dimWidthInput) dimWidthInput.value = String(calculatedW);
      }
    }
    updateCustomDimensions();
    updateLiveDimensionsAndCardPreviews();
    queueCustomDimensionsPreview();
  });

  function updateCustomDimensions(): void {
    const w = dimWidthInput?.value ? Number(dimWidthInput.value) : undefined;
    const h = dimHeightInput?.value ? Number(dimHeightInput.value) : undefined;
    state.dimensions = {
      mode: 'custom',
      width: w,
      height: h,
      lockAspectRatio: state.lockAspectRatio,
      fit: state.dimensions.fit || 'contain',
      noUpscale: state.dimensions.noUpscale !== false,
    };
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
  grayscaleCheckbox?.addEventListener('change', async () => {
    state.grayscale = grayscaleCheckbox.checked;
    setStatus(state.grayscale ? 'Monochrome / Grayscale filter enabled.' : 'Color output restored.');
    await Promise.all(state.jobs.map((j) => generateJobAdjustedPreview(j)));
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
  });


  function resetJobAdjustments(job: FileJob): void {
    job.customCropBox = undefined;
    job.cropAspect = 'original';
    job.cropAnchor = 'center';
    job.croppedWidth = undefined;
    job.croppedHeight = undefined;
    job.dimensions = { mode: 'original', noUpscale: true };
    job.rotate = 0;
    job.flipH = false;
    job.flipV = false;
    job.grayscale = false;
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
    setStatus(`Reset adjustments for ${job.file.name}`);
    renderFiles();
    updateButtons();
    updateLiveDimensionsAndCardPreviews();
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
    const clamped = Math.max(0, Math.min(100, pct));
    if (compareClip) {
      compareClip.style.clipPath = `inset(0 ${100 - clamped}% 0 0)`;
      (compareClip.style as unknown as { webkitClipPath?: string }).webkitClipPath = `inset(0 ${100 - clamped}% 0 0)`;
    }
    if (compareHandle) compareHandle.style.left = `${clamped}%`;
  }

  async function openCompareModal(job: FileJob): Promise<void> {
    if (!compareModal) return;
    activeCompareJob = job;

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
    const isAdjusted = !isDone && !!(job.adjustedPreviewUrl || job.croppedPreviewUrl);
    const uneditedOrigSrc = job.previewUrl || (job.file ? URL.createObjectURL(job.file) : '');
    const adjustedSrc = job.adjustedPreviewUrl || job.croppedPreviewUrl || uneditedOrigSrc;

    // When conversion is done, the "Before" picture MUST be the unedited original image.
    // When previewing queued adjustments before conversion, show the adjusted composition.
    let currentBeforeMode: 'orig' | 'adj' = isDone ? 'orig' : (isAdjusted ? 'adj' : 'orig');
    const origSrc = currentBeforeMode === 'orig' ? uneditedOrigSrc : adjustedSrc;
    const resSrc = isDone ? (job.resultPreviewUrl || adjustedSrc) : adjustedSrc;

    if (compareImgOrig) compareImgOrig.src = origSrc;
    if (compareImgResult) compareImgResult.src = resSrc;

    if (compareTitle) {
      const effW = isDone
        ? (job.resultWidth || job.adjustedWidth || job.croppedWidth || job.originalWidth)
        : (job.adjustedWidth || job.croppedWidth || job.originalWidth);
      const effH = isDone
        ? (job.resultHeight || job.adjustedHeight || job.croppedHeight || job.originalHeight)
        : (job.adjustedHeight || job.croppedHeight || job.originalHeight);
      const dimStr = effW && effH ? ` (${effW}×${effH}px)` : '';
      const suffix = isAdjusted ? ` · Live Preview${dimStr}` : (isDone ? ` · Visual Comparison${dimStr}` : ' · Full Resolution Preview');
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
      } else if (isAdjusted) {
        const effW = job.adjustedWidth || job.croppedWidth;
        const effH = job.adjustedHeight || job.croppedHeight;
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

    if (compareToggleContainer && compareViewOrigBtn && compareViewAdjBtn) {
      if (hasAdjustments) {
        compareToggleContainer.classList.remove('hidden');
        if (compareOrigTag) compareOrigTag.classList.add('hidden');

        const updateToggleButtons = () => {
          const deg = job.rotate ?? 0;
          const sx = job.flipH ? -1 : 1;
          const isGray = job.grayscale ?? state.grayscale;
          const needsCss = currentBeforeMode === 'adj' && !job.adjustedPreviewUrl && !job.croppedPreviewUrl;
          const trans: string[] = [];
          if (needsCss) {
            if (deg !== 0) trans.push(`rotate(${deg}deg)`);
            if (sx !== 1) trans.push(`scaleX(${sx})`);
          }

          // Calculate visual scale difference between original/cropped base and target output
          const origW = job.originalWidth || 1;
          const origH = job.originalHeight || 1;
          const baseW = job.croppedWidth || origW;
          const baseH = job.croppedHeight || origH;

          let relScale = 1.0;
          const dims = job.dimensions ?? state.dimensions;
          if (dims && dims.mode !== 'original') {
            if (dims.scalePercent && dims.scalePercent > 0) {
              relScale = Math.max(0.1, Math.min(2.0, dims.scalePercent / 100));
            } else if (dims.width && dims.height) {
              relScale = Math.max(0.1, Math.min(2.0, Math.min(dims.width / baseW, dims.height / baseH)));
            }
          }

          if (currentBeforeMode === 'adj' && relScale !== 1.0) {
            trans.unshift(`scale(${relScale.toFixed(3)})`);
          }

          const transformStr = trans.join(' ');
          const filterStr = needsCss && isGray ? 'grayscale(100%)' : '';

          if (currentBeforeMode === 'orig') {
            compareViewOrigBtn.className = 'px-2.5 py-1 rounded-md bg-accent text-accent-fg font-bold transition-colors cursor-pointer';
            compareViewAdjBtn.className = 'px-2.5 py-1 rounded-md text-muted hover:text-fg transition-colors cursor-pointer';
            if (compareImgOrig) {
              compareImgOrig.src = uneditedOrigSrc;
              compareImgOrig.style.transform = '';
              compareImgOrig.style.filter = '';
            }
            if (!isDone && compareImgResult) {
              compareImgResult.src = uneditedOrigSrc;
              compareImgResult.style.transform = '';
              compareImgResult.style.filter = '';
            }
          } else {
            compareViewOrigBtn.className = 'px-2.5 py-1 rounded-md text-muted hover:text-fg transition-colors cursor-pointer';
            compareViewAdjBtn.className = 'px-2.5 py-1 rounded-md bg-accent text-accent-fg font-bold transition-colors cursor-pointer';
            if (compareImgOrig) {
              compareImgOrig.src = adjustedSrc;
              compareImgOrig.style.transform = transformStr;
              compareImgOrig.style.filter = filterStr;
            }
            if (!isDone && compareImgResult) {
              compareImgResult.src = adjustedSrc;
              compareImgResult.style.transform = transformStr;
              compareImgResult.style.filter = filterStr;
            }
          }
        };

        compareViewOrigBtn.onclick = (e) => {
          e.stopPropagation();
          currentBeforeMode = 'orig';
          updateToggleButtons();
        };

        compareViewAdjBtn.onclick = (e) => {
          e.stopPropagation();
          currentBeforeMode = 'adj';
          updateToggleButtons();
        };

        updateToggleButtons();
      } else {
        compareToggleContainer.classList.add('hidden');
        if (compareOrigTag) {
          compareOrigTag.textContent = isDone ? 'Original (Before)' : `High-Res Source (${job.originalWidth && job.originalHeight ? `${job.originalWidth}×${job.originalHeight}px` : 'Original'})`;
          compareOrigTag.classList.remove('hidden');
        }
      }
    } else if (compareOrigTag) {
      if (isDone) {
        compareOrigTag.textContent = 'Original (Before)';
        compareOrigTag.classList.remove('hidden');
      } else if (isAdjusted) {
        const effW = job.adjustedWidth || job.croppedWidth || job.originalWidth;
        const effH = job.adjustedHeight || job.croppedHeight || job.originalHeight;
        compareOrigTag.textContent = `Adjusted Preview (${effW}×${effH} px)`;
        compareOrigTag.classList.remove('hidden');
      } else {
        const origDim = job.originalWidth && job.originalHeight ? `${job.originalWidth}×${job.originalHeight}px` : 'Original';
        compareOrigTag.textContent = `High-Res Source (${origDim})`;
        compareOrigTag.classList.remove('hidden');
      }
    }

    if (compareResTag) {
      if (isDone) {
        compareResTag.textContent = 'Converted (After)';
        compareResTag.classList.remove('hidden');
      } else {
        compareResTag.classList.add('hidden');
      }
    }

    if (compareTip) {
      compareTip.textContent = isDone
        ? 'Drag split handle to compare · Scroll or pinch to zoom'
        : 'High-fidelity preview · Scroll or pinch to zoom';
    }

    if (compareSavedBadge) {
      if (isDone && job.result && job.result.size < job.file.size) {
        const savedPct = Math.round(((job.file.size - job.result.size) / job.file.size) * 100);
        compareSavedBadge.textContent = `-${savedPct}% saved`;
        compareSavedBadge.classList.remove('hidden');
      } else {
        compareSavedBadge.classList.add('hidden');
      }
    }

    // Modal download button
    if (compareDlBtn) {
      compareDlBtn.classList.toggle('hidden', !isDone);
    }

    // Divider handle & clip path
    if (compareHandle) {
      compareHandle.classList.toggle('hidden', !isDone);
    }
    if (compareClip) {
      compareClip.style.clipPath = isDone ? 'inset(0 50% 0 0)' : 'none';
      (compareClip.style as unknown as { webkitClipPath?: string }).webkitClipPath = isDone ? 'inset(0 50% 0 0)' : 'none';
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
    const targetJob = job || state.jobs[0];
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
    if (cropOrigDims) {
      const origStr = targetJob.originalWidth && targetJob.originalHeight
        ? `${targetJob.originalWidth} × ${targetJob.originalHeight} px`
        : 'Detecting…';
      cropOrigDims.textContent = `${origStr}${resizeDesc ? ` (${resizeDesc.trim().replace(/^·\s*/, '')})` : ''}`;
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
          const dims = targetJob.dimensions || state.dimensions;
          const scale = dims?.scalePercent ?? state.scalePercent;
          let rDesc = '';
          if (scale && scale !== 100) {
            rDesc = ` (Scaled ${scale}%)`;
          } else if (dims?.mode === 'custom' && dims.width && dims.height) {
            rDesc = ` (Resized ${dims.width}×${dims.height} px)`;
          }
          cropOrigDims.textContent = `${realW} × ${realH} px${rDesc}`;
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
        ? 'pk-modal-ratio-btn px-2.5 py-1 rounded-md font-medium border border-accent/40 bg-accent/10 text-accent font-semibold cursor-pointer'
        : 'pk-modal-ratio-btn px-2.5 py-1 rounded-md font-medium border border-border bg-surface text-fg hover:border-accent/40 cursor-pointer';
    });
  }

  function syncCropModalAnchorBtns(): void {
    const a = cropBoxState.anchor;
    if (cropModalAnchorTop) {
      cropModalAnchorTop.className = a === 'top'
        ? 'px-2 py-1 rounded-md border border-accent/40 bg-accent/10 text-accent font-semibold cursor-pointer'
        : 'px-2 py-1 rounded-md border border-border bg-surface text-muted hover:text-fg font-medium cursor-pointer';
    }
    if (cropModalAnchorCenter) {
      cropModalAnchorCenter.className = a === 'center'
        ? 'px-2 py-1 rounded-md border border-accent/40 bg-accent/10 text-accent font-semibold cursor-pointer'
        : 'px-2 py-1 rounded-md border border-border bg-surface text-muted hover:text-fg font-medium cursor-pointer';
    }
    if (cropModalAnchorBottom) {
      cropModalAnchorBottom.className = a === 'bottom'
        ? 'px-2 py-1 rounded-md border border-accent/40 bg-accent/10 text-accent font-semibold cursor-pointer'
        : 'px-2 py-1 rounded-md border border-border bg-surface text-muted hover:text-fg font-medium cursor-pointer';
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
    const targetJob = job || state.jobs[0];
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

    // Init state from job or global settings
    const currentDims = job ? (job.dimensions || state.dimensions) : state.dimensions;
    const hasCustomExactDims = currentDims?.mode === 'custom' && Boolean(currentDims.width || currentDims.height) && !currentDims.scalePercent;
    const currentScale = hasCustomExactDims
      ? null
      : (job ? (job.dimensions?.scalePercent ?? state.scalePercent ?? 100) : (state.scalePercent ?? 100));
    resizeStudioState.scalePercent = currentScale;
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

    // Input values
    if (modalDimW && resizeStudioState.width) {
      modalDimW.value = String(resizeStudioState.width);
    }
    if (modalDimH && resizeStudioState.height) {
      modalDimH.value = String(resizeStudioState.height);
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

    const srcMP = Number(((srcW * srcH) / 1_000_000).toFixed(1));
    const targetMP = Number(((targetW * targetH) / 1_000_000).toFixed(1));

    const isCropped = !!(activeResizeJob?.croppedPreviewUrl || activeResizeJob?.customCropBox);
    if (resizeSrcDims) resizeSrcDims.textContent = `${srcW} × ${srcH} px (${srcMP} MP)${isCropped ? ' (Cropped)' : ''}`;
    if (resizeTargetDims) resizeTargetDims.textContent = `${targetW} × ${targetH} px (${targetMP} MP)`;
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
        resizeStudioState.scalePercent = null;
        syncResizeStudioUi();
      }
    });
  });

  modalLockBtn?.addEventListener('click', () => {
    resizeStudioState.lockAspect = !resizeStudioState.lockAspect;
    syncResizeStudioUi();
  });

  modalDimW?.addEventListener('input', () => {
    const val = Number(modalDimW.value);
    if (val > 0) {
      resizeStudioState.width = val;
      resizeStudioState.scalePercent = null;
      if (resizeStudioState.lockAspect) {
        const { w: srcW, h: srcH } = getResizeBaseDimensions();
        resizeStudioState.height = Math.round((val * srcH) / srcW);
      }
      scheduleResizeStudioUi();
    }
  });

  modalDimH?.addEventListener('input', () => {
    const val = Number(modalDimH.value);
    if (val > 0) {
      resizeStudioState.height = val;
      resizeStudioState.scalePercent = null;
      if (resizeStudioState.lockAspect) {
        const { w: srcW, h: srcH } = getResizeBaseDimensions();
        resizeStudioState.width = Math.round((val * srcW) / srcH);
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
    resizeStudioState.lockAspect = true;
    resizeStudioState.fit = 'contain';
    resizeStudioState.noUpscale = true;
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
    } else if (hasDimChange) {
      dims = {
        mode: 'custom',
        width: resizeStudioState.width || srcW,
        height: resizeStudioState.height || srcH,
        scalePercent: undefined,
        lockAspectRatio: resizeStudioState.lockAspect,
        fit: resizeStudioState.fit,
        noUpscale: resizeStudioState.noUpscale,
      };
    } else {
      dims = { mode: 'original', noUpscale: resizeStudioState.noUpscale };
    }

    if (!isGlobalResizeModal && activeResizeJob) {
      activeResizeJob.dimensions = dims;
      if (activeResizeJob.status === 'done') {
        activeCropJob = null;
        activeResizeJob.status = 'queued';
        updateButtons();
      }
      await generateJobAdjustedPreview(activeResizeJob);
      const resDesc = hasScaleChange
        ? `${resizeStudioState.scalePercent}% Scale`
        : (hasDimChange ? `${dims.width}×${dims.height}px` : 'Original Size');
      setStatus(`Applied resize (${resDesc}) to ${activeResizeJob.file.name}`);
    } else {
      state.dimensions = dims;
      state.scalePercent = resizeStudioState.scalePercent;
      await Promise.all(
        state.jobs.map(async (j) => {
          j.dimensions = dims;
          if (j.status === 'done') j.status = 'queued';
          await generateJobAdjustedPreview(j);
        })
      );
      setStatus('Applied resize settings to all files in queue.');
    }

    if (resizeHint) {
      resizeHint.textContent = resizeStudioState.scalePercent
        ? (resizeStudioState.scalePercent === 100 ? '100% (Original)' : `${resizeStudioState.scalePercent}% Scale`)
        : `${resizeStudioState.width}×${resizeStudioState.height}px`;
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
      if (dimWidthInput && resizeStudioState.width) dimWidthInput.value = String(resizeStudioState.width);
      if (dimHeightInput && resizeStudioState.height) dimHeightInput.value = String(resizeStudioState.height);
    }

    renderFiles();
    updateLiveDimensionsAndCardPreviews();
    updateButtons();
    closeResizeModal();
  });

  openResizeStudioBtn?.addEventListener('click', () => openResizeModal());
  openCropStudioBtn?.addEventListener('click', () => openCropModal());

  // ---------- actions ----------

  async function startConversion(): Promise<void> {
    if (state.converting) return;
    const pendingJobs = state.jobs.filter((j) => j.status === 'queued');
    if (!pendingJobs.length) return;

    state.converting = true;
    setStatus(`Converting & compressing ${pendingJobs.length} file${pendingJobs.length === 1 ? '' : 's'}…`);
    updateButtons();

    const isMergePdf = state.mergePdf && state.to === 'pdf' && state.jobs.length > 1;

    for (const job of pendingJobs) {
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
        targetKb: state.targetSizeMode === 'quality' ? null : state.targetKb,
        autoOrient: state.autoOrient,
        preserveMetadata: state.preserveMetadata,
        quality: state.quality,
        stripTransparency: state.stripTransparency,
        cropAspect: job.cropAspect ?? state.cropAspect,
        cropAnchor: job.cropAnchor ?? state.cropAnchor,
        customCropBox: job.customCropBox,
        rotate: job.rotate ?? 0,
        flipH: job.flipH ?? false,
        flipV: job.flipV ?? false,
        grayscale: job.grayscale ?? state.grayscale,
        dimensions: job.dimensions ?? state.dimensions,
        targetOptions: targetOpts,
        svgScale: state.svgScale,
        pdfPageNumber: job.pdfPageNumber,
        pdfTotalPages: job.pdfTotalPages,
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
      if (j.resultPreviewUrl) URL.revokeObjectURL(j.resultPreviewUrl);
      if (j.adjustedPreviewUrl) URL.revokeObjectURL(j.adjustedPreviewUrl);
      if (j.croppedPreviewUrl && j.croppedPreviewUrl !== j.adjustedPreviewUrl) URL.revokeObjectURL(j.croppedPreviewUrl);
    }
    state.jobs = [];
    renderFiles();
    updateButtons();
    updateProgress();
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
      ? (job.adjustedPreviewUrl || job.croppedPreviewUrl || job.previewUrl)
      : (job.resultPreviewUrl || job.adjustedPreviewUrl || job.croppedPreviewUrl || job.previewUrl);
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
      } else if (
        job.originalWidth &&
        job.originalHeight &&
        job.resultWidth &&
        job.resultHeight &&
        (job.resultWidth !== job.originalWidth || job.resultHeight !== job.originalHeight)
      ) {
        metaParts.push(`Resized: ${job.originalWidth}×${job.originalHeight} ➔ ${job.resultWidth}×${job.resultHeight}px`);
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

  function renderFiles(): void {
    if (!state.jobs.length) {
      activeFileList.querySelectorAll('.pk-file-item').forEach((n) => n.remove());
      emptyState?.classList.remove('hidden');
      updateLiveDimensionsAndCardPreviews();
      return;
    }
    emptyState?.classList.add('hidden');

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
        ? (job.adjustedPreviewUrl || job.croppedPreviewUrl || job.previewUrl)
        : (job.resultPreviewUrl || job.adjustedPreviewUrl || job.croppedPreviewUrl || job.previewUrl);
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

      // 5. Before -> After Stats
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

      // 6. Metadata / Dimensions Change
      if (meta) {
        const metaParts: string[] = [];
        if (job.error) {
          metaParts.push(`Error: ${job.error}`);
        } else if (
          job.originalWidth &&
          job.originalHeight &&
          job.resultWidth &&
          job.resultHeight &&
          (job.resultWidth !== job.originalWidth || job.resultHeight !== job.originalHeight)
        ) {
          metaParts.push(`Resized: ${job.originalWidth}×${job.originalHeight} ➔ ${job.resultWidth}×${job.resultHeight}px`);
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
            if (job.resultPreviewUrl) URL.revokeObjectURL(job.resultPreviewUrl);
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
          await generateJobAdjustedPreview(job);
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
          await generateJobAdjustedPreview(job);
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
          await generateJobAdjustedPreview(job);
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
          await generateJobAdjustedPreview(job);
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
      const btnText = isMerge ? 'Merge & Convert to Single PDF' : 'Convert & Compress Now';
      convertBtn.innerHTML = state.converting
        ? '<span class="animate-spin inline-block mr-1.5">⟳</span> Converting…'
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> <span>${btnText}</span>`;
    }
    if (clearBtn) clearBtn.disabled = state.converting || state.jobs.length === 0;

    if (downloadAllBtn) {
      downloadAllBtn.classList.toggle('hidden', doneJobs < 2);
      downloadAllBtn.disabled = state.converting;
    }

    // Toggle Active badge on Crop, Resize & Color Filters accordion
    const editingActiveBadge = document.getElementById('pk-editing-active-badge');
    if (editingActiveBadge) {
      const hasGlobalEdits =
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
  updateFormatUi();
  renderFiles();
  updateButtons();
}

// ---------- helpers ----------

function parseTargetKb(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
