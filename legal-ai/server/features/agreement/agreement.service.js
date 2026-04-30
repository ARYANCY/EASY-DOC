import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import Agreement from './agreement.model.js';

export const createAgreement = async (name, templateUrl, parsedContent = '') => {
  const agreementId = uuidv4();
  const agreement = new Agreement({
    agreementId,
    name,
    templateUrl,
    parsedContent, // Store parsed text for AI context
    versions: [{ version: 0, text: parsedContent || '', source: 'manual' }],
    currentVersion: 0
  });
  await agreement.save();
  return agreement;
};

export const getAgreement = async (agreementId) => {
  return Agreement.findOne({ agreementId });
};

export const updateParsedContent = async (agreementId, parsedContent) => {
  const agreement = await Agreement.findOne({ agreementId });
  if (!agreement) throw new Error('Agreement not found');
  
  agreement.parsedContent = parsedContent;
  
  // Also update the first version if it has empty text
  if (agreement.versions.length > 0 && !agreement.versions[0].text) {
    agreement.versions[0].text = parsedContent;
  }
  
  await agreement.save();
  return agreement;
};

export const addVersion = async (agreementId, text, source) => {
  const agreement = await Agreement.findOne({ agreementId });
  if (!agreement) throw new Error('Agreement not found');

  const nextVersion = agreement.currentVersion + 1;
  // Truncate future versions if we diverged
  agreement.versions = agreement.versions.slice(0, nextVersion);
  agreement.versions.push({
    version: nextVersion,
    text,
    source
  });
  agreement.currentVersion = nextVersion;
  agreement.status = 'draft';
  await agreement.save();
  return agreement;
};

export const setVersionPointer = async (agreementId, versionIndex) => {
  const agreement = await Agreement.findOne({ agreementId });
  if (!agreement) throw new Error('Agreement not found');
  if (versionIndex < 0 || versionIndex >= agreement.versions.length) {
    throw new Error('Invalid version pointer');
  }
  agreement.currentVersion = versionIndex;
  agreement.status = 'draft'; // undoing or redoing resets approval
  await agreement.save();
  return agreement;
};

export const approveAgreement = async (agreementId) => {
  const agreement = await Agreement.findOne({ agreementId });
  if (!agreement) throw new Error('Agreement not found');
  agreement.status = 'approved';
  await agreement.save();
  return agreement;
};

// Helper: Add text content across multiple pages with proper formatting
const addTextPagesToPdf = async (pdfDoc, text) => {
  // Get dimensions from first page or use A4
  const existingPages = pdfDoc.getPages();
  let width = 595; // A4 width in points
  let height = 842; // A4 height in points
  
  if (existingPages.length > 0) {
    width = existingPages[0].getWidth();
    height = existingPages[0].getHeight();
  }
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 10;
  const margin = 60;
  const maxWidth = width - (margin * 2);
  const lineHeight = fontSize * 1.4;
  const maxY = height - margin - fontSize;
  const minY = margin + fontSize;
  
  // Word wrap text into lines
  const wrapText = (text, maxWidth) => {
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };
  
  // Parse text into paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  let allLines = [];
  
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    
    // Check if it's a heading (short, all caps or ends with colon)
    const isHeading = (trimmed.length < 100 && 
      (trimmed === trimmed.toUpperCase() || trimmed.endsWith(':')));
    
    if (isHeading) {
      allLines.push({ type: 'heading', text: trimmed });
    } else {
      const wrapped = wrapText(trimmed, maxWidth);
      wrapped.forEach(line => allLines.push({ type: 'text', text: line }));
    }
    allLines.push({ type: 'spacer' }); // Add space between paragraphs
  }
  
  // Create pages and render lines
  let pages = [];
  let pageIndex = 0;
  
  const createNewPage = () => {
    const page = pdfDoc.insertPage(pageIndex, [width, height]);
    pages.push(page);
    pageIndex++;
    
    // Add header
    const headerText = 'AGREEMENT';
    const headerWidth = boldFont.widthOfTextAtSize(headerText, 14);
    page.drawText(headerText, {
      x: (width - headerWidth) / 2,
      y: height - 40,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    // Add page number if multiple pages
    if (pageIndex > 1) {
      const pageNumText = `Page ${pageIndex}`;
      const pageNumWidth = font.widthOfTextAtSize(pageNumText, 8);
      page.drawText(pageNumText, {
        x: width - margin - pageNumWidth,
        y: 30,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
    
    return height - 70; // Return starting Y position
  };
  
  let y = createNewPage();
  
  for (const line of allLines) {
    if (line.type === 'spacer') {
      y -= lineHeight;
      continue;
    }
    
    // Check if we need a new page
    if (y < minY + lineHeight) {
      y = createNewPage();
    }
    
    const isHeading = line.type === 'heading';
    const lineFont = isHeading ? boldFont : font;
    const lineSize = isHeading ? 11 : fontSize;
    const lineSpacing = isHeading ? lineHeight * 1.5 : lineHeight;
    
    page.drawText(line.text, {
      x: margin,
      y: y,
      size: lineSize,
      font: lineFont,
      color: rgb(0, 0, 0),
    });
    
    y -= lineSpacing;
  }
};

export const injectPdf = async (agreementId) => {
  const agreement = await Agreement.findOne({ agreementId });
  if (!agreement) throw new Error('Agreement not found');
  if (agreement.status !== 'approved') throw new Error('Must be approved before injection');
  
  if (!agreement.templateUrl || !fs.existsSync(agreement.templateUrl)) {
    throw new Error('Template PDF not found');
  }

  const currentVersionData = agreement.versions[agreement.currentVersion];
  const text = currentVersionData ? currentVersionData.text : '';

  const pdfBytes = fs.readFileSync(agreement.templateUrl);
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    updateMetadata: false
  });
  
  // Try to fill form fields first
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  let filled = false;
  
  if (fields.length > 0) {
    for (const field of fields) {
      if (field.constructor.name === 'PDFTextField') {
        try {
          field.setText(text);
          filled = true;
          break;
        } catch (e) {
          console.log('Could not fill field, will create overlay instead');
        }
      }
    }
    // Flatten if we filled a form
    if (filled) {
      form.flatten();
    }
  }
  
  // If no form fields were filled, create a new page with text overlay
  if (!filled && text) {
    await addTextPagesToPdf(pdfDoc, text);
  }

  const outputBytes = await pdfDoc.save({
    useObjectStreams: false,
    addDefaultPage: false
  });
  
  const outputFileName = `injected_${agreementId}.pdf`;
  const outputPath = path.join('uploads', outputFileName);
  
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
  }

  fs.writeFileSync(outputPath, outputBytes);
  
  agreement.pdfUrl = outputPath;
  agreement.status = 'injected';
  await agreement.save();
  
  return agreement;
};
