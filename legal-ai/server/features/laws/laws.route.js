import express from 'express';
import { callAnalyzeLaws } from '../../core/services/pythonClient.js';
import { Document } from '../document/document.model.js';

const router = express.Router();

// Extract relevant laws from a document
router.post('/analyze', async (req, res) => {
  try {
    const { documentId, text, jurisdiction } = req.body;

    if (!documentId && !text) {
      return res.status(400).json({ error: 'Either documentId or text is required' });
    }

    let documentText = text;

    // Fetch text from DB if not provided
    if (!documentText && documentId) {
      const doc = await Document.findOne({ documentId });
      if (!doc || !doc.text) {
        return res.status(404).json({ error: 'Document not found or has no text' });
      }
      documentText = doc.text;
    }

    const result = await callAnalyzeLaws(documentId || 'unknown', documentText, jurisdiction);
    res.json(result);
  } catch (error) {
    console.error('Error in analyze laws route:', error);
    res.status(500).json({ error: 'Failed to analyze laws' });
  }
});

export default router;
