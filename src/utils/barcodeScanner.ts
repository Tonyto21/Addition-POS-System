import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';

// Reusable ZXing reader instance with common retail formats
const hints = new Map<DecodeHintType, any>();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
]);
hints.set(DecodeHintType.TRY_HARDER, true);

const zxingReader = new BrowserMultiFormatReader(hints);

// Native BarcodeDetector caching for mobile phones / Android Chrome / WebViews
let nativeDetector: any = null;
let nativeDetectorChecked = false;

function getNativeBarcodeDetector(): any {
  if (nativeDetectorChecked) return nativeDetector;
  nativeDetectorChecked = true;
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      nativeDetector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'itf'],
      });
    } catch (e) {
      nativeDetector = null;
    }
  }
  return nativeDetector;
}

export interface BarcodeScanResult {
  text: string;
  format?: string;
}

/**
 * Decodes barcode from an image file (PNG, JPG, WebP)
 */
export async function decodeBarcodeFromImageFile(file: File | Blob): Promise<string | null> {
  // Strategy 1: Check native BarcodeDetector API if present
  const detector = getNativeBarcodeDetector();
  if (detector) {
    try {
      const bitmap = await createImageBitmap(file);
      const detected = await detector.detect(bitmap);
      if (detected && detected.length > 0 && detected[0].rawValue) {
        return detected[0].rawValue.trim();
      }
    } catch (e) {
      // fallback to ZXing below
    }
  }

  // Strategy 2: ZXing Library from Object URL
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Direct decode via ZXing
      try {
        const result = zxingReader.decode(img);
        URL.revokeObjectURL(objectUrl);
        if (result && result.getText()) {
          resolve(result.getText().trim());
          return;
        }
      } catch (err) {
        // Not found on direct image
      }

      // If direct image fails, draw to canvas
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const result = (zxingReader as any).decode(canvas);
          URL.revokeObjectURL(objectUrl);
          if (result && result.getText()) {
            resolve(result.getText().trim());
            return;
          }
        }
      } catch (err2) {
        // No barcode found
      }

      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    img.src = objectUrl;
  });
}

/**
 * Decodes barcode from a live <video> element
 */
export async function decodeBarcodeFromVideoElement(video: HTMLVideoElement): Promise<string | null> {
  if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  // Strategy 1: Fast native BarcodeDetector (hardware-accelerated on Android)
  const detector = getNativeBarcodeDetector();
  if (detector) {
    try {
      const barcodes = await detector.detect(video);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue.trim();
      }
    } catch (e) {
      // Fallback to ZXing
    }
  }

  // Strategy 2: ZXing direct decode from video element
  try {
    const result = zxingReader.decode(video);
    if (result && result.getText()) {
      return result.getText().trim();
    }
  } catch (err) {
    // Frame did not contain a readable barcode
  }

  // Strategy 3: Crop center reticle to canvas for enhanced contrast / dense 1D barcodes
  try {
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;
    const cropW = Math.floor(vWidth * 0.85);
    const cropH = Math.floor(vHeight * 0.55);
    const startX = Math.floor((vWidth - cropW) / 2);
    const startY = Math.floor((vHeight - cropH) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(video, startX, startY, cropW, cropH, 0, 0, cropW, cropH);
      const result = (zxingReader as any).decode(canvas);
      if (result && result.getText()) {
        return result.getText().trim();
      }
    }
  } catch (err3) {
    // No barcode found in cropped frame
  }

  return null;
}

