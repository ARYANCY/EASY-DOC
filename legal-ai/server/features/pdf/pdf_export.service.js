import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

export const generatePdfFromHtml = async (html, options = {}) => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set content and wait for images/fonts
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Apply print CSS rules
    await page.addStyleTag({
      content: `
        @page {
          size: A4;
          margin: 20mm;
        }
        body {
          font-family: sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .page-break {
          page-break-after: always;
        }
        h1, h2, h3 {
          color: #1a365d;
          margin-top: 2em;
        }
        p {
          margin-bottom: 1em;
        }
      `
    });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    return pdfBuffer;
  } finally {
    await browser.close();
  }
};
