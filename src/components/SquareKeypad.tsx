import React, { useState } from 'react';
import { Delete, Check, DollarSign, Tag, ArrowRight } from 'lucide-react';
import { BusinessSettings } from '../types';

interface SquareKeypadProps {
  settings: BusinessSettings;
  onAddCustomItem: (name: string, priceUSD: number, priceLRD: number) => void;
}

export const SquareKeypad: React.FC<SquareKeypadProps> = ({
  settings,
  onAddCustomItem,
}) => {
  const [currency, setCurrency] = useState<'USD' | 'LRD'>('USD');
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [itemLabel, setItemLabel] = useState<string>('');

  const handleDigit = (digit: string) => {
    setDisplayValue((prev) => {
      if (prev === '0' && digit !== '.') return digit;
      if (digit === '.' && prev.includes('.')) return prev;
      if (prev.length >= 8) return prev;
      return prev + digit;
    });
  };

  const handleBackspace = () => {
    setDisplayValue((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    setDisplayValue('0');
    setItemLabel('');
  };

  const handleAdd = () => {
    const num = parseFloat(displayValue);
    if (isNaN(num) || num <= 0) return;

    let finalUSD = 0;
    let finalLRD = 0;

    if (currency === 'USD') {
      finalUSD = Math.round(num * 100) / 100;
      finalLRD = Math.round(finalUSD * settings.exchangeRate);
    } else {
      finalLRD = Math.round(num);
      finalUSD = Math.round((finalLRD / settings.exchangeRate) * 100) / 100;
    }

    const name = itemLabel.trim() || `Custom Sale (${currency} ${displayValue})`;
    onAddCustomItem(name, finalUSD, finalLRD);

    handleClear();
  };

  const numericVal = parseFloat(displayValue) || 0;
  const convertedPreview =
    currency === 'USD'
      ? `≈ L$ ${(numericVal * settings.exchangeRate).toLocaleString()} LRD`
      : `≈ $${(numericVal / settings.exchangeRate).toFixed(2)} USD`;

  return (
    <div className="flex flex-col h-full bg-white max-w-md mx-auto rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      {/* Currency Switcher */}
      <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-stone-200/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setCurrency('USD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              currency === 'USD'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            $ USD
          </button>
          <button
            type="button"
            onClick={() => setCurrency('LRD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              currency === 'LRD'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            L$ LRD
          </button>
        </div>

        <span className="text-[11px] font-mono text-stone-500">
          Rate: 1 USD = {settings.exchangeRate} LRD
        </span>
      </div>

      {/* Amount Display */}
      <div className="px-6 py-5 text-center bg-white border-b border-stone-100 flex flex-col justify-center">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-stone-400">
          Custom Amount
        </div>
        <div className="text-4xl font-extrabold text-stone-900 font-mono tracking-tight my-1">
          {currency === 'USD' ? '$' : 'L$ '}
          {displayValue}
        </div>
        <div className="text-xs font-mono font-medium text-stone-500">
          {convertedPreview}
        </div>
      </div>

      {/* Optional Note / Item Description */}
      <div className="px-4 py-2 bg-stone-50/60 border-b border-stone-100 flex items-center gap-2">
        <Tag className="w-3.5 h-3.5 text-stone-400" />
        <input
          type="text"
          value={itemLabel}
          onChange={(e) => setItemLabel(e.target.value)}
          placeholder="Optional note (e.g. 5 bags plastic, repair fee)..."
          className="w-full bg-transparent text-xs text-stone-800 placeholder-stone-400 focus:outline-none"
        />
      </div>

      {/* 3x4 Square Grid Numpad */}
      <div className="flex-1 grid grid-cols-3 gap-px bg-stone-200 p-px">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((btn) => (
          <button
            key={btn}
            type="button"
            onClick={() => handleDigit(btn)}
            className="bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-900 text-2xl font-semibold font-mono py-4 flex items-center justify-center transition"
          >
            {btn}
          </button>
        ))}

        <button
          type="button"
          onClick={handleBackspace}
          className="bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-700 py-4 flex items-center justify-center transition"
          title="Backspace"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>

      {/* Add To Cart CTA Button */}
      <div className="p-3 bg-stone-50 border-t border-stone-200">
        <button
          type="button"
          onClick={handleAdd}
          disabled={numericVal <= 0}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
        >
          <span>Add {currency === 'USD' ? `$${displayValue}` : `L$ ${displayValue}`} to Ticket</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
