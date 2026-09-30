import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Maximize2,
  SwitchCamera,
  Crop,
  Smartphone,
} from 'lucide-react';
import { DeviceHelper } from '../utils/device';
import { ImageCropModal } from './ImageCropModal';

interface ProductPhotoCaptureProps {
  imageUrl?: string;
  onChange: (dataUrl: string | undefined) => void;
  label?: string;
}

export const ProductPhotoCapture: React.FC<ProductPhotoCaptureProps> = ({
  imageUrl,
  onChange,
  label = 'Product Photo',
}) => {
  const isMobile = DeviceHelper.isMobileDevice();

  // Fullscreen Camera Viewfinder Modal State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Snapshot Review within camera modal
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);

  // Image Cropping Modal State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageCandidate, setCropImageCandidate] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Resize and compress image to dataURL (max 600px width/height) to maintain high performance
  const compressImage = (imageSource: CanvasImageSource, width: number, height: number): string => {
    const maxDimension = 600;
    let targetWidth = width;
    let targetHeight = height;

    if (width > height && width > maxDimension) {
      targetHeight = Math.round((height * maxDimension) / width);
      targetWidth = maxDimension;
    } else if (height > maxDimension) {
      targetWidth = Math.round((width * maxDimension) / height);
      targetHeight = maxDimension;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);
      return canvas.toDataURL('image/jpeg', 0.85);
    }
    return '';
  };

  const startCamera = async (facing: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setCameraError(null);
    setCapturedSnapshot(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch((e) => console.warn('Camera video play error:', e));
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera start error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings.'
          : err.message || 'Could not start camera.'
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleOpenFullCamera = () => {
    setIsCameraOpen(true);
    setCapturedSnapshot(null);
    startCamera(facingMode);
  };

  const handleCloseCamera = () => {
    stopCamera();
    setIsCameraOpen(false);
    setCapturedSnapshot(null);
  };

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const snapshot = compressImage(video, width, height);
    if (snapshot) {
      // Haptic feedback if supported
      try {
        if ('vibrate' in navigator) navigator.vibrate(40);
      } catch (e) {
        // ignore
      }
      setCapturedSnapshot(snapshot);
      // Immediately offer the interactive crop tool to frame the item
      setCropImageCandidate(snapshot);
      setIsCropModalOpen(true);
    }
  };

  const handleConfirmCapturedPhoto = () => {
    if (capturedSnapshot) {
      onChange(capturedSnapshot);
      handleCloseCamera();
    }
  };

  const handleRetake = () => {
    setCapturedSnapshot(null);
    setCropImageCandidate(null);
    if (!cameraActive) {
      startCamera(facingMode);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (rawDataUrl) {
        // Open crop modal directly so user has full control over framing
        setCropImageCandidate(rawDataUrl);
        setIsCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    onChange(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = '';
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-stone-800 dark:text-stone-200 font-bold text-xs flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{label}</span>
        </label>
        {imageUrl && (
          <button
            type="button"
            onClick={handleRemovePhoto}
            className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1 transition"
          >
            <Trash2 className="w-3 h-3" />
            <span>Remove Photo</span>
          </button>
        )}
      </div>

      {/* If an image is already set, show clear preview tile */}
      {imageUrl ? (
        <div className="relative border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 bg-stone-50 dark:bg-stone-850 flex items-center gap-3 shadow-2xs">
          <img
            src={imageUrl}
            alt="Product Preview"
            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shrink-0"
          />
          <div className="flex-1 text-xs min-w-0">
            <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Photo Attached</span>
            </div>
            <p className="text-stone-500 dark:text-stone-400 text-[11px] mt-0.5 line-clamp-2">
              Appears on POS register catalog tiles, inventory list, and printed receipts.
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => {
                  setCropImageCandidate(imageUrl);
                  setIsCropModalOpen(true);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black flex items-center gap-1.5 transition shadow-xs"
                title="Crop and reposition this photo"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Crop / Frame Photo</span>
              </button>
              <button
                type="button"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="px-2.5 py-1 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-600 rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow-2xs"
                title="Take photo with iPhone Camera"
              >
                <Smartphone className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span>iPhone Cam</span>
              </button>
              <button
                type="button"
                onClick={handleOpenFullCamera}
                className="px-2.5 py-1 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-600 rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow-2xs"
                title="Retake with live in-app viewfinder"
              >
                <Camera className="w-3 h-3 text-amber-500" />
                <span>Live Cam</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-600 rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow-2xs"
              >
                <Upload className="w-3 h-3 text-stone-600 dark:text-stone-400" />
                <span>Upload New</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Action buttons to capture photo */
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Native iPhone / Mobile Camera */}
            <button
              type="button"
              onClick={() => nativeCameraInputRef.current?.click()}
              className="p-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs"
              title="Opens iPhone camera with auto-focus and flash, then opens Crop tool"
            >
              <Smartphone className="w-4 h-4" />
              <span>Take Photo (iPhone Camera)</span>
            </button>

            {/* In-App Live Camera Viewfinder */}
            <button
              type="button"
              onClick={handleOpenFullCamera}
              className="p-3 bg-stone-850 dark:bg-stone-800 hover:bg-stone-800 dark:hover:bg-stone-700 active:scale-[0.98] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs border border-stone-700"
              title="Live interactive camera with framing guide"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <span>Live In-App Camera</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 bg-stone-100 dark:bg-stone-850 hover:bg-stone-200 dark:hover:bg-stone-800 active:scale-[0.98] text-stone-700 dark:text-stone-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-stone-200 dark:border-stone-750 transition"
          >
            <Upload className="w-3.5 h-3.5 text-stone-500" />
            <span>Upload from Gallery / Files (with Crop Option)</span>
          </button>
        </div>
      )}

      {/* Native Camera Input (triggers native iOS Camera on iPhones) */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hidden File Input for Gallery / Local Drive */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* FULLSCREEN CAMERA MODAL / VIEWFINDER */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between text-white animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="font-extrabold text-sm sm:text-base leading-tight">Product Camera</h3>
                <p className="text-[10px] text-stone-400">Position the item inside the frame</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Camera Switcher (Front/Back) */}
              {!capturedSnapshot && (
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition active:scale-95"
                  title="Switch Camera (Front / Back)"
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={handleCloseCamera}
                className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition active:scale-95"
                title="Close camera"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central Camera Viewfinder Area */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
            {capturedSnapshot ? (
              /* Review Mode */
              <div className="relative w-full h-full flex items-center justify-center p-4">
                <img
                  src={capturedSnapshot}
                  alt="Captured Product"
                  className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/20"
                />
                <div className="absolute top-6 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-bold text-stone-200">
                  Photo Captured • Review & Confirm
                </div>
              </div>
            ) : (
              /* Live Stream Mode */
              <>
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-contain"
                />

                {/* Target Framing Overlay */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 sm:w-80 sm:h-80 border-2 border-white/40 rounded-3xl relative flex items-center justify-center">
                    <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                    <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                    <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                    <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
                    <span className="text-[11px] font-bold text-white/70 bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs">
                      Frame Product
                    </span>
                  </div>
                </div>

                {cameraError && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center z-20">
                    <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-rose-300 max-w-sm mb-4">{cameraError}</p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startCamera(facingMode)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Retry Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleCloseCamera();
                          fileInputRef.current?.click();
                        }}
                        className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Pick from Gallery</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom Controls Bar */}
          <div className="p-6 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-around z-10">
            {capturedSnapshot ? (
              /* Review Buttons with Crop Option */
              <div className="flex items-center gap-2.5 w-full max-w-lg mx-auto justify-between">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="py-3 px-3 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retake</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (capturedSnapshot) {
                      setCropImageCandidate(capturedSnapshot);
                      setIsCropModalOpen(true);
                    }
                  }}
                  className="flex-1 py-3 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition shadow-lg active:scale-95"
                >
                  <Crop className="w-4 h-4" />
                  <span>Crop & Frame</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCapturedPhoto}
                  className="flex-1 py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition shadow-lg active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Use As-Is</span>
                </button>
              </div>
            ) : (
              /* Shutter Button */
              <div className="flex items-center justify-between w-full max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    handleCloseCamera();
                    fileInputRef.current?.click();
                  }}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
                  title="Pick from Gallery"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>

                {/* Big Shutter Button */}
                <button
                  type="button"
                  disabled={!cameraActive}
                  onClick={handleSnapPhoto}
                  className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-90 transition disabled:opacity-40 disabled:cursor-not-allowed group"
                  title="Snap Photo"
                >
                  <div className="w-16 h-16 rounded-full bg-white group-hover:bg-stone-200 transition" />
                </button>

                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
                  title="Switch Camera"
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Photo Crop Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropImageCandidate}
        onClose={() => {
          setIsCropModalOpen(false);
          setCropImageCandidate(null);
        }}
        onCropComplete={(croppedDataUrl) => {
          onChange(croppedDataUrl);
          setIsCropModalOpen(false);
          setCropImageCandidate(null);
          handleCloseCamera();
        }}
      />
    </div>
  );
};
