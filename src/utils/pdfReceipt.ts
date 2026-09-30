import { jsPDF } from 'jspdf';
import { BusinessSettings, ReceiptSnapshot } from '../types';

export interface GeneratePdfOptions {
  paperSize?: '58mm' | '80mm';
  customAddress?: string;
  customName?: string;
  customPhone?: string;
  customHeader?: string;
  customFooter?: string;
}

/**
 * Builds a clean, centered, professional thermal POS receipt PDF
 * using exact transaction capture and current business settings/address.
 */
export function buildReceiptPdf(
  receipt: ReceiptSnapshot,
  settings: BusinessSettings,
  options?: GeneratePdfOptions
): jsPDF {
  const paperSize = options?.paperSize || settings.defaultThermalPaperSize || '80mm';
  const widthMm = paperSize === '58mm' ? 58 : 80;
  const marginMm = paperSize === '58mm' ? 3 : 5;
  const contentWidth = widthMm - marginMm * 2;
  const centerX = widthMm / 2;
  const rightX = widthMm - marginMm;
  const leftX = marginMm;

  // Resolve business information (prioritizing current settings over snapshot for fresh address/branding)
  const businessName = (options?.customName || settings.name || receipt.businessName || 'Addition Store').toUpperCase();
  const businessAddress = options?.customAddress || settings.address || receipt.businessAddress || 'Monrovia, Liberia';
  const businessPhone = options?.customPhone || settings.phone || receipt.businessPhone || '';
  const businessEmail = settings.email || '';
  const headerText = options?.customHeader ?? (settings.receiptHeader || receipt.headerText || '');
  const footerText = options?.customFooter ?? (settings.receiptFooter || receipt.footerText || 'Thank you for your business!');

  // Estimate total height needed dynamically
  const baseHeight = 110;
  const itemsHeight = Math.max(15, receipt.items.length * 8.5);
  const totalCalculatedHeight = Math.max(140, baseHeight + itemsHeight);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [widthMm, totalCalculatedHeight],
  });

  let currentY = 7;

  // Helper to draw dashed separator line
  const drawDashedLine = (y: number) => {
    doc.setDrawColor(180, 180, 180);
    doc.setLineDashPattern([1.2, 1.2], 0);
    doc.line(leftX, y, rightX, y);
    doc.setLineDashPattern([], 0);
  };

  // Helper to split and print centered multi-line text
  const printCentered = (text: string, fontSize = 9, isBold = false, color = [0, 0, 0]) => {
    if (!text.trim()) return;
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      doc.text(line, centerX, currentY, { align: 'center' });
      currentY += fontSize * 0.42;
    });
  };

  // --- 1. CENTERED HEADER / BUSINESS PROFILE ---
  printCentered(businessName, 12, true, [20, 20, 20]);
  currentY += 1;

  if (businessAddress) {
    printCentered(businessAddress, 8, false, [70, 70, 70]);
  }

  if (businessPhone) {
    printCentered(`TEL: ${businessPhone}`, 8, false, [70, 70, 70]);
  }

  if (businessEmail) {
    printCentered(businessEmail, 7.5, false, [90, 90, 90]);
  }

  if (headerText) {
    currentY += 1;
    printCentered(headerText, 7.5, false, [80, 80, 80]);
  }

  currentY += 2;
  drawDashedLine(currentY);
  currentY += 3.5;

  // --- 2. TRANSACTION METADATA ---
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);

  // Receipt Number
  doc.text(`RECEIPT: #${receipt.receiptNumber}`, leftX, currentY);
  currentY += 4;

  // Store TIN if available
  const activeStoreTIN = receipt.storeTIN || receipt.taxSnapshot?.storeTIN || settings.storeTIN;
  if (activeStoreTIN) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Store TIN: ${activeStoreTIN}`, leftX, currentY);
    currentY += 3.5;
  }

  // Date & Time
  const formattedDate = new Date(receipt.date).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`Date: ${formattedDate}`, leftX, currentY);
  currentY += 3.5;

  // Cashier & Customer
  doc.text(`Cashier: ${receipt.cashierName || 'Staff'}`, leftX, currentY);
  if (receipt.customerName && receipt.customerName !== 'Walk-in Customer') {
    currentY += 3.5;
    doc.text(`Customer: ${receipt.customerName}`, leftX, currentY);
  }

  // Customer TIN if available
  const activeCustomerTIN = receipt.customerTIN || receipt.taxSnapshot?.customerTIN;
  if (activeCustomerTIN) {
    currentY += 3.5;
    doc.setFont('courier', 'normal');
    doc.text(`Customer TIN: ${activeCustomerTIN}`, leftX, currentY);
  }

  if (receipt.reprintCount > 0) {
    currentY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(200, 30, 30);
    doc.text(`*** REPRINT COPY #${receipt.reprintCount} ***`, centerX, currentY, { align: 'center' });
  }

  currentY += 2;
  drawDashedLine(currentY);
  currentY += 4;

  // --- 3. ITEMS TABLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text('ITEM / QTY', leftX, currentY);
  doc.text('AMOUNT (USD)', rightX, currentY, { align: 'right' });
  currentY += 3.5;

  // Items rows
  receipt.items.forEach((item) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(20, 20, 20);

    const itemNameLines = doc.splitTextToSize(item.name, contentWidth - 18);
    doc.text(itemNameLines[0], leftX, currentY);

    // Quantity line and item total
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    const qtyText = `${item.quantity} ${item.unitSymbol || 'pcs'} @ $${item.unitPriceUSD.toFixed(2)}`;
    doc.text(qtyText, leftX, currentY + 3.2);

    // Line Total (USD)
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`$${item.totalUSD.toFixed(2)}`, rightX, currentY, { align: 'right' });

    currentY += 7;
  });

  drawDashedLine(currentY);
  currentY += 3.5;

  // --- 4. TOTALS & DUAL CURRENCY SUMMARY ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);

  // Subtotal
  doc.text('Subtotal:', leftX, currentY);
  doc.text(`$${receipt.subtotalUSD.toFixed(2)}`, rightX, currentY, { align: 'right' });
  currentY += 3.5;

  if (receipt.discountUSD > 0) {
    doc.text('Discount:', leftX, currentY);
    doc.text(`-$${receipt.discountUSD.toFixed(2)}`, rightX, currentY, { align: 'right' });
    currentY += 3.5;
  }

  if (receipt.taxSnapshot?.customerTaxExemptApplied) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 120, 70);
    doc.text('Tax Regime:', leftX, currentY);
    doc.text('EXEMPT SALE (100% RELIEF)', rightX, currentY, { align: 'right' });
    currentY += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
  } else if (receipt.taxUSD > 0 || (receipt.taxSnapshot && receipt.taxSnapshot.taxEnabled)) {
    const taxTitle = `${receipt.taxSnapshot?.taxName || receipt.taxName || 'Tax'} (${receipt.taxSnapshot?.taxRatePercent ?? receipt.taxRatePercent ?? 10}%${receipt.taxSnapshot?.taxCalculationType === 'INCLUSIVE' || receipt.taxCalculationType === 'INCLUSIVE' ? ' Incl' : ''}):`;
    doc.text(taxTitle, leftX, currentY);
    doc.text(`$${receipt.taxUSD.toFixed(2)}`, rightX, currentY, { align: 'right' });
    currentY += 3.5;
  }

  // Grand Total USD
  currentY += 1;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL (USD):', leftX, currentY);
  doc.text(`$${receipt.totalUSD.toFixed(2)}`, rightX, currentY, { align: 'right' });
  currentY += 4.5;

  // Grand Total LRD (Prominent dual currency)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(16, 120, 70);
  doc.text('TOTAL (LRD):', leftX, currentY);
  doc.text(`L$ ${receipt.totalLRD.toLocaleString()}`, rightX, currentY, { align: 'right' });
  currentY += 3.5;

  // Exchange rate badge
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(110, 110, 110);
  doc.text(`Exchange Rate: 1 USD = ${receipt.exchangeRateUsed || settings.exchangeRate} LRD`, rightX, currentY, { align: 'right' });
  currentY += 2.5;

  drawDashedLine(currentY);
  currentY += 3.5;

  // --- 5. PAYMENTS & CHANGE ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);

  const displayMethod = (receipt.paymentMethod || 'CASH_USD').replace('_', ' ');
  doc.text(`Payment Mode:`, leftX, currentY);
  doc.setFont('helvetica', 'bold');
  doc.text(displayMethod, rightX, currentY, { align: 'right' });
  currentY += 3.5;

  doc.setFont('helvetica', 'normal');
  if (receipt.amountPaidUSD > 0) {
    doc.text('Tendered (USD):', leftX, currentY);
    doc.text(`$${receipt.amountPaidUSD.toFixed(2)}`, rightX, currentY, { align: 'right' });
    currentY += 3.2;
  }

  if (receipt.amountPaidLRD > 0) {
    doc.text('Tendered (LRD):', leftX, currentY);
    doc.text(`L$ ${receipt.amountPaidLRD.toLocaleString()}`, rightX, currentY, { align: 'right' });
    currentY += 3.2;
  }

  if (receipt.changeUSD > 0 || receipt.changeLRD > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Change Returned:', leftX, currentY);
    const changeParts = [];
    if (receipt.changeUSD > 0) changeParts.push(`$${receipt.changeUSD.toFixed(2)}`);
    if (receipt.changeLRD > 0) changeParts.push(`L$ ${receipt.changeLRD.toLocaleString()}`);
    doc.text(changeParts.join(' / '), rightX, currentY, { align: 'right' });
    currentY += 3.5;
  }

  currentY += 1.5;
  drawDashedLine(currentY);
  currentY += 4;

  // --- 6. CENTERED FOOTER ---
  if (footerText) {
    printCentered(footerText, 7.5, false, [80, 80, 80]);
    currentY += 1;
  }

  printCentered('*** THANK YOU FOR SHOPPING WITH US ***', 7.5, true, [40, 40, 40]);
  currentY += 2;
  printCentered('Addition POS • Dual-Currency Retail System', 6.5, false, [120, 120, 120]);

  return doc;
}

