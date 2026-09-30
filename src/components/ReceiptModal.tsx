import React, { useState, useEffect } from 'react';
import {
  Bluetooth,
  Printer,
  Share2,
  Download,
  Copy,
  Check,
  X,
  FileText,
  Edit3,
  Save,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MapPin,
  Phone,
  Store,
} from 'lucide-react';
import { BusinessSettings, ReceiptSnapshot } from '../types';
import { formatThermalReceiptText, printViaBluetoothThermal, shareReceiptDigitally } from '../utils/printer';
import { OfflineStorageManager } from '../utils/storage';
import { downloadReceiptPdf, getReceiptPdfBlobUrl, openReceiptPdfInNewTab } from '../utils/pdfReceipt';

interface ReceiptModalProps {
  receipt: ReceiptSnapshot | null;
  settings: BusinessSettings;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSettings?: (newSettings: BusinessSettings) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  settings,
  isOpen,
  onClose,
  onUpdateSettings,
}) => {
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>(
    settings.defaultThermalPaperSize || '80mm'
  );
  const [viewMode, setViewMode] = useState<'slip' | 'pdf'>('slip');
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Editable receipt appearance state
  const [showEditSettings, setShowEditSettings] = useState(false);
  const [editStoreName, setEditStoreName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editHeader, setEditHeader] = useState('');
  const [editFooter, setEditFooter] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // PDF blob url for embedded preview
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  // Synchronize initial values when modal opens
  useEffect(() => {
    if (receipt && isOpen) {
      setEditStoreName(settings.name || receipt.businessName || 'Addition Store');
      setEditAddress(settings.address || receipt.businessAddress || 'Monrovia, Liberia');
      setEditPhone(settings.phone || receipt.businessPhone || '');
      setEditHeader(settings.receiptHeader || receipt.headerText || '');
      setEditFooter(settings.receiptFooter || receipt.footerText || '');
      setPaperSize(settings.defaultThermalPaperSize || '80mm');
      setFeedback(null);
    }
  }, [receipt, isOpen, settings]);

  // Regenerate PDF preview URL when in PDF mode or options change
  useEffect(() => {
    if (!receipt || !isOpen) {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
      return;
    }

    try {
      const url = getReceiptPdfBlobUrl(receipt, settings, {
        paperSize,
        customName: editStoreName,
        customAddress: editAddress,
        customPhone: editPhone,
        customHeader: editHeader,
        customFooter: editFooter,
      });
      setPdfBlobUrl(url);
    } catch (err) {
      console.error('Error generating PDF preview:', err);
    }

    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [receipt, isOpen, paperSize, editStoreName, editAddress, editPhone, editHeader, editFooter]);

  if (!isOpen || !receipt) return null;

  // Resolved store details
  const activeStoreName = editStoreName || settings.name || receipt.businessName;
  const activeAddress = editAddress || settings.address || receipt.businessAddress;
  const activePhone = editPhone || settings.phone || receipt.businessPhone;
  const activeHeader = editHeader ?? settings.receiptHeader ?? receipt.headerText;
  const activeFooter = editFooter ?? settings.receiptFooter ?? receipt.footerText;

  const handleSaveReceiptSettings = () => {
    const updatedSettings: BusinessSettings = {
      ...settings,
      name: editStoreName.trim() || settings.name,
      address: editAddress.trim(),
      phone: editPhone.trim(),
      receiptHeader: editHeader.trim(),
      receiptFooter: editFooter.trim(),
      defaultThermalPaperSize: paperSize,
    };

    OfflineStorageManager.saveSettings(updatedSettings);
    if (onUpdateSettings) {
      onUpdateSettings(updatedSettings);
    }
    setSavedSuccess(true);
    setFeedback('Business address & receipt branding saved to Settings!');
    setTimeout(() => {
      setSavedSuccess(false);
      setShowEditSettings(false);
    }, 2000);
  };

  const handleDownloadPdf = () => {
    try {
      setIsDownloading(true);
      setFeedback(null);
      downloadReceiptPdf(receipt, settings, {
        paperSize,
        customName: activeStoreName,
        customAddress: activeAddress,
        customPhone: activePhone,
        customHeader: activeHeader,
        customFooter: activeFooter,
      });
      OfflineStorageManager.incrementReprintCount(receipt.receiptNumber);
      setFeedback(`PDF Receipt downloaded as Receipt-${receipt.receiptNumber}.pdf`);
    } catch (err: any) {
      console.error('PDF download failed:', err);
      setFeedback(`Failed to download PDF: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenPdfNewTab = () => {
    try {
      openReceiptPdfInNewTab(receipt, settings, {
        paperSize,
        customName: activeStoreName,
        customAddress: activeAddress,
        customPhone: activePhone,
        customHeader: activeHeader,
        customFooter: activeFooter,
      });
      OfflineStorageManager.incrementReprintCount(receipt.receiptNumber);
    } catch (err: any) {
      setFeedback(`Unable to open in new tab: ${err.message}. Downloading file instead...`);
      handleDownloadPdf();
    }
  };

  const handleBluetoothPrint = async () => {
    setIsPrinting(true);
    setFeedback(null);
    try {
      const res = await printViaBluetoothThermal(receipt, paperSize);
      OfflineStorageManager.incrementReprintCount(receipt.receiptNumber);
      setFeedback(res.message);
    } catch (err: any) {
      setFeedback(`Thermal printer error: ${err.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDigitalShare = async () => {
    setFeedback(null);
    const res = await shareReceiptDigitally(receipt, settings);
    if (res.shared) {
      setFeedback(`Receipt shared successfully via ${res.method}!`);
    }
  };

  const handleCopyText = () => {
    const raw = formatThermalReceiptText(receipt, paperSize);
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setFeedback('Receipt text copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/65 p-2 sm:p-4 backdrop-blur-xs">
      <div className="bg-white border border-stone-200 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] animate-fadeIn">
        {/* Header */}
        <div className="no-print px-4 sm:px-5 py-3.5 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-stone-900">Receipt #{receipt.receiptNumber}</h3>
                <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 font-bold rounded border border-blue-200">
                  PDF Ready
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                {new Date(receipt.date).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                • {receipt.paymentMethod.replace('_', ' ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowEditSettings(!showEditSettings)}
              className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-stone-200"
              title="Edit Receipt Header, Address, and Notes in Settings"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Edit Info</span>
              {showEditSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Collapsible Edit Receipt Info Panel */}
        {showEditSettings && (
          <div className="no-print bg-stone-50 p-4 border-b border-stone-200 text-xs space-y-3 shrink-0 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-stone-900 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-blue-600" />
                Customize Info Printed on Receipts & PDF
              </span>
              <span className="text-[11px] text-stone-500">Updates live & saves to Store Settings</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Business / Store Name</label>
                <input
                  type="text"
                  value={editStoreName}
                  onChange={(e) => setEditStoreName(e.target.value)}
                  placeholder="e.g. Addition Supermarket"
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Store Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. +231 77 000 0000"
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-stone-700 block mb-1">
                  Physical Business Address (Centered on Receipt)
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="e.g. Tubman Boulevard, Sinkor, Monrovia, Liberia"
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Custom Header Message</label>
                <input
                  type="text"
                  value={editHeader}
                  onChange={(e) => setEditHeader(e.target.value)}
                  placeholder="e.g. Dual Currency Retail Specialist"
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Custom Footer Note</label>
                <input
                  type="text"
                  value={editFooter}
                  onChange={(e) => setEditFooter(e.target.value)}
                  placeholder="e.g. Goods once sold cannot be returned"
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-stone-400">
                All changes reflect immediately in the preview below.
              </span>
              <button
                onClick={handleSaveReceiptSettings}
                className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savedSuccess ? 'Saved to Settings!' : 'Save to Settings'}</span>
              </button>
            </div>
          </div>
        )}

        {/* View Mode & Paper Size Switchers */}
        <div className="no-print px-4 py-2 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-stone-200 shadow-2xs">
            <button
              onClick={() => setViewMode('slip')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'slip'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Printer className="w-3 h-3" />
              <span>Thermal Slip</span>
            </button>
            <button
              onClick={() => setViewMode('pdf')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'pdf'
                  ? 'bg-blue-600 text-white'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>PDF Document</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-stone-500 font-bold text-[11px]">Paper Width:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPaperSize('58mm')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                  paperSize === '58mm'
                    ? 'bg-stone-800 text-white'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                58mm Mini
              </button>
              <button
                onClick={() => setPaperSize('80mm')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                  paperSize === '80mm'
                    ? 'bg-stone-800 text-white'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                80mm Standard
              </button>
            </div>
          </div>
        </div>

        {/* Receipt Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-stone-100 flex justify-center">
          {viewMode === 'pdf' && pdfBlobUrl ? (
            <div className="w-full flex flex-col items-center gap-2">
              <div className="w-full max-w-md h-[460px] bg-white rounded-xl shadow-md border border-stone-300 overflow-hidden">
                <iframe
                  src={pdfBlobUrl}
                  title="PDF Receipt Preview"
                  className="w-full h-full border-0"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={handleOpenPdfNewTab}
                  className="px-3.5 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Full Tab</span>
                </button>
              </div>
            </div>
          ) : (
            /* Perfectly Centered Thermal Paper Slip */
            <div
              id="printable-receipt-slip"
              className={`bg-white text-black p-5 sm:p-6 font-mono shadow-md border border-stone-300 text-xs leading-relaxed transition-all rounded-xl mx-auto my-auto ${
                paperSize === '58mm' ? 'w-72 max-w-full' : 'w-88 max-w-full'
              }`}
            >
              {/* Centered Business Profile Header */}
              <div className="text-center pb-3 border-b border-dashed border-stone-300">
                <h2 className="text-sm font-black tracking-wide uppercase text-black">
                  {activeStoreName}
                </h2>
                {activeAddress && (
                  <p className="text-[11px] text-stone-700 font-sans mt-0.5 flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3 text-stone-400 shrink-0 inline" />
                    <span>{activeAddress}</span>
                  </p>
                )}
                {activePhone && (
                  <p className="text-[11px] text-stone-700 font-mono mt-0.5">
                    TEL: {activePhone}
                  </p>
                )}
                {settings.email && (
                  <p className="text-[10px] text-stone-600 font-sans">
                    {settings.email}
                  </p>
                )}
                {activeHeader && (
                  <p className="text-[10px] text-stone-600 mt-1 whitespace-pre-line font-sans border-t border-dotted border-stone-200 pt-1">
                    {activeHeader}
                  </p>
                )}
              </div>

              {/* Receipt Metadata */}
              <div className="py-2.5 border-b border-dashed border-stone-300 text-[11px] space-y-0.5">
                <div className="flex justify-between font-mono">
                  <span>RECEIPT:</span>
                  <span className="font-black text-black">#{receipt.receiptNumber}</span>
                </div>
                {(receipt.storeTIN || receipt.taxSnapshot?.storeTIN || settings.storeTIN) && (
                  <div className="flex justify-between font-mono">
                    <span>Store TIN:</span>
                    <span className="font-bold text-black">
                      {receipt.storeTIN || receipt.taxSnapshot?.storeTIN || settings.storeTIN}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-sans">
                  <span>Date:</span>
                  <span className="font-mono">
                    {new Date(receipt.date).toLocaleDateString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    {new Date(receipt.date).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex justify-between font-sans">
                  <span>Cashier:</span>
                  <span className="font-semibold">{receipt.cashierName || 'Staff'}</span>
                </div>
                {receipt.customerName && receipt.customerName !== 'Walk-in Customer' && (
                  <div className="flex justify-between font-sans">
                    <span>Customer:</span>
                    <span className="font-bold text-black">{receipt.customerName}</span>
                  </div>
                )}
                {(receipt.customerTIN || receipt.taxSnapshot?.customerTIN) && (
                  <div className="flex justify-between font-mono">
                    <span>Customer TIN:</span>
                    <span className="font-bold text-black">
                      {receipt.customerTIN || receipt.taxSnapshot?.customerTIN}
                    </span>
                  </div>
                )}
                {receipt.reprintCount > 0 && (
                  <div className="text-center font-bold text-rose-600 text-[10px] pt-1">
                    *** REPRINT COPY #{receipt.reprintCount} ***
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="py-2.5 border-b border-dashed border-stone-300 space-y-2">
                <div className="flex justify-between font-bold text-[10px] text-stone-500 uppercase border-b border-stone-200 pb-0.5">
                  <span>Item / Qty</span>
                  <span>Amount (USD)</span>
                </div>
                {receipt.items.map((it, idx) => (
                  <div key={idx} className="text-[11px]">
                    <div className="font-semibold text-black leading-tight">{it.name}</div>
                    <div className="flex justify-between text-stone-600 text-[10px] pt-0.5 font-mono">
                      <span>
                        {it.quantity} {it.unitSymbol} × ${it.unitPriceUSD.toFixed(2)}
                      </span>
                      <span className="font-bold text-black">${it.totalUSD.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals & Dual Currency Breakdown */}
              <div className="py-2.5 border-b border-dashed border-stone-300 space-y-1 text-[11px]">
                <div className="flex justify-between text-stone-700">
                  <span>Subtotal:</span>
                  <span className="font-mono">${receipt.subtotalUSD.toFixed(2)}</span>
                </div>
                {receipt.discountUSD > 0 && (
                  <div className="flex justify-between text-stone-700">
                    <span>Discount:</span>
                    <span className="font-mono">-${receipt.discountUSD.toFixed(2)}</span>
                  </div>
                )}
                {receipt.taxSnapshot?.customerTaxExemptApplied ? (
                  <div className="flex justify-between text-emerald-800 font-bold border-y border-stone-200 py-1 my-0.5">
                    <span>Tax Regime:</span>
                    <span>TAX-EXEMPT SALE (100% RELIEF)</span>
                  </div>
                ) : (receipt.taxUSD > 0 || (receipt.taxSnapshot && receipt.taxSnapshot.taxEnabled)) ? (
                  <>
                    <div className="flex justify-between text-stone-800">
                      <span>
                        {receipt.taxSnapshot?.taxName || receipt.taxName || 'Tax'} (
                        {receipt.taxSnapshot?.taxRatePercent ?? receipt.taxRatePercent ?? 10}%
                        {receipt.taxSnapshot?.taxCalculationType === 'INCLUSIVE' || receipt.taxCalculationType === 'INCLUSIVE'
                          ? ' Incl'
                          : ''}
                        ):
                      </span>
                      <span className="font-mono">${receipt.taxUSD.toFixed(2)}</span>
                    </div>
                    {receipt.taxSnapshot?.taxableAmountUSD ? (
                      <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                        <span>Taxable Amount:</span>
                        <span>${receipt.taxSnapshot.taxableAmountUSD.toFixed(2)}</span>
                      </div>
                    ) : null}
                  </>
                ) : null}

                <div className="pt-1.5 flex justify-between font-extrabold text-sm text-black border-t border-stone-200">
                  <span>TOTAL (USD):</span>
                  <span className="font-mono">${receipt.totalUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-emerald-800">
                  <span>TOTAL (LRD):</span>
                  <span className="font-mono">L$ {receipt.totalLRD.toLocaleString()}</span>
                </div>
                <div className="text-[10px] text-stone-500 text-right font-sans">
                  Rate: 1 USD = {receipt.exchangeRateUsed || settings.exchangeRate} LRD
                </div>
              </div>

              {/* Tender & Change Breakdown */}
              <div className="py-2.5 border-b border-dashed border-stone-300 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span>Payment Mode:</span>
                  <span className="font-bold font-sans">
                    {receipt.paymentMethod.replace('_', ' ')}
                  </span>
                </div>
                {receipt.amountPaidUSD > 0 && (
                  <div className="flex justify-between font-mono">
                    <span>Paid (USD):</span>
                    <span>${receipt.amountPaidUSD.toFixed(2)}</span>
                  </div>
                )}
                {receipt.amountPaidLRD > 0 && (
                  <div className="flex justify-between font-mono">
                    <span>Paid (LRD):</span>
                    <span>L$ {receipt.amountPaidLRD.toLocaleString()}</span>
                  </div>
                )}
                {(receipt.changeUSD > 0 || receipt.changeLRD > 0) && (
                  <div className="flex justify-between font-bold text-black border-t border-stone-200 pt-1 font-mono">
                    <span>Change Returned:</span>
                    <span>
                      {receipt.changeUSD > 0 && `$${receipt.changeUSD.toFixed(2)}`}
                      {receipt.changeUSD > 0 && receipt.changeLRD > 0 && ' / '}
                      {receipt.changeLRD > 0 && `L$ ${receipt.changeLRD.toLocaleString()}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Centered Footer */}
              <div className="pt-3 text-center text-[10px] text-stone-600 space-y-1 font-sans">
                {activeFooter && <p className="whitespace-pre-line">{activeFooter}</p>}
                <p className="font-bold text-stone-800 pt-1">
                  *** THANK YOU FOR YOUR BUSINESS ***
                </p>
                <p className="text-[9px] text-stone-400 uppercase tracking-wider font-mono">
                  Addition POS • Dual-Currency System
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Feedback message */}
        {feedback && (
          <div className="no-print px-4 py-2 bg-emerald-50 border-t border-emerald-200 text-emerald-900 text-xs text-center font-medium flex items-center justify-center gap-1.5 animate-fadeIn shrink-0">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="no-print p-3 sm:p-4 bg-white border-t border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-[0.98]"
            title="Save and download the PDF file to your phone/computer"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? 'Saving...' : 'Save PDF'}</span>
          </button>

          <button
            onClick={handleBluetoothPrint}
            disabled={isPrinting}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-[0.98]"
            title="Print to Bluetooth ESC/POS thermal printer"
          >
            <Bluetooth className="w-4 h-4 text-blue-400" />
            <span>{isPrinting ? 'Printing...' : 'Thermal Print'}</span>
          </button>

          <button
            onClick={handleDigitalShare}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-[0.98]"
            title="Share receipt via WhatsApp or mobile share sheet"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp / Share</span>
          </button>

          <button
            onClick={handleCopyText}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition border border-stone-200"
            title="Copy plain text formatted receipt to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
