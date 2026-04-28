import { callParser } from '../../core/services/pythonClient.js';
import { Upload } from './upload.model.js';
import { Document } from '../document/document.model.js';

export const handleUpload = async (file) => {
  try {
    // Forward to FastAPI for parsing
    const parseResult = await callParser(file.buffer, file.originalname);
    
    if (!parseResult || !parseResult.document_id) {
      throw new Error('Failed to parse document');
    }
    
    // Store upload record
    await Upload.create({
      documentId: parseResult.document_id,
      filename: parseResult.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      status: 'completed',
      parsedData: parseResult
    });
    
    // Store document for retrieval
    await Document.create({
      documentId: parseResult.document_id,
      filename: parseResult.filename,
      text: parseResult.text || '',
      chunks: parseResult.chunks || [],
      metadata: {
        pageCount: parseResult.page_count,
        isScanned: parseResult.is_scanned,
        parsedAt: new Date()
      }
    });
    
    return {
      success: true,
      documentId: parseResult.document_id,
      filename: file.originalname,
      chunkCount: parseResult.chunk_count,
      isScanned: parseResult.is_scanned,
      message: 'Document uploaded and processed successfully'
    };
    
  } catch (error) {
    console.error('Upload processing error:', error);
    
    // Store failed upload record
    await Upload.create({
      documentId: `failed_${Date.now()}`,
      filename: file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      status: 'failed',
      parsedData: { error: error.message }
    }).catch(() => {}); // Ignore if DB is down
    
    throw error;
  }
};
