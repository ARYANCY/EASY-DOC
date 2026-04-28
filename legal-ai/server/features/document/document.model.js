import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  documentId: { type: String, required: true, unique: true },
  filename: { type: String, required: true },
  text: { type: String, required: true },
  chunks: [{ type: String }],
  metadata: {
    pageCount: Number,
    isScanned: Boolean,
    parsedAt: Date,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Document = mongoose.model('Document', documentSchema);
export default Document;
