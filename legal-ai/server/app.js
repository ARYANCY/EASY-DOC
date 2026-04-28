import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import uploadRoutes from './features/upload/upload.route.js';
import documentRoutes from './features/document/document.route.js';
import chatRoutes from './features/chat/chat.route.js';
import riskRoutes from './features/risk/risk.route.js';
import simplifyRoutes from './features/simplify/simplify.route.js';
import searchRoutes from './features/search/search.route.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'nodejs-gateway' });
});

// API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/document', documentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/simplify', simplifyRoutes);
app.use('/api/search', searchRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`FastAPI URL: ${process.env.FASTAPI_URL}`);
});
