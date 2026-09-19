import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Volume2,
  Image as ImageIcon,
  Smartphone,
  Monitor,
  Zap,
} from 'lucide-react';
import { playSupermarketBeep, playBeep } from '../utils/audio';
import { decodeBarcodeFromImageFile, decodeBarcodeFromVideoElement } from '../utils/barcodeScanner';
import { DeviceHelper } from '../utils/device';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  continuous?: boolean;
  allowPhotoUpload?: boolean;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Barcode Scanner',
  continuous = true,
  allowPhotoUpload = true,
}) => {
  // Determine if running on mobile device or desktop web
  const isMobile = DeviceHelper.isMobileDevice();

  // Mode: if allowPhotoUpload is false, locked to 'camera'.
  // Otherwise on mobile camera, on desktop upload photo.
  const [activeMode, setActiveMode] = useState<'camera' | 'upload'>(() =>
    !allowPhotoUpload ? 'camera' : isMobile ? 'camera' : 'upload'
  );

  useEffect(() => {
    if (!allowPhotoUpload && activeMode !== 'camera') {
      setActiveMode('camera');
    }
  }, [allowPhotoUpload]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const lastScanTimeRef = useRef<number>(0);

  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // When modal opens or mode changes:
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    if (activeMode === 'camera') {
      startCamera();
    } else {
      // In upload mode, immediately release camera hardware
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode]);

  // Start live camera stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera device API not supported on this browser');
      }

      let stream: MediaStream;
      try {
        // First try back camera (ideal for retail scanning on mobile phones)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (backCamErr) {
        // Fallback to basic video constraint if device is picky
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.setAttribute('muted', 'true');
        await videoRef.current.play().catch((e) => console.warn('Play error:', e));
      }

      setHasCamera(true);
      isScanningRef.current = true;
      startScanLoop();
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setHasCamera(false);
      setCameraError(err.message || 'Unable to access camera');
    }
  };

  // Continuous frame analysis loop for camera
  const startScanLoop = () => {
    const scanFrame = async () => {
      if (!isScanningRef.current || !videoRef.current) return;

      const video = videoRef.current;
      const now = Date.now();

      // Scan every 150ms once video has loaded frame dimensions
      if (video.readyState >= 2 && video.videoWidth > 0 && now - lastScanTimeRef.current > 150) {
        lastScanTimeRef.current = now;
        try {
          const barcode = await decodeBarcodeFromVideoElement(video);
          if (barcode && barcode.trim()) {
            handleSuccessfulScan(barcode.trim());
            return;
          }
        } catch (e) {
          // Frame decode error - continue to next frame
        }
      }

      if (isScanningRef.current) {
        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);
  };

  // Stop camera hardware and cancel scan loop
  const stopCamera = () => {
    isScanningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Handle successful barcode recognition (from either camera OR photo upload)
  const handleSuccessfulScan = (code: string) => {
    // Subtle audio feedback
    playSupermarketBeep();

    setLastScanned(code);
    onScan(code);

    if (!continuous) {
      stopCamera();
      onClose();
    }
  };

  // Handle uploaded photo decoding
  const handlePhotoUpload = async (file: File) => {
    if (!file) return;
    setIsProcessingPhoto(true);
    setPhotoError(null);

    // Generate local preview
    const previewUrl = URL.createObjectURL(file);
    setUploadedPreview(previewUrl);

    try {
      const decoded = await decodeBarcodeFromImageFile(file);
      if (decoded && decoded.trim()) {
        handleSuccessfulScan(decoded.trim());
      } else {
        playBeep('unknown');
        setPhotoError(
          'No barcode detected in this photo. Please ensure the barcode is sharp, well-lit, and in focus.'
        );
      }
    } catch (err: any) {
      playBeep('error');
      setPhotoError('Failed to process image file.');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const code = manualCode.trim();
    handleSuccessfulScan(code);
    setManualCode('');
  };

  // Quick preset test barcodes from store catalog
  const sampleBarcodes = [
    { code: '070001000123', name: 'Bella Rice 25kg' },
    { code: '600100100234', name: 'Mayor Cooking Oil 5L' },
    { code: '071112223344', name: 'White Cane Sugar' },
    { code: '544900000099', name: 'Aquavita Water 500ml' },
    { code: '890103000555', name: 'Dettol Soap Bar' },
    { code: '544900000028', name: 'Coca-Cola 330ml' },
    { code: '082223334455', name: 'Wheat Flour (kg)' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="bg-stone-900 border border-stone-700 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-stone-800/90 border-b border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
              {activeMode === 'camera' ? <Camera className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{title}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Scanner Active
                </span>
              </h3>
              <p className="text-[11px] text-stone-400">
                {isMobile ? 'Mobile POS Scanner' : 'Web App Barcode Scanner'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MUTUALLY EXCLUSIVE MODE SELECTOR - ONLY SHOWN IF allowPhotoUpload is true */}
        {allowPhotoUpload && (
          <div className="p-2.5 bg-stone-950 border-b border-stone-800">
            <div className="grid grid-cols-2 gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800">
              <button
                type="button"
                onClick={() => setActiveMode('camera')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                  activeMode === 'camera'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan with Camera</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('upload')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                  activeMode === 'upload'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE VIEW AREA: EXACTLY ONE IS SHOWN AT A TIME */}
        <div className="relative bg-black flex-1 min-h-[240px] max-h-[300px] flex items-center justify-center overflow-hidden">
          {activeMode === 'camera' ? (
            /* CAMERA SCANNING MODE */
            hasCamera && !cameraError ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Scanner Reticle Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-36 border-2 border-emerald-500/80 rounded-xl relative shadow-[0_0_25px_rgba(16,185,129,0.35)] overflow-hidden">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-0.5 -ml-0.5 rounded-tl"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-0.5 -mr-0.5 rounded-tr"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-0.5 -ml-0.5 rounded-bl"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-0.5 -mr-0.5 rounded-br"></div>
                    {/* Animated moving red scanner laser */}
                    <div className="absolute inset-x-2 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-laser-sweep"></div>
                  </div>
                </div>

                <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/70 backdrop-blur-xs border border-white/10 rounded-full text-[11px] text-emerald-400 font-medium">
                  Point camera at item barcode
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-stone-300">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-white mb-1">Camera Unavailable</p>
                <p className="text-xs text-stone-400 max-w-xs mx-auto mb-3">
                  {cameraError || (allowPhotoUpload ? 'Use the "Upload Photo" tab or enter the barcode manually.' : 'Please allow camera access or enter the barcode number below.')}
                </p>
                <button
                  onClick={startCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-800 border border-stone-700 hover:bg-stone-700 text-stone-200 rounded-lg"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                </button>
              </div>
            )
          ) : (
            /* UPLOAD PHOTO MODE */
            <div className="w-full h-full p-4 flex flex-col items-center justify-center bg-stone-900 text-stone-300">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                }}
              />

              {uploadedPreview && !isProcessingPhoto ? (
                <div className="flex flex-col items-center gap-2 max-h-full">
                  <div className="relative w-36 h-28 border border-stone-700 rounded-lg overflow-hidden bg-black">
                    <img
                      src={uploadedPreview}
                      alt="Uploaded Barcode"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-stone-700"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Another Photo</span>
                  </button>
                </div>
              ) : isProcessingPhoto ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="text-xs font-bold text-white">Scanning photo for barcode...</p>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-sm border-2 border-dashed border-stone-700 hover:border-blue-500 hover:bg-stone-800/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/10 group-hover:bg-blue-600/20 text-blue-400 flex items-center justify-center mb-2 transition">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-extrabold text-white mb-1">
                    Click or Drag to Upload Barcode Photo
                  </p>
                  <p className="text-[11px] text-stone-400 max-w-xs">
                    Accepts clear snapshots of product packages, shelf labels, or barcodes
                  </p>
                </div>
              )}

              {photoError && (
                <div className="mt-3 px-3 py-1.5 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-lg text-[11px] max-w-sm text-center">
                  {photoError}
                </div>
              )}
            </div>
          )}

          {/* Success Banner when code is detected */}
          {lastScanned && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-emerald-950/95 border border-emerald-600 text-emerald-300 text-xs px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Scanned: <strong className="font-mono text-white">{lastScanned}</strong></span>
            </div>
          )}
        </div>

        {/* Manual Barcode Entry + Preset Test Barcodes */}
        <div className="p-4 bg-stone-800/90 border-t border-stone-700 space-y-3">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Or enter barcode numbers manually (e.g. 070001000123)..."
              className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white text-xs font-bold rounded-xl transition"
            >
              Enter
            </button>
          </form>

          {/* Quick Barcode Simulator Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Store Catalog Quick Test
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                Click any item to test scan
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-24 overflow-y-auto pr-1">
              {sampleBarcodes.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleSuccessfulScan(item.code)}
                  className="p-1.5 text-left bg-stone-900/80 hover:bg-stone-700 border border-stone-700/80 rounded-lg text-[10px] transition text-stone-300 hover:text-white truncate"
                  title={`${item.name} (${item.code})`}
                >
                  <div className="font-bold truncate">{item.name}</div>
                  <div className="font-mono text-[9px] text-stone-400">{item.code}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
