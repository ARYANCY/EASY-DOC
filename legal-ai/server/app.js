import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Import routes
import uploadRouter from './features/upload/upload.route.js';
import documentRouter from './features/document/document.route.js';
import chatRouter from './features/chat/chat.route.js';
import riskRouter from './features/risk/risk.route.js';
import simplifyRouter from './features/simplify/simplify.route.js';

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/document', documentRouter);
app.use('/api/chat', chatRouter);
app.use('/api/risk', riskRouter);
app.use('/api/simplify', simplifyRouter);

app.get('/', (req, res) => {
  res.json({ status: 'Easy-Doc API Gateway Running', version: '1.0.0' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Easy-Doc API Gateway running on http://localhost:${PORT}`);
});

export default app;
