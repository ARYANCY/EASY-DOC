import mongoose from 'mongoose';

const pdfEditSchema = new mongoose.Schema({
  documentId: { type: String, required: true },
  page: { type: Number, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number },
  height: { type: Number },
  originalText: { type: String },
  editedText: { type: String },
  status: { type: String, enum: ['pending', 'approved'], default: 'pending' },
  updatedAt: { type: Date, default: Date.now },
});

// Index for fast lookup by document and page
pdfEditSchema.index({ documentId: 1, page: 1 });

export const PdfEdit = mongoose.model('PdfEdit', pdfEditSchema);
export default PdfEdit;
