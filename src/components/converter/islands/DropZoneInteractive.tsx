/**
 * DropZoneInteractive — thin re-export of the drop-zone wiring inside
 * ConverterApp. Kept as a separate module so tests can exercise the
 * drag/drop logic in isolation.
 *
 * In practice ConverterApp wires everything; this module exists to keep
 * the file structure honest and give a future refactor a home. It exposes
 * a pure helper used by the app.
 */

export interface DropHandlerOptions {
  onFiles: (files: File[]) => void;
  acceptExtensions: string[];
}

export function attachDropHandlers(
  el: HTMLElement,
  opts: DropHandlerOptions
): () => void {
  const { onFiles, acceptExtensions } = opts;
  const allowed = new Set(acceptExtensions.map((e) => e.toLowerCase()));

  const isAllowed = (file: File): boolean => {
    if (!allowed.size) return true;
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    return allowed.has(ext);
  };

  const onDragEnter = (e: DragEvent): void => {
    e.preventDefault();
    el.dataset.dragover = 'true';
    el.classList.add('border-accent', 'bg-bg/70');
  };
  const onDragOver = (e: DragEvent): void => {
    e.preventDefault();
    el.dataset.dragover = 'true';
  };
  const onDragLeave = (e: DragEvent): void => {
    e.preventDefault();
    el.dataset.dragover = 'false';
    el.classList.remove('border-accent', 'bg-bg/70');
  };
  const onDrop = (e: DragEvent): void => {
    e.preventDefault();
    el.dataset.dragover = 'false';
    el.classList.remove('border-accent', 'bg-bg/70');
    const files = e.dataTransfer?.files;
    if (!files) return;
    const ok = Array.from(files).filter(isAllowed);
    if (ok.length) onFiles(ok);
  };

  el.addEventListener('dragenter', onDragEnter);
  el.addEventListener('dragover', onDragOver);
  el.addEventListener('dragleave', onDragLeave);
  el.addEventListener('drop', onDrop);

  // Return a cleanup function for tests / Astro transitions.
  return () => {
    el.removeEventListener('dragenter', onDragEnter);
    el.removeEventListener('dragover', onDragOver);
    el.removeEventListener('dragleave', onDragLeave);
    el.removeEventListener('drop', onDrop);
  };
}