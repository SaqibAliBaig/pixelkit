/**
 * Shared types for the conversion worker. Imported by both the worker
 * (src/lib/worker/convert.worker.ts) and the island (ConverterApp.ts).
 */

export type InputFormat =
  | 'jpg'
  | 'png'
  | 'webp'
  | 'heic'
  | 'avif'
  | 'gif'
  | 'bmp'
  | 'pdf'
  | 'svg'
  | 'tiff';

export type OutputFormat =
  | 'jpg'
  | 'png'
  | 'webp'
  | 'pdf'
  | 'avif'
  | 'svg';

export type DimensionMode = 'original' | 'passport' | 'square' | 'custom';

export type CropAspectPreset =
  | 'original'
  | '1:1'
  | '3.5:4.5'
  | '4:3'
  | '16:9'
  | '9:16'
  | '3:2';

export type CropAnchor = 'top' | 'center' | 'bottom';

export interface CustomCropBox {
  x: number; // 0 to 1 relative to source width
  y: number; // 0 to 1 relative to source height
  width: number; // 0 to 1 relative to source width
  height: number; // 0 to 1 relative to source height
}

export interface DimensionOptions {
  mode: DimensionMode;
  width?: number;
  height?: number;
  lockAspectRatio?: boolean;
  scalePercent?: number; // 25, 50, 75, 100
  fit?: 'cover' | 'contain' | 'fill';
  noUpscale?: boolean;
}

export type TargetSizeMode = 'max' | 'exact' | 'range';

export interface TargetSizeOptions {
  mode: TargetSizeMode;
  targetKb: number | null;
  minKb?: number | null;
  maxKb?: number | null;
}

export interface ConvertRequest {
  id: string;
  from: string;
  to: string;
  fromMime: string;
  toMime: string;
  targetKb: number | null;
  autoOrient: boolean;
  preserveMetadata?: boolean;
  quality?: number;
  stripTransparency?: boolean;
  cropAspect?: CropAspectPreset;
  cropAnchor?: CropAnchor;
  customCropBox?: CustomCropBox;
  rotate?: number; // 0, 90, 180, 270
  flipH?: boolean;
  flipV?: boolean;
  grayscale?: boolean;
  dimensions?: DimensionOptions;
  targetOptions?: TargetSizeOptions;
  svgScale?: number;
  pdfPageNumber?: number;
  pdfTotalPages?: number;
  file: File;
}

export interface ConvertSuccess {
  type: 'result';
  id: string;
  blob: Blob;
  filename: string;
  originalSize: number;
  resultSize: number;
  originalWidth?: number;
  originalHeight?: number;
  resultWidth?: number;
  resultHeight?: number;
  originalPreviewBlob?: Blob;
}

export interface ConvertError {
  type: 'error';
  id: string;
  message: string;
}

export interface ConvertProgress {
  type: 'progress';
  id: string;
  percent: number;
  stage: string;
}

export type WorkerMessage = ConvertSuccess | ConvertError | ConvertProgress;

export type ConvertResponse = ConvertSuccess | ConvertError;

/** Engine — a single handler that knows how to turn (image, opts) → Blob. */
export interface EngineOptions {
  targetKb: number | null;
  autoOrient: boolean;
  toMime: string;
  to: string;
  filename: string;
}

export interface Engine {
  name: string;
  supports: (to: OutputFormat) => boolean;
  run: (input: ImageBitmap | Blob, opts: EngineOptions) => Promise<Blob>;
}