import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { Document } from '../document/document.model.js';
import { PdfEdit } from './pdfEdit.model.js';
import { callParser, callConvertHTML, callSimplify } from '../../core/services/pythonClient.js';
import { generatePdfFromHtml } from './pdf_export.service.js';
import fs from 'fs';

const router = express.Router();

// Get structured PDF data (blocks/coordinates)
router.get('/parse/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    let doc = await Document.findOne({ documentId });
    
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    
    // Auto-parse if structured data is missing
    if (!doc.pages || doc.pages.length === 0) {
      console.log(`[PDF] Auto-parsing missing structured data for: ${documentId}`);
      if (doc.filePath && fs.existsSync(doc.filePath)) {
        try {
          const fileBuffer = fs.readFileSync(doc.filePath);
          const parseResult = await callParser(fileBuffer, doc.filename);
          if (parseResult && parseResult.pages) {
            doc.pages = parseResult.pages;
            await doc.save();
            console.log(`[PDF] Auto-parse successful for ${documentId}: ${doc.pages.length} pages`);
          }
        } catch (parseError) {
          console.error(`[PDF] Auto-parse failed for ${documentId}:`, parseError.message);
        }
      } else {
        console.warn(`[PDF] Cannot auto-parse, filePath missing or invalid for ${documentId}`);
      }
    }
    
    res.json({
      success: true,
      documentId,
      pages: doc.pages || []
    });
  } catch (error) {
    console.error(`[PDF] Parse error for ${documentId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Convert blocks to reconstructed HTML
router.post('/convert-html', authenticateToken, async (req, res) => {
  try {
    const { pages } = req.body;
    if (!pages) return res.status(400).json({ error: 'Pages data required' });
    
    const result = await callConvertHTML(pages);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Process (Simplify/Rewrite)
router.post('/ai-process', authenticateToken, async (req, res) => {
  try {
    const { text, type = 'simplify' } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });
    
    let result;
    if (type === 'simplify') {
      result = await callSimplify(text);
    } else {
      // Fallback or other AI types
      result = { simplified: `AI Processed (${type}): ` + text };
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export HTML to PDF
router.post('/export', authenticateToken, async (req, res) => {
  try {
    const { html, filename = 'exported_document.pdf' } = req.body;
    if (!html) return res.status(400).json({ error: 'HTML content required' });
    
    const pdfBuffer = await generatePdfFromHtml(html);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save overlay edits
router.post('/save-edits', authenticateToken, async (req, res) => {
  try {
    const { documentId, edits } = req.body;
    if (!documentId || !edits) return res.status(400).json({ error: 'documentId and edits required' });
    
    // Upsert edits
    for (const edit of edits) {
      await PdfEdit.findOneAndUpdate(
        { documentId, page: edit.page, x: edit.x, y: edit.y },
        { ...edit, updatedAt: new Date() },
        { upsert: true }
      );
    }
    
    res.json({ success: true, message: 'Edits saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get edits for a document
router.get('/edits/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const edits = await PdfEdit.find({ documentId });
    res.json({ success: true, edits });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
