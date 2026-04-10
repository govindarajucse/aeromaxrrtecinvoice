import PDFDocument from 'pdfkit'
import ExcelJS from 'exceljs'
import { Writable } from 'stream'
import { readdirSync } from 'fs'
import { join, dirname, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function numberToWords(num) {
  const a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
  if (num < 20) return a[num]
  if (num < 100) return b[Math.floor(num / 10)] + (num % 10 ? ' ' + a[num % 10] : '')
  if (num < 1000) return a[Math.floor(num / 100)] + ' hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '')
  return ''
}

function numberToIndianWords(num) {
  const lakhs = Math.floor(num / 100000)
  const thousands = Math.floor((num % 100000) / 1000)
  const hundreds = num % 1000
  let result = []
  if (lakhs) result.push(numberToWords(lakhs) + ' lakh')
  if (thousands) result.push(numberToWords(thousands) + ' thousand')
  if (hundreds) result.push(numberToWords(hundreds))
  return result.filter(Boolean).join(' ')
}

function formatAmountInWords(amount) {
  const rupees = Math.floor(amount)
  const paise = Math.round((amount - rupees) * 100)
  let words = numberToIndianWords(rupees) || 'zero'
  words = words.trim() + ' rupees'
  if (paise) {
    words = words + ` and ${numberToWords(paise)} paise`
  }
  return words.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Only'
}

export function generatePDF(invoice) {
  return new Promise((resolve, reject) => {
    try {
      const chunks = []
      class BufferStream extends Writable {
        _write(chunk, encoding, callback) {
          chunks.push(chunk)
          callback()
        }
      }

      const stream = new BufferStream()
      const doc = new PDFDocument({ size: 'A4', margin: 30 })
      doc.pipe(stream)

      const margin = 30;
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const contentWidth = pageWidth - margin * 2;

      // Outer border
      doc.rect(margin, margin, contentWidth, pageHeight - margin * 2).stroke();

      let y = margin;

      // --- HEADER (dynamic centered, no overlap) ---
      const logoDir = join(__dirname, 'public', 'logos');
      let logoFiles = [];
      try {
        if (readdirSync) logoFiles = readdirSync(logoDir).filter(f => f.startsWith('company-logo'));
      } catch (err) { }

      const logoW = 60, logoH = 60;
      const headerTop = y;

      // Compute required textual height to avoid overlap
      let docTemp = doc;

      // Restrict text width to avoid logo horizontally perfectly
      const textMargin = margin + 80;
      const innerTextWidth = contentWidth - 160;

      docTemp.fontSize(11).font('Helvetica-Bold');
      const h1 = docTemp.heightOfString('TAX INVOICE', { width: innerTextWidth, align: 'center' });
      docTemp.fontSize(14).font('Helvetica-Bold');
      const h2 = docTemp.heightOfString(invoice.companyName || '', { width: innerTextWidth, align: 'center' });
      docTemp.fontSize(9).font('Helvetica');
      const h3 = docTemp.heightOfString(invoice.companyAddress || '', { width: innerTextWidth, align: 'center' });
      const h4 = docTemp.heightOfString('GSTN : ' + (invoice.companyGSTN || ''), { width: innerTextWidth, align: 'center' });
      const h5 = docTemp.heightOfString('Email: ' + (invoice.companyEmail || ''), { width: innerTextWidth, align: 'center' });

      const totalHeaderH = h1 + h2 + h3 + h4 + h5 + 35; // 35 padding total (10 top, 16 internal, 9 bottom)
      const headerTableH = Math.max(logoH + 20, totalHeaderH);

      // Logo (left cell)
      if (logoFiles.length > 0) {
        doc.image(join(logoDir, logoFiles[0]), margin + 10, headerTop + (headerTableH - logoH) / 2, { width: logoW, height: logoH });
      }

      // Draw centered texts
      let centerY = headerTop + 10;
      doc.fontSize(11).font('Helvetica-Bold').text('TAX INVOICE', textMargin, centerY, { width: innerTextWidth, align: 'center' });
      centerY += h1 + 4;
      doc.fontSize(14).font('Helvetica-Bold').text(invoice.companyName || '', textMargin, centerY, { width: innerTextWidth, align: 'center' });
      centerY += h2 + 4;
      doc.fontSize(9).font('Helvetica').text(invoice.companyAddress || '', textMargin, centerY, { width: innerTextWidth, align: 'center' });
      centerY += h3 + 4;

      doc.font('Helvetica').text('GSTN : ' + (invoice.companyGSTN || ''), textMargin, centerY, { width: innerTextWidth, align: 'center' });
      centerY += h4 + 4;
      doc.font('Helvetica').text('Email: ' + (invoice.companyEmail || ''), textMargin, centerY, { width: innerTextWidth, align: 'center' });

      y += headerTableH;
      // Draw header bottom border
      doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();

      // --- CUSTOMER & META (two-column layout like target image) ---
      const leftW = contentWidth * 0.55;
      const rightW = contentWidth - leftW;
      const metaLabelW = rightW * 0.40;

      const metaFields = [
        ['Invoice No :', invoice.number || ''],
        ['Invoice Date :', invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-IN') : ''],
        ['Your DC No :', invoice.dcNumber || ''],
        ['PO No :', invoice.poNumber || ''],
        ['Goods/Service :', invoice.goodsService || '']
      ];

      const metaRowH = 15;
      const metaTotalH = metaFields.length * metaRowH;

      // Customer Text height
      doc.fontSize(9).font('Helvetica-Bold');
      const cH1 = doc.heightOfString(`Customer Name: ${invoice.clientName || ''}`, { width: leftW - 16, align: 'left' });
      doc.font('Helvetica');
      const singleLineAddress = (invoice.clientAddress || '').replace(/\r?\n/g, ', ').replace(/\s{2,}/g, ' ').replace(/,\s*,/g, ', ');
      const cH2 = doc.heightOfString(`Address: ${singleLineAddress}`, { width: leftW - 16, align: 'left' });
      const stateStr = `State : ${invoice.stateName || 'Karnataka'} Dist: Bangalore`;
      const cH3 = doc.heightOfString(stateStr, { width: leftW - 16, align: 'left' });
      const cH4 = doc.heightOfString(`GSTN : ${invoice.clientGSTN || ''}`, { width: leftW - 16, align: 'left' });

      let stateCodeStr = 'State Code :    ';
      if (invoice.stateCode && invoice.stateName) {
        stateCodeStr += `${invoice.stateCode} - ${invoice.stateName.toUpperCase()}`;
      } else if (invoice.stateCode) {
        stateCodeStr += `${invoice.stateCode}`;
      } else if (invoice.stateName) {
        stateCodeStr += `29 - ${invoice.stateName.toUpperCase()}`;
      } else {
        stateCodeStr += '29 - KARNATAKA';
      }
      const cH5 = doc.heightOfString(stateCodeStr, { width: leftW - 16, align: 'left' });

      const customerTotalH = cH1 + cH2 + cH3 + cH4 + cH5 + 18; // Padded less
      const sectionH = Math.max(metaTotalH, customerTotalH);

      // Draw outer box side borders for customer/meta section
      doc.moveTo(margin, y).lineTo(margin, y + sectionH + 10).stroke();
      doc.moveTo(margin + contentWidth, y).lineTo(margin + contentWidth, y + sectionH + 10).stroke();

      // Draw middle vertical separator
      doc.moveTo(margin + leftW, y).lineTo(margin + leftW, y + sectionH + 10).stroke();
      // Draw inner meta vertical separator (continuous)
      doc.moveTo(margin + leftW + metaLabelW, y).lineTo(margin + leftW + metaLabelW, y + sectionH + 10).stroke();

      // Customer block (left)
      let custY = y + 8;
      doc.fontSize(9).font('Helvetica').text(`Customer Name: ${invoice.clientName || ''}`, margin + 8, custY, { width: leftW - 16, align: 'left' });
      custY += cH1 + 4;
      doc.font('Helvetica').text(`Address: ${singleLineAddress}`, margin + 8, custY, { width: leftW - 16, align: 'left' });
      custY += cH2 + 4;
      doc.font('Helvetica').text(stateStr, margin + 8, custY, { width: leftW - 16, align: 'left' });
      custY += cH3 + 4;
      doc.font('Helvetica').text(`GSTN : ${invoice.clientGSTN || ''}`, margin + 8, custY, { width: leftW - 16, align: 'left' });
      custY += cH4 + 4; // Gap before state code reduced
      doc.font('Helvetica').text(stateCodeStr, margin + 8, custY, { width: leftW - 16, align: 'left' });

      // Invoice meta block (right)
      let metaY = y;
      const metaValueW = rightW - metaLabelW;

      for (let i = 0; i < metaFields.length; i++) {
        if (metaFields[i][0] !== '') {
          doc.fontSize(9).font('Helvetica').fillColor('#000').text(
            metaFields[i][0],
            margin + leftW + 6,
            metaY + 4,
            { width: metaLabelW - 8, align: 'left' }
          );
          doc.font('Helvetica-Bold').fillColor('#000').text(
            metaFields[i][1],
            margin + leftW + metaLabelW + 6,
            metaY + 4,
            { width: metaValueW - 12, align: 'left' }
          );
        }
        metaY += metaRowH;
      }

      y += sectionH + 10;
      // Draw border beneath meta section
      doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();
      const itemColWidths = [35, 275, 60, 45, 50, contentWidth - (35 + 275 + 60 + 45 + 50)];
      let x = margin;

      // --- ITEMS TABLE (dynamic row heights) ---
      const tableTopY = y;
      const baseRowH = 18;
      const minRows = 10;

      // Headers
      const headers = ['Sl No', 'Item Description', 'HSN Code', 'Qty', 'Rate', 'Amount'];
      doc.fontSize(9).font('Helvetica-Bold');
      const headerH = baseRowH;
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], x + 3, y + 5, { width: itemColWidths[i] - 6, align: i >= 3 ? 'right' : (i === 2 ? 'center' : 'left') });
        x += itemColWidths[i];
      }
      y += headerH;
      doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();

      // Items
      doc.fontSize(9).font('Helvetica');
      let subTotal = 0;
      let totalQty = 0;
      let itemCount = invoice.lineItems && invoice.lineItems.length ? invoice.lineItems.length : 0;
      let currentY = y;

      let rowsToDraw = Math.max(minRows, itemCount);
      for (let r = 0; r < rowsToDraw; r++) {
        x = margin;
        let rowH = baseRowH;

        if (r < itemCount) {
          const item = invoice.lineItems[r];
          const descHeight = doc.heightOfString(item.description || '', { width: itemColWidths[1] - 6 });
          rowH = Math.max(baseRowH, descHeight + 10);

          doc.text((r + 1).toString(), x + 3, currentY + 5, { width: itemColWidths[0] - 6, align: 'left' }); x += itemColWidths[0];
          doc.text(item.description || '', x + 3, currentY + 5, { width: itemColWidths[1] - 6, align: 'left' }); x += itemColWidths[1];
          doc.text(item.hsnCode || '', x + 3, currentY + 5, { width: itemColWidths[2] - 6, align: 'center' }); x += itemColWidths[2];
          doc.text(item.qty ? item.qty.toString() : '', x + 3, currentY + 5, { width: itemColWidths[3] - 6, align: 'right' }); x += itemColWidths[3];
          doc.text(item.rate ? item.rate.toFixed(2) : '', x + 3, currentY + 5, { width: itemColWidths[4] - 6, align: 'right' }); x += itemColWidths[4];
          doc.text(item.amount ? item.amount.toFixed(2) : '', x + 3, currentY + 5, { width: itemColWidths[5] - 6, align: 'right' });

          subTotal += item.amount || 0;
          totalQty += item.qty || 0;
        }
        currentY += rowH;
      }

      const spaceNeededForFooter = 270; // Total Qty(18) + Totals(126) + Remarks(42) + Signatures(84)
      let itemsBottomY = currentY;
      const fillY = (pageHeight - margin) - spaceNeededForFooter;
      if (fillY > itemsBottomY) {
        itemsBottomY = fillY;
      }

      y = itemsBottomY;

      // Draw horizontal line above Total Qty
      doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();

      // Draw vertical lines covering the entire item rows explicitly
      x = margin;
      for (let i = 0; i < itemColWidths.length - 1; i++) {
        doc.moveTo(x + itemColWidths[i], tableTopY).lineTo(x + itemColWidths[i], itemsBottomY + baseRowH).stroke();
        x += itemColWidths[i];
      }

      // Total Qty Row
      x = margin;
      doc.font('Helvetica-Bold').fontSize(8);
      const totalQtyLabelW = itemColWidths[0] + itemColWidths[1] + itemColWidths[2];
      doc.text('Total Qty', x, y + 5, { width: totalQtyLabelW - 6, align: 'center' });
      doc.text(totalQty.toString(), x + totalQtyLabelW + 3, y + 5, { width: itemColWidths[3] - 6, align: 'center' });

      y += baseRowH;

      // Outer border for items
      doc.rect(margin, tableTopY, contentWidth, y - tableTopY).stroke();

      // --- Bank Details (left) & Totals (right) block ---
      const cgstRate = invoice.cgstRate ?? 9;
      const sgstRate = invoice.sgstRate ?? 9;
      const igstRate = invoice.igstRate ?? 0;
      const cgstAmount = (subTotal * cgstRate) / 100;
      const sgstAmount = (subTotal * sgstRate) / 100;
      const igstAmount = (subTotal * igstRate) / 100;
      const roundOff = typeof invoice.roundOff === 'number' ? invoice.roundOff : 0;
      const grandTotal = subTotal + cgstAmount + sgstAmount + roundOff + igstAmount;

      const totals = [
        ['Sub Total', subTotal],
        ['Net Total', subTotal],
        [`CGST @${cgstRate}%`, cgstAmount],
        [`SGST @${sgstRate}%`, sgstAmount],
        ['IGST', igstAmount],
        ['Round Off', roundOff],
        ['Grand Total', grandTotal]
      ];

      const totalRowH = 18;
      const blockH = totals.length * totalRowH;
      const leftBlockW = contentWidth - 200;
      const rightBlockW = 200;

      // Draw outer boxes
      doc.rect(margin, y, leftBlockW, blockH).stroke();
      doc.rect(margin + leftBlockW, y, rightBlockW, blockH).stroke();

      // Bank Details (left)
      let bankY = y + 8;
      doc.font('Helvetica-Bold').fontSize(10).text('Bank Details:', margin + 8, bankY);
      bankY += 14;
      doc.font('Helvetica').text('Bank Name : ' + (invoice.bankName || ''), margin + 8, bankY);
      bankY += 14;
      doc.font('Helvetica').text('Branch : ' + (invoice.bankBranch || ''), margin + 8, bankY);
      bankY += 14;
      doc.font('Helvetica').text('A/C No : ' + (invoice.accountNo || ''), margin + 8, bankY);
      bankY += 14;
      doc.font('Helvetica').text('IFSC Code : ' + (invoice.ifscCode || ''), margin + 8, bankY);

      // Totals (right)
      let totalsY = y;
      for (let i = 0; i < totals.length; i++) {
        const isGrandTotal = i === totals.length - 1;
        // Highlight Grand Total row
        if (isGrandTotal) {
          doc.save();
          doc.rect(margin + leftBlockW, totalsY, rightBlockW, totalRowH).fillAndStroke('#e0e0e0', 'black');
          doc.restore();
          doc.font('Helvetica-Bold').fillColor('#000');
        } else {
          doc.font('Helvetica').fillColor('#000');
        }
        // Label
        doc.fontSize(9).text(
          totals[i][0],
          margin + leftBlockW + 6,
          totalsY + 5,
          { width: rightBlockW * 0.45 - 12, align: 'left' }
        );
        // Value
        let valStr = isNaN(Number(totals[i][1])) ? totals[i][1] : Number(totals[i][1]).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        doc.font(isGrandTotal ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).text(
          valStr,
          margin + leftBlockW + rightBlockW * 0.45 + 6,
          totalsY + 4,
          { width: rightBlockW * 0.55 - 12, align: 'right' }
        );
        // Draw row border (skip last one to not overlap outer border unnecessarily)
        if (!isGrandTotal) {
          doc.moveTo(margin + leftBlockW, totalsY + totalRowH).lineTo(margin + leftBlockW + rightBlockW, totalsY + totalRowH).stroke();
        }
        totalsY += totalRowH;
      }

      // Draw dividing line for right block (labels vs values) - Draw AFTER loop to ensure it's on top of fills
      doc.moveTo(margin + leftBlockW + rightBlockW * 0.45, y).lineTo(margin + leftBlockW + rightBlockW * 0.45, y + blockH).stroke();

      y += blockH;

      // --- Rupees & Remarks block (full width) ---
      const rowH_rx = 20;
      const rxBlockH = rowH_rx * 2;
      doc.rect(margin, y, contentWidth, rxBlockH).stroke();
      doc.moveTo(margin, y + rowH_rx).lineTo(margin + contentWidth, y + rowH_rx).stroke();
      doc.moveTo(margin + 60, y).lineTo(margin + 60, y + rxBlockH).stroke();

      // Rupees
      doc.fontSize(10).font('Helvetica-Bold').text('Rupees', margin + 8, y + 6);
      doc.font('Helvetica').text(formatAmountInWords(grandTotal), margin + 68, y + 6);
      // Remarks
      doc.font('Helvetica-Bold').text('Remarks', margin + 8, y + rowH_rx + 6);
      doc.font('Helvetica').text(invoice.notes || '', margin + 68, y + rowH_rx + 6);
      y += rxBlockH;

      // --- Signatures block (two columns) ---
      let sigHeight = 84;

      const halfW = contentWidth / 2;
      // Top divider line for signature section
      doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();
      // Middle vertical separator
      doc.moveTo(margin + halfW, y).lineTo(margin + halfW, y + sigHeight).stroke();
      // Jurisdiction
      doc.font('Helvetica-Bold').text('Subject to Bangalore Jurisdiction', margin + 8, y + 8, { width: halfW - 16, align: 'center' });
      // Receiver signature
      doc.font('Helvetica-Bold').text("Receiver's Signature & Seal", margin + 8, y + sigHeight - 18, { width: halfW - 16, align: 'center' });
      // Company signature
      doc.font('Helvetica-Bold').text('For ' + (invoice.companyName || '____________________'), margin + halfW + 8, y + 8, { width: halfW - 16, align: 'center' });
      doc.font('Helvetica-Bold').text('Authorised Signatory', margin + halfW + 8, y + sigHeight - 18, { width: halfW - 16, align: 'center' });

      stream.on('finish', () => resolve(Buffer.concat(chunks)))
      stream.on('error', (err) => reject(err))
      doc.on('error', (err) => reject(err))
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

export async function generateExcel(invoice) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Invoice')

  worksheet.columns = [
    { width: 3 }, // A
    { width: 5 }, // B S.No
    { width: 40 }, // C Description
    { width: 10 }, // D HSN
    { width: 8 }, // E Qty
    { width: 12 }, // F Rate
    { width: 15 }, // G Amount
    { width: 20 }, // H Label
    { width: 15 }  // I Value
  ]

  const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }

  let row = 1

  // Logo and company header
  try {
    const logoPath = join(__dirname, 'public', 'logos');
    const logoFiles = readdirSync(logoPath).filter(f => f.startsWith('company-logo'));
    if (logoFiles.length > 0) {
      const fullLogoPath = join(logoPath, logoFiles[0]);
      const image = workbook.addImage({ filename: fullLogoPath, extension: extname(fullLogoPath).slice(1) || 'png' });
      worksheet.addImage(image, 'B1:B4');
    }
  } catch (err) { }

  worksheet.getCell('D2').value = invoice.companyName;
  worksheet.getCell('D2').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.mergeCells('D2:I2');

  worksheet.getCell('D3').value = invoice.companyAddress;
  worksheet.getCell('D3').font = { size: 10 };
  worksheet.getCell('D3').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.mergeCells('D3:I3');

  worksheet.getCell('D4').value = 'GSTN: ' + invoice.companyGSTN + ' | Email: ' + invoice.companyEmail;
  worksheet.getCell('D4').font = { size: 10 };
  worksheet.getCell('D4').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.mergeCells('D4:I4');

  row = 7;

  // Bill To table (left side)
  worksheet.getCell(`B${row}`).value = 'Bill To:'
  worksheet.getCell(`B${row}`).font = { bold: true, size: 12 }
  worksheet.getCell(`B${row}`).border = borderStyle
  worksheet.mergeCells(`B${row}:C${row}`)

  row++
  worksheet.getCell(`B${row}`).value = invoice.clientName || ''
  worksheet.getCell(`B${row}`).border = borderStyle
  worksheet.mergeCells(`B${row}:C${row}`)

  row++
  // Address as a single cell, multi-line if needed
  const excelAddress = (invoice.clientAddress || '').replace(/\r?\n/g, ', ');
  worksheet.getCell(`B${row}`).value = excelAddress;
  worksheet.getCell(`B${row}`).border = borderStyle;
  worksheet.mergeCells(`B${row}:C${row}`);
  row++
  worksheet.getCell(`B${row}`).value = `GSTN: ${invoice.clientGSTN || ''}`
  worksheet.getCell(`B${row}`).border = borderStyle
  worksheet.mergeCells(`B${row}:C${row}`)

  // Invoice Details table (right side)
  let detailRow = 9
  worksheet.getCell(`F${detailRow}`).value = 'Invoice Details:'
  worksheet.getCell(`F${detailRow}`).font = { bold: true, size: 12 }
  worksheet.getCell(`F${detailRow}`).border = borderStyle
  worksheet.mergeCells(`F${detailRow}:I${detailRow}`)

  detailRow++
  worksheet.getCell(`F${detailRow}`).value = 'Invoice No:'
  worksheet.getCell(`F${detailRow}`).font = { bold: true }
  worksheet.getCell(`F${detailRow}`).border = borderStyle
  worksheet.getCell(`G${detailRow}`).value = invoice.number || ''
  worksheet.getCell(`G${detailRow}`).border = borderStyle
  worksheet.mergeCells(`G${detailRow}:I${detailRow}`)

  detailRow++
  worksheet.getCell(`F${detailRow}`).value = 'Date:'
  worksheet.getCell(`F${detailRow}`).font = { bold: true }
  worksheet.getCell(`F${detailRow}`).border = borderStyle
  worksheet.getCell(`G${detailRow}`).value = new Date(invoice.createdAt).toLocaleDateString('en-IN')
  worksheet.getCell(`G${detailRow}`).border = borderStyle
  worksheet.mergeCells(`G${detailRow}:I${detailRow}`)

  detailRow++
  worksheet.getCell(`F${detailRow}`).value = 'DC No:'
  worksheet.getCell(`F${detailRow}`).font = { bold: true }
  worksheet.getCell(`F${detailRow}`).border = borderStyle
  worksheet.getCell(`G${detailRow}`).value = invoice.dcNumber || ''
  worksheet.getCell(`G${detailRow}`).border = borderStyle
  worksheet.mergeCells(`G${detailRow}:I${detailRow}`)

  detailRow++
  worksheet.getCell(`F${detailRow}`).value = 'PO No:'
  worksheet.getCell(`F${detailRow}`).font = { bold: true }
  worksheet.getCell(`F${detailRow}`).border = borderStyle
  worksheet.getCell(`G${detailRow}`).value = invoice.poNumber || ''
  worksheet.getCell(`G${detailRow}`).border = borderStyle
  worksheet.mergeCells(`G${detailRow}:I${detailRow}`)

  detailRow++
  worksheet.getCell(`F${detailRow}`).value = 'Goods/Service:'
  worksheet.getCell(`F${detailRow}`).font = { bold: true }
  worksheet.getCell(`F${detailRow}`).border = borderStyle
  worksheet.getCell(`G${detailRow}`).value = invoice.goodsService || 'Service'
  worksheet.getCell(`G${detailRow}`).border = borderStyle
  worksheet.mergeCells(`G${detailRow}:I${detailRow}`)

  detailRow++
  worksheet.getCell(`F${detailRow}`).value = 'State Code:'
  worksheet.getCell(`F${detailRow}`).font = { bold: true }
  worksheet.getCell(`F${detailRow}`).border = borderStyle
  let stateCodeStr = '';
  if (invoice.stateCode && invoice.stateName) {
    stateCodeStr = `${invoice.stateCode} - ${invoice.stateName}`;
  } else if (invoice.stateCode) {
    stateCodeStr = `${invoice.stateCode}`;
  } else if (invoice.stateName) {
    stateCodeStr = `${invoice.stateName}`;
  }
  worksheet.getCell(`G${detailRow}`).value = stateCodeStr;
  worksheet.getCell(`G${detailRow}`).border = borderStyle
  worksheet.mergeCells(`G${detailRow}:I${detailRow}`)

  row = Math.max(row, detailRow) + 2

  // Table headers
  const headerRow = worksheet.getRow(row)
  headerRow.values = ['', 'S.No', 'Description', 'HSN', 'Qty', 'Rate', 'Amount']
  headerRow.font = headerFont
  headerRow.fill = headerFill
  headerRow.height = 20
  for (let col = 2; col <= 7; col++) {
    headerRow.getCell(col).border = borderStyle
    headerRow.getCell(col).alignment = { horizontal: 'center', vertical: 'center' }
  }
  row++

  // Items
  let subTotal = 0
  if (invoice.lineItems && invoice.lineItems.length > 0) {
    invoice.lineItems.forEach((item, idx) => {
      const dataRow = worksheet.getRow(row)
      dataRow.values = ['', idx + 1, item.description || '', item.hsnCode || '9988', item.qty || 0, item.rate || 0, item.amount || 0]
      for (let col = 2; col <= 7; col++) {
        dataRow.getCell(col).border = borderStyle
        if (col >= 5) dataRow.getCell(col).alignment = { horizontal: 'right' }
      }
      subTotal += item.amount || 0
      row++
    })
  }

  row++


  // --- Totals block: each label/value in its own cell, all dynamic ---
  const igstRate = invoice.igstRate ?? 0;
  const igstAmount = (subTotal * igstRate) / 100;
  const roundOff = typeof invoice.roundOff === 'number' ? invoice.roundOff : 0;
  const grandTotal = subTotal + cgstAmount + sgstAmount + igstAmount + roundOff;

  const totals = [
    ['Sub Total', subTotal],
    [`CGST @${cgstRate}%`, cgstAmount],
    [`SGST @${sgstRate}%`, sgstAmount],
    [`IGST @${igstRate}%`, igstAmount],
    ['Round Off', roundOff],
    ['Grand Total', grandTotal]
  ];

  for (let i = 0; i < totals.length; i++) {
    const isGrandTotal = i === totals.length - 1;
    worksheet.getCell(`F${row}`).value = totals[i][0];
    worksheet.getCell(`F${row}`).border = borderStyle;
    worksheet.getCell(`F${row}`).alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getCell(`F${row}`).font = isGrandTotal ? { bold: true, size: 12 } : { bold: true };
    worksheet.getCell(`G${row}`).value = typeof totals[i][1] === 'number' ? `₹ ${totals[i][1].toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : totals[i][1];
    worksheet.getCell(`G${row}`).border = borderStyle;
    worksheet.getCell(`G${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getCell(`G${row}`).font = isGrandTotal ? { bold: true, size: 12 } : { bold: true };
    worksheet.getRow(row).height = 18;
    row++;
  }

  row++;

  // Amount in words table
  worksheet.getCell(`B${row}`).value = 'Amount in Words:'
  worksheet.getCell(`B${row}`).font = { bold: true }
  worksheet.getCell(`B${row}`).border = borderStyle
  worksheet.mergeCells(`C${row}:I${row}`)
  worksheet.getCell(`C${row}`).value = formatAmountInWords(grandTotal)
  worksheet.getCell(`C${row}`).border = borderStyle
  row++

  // Remarks table
  worksheet.getCell(`B${row}`).value = 'Remarks:'
  worksheet.getCell(`B${row}`).font = { bold: true }
  worksheet.getCell(`B${row}`).border = borderStyle
  worksheet.mergeCells(`C${row}:I${row}`)
  worksheet.getCell(`C${row}`).value = invoice.notes || ''
  worksheet.getCell(`C${row}`).border = borderStyle
  row++

  // Bank details table
  worksheet.getCell(`B${row}`).value = 'Bank Details:'
  worksheet.getCell(`B${row}`).font = { bold: true }
  worksheet.getCell(`B${row}`).border = borderStyle
  worksheet.mergeCells(`B${row}:I${row}`)
  row++

  // Dynamic bank details from invoice object
  const bankName = invoice.bankName || 'Bank Name:';
  const bankBranch = invoice.bankBranch || 'Branch:';
  const accountNo = invoice.accountNo || 'Account No:';
  const ifscCode = invoice.ifscCode || 'IFSC Code:';

  worksheet.getCell(`B${row}`).value = `Bank Name: ${bankName}`;
  worksheet.getCell(`B${row}`).border = borderStyle;
  worksheet.mergeCells(`B${row}:I${row}`);
  row++;

  worksheet.getCell(`B${row}`).value = `Branch: ${bankBranch}`;
  worksheet.getCell(`B${row}`).border = borderStyle;
  worksheet.mergeCells(`B${row}:I${row}`);
  row++;

  worksheet.getCell(`B${row}`).value = `Account No: ${accountNo}`;
  worksheet.getCell(`B${row}`).border = borderStyle;
  worksheet.mergeCells(`B${row}:I${row}`);
  row++;

  worksheet.getCell(`B${row}`).value = `IFSC Code: ${ifscCode}`;
  worksheet.getCell(`B${row}`).border = borderStyle;
  worksheet.mergeCells(`B${row}:I${row}`);
  row++;

  // Jurisdiction and signatures in two boxes
  worksheet.getCell(`B${row}`).value = 'Subject to Bangalore Jurisdiction'
  worksheet.getCell(`B${row}`).border = borderStyle
  worksheet.mergeCells(`B${row}:E${row}`)
  worksheet.getCell(`B${row + 1}`).value = 'Receiver\'s Signature & Seal'
  worksheet.getCell(`B${row + 1}`).border = borderStyle
  worksheet.mergeCells(`B${row + 1}:E${row + 1}`)

  worksheet.getCell(`F${row}`).value = invoice.companyName ? `For ${invoice.companyName}` : 'For ____________________'
  worksheet.getCell(`F${row}`).border = borderStyle
  worksheet.getCell(`F${row}`).alignment = { horizontal: 'right' }
  worksheet.mergeCells(`F${row}:I${row}`)
  worksheet.getCell(`F${row + 1}`).value = 'Authorised Signatory'
  worksheet.getCell(`F${row + 1}`).border = borderStyle
  worksheet.getCell(`F${row + 1}`).alignment = { horizontal: 'right' }
  worksheet.mergeCells(`F${row + 1}:I${row + 1}`)

  row += 2

  return await workbook.xlsx.writeBuffer()
}

export async function generateReportExcel(invoices) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Invoice Report')

  worksheet.columns = [
    { header: 'S.No', key: 'sno', width: 8 },
    { header: 'Invoice Number', key: 'number', width: 25 },
    { header: 'PO Number', key: 'poNumber', width: 15 },
    { header: 'Client Name', key: 'clientName', width: 35 },
    { header: 'Invoice Date', key: 'invoiceDate', width: 15 },
    { header: 'Created Date', key: 'date', width: 15 },
    { header: 'Days Elapsed', key: 'daysElapsed', width: 15 },
    { header: 'Amount (₹)', key: 'amount', width: 18 },
    { header: 'Status', key: 'status', width: 12 }
  ]

  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
  headerRow.alignment = { horizontal: 'center' }

  let grandTotalSum = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  invoices.forEach((inv, index) => {
    // Calculate total amount exactly like we do in the single export
    const subTotal = inv.lineItems?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0
    const cgstAmount = (subTotal * (inv.cgstRate || 9)) / 100
    const sgstAmount = (subTotal * (inv.sgstRate || 9)) / 100
    const igstAmount = (subTotal * (inv.igstRate || 0)) / 100
    const roundOff = typeof inv.roundOff === 'number' ? inv.roundOff : parseFloat(inv.roundOff) || 0
    const totalAmount = subTotal + cgstAmount + sgstAmount + igstAmount + roundOff

    grandTotalSum += totalAmount

    // Calculate days elapsed
    const createdDate = new Date(inv.createdAt || Date.now())
    createdDate.setHours(0, 0, 0, 0)
    const diffTime = today - createdDate
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const finalDaysElapsed = diffDays >= 0 ? diffDays : 0

    worksheet.addRow({
      sno: index + 1,
      number: inv.number || '',
      poNumber: inv.poNumber || '-',
      clientName: inv.clientName || '',
      invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : (inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : ''),
      date: inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN') : '',
      daysElapsed: finalDaysElapsed,
      amount: totalAmount,
      status: inv.status || 'Draft'
    })
  })

  // Add formatting for amount column
  worksheet.getColumn('amount').numFmt = '₹ #,##0.00'

  // Add a total row at the bottom
  const totalRow = worksheet.addRow({
    clientName: 'TOTAL',
    amount: grandTotalSum
  })
  totalRow.font = { bold: true }

  // Style boundaries
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })
  })

  return await workbook.xlsx.writeBuffer()
}


