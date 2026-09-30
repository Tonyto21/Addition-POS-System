import React, { useState } from 'react';
import { Smartphone, Download, ExternalLink, Copy, Check, X, ShieldCheck, Terminal, Layers } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface ApkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkExportModal: React.FC<ApkExportModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isAndroid, install } = usePWAInstall();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'ios' | 'pwabuilder' | 'direct' | 'cli'>('ios');

  if (!isOpen) return null;

  // Use current window URL or canonical preview URL
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-sjd6ci75jjgs6sem7e57up-716246304120.europe-west2.run.app';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-stone-900 border border-stone-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-stone-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Convert & Install as Android APK
              </h3>
              <p className="text-xs text-stone-400">
                Run Addition POS natively on Android phones, tablets, or handheld POS terminals
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

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Quick Status / In-App Install Banner */}
          <div className="p-4 bg-blue-950/40 border border-blue-800/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>PWA Manifest & Offline Service Worker Ready</span>
              </div>
              <p className="text-stone-400 text-[11px] mt-0.5">
                Full 192x192, 512x512, and maskable icons are generated. Compatible with Trusted Web Activity (TWA).
              </p>
            </div>

            {isInstalled ? (
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30 shrink-0">
                ✓ Already Installed
              </span>
            ) : isInstallable ? (
              <button
                onClick={install}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Instant Android Install</span>
              </button>
            ) : isAndroid ? (
              <span className="text-[11px] text-stone-400 italic">
                Open in Chrome on Android & tap "Install App" in menu
              </span>
            ) : null}
          </div>

          {/* Navigation Tabs for Methods */}
          <div className="flex border-b border-stone-800 gap-1 pb-1 overflow-x-auto">
            <button
              onClick={() => setActiveGuideTab('ios')}
              className={`px-3 py-2 rounded-t-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeGuideTab === 'ios'
                  ? 'bg-stone-800 text-blue-400 border-b-2 border-blue-500'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>iPhone / iOS (Instant Web App)</span>
            </button>
            <button
              onClick={() => setActiveGuideTab('pwabuilder')}
              className={`px-3 py-2 rounded-t-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeGuideTab === 'pwabuilder'
                  ? 'bg-stone-800 text-blue-400 border-b-2 border-blue-500'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Android APK (PWABuilder)</span>
            </button>
            <button
              onClick={() => setActiveGuideTab('direct')}
              className={`px-3 py-2 rounded-t-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeGuideTab === 'direct'
                  ? 'bg-stone-800 text-blue-400 border-b-2 border-blue-500'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android Chrome Install</span>
            </button>
            <button
              onClick={() => setActiveGuideTab('cli')}
              className={`px-3 py-2 rounded-t-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeGuideTab === 'cli'
                  ? 'bg-stone-800 text-blue-400 border-b-2 border-blue-500'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>CLI / Local Build</span>
            </button>
          </div>

          {/* Tab 0: iPhone / iOS Installation Guide */}
          {activeGuideTab === 'ios' && (
            <div className="space-y-4">
              <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🍎</span>
                    <h4 className="font-bold text-white text-sm">How to Install on iPhone & iPad</h4>
                  </div>
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-mono font-bold">
                    iOS Web App
                  </span>
                </div>
                
                <p className="text-stone-300 text-xs leading-relaxed">
                  Apple does not allow <code className="bg-stone-800 px-1 py-0.5 rounded text-amber-300">.apk</code> files (which are Android-only). Instead, iOS has built-in support to install web apps directly to the iPhone Home Screen as a native standalone app — with zero App Store fees, full-screen display, and offline support!
                </p>

                {/* Step-by-step instructions */}
                <div className="p-3.5 bg-stone-900 border border-stone-800 rounded-xl space-y-3 text-stone-200">
                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span>Follow these 4 simple steps on the iPhone:</span>
                  </div>
                  <ol className="space-y-3 list-decimal list-inside text-xs">
                    <li className="leading-relaxed">
                      Open <strong className="text-white">Safari</strong> on the iPhone and navigate to your link:
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={appUrl}
                          className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-white select-all"
                        />
                        <button
                          onClick={handleCopyUrl}
                          className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-lg flex items-center gap-1 font-bold transition shrink-0 text-xs"
                        >
                          {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </li>
                    <li className="leading-relaxed">
                      Tap the <strong className="text-blue-400">Share</strong> button at the bottom of Safari (the square icon with an arrow pointing up <span className="font-mono bg-stone-800 px-1 rounded">⎋ / [↑]</span>).
                    </li>
                    <li className="leading-relaxed">
                      Scroll down the list and tap <strong className="text-emerald-400">"Add to Home Screen"</strong> (with a plus [+] icon).
                    </li>
                    <li className="leading-relaxed">
                      Tap <strong className="text-blue-400">"Add"</strong> in the top-right corner.
                    </li>
                  </ol>
                </div>

                <div className="p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl space-y-1.5 text-blue-200 text-xs">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>✨ How it works on iPhone:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-stone-300">
                    Addition POS will launch from the iPhone Home Screen just like a native app: no Safari address bars, with its custom icon, camera barcode scanner, and automatic updates whenever you push improvements.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: PWABuilder (Recommended for getting an actual .apk file) */}
          {activeGuideTab === 'pwabuilder' && (
            <div className="space-y-4">
              <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Step 1: Your App Live URL & Icon
                  </span>
                  <a
                    href="/assets/icon-512.png"
                    download="addition-pos-icon-512.png"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-emerald-400 text-[11px] font-bold rounded-lg border border-stone-700 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download 512x512 Icon PNG</span>
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={appUrl}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 font-mono text-xs text-white select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg flex items-center gap-1.5 font-bold transition shrink-0"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Step 2: Generate APK via PWABuilder
                </span>
                <ol className="space-y-2.5 list-decimal list-inside text-stone-300">
                  <li className="leading-relaxed">
                    Open <strong className="text-white">PWABuilder</strong> (Google & Microsoft official packaging tool):{' '}
                    <a
                      href="https://www.pwabuilder.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline inline-flex items-center gap-1 hover:text-blue-300"
                    >
                      pwabuilder.com <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li className="leading-relaxed">
                    Paste your copied app URL into the box and click <strong className="text-white">Start</strong>.
                  </li>
                  <li className="leading-relaxed">
                    Click <strong className="text-white">Package for Stores</strong>, then select <strong className="text-emerald-400">Android</strong>.
                  </li>
                  <li className="leading-relaxed">
                    Select <strong className="text-white">Generate APK / Package</strong>. It will compile a signed <strong className="text-amber-400 font-mono">.apk</strong> file.
                  </li>
                  <li className="leading-relaxed">
                    Send or copy the downloaded <strong className="text-white">.apk</strong> to your Android phone, tablet, or POS terminal (via WhatsApp, USB, or Google Drive) and tap to install!
                  </li>
                </ol>
              </div>

              {/* Troubleshooting PWABuilder Icon 403 / HTML error */}
              <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-xl space-y-2 text-blue-200 text-[11px] leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-blue-300">
                  <span>💡 Fixing PWABuilder "Received icon with invalid Content-Type" or "403 Forbidden":</span>
                </div>
                <p>
                  Because preview cloud containers have automated bot-verification redirects, PWABuilder's external build server may receive an HTML redirect when fetching the icon URL.
                </p>
                <div className="p-2.5 bg-stone-950/80 rounded-lg border border-blue-900/50 space-y-1 text-stone-300">
                  <p className="font-bold text-white">How to fix in 10 seconds:</p>
                  <p>
                    1. Click the <strong className="text-emerald-400">"Download 512x512 Icon PNG"</strong> button above to save the icon to your device.
                  </p>
                  <p>
                    2. In PWABuilder, click <strong className="text-white">Package for Stores → Android → Options</strong> (or click <strong className="text-white">Edit Manifest</strong> on the overview screen).
                  </p>
                  <p>
                    3. Under <strong>Icons</strong>, click <strong className="text-blue-400">Upload Icon</strong> and choose the downloaded PNG file.
                  </p>
                  <p>
                    4. Click <strong className="text-emerald-400">Generate Package</strong> — PWABuilder will immediately bundle your APK without downloading from the URL!
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-1.5 text-amber-200 text-[11px] leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <span>⚠️ Getting "Missing Name" or "Did not find a Web Manifest" error?</span>
                </div>
                <p>
                  This happens when pasting the <strong>private development URL</strong> (<code className="bg-amber-900/50 px-1 py-0.5 rounded text-amber-200">ais-dev-...</code>), which blocks external bots with a Google login screen.
                </p>
                <p className="font-semibold text-white">
                  <strong>The Fix:</strong> Click the <strong className="text-blue-400">"Share"</strong> button in the top-right toolbar of Google AI Studio → Choose <em>"Anyone with the link can view"</em>. Copy that <strong>public shared link</strong> and paste it into PWABuilder instead!
                </p>
              </div>

              <div className="p-3 bg-stone-950/80 border border-stone-800 rounded-xl text-stone-400 text-[11px] leading-relaxed">
                <strong>Android Tip:</strong> If installing an APK directly, Android will prompt "Install unknown apps". Tap <em>Settings → Allow from this source</em> to complete the installation.
              </div>
            </div>
          )}

          {/* Tab 2: Direct Chrome Install (Fastest, no APK file required) */}
          {activeGuideTab === 'direct' && (
            <div className="space-y-4">
              <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-3">
                <h4 className="font-bold text-white text-sm">Instant Home Screen / POS Install (No APK Needed)</h4>
                <p className="text-stone-300 text-xs leading-relaxed">
                  Modern Android allows web apps to install identically to native APKs with their own app icon, splash screen, and offline storage.
                </p>
                <ol className="space-y-2 list-decimal list-inside text-stone-300 text-xs">
                  <li>Open Chrome on your Android smartphone, tablet, or POS register.</li>
                  <li>Navigate to your app URL.</li>
                  <li>Tap the Chrome menu (<strong className="text-white">⋮ 3 dots</strong> in the top-right corner).</li>
                  <li>Tap <strong className="text-emerald-400">"Install app"</strong> or <strong className="text-emerald-400">"Add to Home screen"</strong>.</li>
                  <li>Addition POS will appear in your Android App Drawer just like any Play Store app!</li>
                </ol>
              </div>
            </div>
          )}

          {/* Tab 3: CLI / Bubblewrap */}
          {activeGuideTab === 'cli' && (
            <div className="space-y-4">
              <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-3">
                <h4 className="font-bold text-white text-sm">Build APK Locally using Bubblewrap CLI</h4>
                <p className="text-stone-400 text-xs">
                  Export this app via AI Studio's <strong>Settings → Export to ZIP or GitHub</strong>, then run Google's official Bubblewrap TWA CLI:
                </p>
                <pre className="p-3 bg-stone-900 border border-stone-800 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto">
{`# 1. Install Bubblewrap CLI
npm install -g @bubblewrap/cli

# 2. Initialize Android Project from your app manifest
bubblewrap init --manifest="${appUrl}/manifest.json"

# 3. Build signed APK & AAB
bubblewrap build`}
                </pre>
                <p className="text-stone-400 text-[11px]">
                  Bubblewrap automatically sets up the Android SDK, generates your keystore, and outputs <span className="font-mono text-amber-300">app-release-signed.apk</span>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 flex items-center justify-between bg-stone-950 shrink-0">
          <div className="text-[11px] text-stone-500 font-mono">
            Package: com.additionshop.pos
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-bold transition text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
