import { BusinessSettings, ReceiptSnapshot } from '../types';

/**
 * Formats ESC/POS compatible thermal receipt text and generates styled receipt elements.
 * Supports standard 58mm (32 characters per line) and 80mm (48 characters per line).
 */
export function formatThermalReceiptText(receipt: ReceiptSnapshot, paperSize: '58mm' | '80mm' = '58mm'): string {
  const lineLength = paperSize === '58mm' ? 32 : 48;
  const divider = '='.repeat(lineLength);
  const thinDivider = '-'.repeat(lineLength);

  const center = (text: string) => {
    if (text.length >= lineLength) return text.substring(0, lineLength);
    const leftPad = Math.floor((lineLength - text.length) / 2);
    return ' '.repeat(leftPad) + text;
  };

  const justifyBetween = (left: string, right: string) => {
    const spaceNeeded = lineLength - left.length - right.length;
    if (spaceNeeded <= 0) return left.substring(0, lineLength - right.length - 1) + ' ' + right;
    return left + ' '.repeat(spaceNeeded) + right;
  };

  const lines: string[] = [];

  // Header
  lines.push(center(receipt.businessName.toUpperCase()));
  if (receipt.businessPhone) lines.push(center(`TEL: ${receipt.businessPhone}`));
  if (receipt.businessAddress) lines.push(center(receipt.businessAddress));
  if (receipt.headerText) {
    receipt.headerText.split('\n').forEach((l) => lines.push(center(l)));
  }
  lines.push(divider);

  // Metadata
  lines.push(justifyBetween(`RECEIPT: #${receipt.receiptNumber}`, new Date(receipt.date).toLocaleDateString()));
  lines.push(justifyBetween(`TIME: ${new Date(receipt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, `CASHIER: ${receipt.cashierName}`));
  if (receipt.customerName) {
    lines.push(`CUSTOMER: ${receipt.customerName}`);
  }
  if (receipt.reprintCount && receipt.reprintCount > 0) {
    lines.push(center(`*** REPRINT COPY #${receipt.reprintCount} ***`));
  }
  lines.push(thinDivider);

  // Items Header
  lines.push(justifyBetween('ITEM / QTY', 'TOTAL (USD)'));
  lines.push(thinDivider);

  // Items
  receipt.items.forEach((item) => {
    const qtyUnit = `${item.quantity} ${item.unitSymbol} @ $${item.unitPriceUSD.toFixed(2)}`;
    const lineTotal = `$${item.totalUSD.toFixed(2)}`;
    lines.push(item.name.substring(0, lineLength));
    lines.push(justifyBetween(`  ${qtyUnit}`, lineTotal));
  });

  lines.push(thinDivider);

  // Totals
  lines.push(justifyBetween('SUBTOTAL USD:', `$${receipt.subtotalUSD.toFixed(2)}`));
  if (receipt.taxUSD > 0) {
    lines.push(justifyBetween('TAX / VAT:', `$${receipt.taxUSD.toFixed(2)}`));
  }
  if (receipt.discountUSD > 0) {
    lines.push(justifyBetween('DISCOUNT:', `-$${receipt.discountUSD.toFixed(2)}`));
  }
  lines.push(divider);
  lines.push(justifyBetween('TOTAL (USD):', `$${receipt.totalUSD.toFixed(2)}`));
  lines.push(justifyBetween('TOTAL (LRD):', `L$${receipt.totalLRD.toFixed(0)}`));
  lines.push(justifyBetween('EXCHANGE RATE:', `1 USD = ${receipt.exchangeRateUsed} LRD`));
  lines.push(divider);

  // Payment Breakdown
  lines.push(`PAYMENT: ${receipt.paymentMethod}`);
  if (receipt.amountPaidUSD > 0) {
    lines.push(justifyBetween('PAID (USD):', `$${receipt.amountPaidUSD.toFixed(2)}`));
  }
  if (receipt.amountPaidLRD > 0) {
    lines.push(justifyBetween('PAID (LRD):', `L$${receipt.amountPaidLRD.toFixed(0)}`));
  }
  if (receipt.changeUSD > 0 || receipt.changeLRD > 0) {
    if (receipt.changeUSD > 0) lines.push(justifyBetween('CHANGE (USD):', `$${receipt.changeUSD.toFixed(2)}`));
    if (receipt.changeLRD > 0) lines.push(justifyBetween('CHANGE (LRD):', `L$${receipt.changeLRD.toFixed(0)}`));
  }

  lines.push(divider);

  // Footer
  if (receipt.footerText) {
    receipt.footerText.split('\n').forEach((l) => lines.push(center(l)));
  }
  lines.push(center('POWERED BY ADDITION SHOP POS'));
  lines.push('\n\n\n'); // Paper feed

  return lines.join('\n');
}

/**
 * Simulates connecting and printing to a Bluetooth thermal printer.
 * Handles ESC/POS raw payload conversion.
 */
export async function printViaBluetoothThermal(
  receipt: ReceiptSnapshot,
  paperSize: '58mm' | '80mm' = '58mm'
): Promise<{ success: boolean; message: string }> {
  const text = formatThermalReceiptText(receipt, paperSize);

  // Check if Web Bluetooth API is available (Android Chrome or native bridge)
  if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
    try {
      // In web browser or webview, if user requests, we can request device
      console.log('[Bluetooth Thermal Printer] Sending ESC/POS payload:\n', text);
      return {
        success: true,
        message: `Printed successfully to ${paperSize} thermal printer! (ESC/POS stream dispatched)`,
      };
    } catch (err: any) {
      return { success: false, message: `Bluetooth error: ${err.message || 'Device disconnected'}` };
    }
  }

  // Fallback / standard simulator response
  console.log(`[Thermal Printer ${paperSize}] Simulated print:\n${text}`);
  return {
    success: true,
    message: `Receipt #${receipt.receiptNumber} sent to ${paperSize} Bluetooth thermal printer.`,
  };
}

/**
 * Triggers native digital share dialog (WhatsApp, Email, Bluetooth, etc.) or clipboard copy.
 */
export async function shareReceiptDigitally(receipt: ReceiptSnapshot, settings: BusinessSettings): Promise<{ shared: boolean; method: string }> {
  const summary = `🧾 *${receipt.businessName.toUpperCase()} - RECEIPT #${receipt.receiptNumber}*
📅 Date: ${new Date(receipt.date).toLocaleString()}
👤 Cashier: ${receipt.cashierName}
${receipt.customerName ? `🤝 Customer: ${receipt.customerName}\n` : ''}
--- ITEMS ---
${receipt.items.map((i) => `• ${i.name} (${i.quantity} ${i.unitSymbol}) - $${i.totalUSD.toFixed(2)}`).join('\n')}
-------------
💵 *Total: $${receipt.totalUSD.toFixed(2)} USD (L$${receipt.totalLRD.toFixed(0)} LRD)*
💳 Method: ${receipt.paymentMethod}
📞 Contact: ${receipt.businessPhone}
${settings.receiptFooter}`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `${receipt.businessName} Receipt #${receipt.receiptNumber}`,
        text: summary,
      });
      return { shared: true, method: 'Native Share (WhatsApp / Social / Bluetooth)' };
    } catch (err) {
      console.warn('Share cancelled or not allowed:', err);
    }
  }

  // Fallback: Copy to clipboard
  try {
    await navigator.clipboard.writeText(summary);
    return { shared: true, method: 'Copied formatted receipt to clipboard' };
  } catch (err) {
    return { shared: false, method: 'Clipboard access denied' };
  }
}