/**
 * Directly downloads the PDF receipt file to the device.
 */
export function downloadReceiptPdf(
  receipt: ReceiptSnapshot,
  settings: BusinessSettings,
  options?: GeneratePdfOptions
): void {
  const doc = buildReceiptPdf(receipt, settings, options);
  const cleanNum = receipt.receiptNumber.replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `Receipt-${cleanNum || 'order'}.pdf`;
  doc.save(fileName);
}

/**
 * Returns a blob URL to preview the receipt PDF in an iframe or viewer.
 */
export function getReceiptPdfBlobUrl(
  receipt: ReceiptSnapshot,
  settings: BusinessSettings,
  options?: GeneratePdfOptions
): string {
  const doc = buildReceiptPdf(receipt, settings, options);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}

/**
 * Safely opens the receipt PDF in a new window/tab, or falls back to download.
 */
export function openReceiptPdfInNewTab(
  receipt: ReceiptSnapshot,
  settings: BusinessSettings,
  options?: GeneratePdfOptions
): void {
  const doc = buildReceiptPdf(receipt, settings, options);
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  const newWin = window.open(blobUrl, '_blank');
  if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
    // Popup was blocked by browser/iframe -> directly download file
    const cleanNum = receipt.receiptNumber.replace(/[^a-zA-Z0-9_-]/g, '');
    doc.save(`Receipt-${cleanNum || 'order'}.pdf`);
  }
}
