import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  Maximize2,
  Square,
  RectangleHorizontal,
  RefreshCw,
  Sparkles,
  Move,
} from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
  initialAspectRatio?: '1:1' | '4:3' | 'free';
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  initialAspectRatio = '1:1',
}) => {
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:3' | 'free'>(initialAspectRatio);
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Reset transforms when a new image is loaded
  useEffect(() => {
    if (isOpen && imageSrc) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setImageLoaded(false);
    }
  }, [isOpen, imageSrc]);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoom = (delta: number) => {
    setScale((prev) => Math.min(3, Math.max(0.8, Number((prev + delta).toFixed(2)))));
  };

  // Drag handling (mouse and touch)
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Perform crop extraction onto an offscreen canvas
  const handleApplyCrop = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;

    // Standard output resolution
    const targetSize = 600;
    let outWidth = targetSize;
    let outHeight = targetSize;

    if (aspectRatio === '4:3') {
      outWidth = 600;
      outHeight = 450;
    } else if (aspectRatio === 'free') {
      outWidth = img.naturalWidth || 600;
      outHeight = img.naturalHeight || 600;
      const maxDim = 600;
      if (outWidth > outHeight && outWidth > maxDim) {
        outHeight = Math.round((outHeight * maxDim) / outWidth);
        outWidth = maxDim;
      } else if (outHeight > maxDim) {
        outWidth = Math.round((outWidth * maxDim) / outHeight);
        outHeight = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill background with white in case of margins
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outWidth, outHeight);

    ctx.save();
    // Move to canvas center
    ctx.translate(outWidth / 2, outHeight / 2);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Scaling factor relative to displayed viewport
    // Calculate display ratio
    const container = containerRef.current;
    const cropBoxSize = container ? Math.min(container.clientWidth, container.clientHeight) * 0.75 : 280;
    const ratio = (outWidth / cropBoxSize) * scale;

    ctx.scale(ratio, ratio);

    // Apply pan offset
    const isRotated90or270 = rotation === 90 || rotation === 270;
    let drawX = position.x;
    let drawY = position.y;

    if (rotation === 90) {
      drawX = position.y;
      drawY = -position.x;
    } else if (rotation === 180) {
      drawX = -position.x;
      drawY = -position.y;
    } else if (rotation === 270) {
      drawX = -position.y;
      drawY = position.x;
    }

    // Natural dimensions
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    // Draw centered image
    ctx.drawImage(img, -nw / 2 + drawX, -nh / 2 + drawY, nw, nh);
    ctx.restore();

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
    onCropComplete(croppedDataUrl);
    onClose();
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-sm animate-fade-in text-white select-none">
      <div className="bg-stone-900 border border-stone-700 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-stone-850 border-b border-stone-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Crop & Frame Product Photo</h3>
              <p className="text-[11px] text-stone-400">
                Drag to reposition • Zoom & rotate for clean catalog display
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aspect Ratio Presets */}
        <div className="px-5 py-2.5 bg-stone-850/60 border-b border-stone-800 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider shrink-0">
            Framing Ratio:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAspectRatio('1:1')}
              className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition text-[11px] ${
                aspectRatio === '1:1'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              <Square className="w-3 h-3" />
              <span>1:1 Square (POS Tiles)</span>
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio('4:3')}
              className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition text-[11px] ${
                aspectRatio === '4:3'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              <RectangleHorizontal className="w-3.5 h-3.5" />
              <span>4:3 Standard</span>
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio('free')}
              className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition text-[11px] ${
                aspectRatio === 'free'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              <Maximize2 className="w-3 h-3" />
              <span>Original</span>
            </button>
          </div>
        </div>

        {/* Interactive Crop Viewport Canvas Area */}
        <div
          ref={containerRef}
          className="relative flex-1 min-h-[280px] sm:min-h-[340px] bg-stone-950 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
          onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            if (touch) handlePointerDown(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            if (touch) handlePointerMove(touch.clientX, touch.clientY);
          }}
          onTouchEnd={handlePointerUp}
        >
          {/* Background image transformed by pan, zoom, and rotation */}
          <div
            className="transition-transform duration-75 will-change-transform flex items-center justify-center"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
            }}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop Source"
              onLoad={handleImageLoad}
              className="max-w-[420px] max-h-[360px] object-contain pointer-events-none rounded shadow-lg"
              draggable={false}
            />
          </div>

          {/* Semi-transparent Framing Mask & Guidelines */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <div
              className={`border-2 border-white/90 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] transition-all ${
                aspectRatio === '1:1'
                  ? 'w-64 h-64 sm:w-72 sm:h-72 aspect-square'
                  : aspectRatio === '4:3'
                  ? 'w-72 h-54 sm:w-80 sm:h-60 aspect-4/3'
                  : 'w-72 h-72 sm:w-80 sm:h-80'
              }`}
            >
              {/* Corner indicators */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-blue-400" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-blue-400" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-blue-400" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-blue-400" />

              {/* Rule-of-thirds grid lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-white" />
                <div className="border-r border-white" />
                <div />
              </div>

              {/* Drag Prompt Pill */}
              <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/70 px-2.5 py-0.5 rounded-full text-[10px] text-stone-300 flex items-center gap-1 font-medium backdrop-blur-xs">
                <Move className="w-3 h-3 text-blue-400" />
                <span>Drag to align</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Toolbar: Zoom Slider, Rotate, and Confirm */}
        <div className="p-4 bg-stone-850 border-t border-stone-800 space-y-3">
          <div className="flex items-center justify-between gap-4">
            {/* Zoom Slider */}
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <button
                type="button"
                onClick={() => handleZoom(-0.15)}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="flex-1 accent-blue-500 h-1.5 bg-stone-700 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => handleZoom(0.15)}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-stone-400 min-w-9 text-right">
                {Math.round(scale * 100)}%
              </span>
            </div>

            {/* Rotate Button */}
            <button
              type="button"
              onClick={handleRotate}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition"
              title="Rotate 90 Degrees Clockwise"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Rotate 90°</span>
            </button>

            {/* Reset Button */}
            <button
              type="button"
              onClick={() => {
                setScale(1);
                setRotation(0);
                setPosition({ x: 0, y: 0 });
              }}
              className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition"
              title="Reset Position & Zoom"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Action Confirmation Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-bold transition text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (imageSrc) {
                  onCropComplete(imageSrc);
                  onClose();
                }
              }}
              className="py-2.5 px-3 bg-stone-700 hover:bg-stone-600 text-white rounded-xl text-xs font-bold transition text-center"
              title="Skip crop and use original uncropped image"
            >
              Use Full Original
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition shadow-lg flex items-center justify-center gap-2 active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>Apply Crop & Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
