import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle,
  Copy,
  Check,
  Download,
  Terminal,
  Layers,
  Code,
  ExternalLink,
  QrCode,
  Share2,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const MobileApkGuideView: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-sjd6ci75jjgs6sem7e57up-716246304120.europe-west2.run.app';

  const projectSetupCommands = `# 1. Export repository via AI Studio settings (Export to ZIP / GitHub)
git clone <YOUR_GIT_REPO_URL>
cd addition-shop

# 2. Compile APK using Google Bubblewrap CLI (Fastest TWA method)
npm install -g @bubblewrap/cli
bubblewrap init --manifest="${appUrl}/manifest.json"
bubblewrap build

# --- OR with Capacitor (Full Native WebView container) ---
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Addition Shop" "com.additionshop.pos"
npx cap add android
npm run build
npx cap sync
npx cap open android
# Inside Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)`;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-100 text-stone-900">
      {/* Header */}
      <div className="p-4 bg-white border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            Get Android APK & Phone Installation Guide
          </h2>
          <p className="text-xs text-stone-500">
            Generate a standalone <span className="font-mono font-bold text-stone-800">.apk</span> file or install directly onto any Android phone, tablet, or POS terminal
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isInstallable && (
            <button
              onClick={install}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App Now</span>
            </button>
          )}
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            PWA & APK Ready (100%)
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full space-y-4 text-xs">
        {/* METHOD 1: PWABUILDER (FASTEST WAY TO GET A REAL .APK FILE) */}
        <div className="p-5 bg-white border border-stone-200 rounded-2xl space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
                  <span>Method 1: PWABuilder — 1-Click APK Download</span>
                  <span className="px-2 py-0.2 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold uppercase">
                    Easiest for .apk
                  </span>
                </h3>
                <p className="text-[11px] text-stone-500">
                  Generates a signed Android package (.apk) in under 60 seconds without installing Android Studio.
                </p>
              </div>
            </div>
            <a
              href="https://www.pwabuilder.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold transition text-xs shadow-2xs"
            >
              <span>Open PWABuilder</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-700">Step A: Copy Your Live App URL</span>
              <span className="text-[10px] text-stone-500">Works with your shared or production link</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="flex-1 bg-white border border-stone-300 rounded-lg px-3 py-2 font-mono text-xs text-stone-900 select-all"
              />
              <button
                onClick={() => copyToClipboard(appUrl, 'pwa-url')}
                className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition shrink-0 shadow-2xs"
              >
                {copiedSection === 'pwa-url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSection === 'pwa-url' ? 'Copied!' : 'Copy URL'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 text-stone-700">
            <div className="font-bold text-stone-900">Step B: Download the APK from PWABuilder:</div>
            <ol className="list-decimal list-inside space-y-1.5 leading-relaxed pl-1 text-[11px]">
              <li>
                Go to{' '}
                <a
                  href="https://www.pwabuilder.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 font-bold underline"
                >
                  pwabuilder.com
                </a>
              </li>
              <li>Paste your copied URL into the input field and click <strong>"Start"</strong>.</li>
              <li>Wait 5 seconds for the manifest check — it will score <strong>100% PWA Ready</strong>.</li>
              <li>Click <strong>"Package for Stores"</strong>, then under <strong>Android</strong> click <strong>"Generate"</strong>.</li>
              <li>Download the resulting <strong>.apk</strong> file.</li>
              <li>Send the <strong>.apk</strong> via WhatsApp, Telegram, USB, or Google Drive to your Android device or Sunmi/PAX POS terminal and tap to install!</li>
            </ol>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-900 text-[11px] leading-relaxed">
              <strong className="text-amber-950 font-bold block">
                ⚠️ Did PWABuilder say "Missing Name" or "Did not find a Web Manifest"?
              </strong>
              <p>
                This occurs if you test with the private preview link (<code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-900">ais-dev-...</code>), because Google requires your personal login cookie to view it, blocking PWABuilder's bot.
              </p>
              <p className="font-semibold text-stone-900">
                <strong>Fix:</strong> In the upper right corner of Google AI Studio, tap the <strong className="text-blue-600">"Share"</strong> button → Publish a public share link, then paste that public link into PWABuilder!
              </p>
            </div>
          </div>
        </div>

        {/* METHOD 2: DIRECT PHONE BROWSER INSTALL */}
        <div className="p-5 bg-white border border-stone-200 rounded-2xl space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">
                  Method 2: Instant Home Screen Install (No APK Build Required)
                </h3>
                <p className="text-[11px] text-stone-500">
                  Installs immediately in 5 seconds directly from Google Chrome with full offline functionality.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
              Zero Setup
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5">
              <div className="font-bold text-stone-900 flex items-center gap-1.5">
                <span>On Android (Chrome / Brave / Samsung Internet)</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-stone-600 text-[11px] leading-relaxed">
                <li>Open this app URL in <strong>Google Chrome</strong> on your phone or POS tablet.</li>
                <li>Tap the <strong>3 dots (⋮)</strong> menu in the upper right.</li>
                <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                <li>An app icon appears in your phone app drawer, launching fullscreen without URL bars.</li>
              </ol>
            </div>

            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5">
              <div className="font-bold text-stone-900">On iPhone / iPad (Safari)</div>
              <ol className="list-decimal list-inside space-y-1 text-stone-600 text-[11px] leading-relaxed">
                <li>Open this app URL in <strong>Safari</strong> on iOS.</li>
                <li>Tap the <strong>Share button</strong> (square with arrow pointing up).</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                <li>Tap <strong>Add</strong> in the top-right corner.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* METHOD 3: BUBBLEWRAP & CAPACITOR CLI */}
        <div className="p-5 bg-white border border-stone-200 rounded-2xl space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">
                  Method 3: Build APK from Source via Bubblewrap CLI or Capacitor
                </h3>
                <p className="text-[11px] text-stone-500">
                  For developers wanting to customize Java/Kotlin code, splash screens, or Play Store keys.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-200">
              Developer CLI
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700">
              <span>Terminal Commands (Node.js & Android SDK):</span>
              <button
                onClick={() => copyToClipboard(projectSetupCommands, 'apk-cmd')}
                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg flex items-center gap-1 transition border border-stone-200"
              >
                {copiedSection === 'apk-cmd' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSection === 'apk-cmd' ? 'Copied' : 'Copy Commands'}</span>
              </button>
            </div>

            <pre className="p-3.5 bg-stone-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto leading-relaxed shadow-inner">
              {projectSetupCommands}
            </pre>
          </div>
        </div>

        {/* OFFLINE & POS HARDWARE TIP */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs space-y-1.5 text-blue-950">
          <div className="font-extrabold flex items-center gap-1.5 text-blue-900">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Hardware & Offline POS Ready
          </div>
          <p className="text-[11px] text-blue-900 leading-relaxed">
            Whether installed as an APK or directly via Chrome, Addition POS operates with 100% offline persistence. Camera barcode scanning, dual-currency cash registers (USD & LRD), and 58mm/80mm Bluetooth/USB thermal receipt printing are fully supported on Android.
          </p>
        </div>
      </div>
    </div>
  );
};
