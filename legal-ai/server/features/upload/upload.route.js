import express from 'express';
import multer from 'multer';
import { handleUpload } from './upload.service.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const result = await handleUpload(req.file);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
