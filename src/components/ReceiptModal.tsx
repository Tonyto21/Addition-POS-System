import React, { useState } from 'react';
import { Bluetooth, Printer, Share2, Download, Copy, Check, X, FileText } from 'lucide-react';
import { BusinessSettings, ReceiptSnapshot } from '../types';
import { formatThermalReceiptText, printViaBluetoothThermal, shareReceiptDigitally } from '../utils/printer';
import { OfflineStorageManager } from '../utils/storage';

interface ReceiptModalProps {
  receipt: ReceiptSnapshot | null;
  settings: BusinessSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  settings,
  isOpen,
  onClose,
}) => {
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen || !receipt) return null;

  const handleBluetoothPrint = async () => {
    setIsPrinting(true);
    setFeedback(null);
    try {
      const res = await printViaBluetoothThermal(receipt, paperSize);
      OfflineStorageManager.incrementReprintCount(receipt.receiptNumber);
      setFeedback(res.message);
    } catch (err: any) {
      setFeedback(`Printing error: ${err.message}`);
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
    setTimeout(() => setCopied(false), 2500);
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white border border-stone-200 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-stone-900">Receipt #{receipt.receiptNumber}</h3>
              <p className="text-xs text-stone-500">
                {new Date(receipt.date).toLocaleString()} • {receipt.paymentMethod}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Size selector */}
        <div className="px-5 py-2 bg-stone-50 border-b border-stone-200 flex items-center justify-between text-xs">
          <span className="text-stone-600 font-bold">Paper Format:</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPaperSize('58mm')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                paperSize === '58mm'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
              }`}
            >
              58mm Mini
            </button>
            <button
              onClick={() => setPaperSize('80mm')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                paperSize === '80mm'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
              }`}
            >
              80mm Standard
            </button>
          </div>
        </div>

        {/* Receipt Preview Canvas (styled like real POS paper receipt) */}
        <div className="flex-1 overflow-y-auto p-4 bg-stone-100 flex justify-center">
          <div
            className={`bg-white text-black p-5 font-mono shadow-sm border border-stone-200 text-xs leading-relaxed transition-all rounded-lg ${
              paperSize === '58mm' ? 'w-72' : 'w-96'
            }`}
          >
            {/* Header */}
            <div className="text-center pb-2.5 border-b border-dashed border-stone-300">
              <h2 className="text-sm font-black tracking-wide uppercase">{receipt.businessName}</h2>
              <p className="text-[11px] text-stone-700">{receipt.businessAddress}</p>
              <p className="text-[11px] text-stone-700">TEL: {receipt.businessPhone}</p>
              {receipt.headerText && (
                <p className="text-[10px] text-stone-600 mt-1 whitespace-pre-line">{receipt.headerText}</p>
              )}
            </div>

            {/* Receipt Meta */}
            <div className="py-2.5 border-b border-dashed border-stone-300 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>Receipt:</span>
                <span className="font-bold">#{receipt.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(receipt.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{receipt.cashierName}</span>
              </div>
              {receipt.customerName && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-semibold">{receipt.customerName}</span>
                </div>
              )}
              {receipt.reprintCount > 0 && (
                <div className="text-center font-bold text-rose-600 text-[10px] pt-1">
                  *** REPRINT COPY #{receipt.reprintCount} ***
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b border-dashed border-stone-300 space-y-1.5">
              <div className="flex justify-between font-bold text-[10px] text-stone-500 uppercase border-b border-stone-200 pb-0.5">
                <span>Item / Qty</span>
                <span>Amount (USD)</span>
              </div>
              {receipt.items.map((it, idx) => (
                <div key={idx} className="text-[11px]">
                  <div className="font-medium text-stone-900 truncate">{it.name}</div>
                  <div className="flex justify-between text-stone-600 text-[10px]">
                    <span>
                      {it.quantity} {it.unitSymbol} × ${it.unitPriceUSD.toFixed(2)}
                    </span>
                    <span className="font-bold text-stone-900">${it.totalUSD.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals & Currencies */}
            <div className="py-2.5 border-b border-dashed border-stone-300 space-y-1 text-[11px]">
              <div className="flex justify-between text-stone-700">
                <span>Subtotal:</span>
                <span>${receipt.subtotalUSD.toFixed(2)}</span>
              </div>
              {receipt.taxUSD > 0 && (
                <div className="flex justify-between text-stone-700">
                  <span>Tax / VAT:</span>
                  <span>${receipt.taxUSD.toFixed(2)}</span>
                </div>
              )}
              {receipt.discountUSD > 0 && (
                <div className="flex justify-between text-stone-700">
                  <span>Discount:</span>
                  <span>-${receipt.discountUSD.toFixed(2)}</span>
                </div>
              )}

              <div className="pt-1 flex justify-between font-extrabold text-sm text-black border-t border-stone-200">
                <span>TOTAL (USD):</span>
                <span>${receipt.totalUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-emerald-800">
                <span>TOTAL (LRD):</span>
                <span>L$ {receipt.totalLRD.toLocaleString()}</span>
              </div>
              <div className="text-[10px] text-stone-500 text-right">
                Rate: 1 USD = {receipt.exchangeRateUsed} LRD
              </div>
            </div>

            {/* Payments & Change */}
            <div className="py-2.5 border-b border-dashed border-stone-300 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="font-bold">{receipt.paymentMethod}</span>
              </div>
              {receipt.amountPaidUSD > 0 && (
                <div className="flex justify-between">
                  <span>Paid (USD):</span>
                  <span>${receipt.amountPaidUSD.toFixed(2)}</span>
                </div>
              )}
              {receipt.amountPaidLRD > 0 && (
                <div className="flex justify-between">
                  <span>Paid (LRD):</span>
                  <span>L$ {receipt.amountPaidLRD.toLocaleString()}</span>
                </div>
              )}
              {(receipt.changeUSD > 0 || receipt.changeLRD > 0) && (
                <div className="flex justify-between font-bold text-stone-900 border-t border-stone-200 pt-0.5">
                  <span>Change:</span>
                  <span>
                    {receipt.changeUSD > 0 && `$${receipt.changeUSD.toFixed(2)}`}
                    {receipt.changeUSD > 0 && receipt.changeLRD > 0 && ' / '}
                    {receipt.changeLRD > 0 && `L$ ${receipt.changeLRD.toLocaleString()}`}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2.5 text-center text-[10px] text-stone-500 space-y-1">
              <p className="whitespace-pre-line">{receipt.footerText}</p>
              <p className="font-bold text-[9px] text-stone-400 tracking-wider">
                POWERED BY SQUARE-STYLE LIBERIAN POS
              </p>
            </div>
          </div>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div className="px-4 py-2 bg-blue-50 border-t border-blue-200 text-blue-900 text-xs text-center font-medium">
            {feedback}
          </div>
        )}

        {/* Action Controls */}
        <div className="p-4 bg-white border-t border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={handleBluetoothPrint}
            disabled={isPrinting}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>{isPrinting ? 'Printing...' : 'Thermal Print'}</span>
          </button>

          <button
            onClick={handleBrowserPrint}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition border border-stone-200"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print PDF</span>
          </button>

          <button
            onClick={handleDigitalShare}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            title="Share to WhatsApp, Email, Bluetooth or Social apps"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp / Share</span>
          </button>

          <button
            onClick={handleCopyText}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition border border-stone-200"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
