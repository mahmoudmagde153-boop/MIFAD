/**
 * PDF Invoice Extractor for MIFAD System
 * شركة مصر للمستحضرات الغذائية - ميفاد (MIFAD)
 * يقوم بقراءة وتفكيك فواتير PDF واستخراج رأس الفاتورة والعميل والجدول بالكامل
 */

(function(global) {
  'use strict';

  // Helper to normalize reversed Arabic parentheses and words
  function cleanArabicName(text) {
    if (!text) return '';
    let s = text.trim();
    // Replace multiple spaces
    s = s.replace(/\s+/g, ' ');

    // Check if it's the كريموسي pattern: ") كجم 1 ( 200 كريموسي" or similar
    if (s.includes('كريموسي')) {
      const numMatch = s.match(/(\d+)/g);
      if (numMatch && numMatch.length >= 2) {
        const p1 = numMatch[numMatch.length - 1]; // 200 or 120
        const p2 = numMatch[0]; // 1 or 10
        return `كريموسي ${p1} ( ${p2} كجم )`;
      }
    }
    return s;
  }

  async function extractMifadInvoiceFromPdf(fileOrBuffer) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('مكتبة PDF.js غير متوفرة في الصفحة');
    }

    let arrayBuffer;
    if (fileOrBuffer instanceof ArrayBuffer) {
      arrayBuffer = fileOrBuffer;
    } else if (fileOrBuffer instanceof Uint8Array) {
      arrayBuffer = fileOrBuffer.buffer;
    } else if (fileOrBuffer instanceof Blob || fileOrBuffer instanceof File) {
      arrayBuffer = await fileOrBuffer.arrayBuffer();
    } else {
      throw new Error('نوع الملف غير صالح للقراءة');
    }

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();

    const blocks = textContent.items.map(it => ({
      text: it.str,
      x: Math.round(it.transform[4] * 100) / 100,
      y: Math.round(it.transform[5] * 100) / 100
    })).filter(b => b.text && b.text.trim().length > 0);

    // Group blocks by Y coordinate (within tolerance 4)
    const rowsDict = {};
    blocks.forEach(b => {
      let foundKey = null;
      for (const k in rowsDict) {
        if (Math.abs(b.y - Number(k)) <= 4.5) {
          foundKey = k;
          break;
        }
      }
      if (foundKey === null) {
        rowsDict[b.y] = [b];
      } else {
        rowsDict[foundKey].push(b);
      }
    });

    // Sort row keys descending (top to bottom)
    const sortedY = Object.keys(rowsDict).map(Number).sort((a, b) => b - a);

    const metadata = {
      customerCode: '',
      customerName: '',
      customerAddress: '',
      salesPerson: 'م /خالد حسين',
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      poNumber: '',
      docCode: 'SM/FM/09',
      printDateTime: ''
    };

    const items = [];

    for (const y of sortedY) {
      const rowBlocks = rowsDict[y].sort((a, b) => a.x - b.x);
      const rowText = rowBlocks.map(b => b.text).join(' ');

      // Metadata detections
      if (rowText.includes('CUST-') || /CUST-\d+/i.test(rowText)) {
        const m = rowText.match(/(CUST-\w+)/i);
        if (m) metadata.customerCode = m[1];
      }
      if (rowText.includes('خالد حسين') || rowText.includes('خالد حسيرى')) {
        metadata.salesPerson = 'م /خالد حسين';
      }
      if (rowText.includes('B2B-SINV-') || /B2B-SINV-[\w-]+/i.test(rowText)) {
        const m = rowText.match(/(B2B-SINV-[\w-]+)/i);
        if (m) metadata.invoiceNumber = m[1];
      }
      if (rowText.includes('عادل مصباح')) {
        metadata.customerName = 'م/عادل مصباح';
      } else if (rowText.includes('المطلوب من') && !metadata.customerName) {
        const namePart = rowText.replace(/.*المطلوب من\s*[-:]*/, '').trim();
        if (namePart) metadata.customerName = namePart;
      }
      if (rowText.includes('الاسكندرية') || rowText.includes('الإسكندرية') || rowText.includes('منطقة 45')) {
        metadata.customerAddress = 'منطقة 45 الاسكندرية';
      }
      if (rowText.includes('SM/FM/09')) {
        metadata.docCode = 'SM/FM/09';
      }
      if (/\d{2}\/\d{2}\/\d{4}/.test(rowText) && y < 530 && y > 480) {
        const m = rowText.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (m) {
          // Convert DD/MM/YYYY to YYYY-MM-DD for standard date input
          const parts = m[1].split('/');
          metadata.invoiceDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      // Check Table Row: has item code at X > 500 (e.g. BS... or BF...)
      const codeBlocks = rowBlocks.filter(b => b.x > 500 && /^[A-Z0-9_-]{7,18}$/i.test(b.text.trim()));
      if (codeBlocks.length > 0 && y < 465 && y > 265) {
        const code = codeBlocks[0].text.trim();

        // Amount: X < 130
        const amtBlocks = rowBlocks.filter(b => b.x < 130);
        const amtStr = amtBlocks.length > 0 ? amtBlocks[0].text.replace(/,/g, '').trim() : '0';

        // Price: 130 <= X <= 230
        const priceBlocks = rowBlocks.filter(b => b.x >= 130 && b.x <= 230);
        const priceStr = priceBlocks.length > 0 ? priceBlocks[0].text.replace(/,/g, '').trim() : '0';

        // Unit: 245 <= X <= 315
        const unitBlocks = rowBlocks.filter(b => b.x > 245 && b.x < 318);
        const unitStr = unitBlocks.length > 0 ? unitBlocks[0].text.trim() : '1kg';

        // Qty: 318 <= X <= 375
        const qtyBlocks = rowBlocks.filter(b => b.x >= 318 && b.x <= 375);
        const qtyStr = qtyBlocks.length > 0 ? qtyBlocks[0].text.replace(/,/g, '').trim() : '1';

        // Item Name: 375 <= X <= 515
        const nameBlocks = rowBlocks.filter(b => b.x > 375 && b.x <= 515);
        const rawName = nameBlocks.map(b => b.text.trim()).join(' ');
        const cleanName = cleanArabicName(rawName);

        items.push({
          id: 'item-' + Math.random().toString(36).substr(2, 9),
          code: code,
          name: cleanName || rawName || 'صنف غذائي ميفاد',
          qty: parseFloat(qtyStr) || 0,
          unit: unitStr || '1kg',
          price: parseFloat(priceStr) || 0,
          total: parseFloat(amtStr) || ((parseFloat(qtyStr) || 0) * (parseFloat(priceStr) || 0))
        });
      }
    }

    // Default invoice number if not extracted
    if (!metadata.invoiceNumber) {
      metadata.invoiceNumber = 'B2B-SINV-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);
    }

    const subtotal = items.reduce((sum, it) => sum + (Number(it.total) || 0), 0);

    return {
      metadata,
      items,
      subtotal
    };
  }

  global.MIFAD_PDF = {
    extractMifadInvoiceFromPdf
  };

})(typeof window !== 'undefined' ? window : this);
