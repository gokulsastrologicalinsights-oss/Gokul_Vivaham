'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Maximize2, Minus, Move, Plus, RotateCcw, RotateCw, X } from 'lucide-react';

export type PhotoCropMetadata = {
  mode: 'fit' | 'fill';
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
};

type PhotoCropEditorProps = {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File, metadata: PhotoCropMetadata) => void;
};

const VIEWPORT_SIZE = 320;

export default function PhotoCropEditor({ file, onCancel, onConfirm }: PhotoCropEditorProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const objectUrl = useMemo(() => (typeof window === 'undefined' ? '' : URL.createObjectURL(file)), [file]);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [mode, setMode] = useState<PhotoCropMetadata['mode']>('fill');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);

  const baseScale = useMemo(() => {
    if (!naturalSize.width || !naturalSize.height) return 1;
    const scale = mode === 'fit'
      ? Math.min(VIEWPORT_SIZE / naturalSize.width, VIEWPORT_SIZE / naturalSize.height)
      : Math.max(VIEWPORT_SIZE / naturalSize.width, VIEWPORT_SIZE / naturalSize.height);
    return Math.max(scale, 0.01);
  }, [mode, naturalSize]);

  const previewStyle = {
    width: naturalSize.width ? naturalSize.width * baseScale : VIEWPORT_SIZE,
    height: naturalSize.height ? naturalSize.height * baseScale : VIEWPORT_SIZE,
    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom}) rotate(${rotation}deg)`,
  };

  const miniPreviewStyle = (size: number) => ({
    width: naturalSize.width ? naturalSize.width * baseScale * (size / VIEWPORT_SIZE) : size,
    height: naturalSize.height ? naturalSize.height * baseScale * (size / VIEWPORT_SIZE) : size,
    transform: `translate(calc(-50% + ${offset.x * (size / VIEWPORT_SIZE)}px), calc(-50% + ${offset.y * (size / VIEWPORT_SIZE)}px)) scale(${zoom}) rotate(${rotation}deg)`,
  });

  const reset = () => {
    setMode('fill');
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
  };

  const confirm = () => {
    const image = imageRef.current;
    if (!image?.naturalWidth || !image.naturalHeight) return;
    // Preserve the chosen crop without enlarging a small source image.
    const outputSize = Math.min(1200, Math.max(image.naturalWidth, image.naturalHeight));
    const ratio = outputSize / VIEWPORT_SIZE;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, outputSize, outputSize);
    context.translate(outputSize / 2 + offset.x * ratio, outputSize / 2 + offset.y * ratio);
    context.rotate((rotation * Math.PI) / 180);
    context.scale(baseScale * zoom * ratio, baseScale * zoom * ratio);
    context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const stem = file.name.replace(/\.[^/.]+$/, '') || 'profile-photo';
      onConfirm(new File([blob], `${stem}-cropped.webp`, { type: 'image/webp', lastModified: Date.now() }), {
        mode,
        zoom,
        offsetX: offset.x,
        offsetY: offset.y,
        rotation,
      });
    }, 'image/webp', 0.9);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="photo-editor-title">
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 shadow-2xl sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="photo-editor-title" className="text-lg font-semibold">Adjust your photo</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">Drag to position the face, then preview the circular and rectangular versions before confirming.</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white" aria-label="Cancel photo adjustment"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_180px]">
          <div>
            <div
              className="relative mx-auto aspect-square w-full max-w-[360px] touch-none overflow-hidden rounded-2xl border border-gold-500/50 bg-zinc-900"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setDragging(true);
              }}
              onPointerMove={(event) => {
                if (!dragging) return;
                setOffset((current) => ({ x: current.x + event.movementX, y: current.y + event.movementY }));
              }}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
              aria-label="Photo crop area. Drag to reposition."
            >
              {objectUrl ? <img ref={imageRef} src={objectUrl} alt="Photo being adjusted" onLoad={(event) => setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} className="absolute left-1/2 top-1/2 max-w-none select-none" style={previewStyle} draggable={false} /> : null}
              <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/40" />
              <div className="pointer-events-none absolute inset-0 border border-white/20" />
              <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[10px] text-white"><Move className="mr-1 inline h-3 w-3" />Drag to reposition</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-center text-[10px] text-zinc-400">
              <div>
                <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full border border-white/40 bg-zinc-900">
                  {objectUrl ? <img src={objectUrl} alt="Circular crop preview" className="absolute left-1/2 top-1/2 max-w-none" style={miniPreviewStyle(80)} draggable={false} /> : null}
                </div>
                <span className="mt-1 block">Circle preview</span>
              </div>
              <div>
                <div className="relative mx-auto h-20 w-28 overflow-hidden rounded-lg border border-white/40 bg-zinc-900">
                  {objectUrl ? <img src={objectUrl} alt="Rectangular crop preview" className="absolute left-1/2 top-1/2 max-w-none" style={miniPreviewStyle(80)} draggable={false} /> : null}
                </div>
                <span className="mt-1 block">Rectangle preview</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-zinc-300">Framing</legend>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setMode('fit')} className={`rounded-lg border px-2 py-2 text-xs ${mode === 'fit' ? 'border-gold-500 bg-gold-500/10 text-gold-300' : 'border-zinc-800 text-zinc-400'}`}><Maximize2 className="mx-auto mb-1 h-4 w-4" />Fit</button>
                <button type="button" onClick={() => setMode('fill')} className={`rounded-lg border px-2 py-2 text-xs ${mode === 'fill' ? 'border-gold-500 bg-gold-500/10 text-gold-300' : 'border-zinc-800 text-zinc-400'}`}><Maximize2 className="mx-auto mb-1 h-4 w-4" />Fill</button>
              </div>
            </fieldset>
            <label className="block text-xs font-semibold text-zinc-300" htmlFor="photo-zoom">Zoom <span className="font-normal text-zinc-500">{zoom.toFixed(1)}×</span><input id="photo-zoom" className="mt-2 w-full accent-amber-500" type="range" min="1" max="3" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setZoom((value) => Math.max(1, Number((value - 0.1).toFixed(1))))} className="rounded-lg border border-zinc-800 px-2 py-2 text-xs text-zinc-300"><Minus className="mx-auto mb-1 h-4 w-4" />Zoom out</button>
              <button type="button" onClick={() => setZoom((value) => Math.min(3, Number((value + 0.1).toFixed(1))))} className="rounded-lg border border-zinc-800 px-2 py-2 text-xs text-zinc-300"><Plus className="mx-auto mb-1 h-4 w-4" />Zoom in</button>
            </div>
            <button type="button" onClick={() => setRotation((value) => (value + 90) % 360)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300"><RotateCw className="h-4 w-4" />Rotate</button>
            <button type="button" onClick={reset} className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300"><RotateCcw className="h-4 w-4" />Reset</button>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-zinc-800 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="rounded-xl border border-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-900">Cancel</button>
          <button type="button" onClick={confirm} disabled={!naturalSize.width} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-600 px-5 py-3 text-sm font-bold text-zinc-950 hover:bg-gold-500 disabled:opacity-50"><Check className="h-4 w-4" />Use this crop</button>
        </div>
      </div>
    </div>
  );
}
